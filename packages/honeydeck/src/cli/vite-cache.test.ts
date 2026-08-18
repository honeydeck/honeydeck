import assert from "node:assert/strict";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { clearViteCacheDir, resolveViteCacheDir } from "./vite-cache.ts";

function withTempDir(run: (dir: string) => void): void {
	const dir = mkdtempSync(join(tmpdir(), "honeydeck-vite-cache-"));
	try {
		run(dir);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

describe("resolveViteCacheDir", () => {
	it("resolves node_modules/.vite next to the nearest package.json", () => {
		withTempDir((dir) => {
			writeFileSync(join(dir, "package.json"), "{}", "utf-8");
			const deckDir = join(dir, "decks", "talk");
			mkdirSync(deckDir, { recursive: true });

			assert.equal(
				resolveViteCacheDir(deckDir),
				join(dir, "node_modules", ".vite"),
			);
		});
	});
});

describe("clearViteCacheDir", () => {
	it("removes an existing cache directory and reports its path", () => {
		withTempDir((dir) => {
			writeFileSync(join(dir, "package.json"), "{}", "utf-8");
			const cacheDir = join(dir, "node_modules", ".vite", "deps");
			mkdirSync(cacheDir, { recursive: true });
			writeFileSync(join(cacheDir, "react.js"), "// stale", "utf-8");

			assert.equal(clearViteCacheDir(dir), join(dir, "node_modules", ".vite"));
			assert.equal(existsSync(join(dir, "node_modules", ".vite")), false);
		});
	});

	it("reports null when there is nothing to clear", () => {
		withTempDir((dir) => {
			writeFileSync(join(dir, "package.json"), "{}", "utf-8");
			assert.equal(clearViteCacheDir(dir), null);
		});
	});
});
