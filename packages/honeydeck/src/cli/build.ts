/**
 * `honeydeck build` — build the presentation as a deployable static SPA.
 *
 * ### Architecture
 *
 * Vite root is set to the user deck directory so project-local files, assets,
 * CSS, and peer dependencies resolve with normal Vite semantics.
 *
 * The app-shell `index.html` lives in the Honeydeck package and is passed as
 * Vite's explicit HTML input. The `__HONEYDECK_APP_SHELL_ENTRY__` placeholder
 * in that HTML is replaced with `@honeydeck/honeydeck/app-shell` by the
 * `buildHtmlPlugin`. Vite then resolves the app shell through the same package
 * entry system that user decks
 * use for `@honeydeck/honeydeck` imports.
 *
 * `outDir` points to `<userRoot>/dist`.
 *
 * ### Output structure
 * ```
 * dist/
 *   index.html
 *   assets/
 *     honeydeck-[hash].js
 *     honeydeck-[hash].css
 *   public/       ← copied from project's public/ (if present)
 * ```
 */

import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { build } from "vite";
import { loadDeck } from "#vite-plugin/deck-loader.ts";
import { honeydeckPlugin } from "#vite-plugin/index.ts";
import { injectHoneydeckAppShellEntry } from "./app-shell-entry.ts";
import { hasHelpFlag } from "./args.ts";
import { formatCommandBanner } from "./banner.ts";
import {
	type DeckPathOptions,
	rejectRootOption,
	resolveDeckPath,
	validateDeckPath,
} from "./deck-path.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/** Absolute path to src/runtime/app-shell/ — owns the packaged app HTML. */
export const APP_SHELL_DIR = resolve(__dirname, "../runtime/app-shell");

/** Absolute path to the packaged app-shell HTML input. */
export const INDEX_HTML_PATH = resolve(APP_SHELL_DIR, "index.html");

// ---------------------------------------------------------------------------
// HTML fix plugin — shared with pdf.ts via the export below
// ---------------------------------------------------------------------------

/**
 * Replaces `__HONEYDECK_APP_SHELL_ENTRY__` in index.html with the Honeydeck
 * package app-shell subpath. Both development and production builds load the
 * app shell through the package entry system, keeping the runtime module graph
 * canonical for context-backed components.
 */
export function buildHtmlPlugin(): Plugin {
	return {
		name: "honeydeck:build-html",
		// `order: 'pre'` ensures this hook runs before Vite's built-in
		// `vite:build-html` plugin tries to resolve the script src as a module.
		transformIndexHtml: {
			order: "pre",
			handler(html: string): string {
				return injectHoneydeckAppShellEntry(html);
			},
		},
	};
}

function buildHtmlOutputPlugin(inputDirName: string): Plugin {
	return {
		name: "honeydeck:build-html-output",
		enforce: "post",
		generateBundle(_options, bundle) {
			const prefix = `${inputDirName}/`;

			for (const asset of Object.values(bundle)) {
				if (asset.type !== "asset") continue;
				if (asset.fileName === `${prefix}index.html`) {
					asset.fileName = "index.html";
				}
			}
		},
	};
}

// ---------------------------------------------------------------------------
// Shared build function (also consumed by pdf.ts)
// ---------------------------------------------------------------------------

export type BuildConfig = {
	/** User project root — where the deck entry, CSS, and components live. */
	userRoot: string;
	/** Entry MDX file path relative to userRoot. */
	entry: string;
	/** Absolute path to the output directory. */
	outDir: string;
	/**
	 * Vite log level.
	 * @default 'warn'  Use 'error' for quiet PDF sub-builds.
	 */
	logLevel?: "silent" | "error" | "warn" | "info";
};

/**
 * Programmatic Vite build for Honeydeck presentations.
 * Called by both `runBuild` (normal build) and `runPdf` (PDF sub-build).
 */
export async function buildPresentation(config: BuildConfig): Promise<void> {
	const { userRoot, entry, outDir, logLevel = "warn" } = config;

	// Only pass publicDir when the project actually has a public/ folder,
	// otherwise Vite logs a harmless-but-noisy "public dir does not exist" warning.
	const publicDir = resolve(userRoot, "public");
	const htmlInputDir = mkdtempSync(join(userRoot, ".honeydeck-build-"));
	const htmlInputPath = join(htmlInputDir, "index.html");
	writeFileSync(htmlInputPath, readFileSync(INDEX_HTML_PATH, "utf-8"));

	try {
		await build({
			// root = userRoot: dependencies, CSS, assets, and local components resolve
			// exactly as they would in an ejected Vite config.
			root: userRoot,
			publicDir: existsSync(publicDir) ? publicDir : false,
			logLevel,

			build: {
				outDir,
				emptyOutDir: true,
				rollupOptions: {
					input: htmlInputPath,
				},
			},

			plugins: [
				// Replace HTML placeholder before Vite bundles the entry script.
				buildHtmlPlugin(),
				buildHtmlOutputPlugin(basename(htmlInputDir)),
				// Virtual slides + MDX compilation + Tailwind — user files via userRoot.
				...honeydeckPlugin({ root: userRoot, entry }),
			],
		});
	} finally {
		rmSync(htmlInputDir, { recursive: true, force: true });
	}
}

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export type BuildOptions = DeckPathOptions;

export function printBuildHelp(): void {
	console.log(`
  ✨ honeydeck build — build for production

  Usage:
    honeydeck build [options]

  Options:
    --deck <file.mdx>  Deck entry file          (default: ./deck.mdx)
    -h, --help         Show this help page

  Examples:
    honeydeck build
    honeydeck build --deck talk.mdx
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

export function parseBuildArgs(args: string[]): BuildOptions {
	let deckPath: string | null = null;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--deck") {
			const value = readOptionValue(args, i, arg);
			validateDeckPath(value, arg);
			deckPath = value;
			i++;
		} else if (arg === "--root") {
			rejectRootOption();
		}
	}

	return resolveDeckPath(deckPath ?? undefined);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runBuild(args: string[]): Promise<void> {
	if (hasHelpFlag(args)) {
		printBuildHelp();
		return;
	}

	const { root, entry, deck } = parseBuildArgs(args);

	// Count slides for the summary line — non-fatal if the deck is unreadable
	// (the Vite build step will surface the real error with full context).
	let slideCount = 0;
	try {
		const { slides } = loadDeck(deck);
		slideCount = slides.length;
	} catch {
		// Non-fatal — Vite build will surface the actual error.
	}

	console.log(`\n${formatCommandBanner()}\n`);
	console.log("  📦 Building presentation…\n");

	const outDir = resolve(root, "dist");

	await buildPresentation({ userRoot: root, entry, outDir });

	console.log("\n  ✅ Build complete!");
	console.log("  📁 Output: dist/");
	if (slideCount > 0) {
		console.log(`  📄 ${slideCount} slide${slideCount !== 1 ? "s" : ""}`);
	}
	console.log();
}
