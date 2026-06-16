/**
 * `honeydeck pdf` — export the presentation as a PDF file.
 *
 * ### Pipeline
 *
 *  1. Parse CLI arguments (`--deck`, `-o`, `--steps`, `--mode`, `--parallel`).
 *  2. Read the deck entry: count slides, extract deck frontmatter.
 *  3. Resolve PDF color mode: CLI flag > `pdfColorMode` FM > `colorMode` FM (if pinned) > `light`.
 *  4. If `--steps all`: pre-compile each slide to get per-slide step counts.
 *  5. Build the presentation to a temporary directory (quiet Vite build).
 *  6. Start a minimal static HTTP server on a random OS-assigned port.
 *  7. Launch headless Chromium via Playwright.
 *  8. Navigate to `/#/1/0` (full load), then use hash changes for the rest.
 *  9. Capture slide/step PNG screenshots with a bounded pool of Playwright pages.
 *       For each capture target:
 *       a. Set `location.hash` to `#/<slide>/<step>`.
 *       b. Wait for React to re-render.
 *       c. Force `data-honeydeck-color-mode` on <html>.
 *       d. Capture PNG screenshot at deck-derived PDF dimensions.
 * 10. Embed all PNGs into a PDF document via pdf-lib.
 * 11. Write PDF to the output path.
 * 12. Clean up: close browser, stop server, remove temp build dir.
 *
 * ### Notes
 * - Uses `pdfSteps: final` by default → all reveals visible (step index 999
 *   is higher than any realistic step count, so all `<Reveal>` nodes show).
 *   The first URL includes `honeydeckPdfRender=final`, which tells custom
 *   step-driven components they may render a PDF-specific final composition.
 * - Playwright must have Chromium installed (`npx playwright install chromium`).
 * - Temp directory is always cleaned up in a `finally` block.
 */

import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import { availableParallelism, tmpdir } from "node:os";
import {
	dirname,
	extname,
	isAbsolute,
	join,
	relative,
	resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@mdx-js/mdx";
import { PDFDocument } from "pdf-lib";
import type { Page } from "playwright";
import { chromium } from "playwright";
import remarkFrontmatter from "remark-frontmatter";
import { remarkH1Extract } from "#remark/h1-extract.ts";
import { remarkShikiCodeBlocks } from "#remark/shiki-code-blocks.ts";
import { remarkStepNumbering } from "#remark/step-numbering.ts";
import { loadDeck } from "#vite-plugin/deck-loader.ts";
import { parseAspectRatio } from "../runtime/aspectRatio.ts";
import { hasHelpFlag } from "./args.ts";
import { formatCommandBanner } from "./banner.ts";
import { buildPresentation } from "./build.ts";
import {
	type DeckPathOptions,
	rejectRootOption,
	resolveDeckPath,
	validateDeckPath,
} from "./deck-path.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Step index used for "final" mode — larger than any real step count so all
 * `<Reveal>` nodes are visible.
 */
const FINAL_STEP_INDEX = 999;
const MAX_PDF_CAPTURE_CONCURRENCY = 16;

function buildPdfRenderQuery(isPdfFinalRender: boolean): string {
	return `?honeydeckPdfRender=${isPdfFinalRender ? "final" : "step"}`;
}

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export type PdfOptions = DeckPathOptions & {
	output: string;
	/** Explicit CLI --steps override. `null` = read from frontmatter/default. */
	steps: "final" | "all" | null;
	/** Explicit CLI --mode override. `null` = read from frontmatter. */
	mode: "light" | "dark" | null;
	/** Number of Playwright pages used to capture slide screenshots. */
	parallel: number;
};

export function printPdfHelp(): void {
	console.log(`
  ✨ honeydeck pdf — export slides to a PDF file

  Usage:
    honeydeck pdf [options]

  Options:
    --deck <file.mdx>    Deck entry file          (default: ./deck.mdx)
    -o, --output <file>  Output file path         (default: deck.pdf)
    --steps <mode>       'final' or 'all'         (default: final)
    --mode <mode>        'light' or 'dark'        (default: from frontmatter)
    --parallel <count>   Parallel captures, 1-16  (default: CPU count, max 16)
    -h, --help           Show this help page

  Examples:
    honeydeck pdf
    honeydeck pdf -o my-talk.pdf
    honeydeck pdf --steps all --parallel 6 --mode dark --deck talk.mdx
`);
}

function readOptionValue(
	args: string[],
	index: number,
	option: string,
): string {
	const value = args[index + 1];
	if (!value || value.startsWith("-")) {
		console.error(`❌  Missing value for ${option}`);
		process.exit(1);
	}
	return value;
}

export function parsePdfArgs(args: string[]): PdfOptions {
	let deckPath: string | null = null;
	let output = "deck.pdf";
	let steps: "final" | "all" | null = null;
	let mode: "light" | "dark" | null = null;
	let parallel = resolveDefaultPdfCaptureConcurrency();

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--deck") {
			const value = readOptionValue(args, i, arg);
			validateDeckPath(value, arg);
			deckPath = value;
			i++;
		} else if (arg === "--root") {
			rejectRootOption();
		} else if (arg === "-o" || arg === "--output") {
			const value = readOptionValue(args, i, arg);
			output = value;
			i++;
		} else if (arg === "--steps") {
			const value = readOptionValue(args, i, arg);
			if (value === "all") {
				steps = "all";
			} else if (value === "final") {
				steps = "final";
			} else {
				console.error(
					`❌  Unknown --steps value "${value}". Use "final" or "all".`,
				);
				process.exit(1);
			}
			i++;
		} else if (arg === "--mode") {
			const value = readOptionValue(args, i, arg);
			if (value === "light" || value === "dark") {
				mode = value;
			} else {
				console.error(
					`❌  Unknown --mode value "${value}". Use "light" or "dark".`,
				);
				process.exit(1);
			}
			i++;
		} else if (arg === "--parallel") {
			const value = readOptionValue(args, i, arg);
			parallel = parsePdfCaptureConcurrency(value, arg);
			i++;
		}
	}

	return {
		...resolveDeckPath(deckPath ?? undefined),
		output,
		steps,
		mode,
		parallel,
	};
}

