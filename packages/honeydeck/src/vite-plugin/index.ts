/**
 * Main Honeydeck Vite plugin.
 *
 * Composes three plugin layers into a single `Plugin[]` array:
 *
 *  1. `honeydeck:virtual-modules`  — splits `deck.mdx`, serves virtual MDX modules,
 *                               handles per-slide HMR invalidation.
 *  2. `@mdx-js/rollup`        — compiles `.mdx` files (real and virtual) to
 *                               React JSX via the `transform` hook.
 *  3. `@tailwindcss/vite`     — Tailwind CSS v4 (CSS-first, no config file).
 *
 * ### Plugin ordering rationale
 * Vite applies `resolveId`/`load` hooks in plugin order until the first
 * non-null result. Because our virtual modules plugin handles `resolveId` and
 * `load` for virtual IDs, it must come first. The `transform` hook runs for
 * ALL plugins in order, so `@mdx-js/rollup` naturally sees the raw MDX source
 * returned by our `load` hook and compiles it to JSX.
 *
 * ### Virtual `.mdx` compilation
 * `@mdx-js/rollup` filters by file extension. The resolved virtual ID
 * `\0virtual:honeydeck/slide/N.mdx` ends in `.mdx`, so `path.extname()` returns
 * `.mdx` and the filter passes — no special configuration needed.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import type { Plugin, PluginOption } from "vite";
import { DEFAULT_DECK_ENTRY } from "../defaults.ts";
import { remarkH1Extract } from "../remark/h1-extract.ts";
import { remarkShikiCodeBlocks } from "../remark/shiki-code-blocks.ts";
import { remarkStepNumbering } from "../remark/step-numbering.ts";
import { tokenManifestPlugin } from "./token-manifest.ts";
import { virtualModulesPlugin } from "./virtual-modules.ts";

// ESM-safe equivalent of __dirname
const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HoneydeckPluginOptions = {
	/**
	 * Project root directory. All relative paths (entry, assets, components)
	 * are resolved against this.
	 *
	 * @default process.cwd()
	 */
	root?: string;

	/**
	 * Entry MDX file path, relative to `root`.
	 *
	 * @default 'deck.mdx'
	 */
	entry?: string;
};

// ---------------------------------------------------------------------------
// Tailwind source injection
// ---------------------------------------------------------------------------

const TAILWIND_IMPORT_RE =
	/@import\s+(?:url\()?['"]tailwindcss(?:\/[^'"]*)?['"]\)?\s*;/;
const HONEYDECK_TAILWIND_SOURCE_MARKER = "/* honeydeck:tailwind-user-source */";

function cssString(value: string): string {
	return JSON.stringify(value.replace(/\\/g, "/"));
}

export function injectTailwindUserSource(
	css: string,
	userRoot: string,
): string {
	if (!TAILWIND_IMPORT_RE.test(css)) return css;
	if (css.includes(HONEYDECK_TAILWIND_SOURCE_MARKER)) return css;

	return `${HONEYDECK_TAILWIND_SOURCE_MARKER}\n@source ${cssString(userRoot)};\n${css}`;
}

