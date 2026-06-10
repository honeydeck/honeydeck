/**
 * Virtual module resolution plugin for Honeydeck.
 *
 * Exposes virtual module families derived from a single `deck.mdx`:
 *
 *   virtual:honeydeck/slide/N.mdx  — standalone MDX source for slide N (0-based)
 *   virtual:honeydeck/slides       — barrel re-export: `export { default as SlideN } from ...`
 *   virtual:honeydeck/config       — deck-level frontmatter exported as a plain JS object
 *   virtual:honeydeck/layouts      — active layout map + discovered demo metadata
 *   virtual:honeydeck/layout-demo/N.mdx — compiled MDX source for layout demo N
 *   virtual:honeydeck/components   — built-in component docs metadata
 *
 * All virtual IDs are prefixed with `\0` (Vite convention) so they are
 * invisible to other plugins that rely on file-system resolution.
 *
 * ### HMR strategy
 * When `deck.mdx` changes, the plugin re-splits the file and compares the
 * new segments against the cached ones. Only modules whose content actually
 * changed are invalidated, enabling per-slide hot-reload instead of a
 * blanket page refresh.
 */

import { existsSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import type { HmrContext, ModuleNode, Plugin, ViteDevServer } from "vite";
import { remarkH1Extract } from "../remark/h1-extract.ts";
import { remarkShikiCodeBlocks } from "../remark/shiki-code-blocks.ts";
import { remarkStepNumbering } from "../remark/step-numbering.ts";
import { crawlComponentDocs } from "./component-doc-crawler.ts";
import { type LoadedDeck, loadDeck } from "./deck-loader.ts";
import {
	crawlLayoutDemos,
	toFsImportSpecifier,
} from "./layout-demo-crawler.ts";

// ---------------------------------------------------------------------------
// Virtual module ID constants
// ---------------------------------------------------------------------------

/** Public import specifier prefix used in user/generated code. */
const VIRTUAL_SLIDE_PREFIX = "virtual:honeydeck/slide/";
const VIRTUAL_SLIDES_ID = "virtual:honeydeck/slides";
const VIRTUAL_CONFIG_ID = "virtual:honeydeck/config";
const VIRTUAL_LAYOUTS_ID = "virtual:honeydeck/layouts";
const VIRTUAL_LAYOUT_DEMO_PREFIX = "virtual:honeydeck/layout-demo/";
const VIRTUAL_COMPONENTS_ID = "virtual:honeydeck/components";
const VIRTUAL_COMPONENT_DOC_PREFIX = "virtual:honeydeck/component-doc/";

/** Resolved (internal) IDs — \0 prefix prevents accidental file-system hits. */
const RESOLVED_SLIDE_PREFIX = "\0virtual:honeydeck/slide/";
const RESOLVED_SLIDES_ID = "\0virtual:honeydeck/slides";
const RESOLVED_CONFIG_ID = "\0virtual:honeydeck/config";
const RESOLVED_LAYOUTS_ID = "\0virtual:honeydeck/layouts";
const RESOLVED_LAYOUT_DEMO_PREFIX = "\0virtual:honeydeck/layout-demo/";
const RESOLVED_COMPONENTS_ID = "\0virtual:honeydeck/components";
const RESOLVED_COMPONENT_DOC_PREFIX = "\0virtual:honeydeck/component-doc/";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type VirtualModulesOptions = {
	/** Absolute path to the entry deck MDX file (e.g. `/project/deck.mdx`). */
	entryPath: string;
};

type LayoutDemoSource = {
	layoutName: string;
	modulePath: string;
	source: string;
};

const EXTENSIONLESS_IMPORT_EXTENSIONS = [
	".tsx",
	".ts",
	".jsx",
	".js",
	".mdx",
	".md",
	".css",
];

export function resolveRelativeImport(baseDir: string, id: string): string {
	const absolute = resolve(baseDir, id);

	if (extname(absolute)) return absolute;

	if (existsSync(absolute) && statSync(absolute).isFile()) {
		return absolute;
	}

	for (const extension of EXTENSIONLESS_IMPORT_EXTENSIONS) {
		const candidate = `${absolute}${extension}`;
		if (existsSync(candidate) && statSync(candidate).isFile()) {
			return candidate;
		}
	}

	for (const extension of EXTENSIONLESS_IMPORT_EXTENSIONS) {
		const candidate = join(absolute, `index${extension}`);
		if (existsSync(candidate) && statSync(candidate).isFile()) {
			return candidate;
		}
	}

	return absolute;
}

export function virtualModulesPlugin(options: VirtualModulesOptions): Plugin {
	const { entryPath } = options;
	const entryFileName = basename(entryPath);

	/** In-memory cache of the last split result. `null` until first read. */
	let splitResult: LoadedDeck | null = null;
	let devServer: ViteDevServer | null = null;
	const watchedMdxFiles = new Set<string>();
	const watchedLayoutFiles = new Set<string>();
	const watchedComponentFiles = new Set<string>();
	let layoutDemoSources: LayoutDemoSource[] = [];
	const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

	// ── Helpers ──────────────────────────────────────────────────────────────

	/** Read `entryPath` and split it. Populates / replaces `splitResult`. */
	function loadAndSplit(): LoadedDeck {
		const result = loadDeck(entryPath);
		watchedMdxFiles.clear();
		for (const file of result.watchedFiles) {
			watchedMdxFiles.add(file);
			devServer?.watcher.add(file);
		}
		return result;
	}

	/**
	 * Return the cached split result, loading it on first call.
	 * Lazy to avoid race conditions between `buildStart` and `configureServer`
	 * across different Vite lifecycle orderings.
	 */
	function getResult(): LoadedDeck {
		if (!splitResult) {
			splitResult = loadAndSplit();
		}
		return splitResult;
	}

	// ── Plugin definition ────────────────────────────────────────────────────

	return {
		name: "honeydeck:virtual-modules",

		// Make sure Vite's chokidar watcher covers the entry file even when it is
		// not imported as a real module (it may live outside the default watch
		// directories in non-standard project layouts).
		configureServer(server) {
			devServer = server;
			server.watcher.add(entryPath);
			for (const file of getResult().watchedFiles) {
				server.watcher.add(file);
			}
		},

		// ── resolveId ───────────────────────────────────────────────────────────

		resolveId(id, importer) {
			// Resolve relative imports from virtual slide modules against the entry
			// file's directory. Without this, './styles.css' inside a compiled virtual
			// slide has no filesystem anchor and Vite throws a resolution error.
			if (
				importer?.startsWith(RESOLVED_SLIDE_PREFIX) &&
				(id.startsWith("./") || id.startsWith("../"))
			) {
				return resolveRelativeImport(dirname(entryPath), id);
			}

			if (
				importer === RESOLVED_LAYOUTS_ID &&
				(id.startsWith("./") || id.startsWith("../"))
			) {
				return resolveRelativeImport(dirname(entryPath), id);
			}

			if (
				importer?.startsWith(RESOLVED_LAYOUT_DEMO_PREFIX) &&
				(id.startsWith("./") || id.startsWith("../"))
			) {
				const suffix = importer.slice(RESOLVED_LAYOUT_DEMO_PREFIX.length);
				const index = parseInt(suffix.replace(".mdx", ""), 10);
				const demo = layoutDemoSources[index];
				if (demo) return resolveRelativeImport(dirname(demo.modulePath), id);
			}

			if (id === VIRTUAL_SLIDES_ID) return RESOLVED_SLIDES_ID;
			if (id === VIRTUAL_CONFIG_ID) return RESOLVED_CONFIG_ID;
			if (id === VIRTUAL_LAYOUTS_ID) return RESOLVED_LAYOUTS_ID;
			if (id === VIRTUAL_COMPONENTS_ID) return RESOLVED_COMPONENTS_ID;
			// Matches `virtual:honeydeck/slide/0.mdx`, `virtual:honeydeck/slide/1.mdx`, …
			if (id.startsWith(VIRTUAL_SLIDE_PREFIX)) return `\0${id}`;
			if (id.startsWith(VIRTUAL_LAYOUT_DEMO_PREFIX)) return `\0${id}`;
			if (id.startsWith(VIRTUAL_COMPONENT_DOC_PREFIX)) return `\0${id}`;
			return null;
		},

		// ── load ────────────────────────────────────────────────────────────────

		async load(id) {
			// ── virtual:honeydeck/config ─────────────────────────────────────────────
			if (id === RESOLVED_CONFIG_ID) {
				const { deckFrontmatter } = getResult();
				return [
					`export const config = ${JSON.stringify(deckFrontmatter, null, 2)};`,
					`export default config;`,
				].join("\n");
			}

			// ── virtual:honeydeck/layouts ────────────────────────────────────────────
			if (id === RESOLVED_LAYOUTS_ID) {
				const { deckFrontmatter } = getResult();
				const layoutSpecifier =
					typeof deckFrontmatter.layouts === "string"
						? deckFrontmatter.layouts
						: "";
				const crawl = crawlLayoutDemos({
					entryPath,
					packageRoot,
					layoutSpecifier,
				});
				const runtimeSpecifier =
					layoutSpecifier.trim().startsWith(".") && crawl.mapPath
						? toFsImportSpecifier(crawl.mapPath)
						: layoutSpecifier.trim() || "@honeydeck/honeydeck/layouts";

				watchedLayoutFiles.clear();
				for (const file of crawl.watchedFiles) {
					watchedLayoutFiles.add(file);
					this.addWatchFile(file);
				}

				const importLines: string[] = [
					`import layoutMap from ${JSON.stringify(runtimeSpecifier)};`,
				];
				const demoEntries: string[] = [];
				const propDocEntries: string[] = [];
				layoutDemoSources = [];

				crawl.demos.forEach((demo, index) => {
					propDocEntries.push(
						`${JSON.stringify(demo.layoutName)}: ${JSON.stringify(demo.propDocs)}`,
					);

					const mdx = demo.demoMetadata?.mdx;
					if (typeof mdx !== "string" || mdx.length === 0) {
						if (demo.demoMetadata?.dynamicMdx) {
							crawl.warnings.push(
								`Layout "${demo.layoutName}" demo.mdx is dynamic; live demo rendering skipped.`,
							);
						}
						return;
					}

					const demoIndex =
						layoutDemoSources.push({
							layoutName: demo.layoutName,
							modulePath: demo.modulePath,
							source: mdx,
						}) - 1;
					const moduleId = `${VIRTUAL_LAYOUT_DEMO_PREFIX}${demoIndex}.mdx`;
					const componentName = `LayoutDemo${index}`;
					importLines.push(
						`import ${componentName}, { stepCount as stepCount${index}, slideTitle as slideTitle${index}, slideFrontmatter as slideFrontmatter${index}, slideLayout as slideLayout${index} } from ${JSON.stringify(moduleId)};`,
					);
					demoEntries.push(
						`${JSON.stringify(demo.layoutName)}: { mdx: ${JSON.stringify(mdx)}, Component: ${componentName}, stepCount: stepCount${index}, title: slideTitle${index}, frontmatter: slideFrontmatter${index}, layoutName: slideLayout${index} }`,
					);
				});

				return [
					...importLines,
					`export { layoutMap };`,
					`export const layoutNames = Object.keys(layoutMap);`,
					`export const layoutDemos = { ${demoEntries.join(", ")} };`,
					`export const layoutPropDocs = { ${propDocEntries.join(", ")} };`,
					`export const layoutDemoWarnings = ${JSON.stringify(crawl.warnings)};`,
					`export default layoutMap;`,
				].join("\n");
			}

			// ── virtual:honeydeck/components ────────────────────────────────────────
			if (id === RESOLVED_COMPONENTS_ID) {
				const crawl = crawlComponentDocs({ packageRoot });

				watchedComponentFiles.clear();
				for (const file of crawl.watchedFiles) {
					watchedComponentFiles.add(file);
					this.addWatchFile(file);
				}

				const componentBarrelPath = resolve(
					packageRoot,
					"src/runtime/components/index.ts",
				);
				const importLines: string[] = [
					`import * as componentMap from ${JSON.stringify(toFsImportSpecifier(componentBarrelPath))};`,
				];
				const names = crawl.docs.map((doc) => doc.componentName);
				const docEntries: string[] = [];

				crawl.docs.forEach((doc, index) => {
					const localName = `ComponentDoc${index}`;
					const moduleId = `${VIRTUAL_COMPONENT_DOC_PREFIX}${encodeURIComponent(doc.componentName)}.mdx`;
					importLines.push(
						`import ${localName} from ${JSON.stringify(moduleId)};`,
					);
					docEntries.push(
						`${JSON.stringify(doc.componentName)}: { Component: ${localName}, markdown: ${JSON.stringify(doc.markdown)}, props: ${JSON.stringify(doc.props)} }`,
					);
				});

				return [
					...importLines,
					`export { componentMap };`,
					`export const componentNames = ${JSON.stringify(names)};`,
					`export const componentDocs = { ${docEntries.join(", ")} };`,
					`export const componentDocWarnings = ${JSON.stringify(crawl.warnings)};`,
					`export default componentMap;`,
				].join("\n");
			}

			// ── virtual:honeydeck/slides ─────────────────────────────────────────────
			if (id === RESOLVED_SLIDES_ID) {
				const { slides } = getResult();
				if (slides.length === 0)
					return "export const slideCount = 0;\nexport {};";

				const lines: string[] = slides.map(
					(s) =>
						`export { default as Slide${s.index}, stepCount as stepCount${s.index}, slideTitle as slideTitle${s.index}, slideFrontmatter as slideFrontmatter${s.index}, slideLayout as slideLayout${s.index} } from '${VIRTUAL_SLIDE_PREFIX}${s.index}.mdx';`,
				);
				lines.push(`export const slideCount = ${slides.length};`);
				return lines.join("\n");
			}

			// ── virtual:honeydeck/slide/N.mdx ────────────────────────────────────────
			if (id.startsWith(RESOLVED_SLIDE_PREFIX)) {
				// e.g. '\0virtual:honeydeck/slide/2.mdx' → index 2
				const suffix = id.slice(RESOLVED_SLIDE_PREFIX.length); // '2.mdx'
				const index = parseInt(suffix.replace(".mdx", ""), 10);
				const { slides } = getResult();
				const slide = slides[index];

				if (!slide) {
					this.error(
						`Honeydeck: slide ${index} not found — deck has ${slides.length} slide(s). ` +
							`Did you delete a slide separator in ${entryFileName}?`,
					);
				}

				// Compile MDX → JS here so @mdx-js/rollup's transform is bypassed.
				// createFilter() from @rollup/pluginutils excludes \0-prefixed virtual
				// IDs by default, so the rollup plugin would never transform these.
				const vfile = await compile(slide.rawMdx, {
					remarkPlugins: [
						remarkFrontmatter,
						remarkGfm,
						remarkH1Extract,
						remarkStepNumbering,
						remarkShikiCodeBlocks,
					],
					jsxImportSource: "react",
					outputFormat: "program",
				});

				// Append slide metadata as named exports so the Deck runtime can
				// read title, frontmatter, layout name, and step count without an
				// extra dynamic import.
				const stepCount: number =
					(vfile.data.stepCount as number | undefined) ?? 0;
				const title: string = (vfile.data.title as string | undefined) ?? "";
				const frontmatter: Record<string, unknown> =
					(vfile.data.frontmatter as Record<string, unknown> | undefined) ?? {};
				const layout: string = (frontmatter.layout as string | undefined) ?? "";

				const js =
					String(vfile) +
					`\nexport const stepCount = ${stepCount};` +
					`\nexport const slideTitle = ${JSON.stringify(title)};` +
					`\nexport const slideFrontmatter = ${JSON.stringify(frontmatter)};` +
					`\nexport const slideLayout = ${JSON.stringify(layout)};\n`;

				return js;
			}

			// ── virtual:honeydeck/layout-demo/N.mdx ─────────────────────────────────
			if (id.startsWith(RESOLVED_LAYOUT_DEMO_PREFIX)) {
				const suffix = id.slice(RESOLVED_LAYOUT_DEMO_PREFIX.length);
				const index = parseInt(suffix.replace(".mdx", ""), 10);
				const demo = layoutDemoSources[index];

				if (!demo) {
					this.error(`Honeydeck: layout demo ${index} not found.`);
				}

				const vfile = await compile(demo.source, {
					remarkPlugins: [
						remarkFrontmatter,
						remarkGfm,
						remarkH1Extract,
						remarkStepNumbering,
						remarkShikiCodeBlocks,
					],
					jsxImportSource: "react",
					outputFormat: "program",
				});

				const stepCount: number =
					(vfile.data.stepCount as number | undefined) ?? 0;
				const title: string = (vfile.data.title as string | undefined) ?? "";
				const frontmatter: Record<string, unknown> =
					(vfile.data.frontmatter as Record<string, unknown> | undefined) ?? {};
				const layout: string = (frontmatter.layout as string | undefined) ?? "";

				return (
					String(vfile) +
					`\nexport const stepCount = ${stepCount};` +
					`\nexport const slideTitle = ${JSON.stringify(title)};` +
					`\nexport const slideFrontmatter = ${JSON.stringify(frontmatter)};` +
					`\nexport const slideLayout = ${JSON.stringify(layout)};\n`
				);
			}

			// ── virtual:honeydeck/component-doc/ComponentName.mdx ───────────────────
			if (id.startsWith(RESOLVED_COMPONENT_DOC_PREFIX)) {
				const suffix = id.slice(RESOLVED_COMPONENT_DOC_PREFIX.length);
				const componentName = decodeURIComponent(suffix.replace(".mdx", ""));
				const doc = crawlComponentDocs({ packageRoot }).docs.find(
					(doc) => doc.componentName === componentName,
				);

				if (!doc) {
					this.error(
						`Honeydeck: component documentation page for "${componentName}" not found.`,
					);
				}

				const vfile = await compile(doc.markdown, {
					remarkPlugins: [remarkFrontmatter, remarkGfm, remarkShikiCodeBlocks],
					jsxImportSource: "react",
					outputFormat: "program",
				});

				return String(vfile);
			}

			return null;
		},

		// ── handleHotUpdate ─────────────────────────────────────────────────────

		/**
		 * Called by Vite whenever a watched file changes.
		 *
		 * Strategy:
		 *  1. Ignore changes to files we don't own.
		 *  2. Re-split the entry file.
		 *  3. Diff previous vs next segments; invalidate only changed virtual modules.
		 *  4. Return the affected `ModuleNode` list so Vite can propagate HMR.
		 *     If no modules were in the graph yet (first edit before any page
		 *     load), return `undefined` and let Vite do a full reload.
		 */
		handleHotUpdate(ctx: HmrContext): ModuleNode[] | undefined {
			if (
				ctx.file !== entryPath &&
				!watchedMdxFiles.has(ctx.file) &&
				!watchedLayoutFiles.has(ctx.file) &&
				!watchedComponentFiles.has(ctx.file)
			)
				return; // not our file

			if (watchedLayoutFiles.has(ctx.file)) {
				const affected: ModuleNode[] = [];
				const invalidate = (resolvedId: string): void => {
					const mod = ctx.server.moduleGraph.getModuleById(resolvedId);
					if (mod) {
						ctx.server.moduleGraph.invalidateModule(mod);
						affected.push(mod);
					}
				};

				for (let i = 0; i < layoutDemoSources.length; i++) {
					invalidate(`${RESOLVED_LAYOUT_DEMO_PREFIX}${i}.mdx`);
				}
				const mod = ctx.server.moduleGraph.getModuleById(RESOLVED_LAYOUTS_ID);
				if (mod) {
					ctx.server.moduleGraph.invalidateModule(mod);
					affected.push(mod);
				}
				return affected.length > 0 ? affected : undefined;
			}

			if (watchedComponentFiles.has(ctx.file)) {
				const affected: ModuleNode[] = [...ctx.modules];
				const invalidate = (resolvedId: string): void => {
					const mod = ctx.server.moduleGraph.getModuleById(resolvedId);
					if (mod) {
						ctx.server.moduleGraph.invalidateModule(mod);
						affected.push(mod);
					}
				};

				invalidate(RESOLVED_COMPONENTS_ID);
				crawlComponentDocs({ packageRoot }).docs.forEach((doc) => {
					invalidate(
						`${RESOLVED_COMPONENT_DOC_PREFIX}${encodeURIComponent(doc.componentName)}.mdx`,
					);
				});

				if (affected.length > 0) {
					return affected;
				}
				return undefined;
			}

			const oldResult = getResult();
			const newResult = loadAndSplit();
			splitResult = newResult; // commit new cache

			const affected: ModuleNode[] = [];

			/** Invalidate a virtual module by its resolved ID, if it's in the graph. */
			const invalidate = (resolvedId: string): void => {
				const mod = ctx.server.moduleGraph.getModuleById(resolvedId);
				if (mod) {
					ctx.server.moduleGraph.invalidateModule(mod);
					affected.push(mod);
				}
			};

			// Config changed?
			if (
				JSON.stringify(oldResult.deckFrontmatter) !==
				JSON.stringify(newResult.deckFrontmatter)
			) {
				invalidate(RESOLVED_CONFIG_ID);
				invalidate(RESOLVED_LAYOUTS_ID);
				for (let i = 0; i < layoutDemoSources.length; i++) {
					invalidate(`${RESOLVED_LAYOUT_DEMO_PREFIX}${i}.mdx`);
				}
			}

			// Per-slide diff — invalidate only slides that changed or were added/removed.
			const maxLen = Math.max(oldResult.slides.length, newResult.slides.length);
			for (let i = 0; i < maxLen; i++) {
				const oldSlide = oldResult.slides[i];
				const newSlide = newResult.slides[i];
				if (!oldSlide || !newSlide || oldSlide.rawMdx !== newSlide.rawMdx) {
					invalidate(`${RESOLVED_SLIDE_PREFIX}${i}.mdx`);
				}
			}

			// Slide count changed? → barrel module is stale.
			if (oldResult.slides.length !== newResult.slides.length) {
				invalidate(RESOLVED_SLIDES_ID);
			}

			// Return affected modules for HMR propagation.
			// An empty array would tell Vite "handled, nothing to update" (suppress
			// reload), so we return `undefined` in that case to let it decide.
			return affected.length > 0 ? affected : undefined;
		},
	};
}

// Re-export IDs as constants so other parts of the plugin suite can import them
// without duplicating the magic strings.
export const VIRTUAL_IDS = {
	SLIDE_PREFIX: VIRTUAL_SLIDE_PREFIX,
	SLIDES: VIRTUAL_SLIDES_ID,
	CONFIG: VIRTUAL_CONFIG_ID,
	LAYOUTS: VIRTUAL_LAYOUTS_ID,
	LAYOUT_DEMO_PREFIX: VIRTUAL_LAYOUT_DEMO_PREFIX,
	COMPONENTS: VIRTUAL_COMPONENTS_ID,
	COMPONENT_DOC_PREFIX: VIRTUAL_COMPONENT_DOC_PREFIX,
} as const;