function parsePdfCaptureConcurrency(value: string, option: string): number {
	if (!/^\d+$/.test(value)) {
		console.error(
			`❌  Unknown ${option} value "${value}". Use an integer from 1 to ${MAX_PDF_CAPTURE_CONCURRENCY}.`,
		);
		process.exit(1);
	}

	const parsed = Number(value);
	if (parsed < 1 || parsed > MAX_PDF_CAPTURE_CONCURRENCY) {
		console.error(
			`❌  Unknown ${option} value "${value}". Use an integer from 1 to ${MAX_PDF_CAPTURE_CONCURRENCY}.`,
		);
		process.exit(1);
	}

	return parsed;
}

// ---------------------------------------------------------------------------
// Static HTTP server
// ---------------------------------------------------------------------------

const MIME_TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "application/javascript",
	".mjs": "application/javascript",
	".css": "text/css",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".json": "application/json",
	".woff": "font/woff",
	".woff2": "font/woff2",
};

type StaticServer = {
	url: string;
	close: () => Promise<void>;
};

function isPathInside(root: string, candidate: string): boolean {
	const relativePath = relative(root, candidate);
	return (
		relativePath === "" ||
		(!relativePath.startsWith("..") && !isAbsolute(relativePath))
	);
}

export function resolveStaticFilePath(
	dir: string,
	requestUrl: string | undefined,
): string | null {
	const root = resolve(dir);
	const [rawPath = "/"] = (requestUrl ?? "/").split("?");

	let decodedPath: string;
	try {
		decodedPath = decodeURIComponent(rawPath);
	} catch {
		return null;
	}

	if (decodedPath.includes("\0")) return null;

	const requestedFile =
		decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
	let filePath = resolve(root, requestedFile);

	if (!isPathInside(root, filePath)) return null;

	// SPA fallback: if the resolved path doesn't exist or has no extension
	// (looks like a route rather than an asset), serve index.html instead.
	if (!existsSync(filePath) || extname(filePath) === "") {
		filePath = join(root, "index.html");
	}

	return filePath;
}

/**
 * Start a minimal static file server for the built SPA.
 * Binds to 127.0.0.1 on a random OS-assigned port (port 0).
 * Falls back to serving index.html for any path not found on disk
 * (SPA hash-routing: all routes are the same HTML entry).
 */
