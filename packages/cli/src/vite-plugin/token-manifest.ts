/**
 * Token Manifest Vite plugin for Honeydeck.
 *
 * Parses `src/theme/base.css` for `--honeydeck-*` CSS custom property declarations
 * and their preceding single-line `/* ... *\/` comments (descriptions).
 *
 * Exposes the result as a virtual module:
 *
 *   import { tokens } from 'virtual:honeydeck/token-manifest'
 *
 * Shape:
 *   export const tokens: TokenManifestEntry[]
 *
 * where `TokenManifestEntry = { name: string; description: string; defaultValue: string }`.
 *
 * ### Parsing rules
 * - Tokens are extracted from anywhere in the file (`:root`, `[data-honeydeck-color-mode=...]`, `@theme`, etc.)
 * - If the same token name appears multiple times the **first** occurrence wins (light mode
 *   declaration takes precedence over dark mode in the manifest).
 * - A description is the text of the nearest single-line comment (`/* ... *\/`) on the
 *   line immediately above the declaration, ignoring blank lines.
 */

import { readFileSync } from "node:fs";
import type { HmrContext, ModuleNode, Plugin } from "vite";
import { runtimeThemeBaseCssPath } from "./runtime-package.ts";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/** Absolute path to the base CSS theme file. */
const BASE_CSS_PATH = runtimeThemeBaseCssPath();

// ---------------------------------------------------------------------------
// Virtual module IDs
// ---------------------------------------------------------------------------

const VIRTUAL_ID = "virtual:honeydeck/token-manifest";
const RESOLVED_ID = "\0virtual:honeydeck/token-manifest";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TokenManifestEntry = {
	/** CSS custom property name, e.g. `--honeydeck-primary` */
	name: string;
	/** Description sourced from the preceding comment, or `""` */
	description: string;
	/** Raw default value from the CSS declaration, e.g. `oklch(50% 0.2 250)` */
	defaultValue: string;
};

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Extract all `--honeydeck-*` token entries from a CSS string.
 *
 * @param css - Raw CSS text (e.g. contents of base.css)
 * @returns Array of token entries in document order (first occurrence wins for duplicates).
 */
export function extractTokens(css: string): TokenManifestEntry[] {
	const tokens: TokenManifestEntry[] = [];
	const seen = new Set<string>();
	const lines = css.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]?.trim();

		// Match a CSS custom property declaration:
		//   --honeydeck-something: <value>;
		// Allow optional trailing inline comment.
		const propMatch = line.match(
			/^(--honeydeck-[\w-]+)\s*:\s*(.+?)\s*(?:;.*)?$/,
		);
		if (!propMatch) continue;

		const [, name, value] = propMatch;
		if (!name || !value) continue;
		const rawValue = value
			.replace(/;.*$/, "") // strip trailing semicolon + any trailing comment
			.trim();

		// First occurrence of this token name wins.
		if (seen.has(name)) continue;
		seen.add(name);

		// Look backward (up to 3 lines) for the nearest preceding comment.
		// Stop if we hit a blank line or another property declaration first.
		let description = "";
		for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
			const prev = lines[j]?.trim();
			if (prev === "") continue; // skip blank lines
			if (prev.startsWith("--") || prev.startsWith("}") || prev.startsWith("{"))
				break;

			// Single-line /* ... */ comment
			const commentMatch = prev.match(/^\/\*\s*(.*?)\s*\*\/\s*$/);
			if (commentMatch) {
				description = commentMatch[1]?.trim();
				break;
			}
			// If it's code (not a comment), stop.
			break;
		}

		tokens.push({ name, description, defaultValue: rawValue });
	}

	return tokens;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Vite plugin that exposes `virtual:honeydeck/token-manifest`.
 * Watches `src/theme/base.css` and invalidates the module on change.
 */
export function tokenManifestPlugin(): Plugin {
	return {
		name: "honeydeck:token-manifest",

		resolveId(id: string) {
			if (id === VIRTUAL_ID) return RESOLVED_ID;
			return null;
		},

		load(id: string) {
			if (id !== RESOLVED_ID) return null;

			const css = readFileSync(BASE_CSS_PATH, "utf-8");
			const tokens = extractTokens(css);

			return [
				`export const tokens = ${JSON.stringify(tokens, null, 2)};`,
				`export default tokens;`,
			].join("\n");
		},

		// Ensure the CSS file is watched in dev mode.
		configureServer(server) {
			server.watcher.add(BASE_CSS_PATH);
		},

		// Invalidate the virtual module when base.css changes.
		handleHotUpdate(ctx: HmrContext): ModuleNode[] | undefined {
			if (ctx.file !== BASE_CSS_PATH) return;
			const mod = ctx.server.moduleGraph.getModuleById(RESOLVED_ID);
			if (mod) {
				ctx.server.moduleGraph.invalidateModule(mod);
				return [mod];
			}
		},
	};
}