function tailwindUserSourcePlugin(userRoot: string): Plugin {
	return {
		name: "honeydeck:tailwind-user-source",
		enforce: "pre",
		transform(code, id) {
			const path = id.split("?", 1)[0] ?? id;
			if (!path.endsWith(".css")) return null;

			const nextCode = injectTailwindUserSource(code, userRoot);
			if (nextCode === code) return null;
			return { code: nextCode, map: null };
		},
	};
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Returns the ordered Vite plugin array for Honeydeck.
 *
 * Pass this to Vite's `plugins` array in your programmatic config:
 *
 * ```ts
 * import { createServer } from 'vite';
 * import { honeydeckPlugin } from '#vite-plugin/index.ts';
 *
 * const server = await createServer({
 *   plugins: honeydeckPlugin({ root: 'deck-project' }),
 * });
 * ```
 */
export function honeydeckPlugin(
	options: HoneydeckPluginOptions = {},
): PluginOption[] {
	const root = resolve(options.root ?? process.cwd());
	const entry = options.entry ?? DEFAULT_DECK_ENTRY;
	const entryPath = resolve(root, entry);

	return [
		// ── Layer 0: package aliases ───────────────────────────────────────
		//
		// Maps the bare `honeydeck` specifier (used in user deck.mdx) to the
		// local runtime components, so Vite can resolve it without a published
		// package on npm.
		{
			name: "honeydeck:aliases",
			config() {
				return {
					resolve: {
						// Use an array so more-specific subpath entries are matched before
						// the bare 'honeydeck' entry (Vite processes array aliases in order).
						alias: [
							{
								find: "@honeydeck/honeydeck/app-shell",
								replacement: resolve(
									__dirname,
									"../runtime/app-shell/main.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/components/code-block/normal",
								replacement: resolve(
									__dirname,
									"../runtime/components/NormalCodeBlock.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/components/code-block/magic",
								replacement: resolve(
									__dirname,
									"../runtime/components/MagicCodeBlock.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/components/code-block",
								replacement: resolve(
									__dirname,
									"../runtime/components/CodeBlock.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/layouts/ColorModeImage",
								replacement: resolve(
									__dirname,
									"../layouts/ColorModeImage.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/layouts/bee/Blank",
								replacement: resolve(__dirname, "../layouts/bee/Blank.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/bee/Default",
								replacement: resolve(__dirname, "../layouts/bee/Default.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/bee/Cover",
								replacement: resolve(__dirname, "../layouts/bee/Cover.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/bee/Section",
								replacement: resolve(__dirname, "../layouts/bee/Section.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/bee/TwoCol",
								replacement: resolve(__dirname, "../layouts/bee/TwoCol.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/bee/ImageLeft",
								replacement: resolve(__dirname, "../layouts/bee/ImageLeft.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/bee/ImageRight",
								replacement: resolve(
									__dirname,
									"../layouts/bee/ImageRight.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/layouts/bee/Image",
								replacement: resolve(
									__dirname,
									"../layouts/bee/Image/Image.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/layouts/bee",
								replacement: resolve(__dirname, "../layouts/bee/index.ts"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/clean/Blank",
								replacement: resolve(__dirname, "../layouts/clean/Blank.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/clean/Default",
								replacement: resolve(__dirname, "../layouts/clean/Default.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/clean/Cover",
								replacement: resolve(__dirname, "../layouts/clean/Cover.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/clean/Section",
								replacement: resolve(__dirname, "../layouts/clean/Section.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/clean/TwoCol",
								replacement: resolve(__dirname, "../layouts/clean/TwoCol.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/clean/ImageLeft",
								replacement: resolve(
									__dirname,
									"../layouts/clean/ImageLeft.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/layouts/clean/ImageRight",
								replacement: resolve(
									__dirname,
									"../layouts/clean/ImageRight.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/layouts/clean/Image",
								replacement: resolve(
									__dirname,
									"../layouts/clean/Image/Image.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/layouts/clean",
								replacement: resolve(__dirname, "../layouts/clean/index.ts"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/Blank",
								replacement: resolve(__dirname, "../layouts/clean/Blank.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/Default",
								replacement: resolve(__dirname, "../layouts/clean/Default.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/placeholders",
								replacement: resolve(__dirname, "../layouts/placeholders.ts"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/Cover",
								replacement: resolve(__dirname, "../layouts/clean/Cover.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/Section",
								replacement: resolve(__dirname, "../layouts/clean/Section.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/TwoCol",
								replacement: resolve(__dirname, "../layouts/clean/TwoCol.tsx"),
							},
							{
								find: "@honeydeck/honeydeck/layouts/ImageLeft",
								replacement: resolve(
									__dirname,
									"../layouts/clean/ImageLeft.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/layouts/ImageRight",
								replacement: resolve(
									__dirname,
									"../layouts/clean/ImageRight.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/layouts/Image",
								replacement: resolve(
									__dirname,
									"../layouts/clean/Image/Image.tsx",
								),
							},
							{
								find: "@honeydeck/honeydeck/layouts",
								replacement: resolve(__dirname, "../layouts/index.ts"),
							},
							{
								find: "@honeydeck/honeydeck/types",
								replacement: resolve(__dirname, "../runtime/types.ts"),
							},
							{
								find: "@honeydeck/honeydeck/theme.css",
								replacement: resolve(__dirname, "../theme/base.css"),
							},
							{
								find: "@honeydeck/honeydeck/themes/base.css",
								replacement: resolve(__dirname, "../theme/base.css"),
							},
							{
								find: "@honeydeck/honeydeck/themes/clean.css",
								replacement: resolve(__dirname, "../theme/clean.css"),
							},
							{
								find: "@honeydeck/honeydeck/themes/bee.css",
								replacement: resolve(__dirname, "../theme/bee.css"),
							},
							{
								find: "@honeydeck/honeydeck/components",
								replacement: resolve(
									__dirname,
									"../runtime/components/index.ts",
								),
							},
							{
								find: "@honeydeck/honeydeck",
								replacement: resolve(__dirname, "../runtime/index.ts"),
							},
						],
					},
				};
			},
		} satisfies Plugin,

		// ── Layer 1a: Tailwind source injection ────────────────────────────────
		//
		// `honeydeck build` / `honeydeck pdf` use the package app-shell as Vite root, so
		// Tailwind's default scanner would otherwise miss project-local MDX/TSX
		// files. Add an explicit @source to every user Tailwind entry stylesheet.
		tailwindUserSourcePlugin(root),

		// ── Layer 1b: token manifest ────────────────────────────────────────────
		//
		// Parses src/theme/base.css → virtual:honeydeck/token-manifest (used by DocsView).
		tokenManifestPlugin(),

		// ── Layer 1c: virtual slide modules ─────────────────────────────────────
		//
		// Handles resolveId + load for all `virtual:honeydeck/*` IDs.
		// Must come before @mdx-js/rollup so our load hook runs first and
		// returns raw MDX source for virtual slides.
		virtualModulesPlugin({ entryPath }),

		// ── Layer 2: MDX compilation ─────────────────────────────────────────
		//
		// Transforms `.mdx` source (real files and virtual modules) to React JSX.
		// `remarkFrontmatter` strips YAML frontmatter blocks so they don't
		// appear as raw text in the rendered output.
		mdx({
			// remarkFrontmatter strips YAML front-matter blocks so they don't
			// appear as raw text in the rendered output.
			// remarkStepNumbering assigns timeline metadata to built-in MDX
			// timeline components and records vfile.data.stepCount for each slide.
			remarkPlugins: [
				remarkFrontmatter,
				remarkGfm,
				remarkH1Extract,
				remarkStepNumbering,
				remarkShikiCodeBlocks,
			],
			// Be explicit about the JSX runtime so the output is consistent
			// regardless of tsconfig.json `jsxImportSource` settings.
			jsxImportSource: "react",
		}) as Plugin,

		// ── Layer 3: Tailwind CSS v4 ─────────────────────────────────────────
		//
		// @tailwindcss/vite returns an array of plugins (scan, generate:serve,
		// generate:build). Spread them in to preserve their relative ordering.
		...(tailwindcss() as Plugin[]),
	];
}