function startStaticServer(dir: string): Promise<StaticServer> {
	return new Promise((resolvePromise, reject) => {
		const handler = (req: IncomingMessage, res: ServerResponse): void => {
			if (req.method !== "GET" && req.method !== "HEAD") {
				res.writeHead(405, { "Content-Type": "text/plain" });
				res.end("Method not allowed");
				return;
			}

			const filePath = resolveStaticFilePath(dir, req.url);
			if (!filePath) {
				res.writeHead(403, { "Content-Type": "text/plain" });
				res.end("Forbidden");
				return;
			}

			try {
				const content = readFileSync(filePath);
				const mime =
					MIME_TYPES[extname(filePath).toLowerCase()] ??
					"application/octet-stream";
				res.writeHead(200, { "Content-Type": mime });
				res.end(req.method === "HEAD" ? undefined : content);
			} catch {
				res.writeHead(404, { "Content-Type": "text/plain" });
				res.end("Not found");
			}
		};

		const server = createServer(handler);

		server.listen(0, "127.0.0.1", () => {
			const addr = server.address() as { port: number };
			resolvePromise({
				url: `http://127.0.0.1:${addr.port}`,
				close: () =>
					new Promise<void>((r, e) =>
						server.close((err) => (err ? e(err) : r())),
					),
			});
		});

		server.on("error", reject);
	});
}

// ---------------------------------------------------------------------------
// Step count computation
// ---------------------------------------------------------------------------

/**
 * Pre-compile each slide to extract the `stepCount` injected by
 * `remarkStepNumbering`. Used only for `--steps all` mode.
 *
 * Mirrors the compilation done inside the virtual modules plugin so the
 * counts are identical to what the runtime reports.
 */
async function getStepCounts(entryPath: string): Promise<number[]> {
	const { deckFrontmatter, slides } = loadDeck(entryPath);

	const counts: number[] = [];

	for (const slide of slides) {
		try {
			const vfile = await compile(slide.rawMdx, {
				remarkPlugins: [
					remarkFrontmatter,
					remarkH1Extract,
					remarkStepNumbering,
					[
						remarkShikiCodeBlocks,
						{ magicCodeDuration: deckFrontmatter.magicCodeDuration },
					],
				],
				jsxImportSource: "react",
				outputFormat: "program",
			});
			counts.push((vfile.data.stepCount as number | undefined) ?? 0);
		} catch {
			// Compilation error for an individual slide — assume 0 steps.
			counts.push(0);
		}
	}

	return counts;
}

// ---------------------------------------------------------------------------
// Color mode resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the effective PDF color mode in priority order:
 *   CLI `--mode` flag  >  `pdfColorMode` frontmatter  >  `colorMode` (if pinned)  >  `light`
 */
export function resolveColorMode(
	cliMode: "light" | "dark" | null,
	deckFrontmatter: Record<string, unknown>,
): "light" | "dark" {
	if (cliMode) return cliMode;

	const pdfMode = deckFrontmatter.pdfColorMode;
	if (pdfMode === "light" || pdfMode === "dark") return pdfMode;

	const colorMode = deckFrontmatter.colorMode;
	if (colorMode === "light" || colorMode === "dark") return colorMode;

	return "light";
}

/**
 * Resolve exported steps in priority order:
 *   CLI `--steps` flag  >  `pdfSteps` frontmatter  >  `final`
 */
export function resolvePdfSteps(
	cliSteps: "final" | "all" | null,
	deckFrontmatter: Record<string, unknown>,
): "final" | "all" {
	if (cliSteps) return cliSteps;

	const pdfSteps = deckFrontmatter.pdfSteps;
	if (pdfSteps === "all" || pdfSteps === "final") return pdfSteps;

	return "final";
}

// ---------------------------------------------------------------------------
// Capture target planning
// ---------------------------------------------------------------------------

export type PdfCaptureTarget = {
	pageIndex: number;
	slide: number;
	step: number;
	slideStepCount: number;
	isPdfFinalRender: boolean;
};

export function buildPdfCaptureTargets(
	slideCount: number,
	stepCounts: number[],
	steps: "final" | "all",
): PdfCaptureTarget[] {
	const targets: PdfCaptureTarget[] = [];

	for (let slideIndex = 0; slideIndex < slideCount; slideIndex++) {
		const slide = slideIndex + 1;
		const slideStepCount = stepCounts[slideIndex] ?? 0;

		if (steps === "all") {
			for (let step = 0; step <= slideStepCount; step++) {
				targets.push({
					pageIndex: targets.length,
					slide,
					step,
					slideStepCount,
					isPdfFinalRender: false,
				});
			}
		} else {
			targets.push({
				pageIndex: targets.length,
				slide,
				step: FINAL_STEP_INDEX,
				slideStepCount,
				isPdfFinalRender: true,
			});
		}
	}

	return targets;
}

