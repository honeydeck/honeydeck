import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { loadDeck } from "../vite-plugin/deck-loader.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
	resolve(__dirname, "fixtures/deck-loader", name);

function countOccurrences(value: string, needle: string): number {
	return value.split(needle).length - 1;
}

describe("loadDeck", () => {
	const result = loadDeck(fixture("deck.mdx"));

	it("expands slides from imported MDX files at the component location", () => {
		assert.equal(result.slides.length, 4);
		assert.ok(result.slides[0]?.rawMdx.includes("# Root Slide"));
		assert.ok(result.slides[1]?.rawMdx.includes("# Imported Slide One"));
		assert.ok(result.slides[2]?.rawMdx.includes("# Imported Slide Two"));
		assert.ok(result.slides[3]?.rawMdx.includes("# Final Root Slide"));
	});

	it("keeps imported file frontmatter as slide-level metadata", () => {
		assert.ok(result.slides[1]?.rawMdx.startsWith("---"));
		assert.ok(result.slides[1]?.rawMdx.includes("layout: Section"));
		assert.equal(result.deckFrontmatter.title, "Multi-file Deck");
	});

	it("prepends shared imports from root and imported files to expanded slides", () => {
		assert.ok(result.slides[1]?.rawMdx.includes("import './styles.css'"));
		assert.ok(
			result.slides[1]?.rawMdx.includes(
				"import { Reveal } from '@honeydeck/runtime'",
			),
		);
		assert.ok(
			result.slides[2]?.rawMdx.includes(
				"import { Reveal } from '@honeydeck/runtime'",
			),
		);
	});

	it("tracks the root and imported MDX files for rebuilds", () => {
		assert.ok(result.watchedFiles.includes(fixture("deck.mdx")));
		assert.ok(result.watchedFiles.includes(fixture("extra.mdx")));
	});

	it("does not duplicate imported shared imports when the root only renders an imported deck", () => {
		const importOnlyResult = loadDeck(fixture("import-only-root.mdx"));

		assert.equal(importOnlyResult.slides.length, 2);
		for (const slide of importOnlyResult.slides) {
			assert.equal(
				countOccurrences(
					slide.rawMdx,
					"import { Reveal } from '@honeydeck/runtime'",
				),
				1,
			);
		}
	});

	it("fails on circular MDX imports", () => {
		const tempDir = mkdtempSync(resolve(tmpdir(), "deck-loader-"));
		try {
			const entry = resolve(tempDir, "entry.mdx");
			const other = resolve(tempDir, "other.mdx");

			writeFileSync(entry, "import Other from './other.mdx'\n\n<Other />\n");
			writeFileSync(other, "import Entry from './entry.mdx'\n\n<Entry />\n");

			assert.throws(() => loadDeck(entry), /circular MDX import detected/);
		} finally {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("fails when an imported MDX file is missing", () => {
		const tempDir = mkdtempSync(resolve(tmpdir(), "deck-loader-"));
		try {
			const entry = resolve(tempDir, "entry.mdx");

			writeFileSync(
				entry,
				"import Missing from './missing.mdx'\n\n<Missing />\n",
			);

			assert.throws(() => loadDeck(entry), { code: "ENOENT" });
		} finally {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});
});
