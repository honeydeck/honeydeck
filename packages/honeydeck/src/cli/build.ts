/**
 * `honeydeck build` — build the presentation as a deployable static SPA.
 *
 * ### Architecture
 *
 * Vite root is set to `src/runtime/app-shell/` so that `index.html` lives
 * at the root and Vite outputs it as `dist/index.html`.
 *
 *   Why APP_SHELL_DIR as root?
 *   Vite's default HTML entry resolution uses `<root>/index.html`. By setting
 *   root to the directory that *owns* our shell HTML we get clean output paths
 *   without having to configure `rollupOptions.input` to an unusual path.
 *
 * The `__HONEYDECK_MAIN_ENTRY__` placeholder in index.html is replaced with
 * `./main.tsx` by the `buildHtmlPlugin`. Vite resolves this relative to the
 * HTML file's location (APP_SHELL_DIR), finding `app-shell/main.tsx`. ✓
 *
 * User project files (deck entry, CSS, components) are outside APP_SHELL_DIR
 * but are accessed via absolute paths by `honeydeckPlugin`'s virtual module
 * resolver and resolveId hooks. Rollup (used by Vite during build) has no
 * file-system restrictions — all absolute paths are accessible.
 *
 * `outDir` points to `<userRoot>/dist` (outside the Vite root). Vite 5+
 * allows this when `emptyOutDir: true` is set explicitly.
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

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { build } from "vite";
import { loadDeck } from "#vite-plugin/deck-loader.ts";
import { honeydeckPlugin } from "#vite-plugin/index.ts";
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

/** Absolute path to src/runtime/app-shell/ — used as Vite root for build. */
export const APP_SHELL_DIR = resolve(__dirname, "../runtime/app-shell");

// ---------------------------------------------------------------------------
// HTML fix plugin — shared with pdf.ts via the export below
// ---------------------------------------------------------------------------

/**
 * Replaces `__HONEYDECK_MAIN_ENTRY__` in index.html with `./main.tsx`.
 *
 * During build (root = APP_SHELL_DIR), `./main.tsx` is resolved relative to
 * the HTML file's directory, which is APP_SHELL_DIR — exactly where main.tsx
 * lives. This allows the same index.html template to be used for both the
 * dev server (which injects an `/@fs/` absolute path) and the production
 * build (which uses a normal relative module path).
 */
export function buildHtmlPlugin(): Plugin {
	return {
		name: "honeydeck:build-html",
		// `order: 'pre'` ensures this hook runs before Vite's built-in
		// `vite:build-html` plugin tries to resolve the script src as a module.
		transformIndexHtml: {
			order: "pre",
			handler(html: string): string {
				return html.replace("__HONEYDECK_MAIN_ENTRY__", "./main.tsx");
			},
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

	await build({
		// root = APP_SHELL_DIR: index.html is here, outputs to outDir/index.html.
		root: APP_SHELL_DIR,
		publicDir: existsSync(publicDir) ? publicDir : false,
		logLevel,

		build: {
			outDir,
			// Explicit true so Vite honours it even though outDir is outside the root.
			emptyOutDir: true,
		},

		plugins: [
			// Replace HTML placeholder before Vite bundles the entry script.
			buildHtmlPlugin(),
			// Virtual slides + MDX compilation + Tailwind — user files via userRoot.
			...honeydeckPlugin({ root: userRoot, entry }),
		],
	});
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