export function resolvePdfCaptureConcurrency(
	requestedParallelism: number,
	targetCount: number,
): number {
	if (targetCount <= 0) return 0;
	return Math.min(requestedParallelism, targetCount);
}

export function resolveDefaultPdfCaptureConcurrency(
	cpuCount = availableParallelism(),
): number {
	return Math.min(
		Math.max(1, Math.floor(cpuCount)),
		MAX_PDF_CAPTURE_CONCURRENCY,
	);
}

// ---------------------------------------------------------------------------
// Screenshot helpers
// ---------------------------------------------------------------------------

/**
 * Navigate the Playwright page to a specific slide+step and return a PNG
 * screenshot buffer.
 *
 * Strategy:
 *  - `firstLoad = true`  → full `page.goto()` that boots the React SPA.
 *  - `firstLoad = false` → hash change only; avoids a full page reload and is
 *    much faster when iterating over many slides/steps.
 *
 * After each navigation the color mode attribute is forced so it overrides
 * any system preference or in-app state from the previous slide.
 */
async function captureSlide(
	page: Page,
	serverUrl: string,
	slide: number,
	step: number,
	colorMode: "light" | "dark",
	isPdfFinalRender: boolean,
	firstLoad: boolean,
	getPageError: () => Error | null,
): Promise<Buffer> {
	if (firstLoad) {
		const pdfRenderQuery = buildPdfRenderQuery(isPdfFinalRender);

		// Full navigation: boots the SPA and waits for network to settle.
		await page.goto(`${serverUrl}/${pdfRenderQuery}#/${slide}/${step}`, {
			waitUntil: "networkidle",
			timeout: 30_000,
		});
		// Ensure the slide canvas element exists before we continue.
		await waitForSlideCanvas(page, getPageError);
	} else {
		// Hash-only navigation: React router picks it up via the hashchange event.
		await page.evaluate((hash: string) => {
			window.location.hash = hash;
		}, `#/${slide}/${step}`);
		// Wait for React to finish re-rendering (opacity transition + reveals).
		await page.waitForTimeout(500);
	}

	// Force the color mode attribute regardless of system preference.
	await page.evaluate((mode: string) => {
		document.documentElement.setAttribute("data-honeydeck-color-mode", mode);
	}, colorMode);

	await waitForPdfColorMode(page, colorMode, getPageError);

	// Brief pause for any CSS color-mode transitions to settle.
	await page.waitForTimeout(150);

	const png = await page.screenshot({ type: "png" });
	return Buffer.from(png);
}

async function prepareCapturePage(
	page: Page,
	serverUrl: string,
	colorMode: "light" | "dark",
	isPdfFinalRender: boolean,
	getPageError: () => Error | null,
): Promise<void> {
	const pdfRenderQuery = buildPdfRenderQuery(isPdfFinalRender);

	await page.goto(`${serverUrl}/${pdfRenderQuery}#/1/0`, {
		waitUntil: "networkidle",
		timeout: 30_000,
	});
	await waitForSlideCanvas(page, getPageError);

	await page.evaluate((mode: string) => {
		document.documentElement.setAttribute("data-honeydeck-color-mode", mode);
	}, colorMode);

	await waitForPdfColorMode(page, colorMode, getPageError);
	await page.waitForTimeout(150);
}

async function waitForPdfColorMode(
	page: Page,
	colorMode: "light" | "dark",
	getPageError: () => Error | null,
): Promise<void> {
	await waitForBrowserWork(
		page.waitForFunction(
			(mode) => {
				if (
					document.documentElement.getAttribute("data-honeydeck-color-mode") !==
					mode
				) {
					return false;
				}

				return true;
			},
			colorMode,
			{ timeout: 5_000 },
		),
		getPageError,
		5_000,
		async () =>
			new Error(
				`Timed out waiting for PDF color mode "${colorMode}" to apply.`,
			),
	);
}

