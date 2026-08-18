/**
 * Vite cache directory helpers for `honeydeck dev --force`.
 *
 * Vite stores pre-bundled dependencies in its cache directory. When that
 * directory holds chunks from more than one optimizer generation, the browser
 * fails with errors such as
 * `The requested module '/node_modules/.vite/deps/react_jsx-runtime.js?v=...'
 * doesn't provide an export named: 't'`.
 *
 * Deleting the directory is the reliable recovery, so the CLI needs to resolve
 * the same path Vite uses by default.
 */

import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Resolve Vite's default cache directory for a project root.
 *
 * Vite places the cache in `node_modules/.vite` next to the nearest
 * `package.json` at or above the root, and falls back to `<root>/.vite` when no
 * `package.json` exists.
 */
export function resolveViteCacheDir(root: string): string {
	const rootPath = resolve(root);
	let dir = rootPath;

	while (true) {
		if (existsSync(join(dir, "package.json"))) {
			return join(dir, "node_modules", ".vite");
		}

		const parent = dirname(dir);
		if (parent === dir) return join(rootPath, ".vite");
		dir = parent;
	}
}

/**
 * Delete Vite's cache directory for `root`.
 *
 * Returns the removed directory, or `null` when there was nothing to remove.
 */
export function clearViteCacheDir(root: string): string | null {
	const cacheDir = resolveViteCacheDir(root);
	if (!existsSync(cacheDir)) return null;

	rmSync(cacheDir, { recursive: true, force: true });
	return cacheDir;
}