async function waitForBrowserWork<T>(
	work: Promise<T>,
	getPageError: () => Error | null,
	timeoutMs: number,
	makeTimeoutError: () => Promise<Error>,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		let settled = false;
		let pageErrorInterval: ReturnType<typeof setInterval>;
		let timeout: ReturnType<typeof setTimeout>;

		const finish = (callback: () => void) => {
			if (settled) return;
			settled = true;
			clearInterval(pageErrorInterval);
			clearTimeout(timeout);
			callback();
		};

		pageErrorInterval = setInterval(() => {
			const pageError = getPageError();
			if (!pageError) return;
			finish(() => {
				reject(
					new Error(
						`Browser failed while rendering the deck:\n${formatPageError(pageError)}`,
					),
				);
			});
		}, 100);

		timeout = setTimeout(() => {
			void makeTimeoutError().then(
				(error) => finish(() => reject(error)),
				(error: unknown) => finish(() => reject(error)),
			);
		}, timeoutMs);

		work.then(
			(value) => finish(() => resolve(value)),
			(error: unknown) => finish(() => reject(error)),
		);
	});
}

async function waitForSlideCanvas(
	page: Page,
	getPageError: () => Error | null,
): Promise<void> {
	const timeoutMs = 15_000;
	const startedAt = Date.now();

	while (Date.now() - startedAt < timeoutMs) {
		const pageError = getPageError();
		if (pageError) {
			throw new Error(
				`Browser failed while rendering the deck:\n${formatPageError(pageError)}`,
			);
		}

		const canvas = await page.$(".honeydeck-slide-canvas");
		if (canvas && (await canvas.isVisible())) return;

		await page.waitForTimeout(100);
	}

	const pageError = getPageError();
	if (pageError) {
		throw new Error(
			`Browser failed while rendering the deck:\n${formatPageError(pageError)}`,
		);
	}

	throw new Error(
		"Timed out waiting for .honeydeck-slide-canvas to become visible.",
	);
}

function formatPageError(error: Error): string {
	return error.stack || error.message;
}

function formatCaptureProgress(
	target: PdfCaptureTarget,
	targetCount: number,
	slideCount: number,
	steps: "final" | "all",
): string {
	const pageProgress = `${target.pageIndex + 1}/${targetCount}`;

	if (steps === "all") {
		return (
			`  📄 Rendering page ${pageProgress} ` +
			`(slide ${target.slide}/${slideCount}, step ${target.step}/${target.slideStepCount})…\n`
		);
	}

	return (
		`  📄 Rendering page ${pageProgress} ` +
		`(slide ${target.slide}/${slideCount})…\n`
	);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runPdf(args: string[]): Promise<void> {
	if (hasHelpFlag(args)) {
		printPdfHelp();
		return;
	}

	const {
		root,
		entry,
		deck,
		output,
		steps: cliSteps,
		mode: cliMode,
		parallel,
	} = parsePdfArgs(args);
	// Resolve output path against cwd so relative paths like "deck.pdf" work.
	const outputPath = resolve(process.cwd(), output);

	console.log(`\n${formatCommandBanner()}\n`);
	console.log("  🖨️  Exporting PDF…\n");

	// ── Read deck entry ──────────────────────────────────────────────────────
	let deckFrontmatter: Record<string, unknown> = {};
	let slideCount = 0;

	try {
		const { slides, deckFrontmatter: fm } = loadDeck(deck);
		deckFrontmatter = fm;
		slideCount = slides.length;
	} catch (err) {
		console.error(`\n  ❌  Cannot read ${deck}`);
		console.error(err);
		process.exit(1);
	}

	if (slideCount === 0) {
		console.error(`\n  ❌  No slides found in ${deck}`);
		process.exit(1);
	}

	const colorMode = resolveColorMode(cliMode, deckFrontmatter);
	const steps = resolvePdfSteps(cliSteps, deckFrontmatter);
	const pdfDimensions = parseAspectRatio(deckFrontmatter.aspectRatio);

	// ── Step counts (only needed for --steps all) ──────────────────────────────
	let stepCounts: number[] = Array<number>(slideCount).fill(0);
	if (steps === "all") {
		process.stdout.write("  🔢 Computing step counts…\n");
		stepCounts = await getStepCounts(deck);
	}

	// ── Build to temp directory ────────────────────────────────────────────────
	const tempDir = mkdtempSync(join(tmpdir(), "honeydeck-pdf-"));

	try {
		process.stdout.write("  🏗️  Building presentation…\n");

		await buildPresentation({
			userRoot: root,
			entry,
			outDir: tempDir,
			logLevel: "error", // Suppress Vite output during PDF sub-build
		});

		// ── Static server ────────────────────────────────────────────────────────
		const server = await startStaticServer(tempDir);

		try {
			// ── Playwright ───────────────────────────────────────────────────────
			let browser: Awaited<ReturnType<typeof chromium.launch>>;

			try {
				browser = await chromium.launch({ headless: true });
			} catch (err) {
				console.error("\n  ❌  Failed to launch Chromium.");
				console.error("     Make sure Playwright browsers are installed:");
				console.error("     npx playwright install chromium\n");
				throw err;
			}

			try {
				const colorModeInitScript = `
            (() => {
              const mode = ${JSON.stringify(colorMode)};
              const applyMode = () => {
                if (document.documentElement) {
                  document.documentElement.setAttribute('data-honeydeck-color-mode', mode);
                }
              };

              applyMode();

              if (!document.documentElement) {
                const observer = new MutationObserver(() => {
                  if (!document.documentElement) return;
                  applyMode();
                  observer.disconnect();
                });
                observer.observe(document, { childList: true });
              }

              document.addEventListener('DOMContentLoaded', applyMode, { once: true });
            })();
				`;

				const targets = buildPdfCaptureTargets(slideCount, stepCounts, steps);
				const captureConcurrency = resolvePdfCaptureConcurrency(
					parallel,
					targets.length,
				);
				const screenshots: Buffer[] = Array<Buffer>(targets.length);
				let nextTargetIndex = 0;

				process.stdout.write("\n");

				process.stdout.write(
					`  🧵 Capturing ${targets.length} page${targets.length !== 1 ? "s" : ""} with ${captureConcurrency} worker${captureConcurrency !== 1 ? "s" : ""}…\n\n`,
				);

				await Promise.all(
					Array.from({ length: captureConcurrency }, async () => {
						const context = await browser.newContext({
							// PDF page follows deck aspect ratio. Runtime slide canvas uses the
							// same 1920px base width and derived height, so screenshots fill the
							// exported page without letterbox/pillarbox space.
							viewport: pdfDimensions,
							// Make `colorMode: system` resolve to the same mode that PDF export
							// will force later.
							colorScheme: colorMode,
						});
						await context.addInitScript({ content: colorModeInitScript });
						let page: Page | null = null;
						let firstPageError: Error | null = null;

						try {
							page = await context.newPage();
							page.on("pageerror", (error) => {
								firstPageError ??= error;
							});

							await prepareCapturePage(
								page,
								server.url,
								colorMode,
								steps === "final",
								() => firstPageError,
							);

							while (true) {
								const target = targets[nextTargetIndex++];
								if (!target) break;

								process.stdout.write(
									formatCaptureProgress(
										target,
										targets.length,
										slideCount,
										steps,
									),
								);

								const screenshot = await captureSlide(
									page,
									server.url,
									target.slide,
									target.step,
									colorMode,
									target.isPdfFinalRender,
									false,
									() => firstPageError,
								);

								screenshots[target.pageIndex] = screenshot;
							}
						} finally {
							await page?.close();
							await context.close();
						}
					}),
				);

				// ── Assemble PDF ───────────────────────────────────────────────────
				process.stdout.write("\n  📎 Assembling PDF…\n");

				const pdfDoc = await PDFDocument.create();

				for (const target of targets) {
					const screenshot = screenshots[target.pageIndex];
					if (!screenshot) {
						throw new Error(
							`Missing screenshot for PDF page ${target.pageIndex + 1}.`,
						);
					}

					// pdf-lib uses PDF points as units; 1920×1080 points = 26.67"×15"
					// for default 16:9 decks. Other aspect ratios keep the same 1920pt
					// base width and use the deck-derived height.
					const pngImage = await pdfDoc.embedPng(screenshot);
					const pdfPage = pdfDoc.addPage([
						pdfDimensions.width,
						pdfDimensions.height,
					]);
					pdfPage.drawImage(pngImage, {
						x: 0,
						y: 0,
						width: pdfDimensions.width,
						height: pdfDimensions.height,
					});
				}

				const pdfBytes = await pdfDoc.save();
				writeFileSync(outputPath, pdfBytes);

				const pageCount = screenshots.length;
				console.log(
					`\n  ✅ Done! ${output} (${pageCount} page${pageCount !== 1 ? "s" : ""})\n`,
				);
			} finally {
				await browser.close();
			}
		} finally {
			await server.close();
		}
	} finally {
		// Always remove the temp build directory — even on error.
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Non-fatal: OS will clean up eventually.
		}
	}
}
