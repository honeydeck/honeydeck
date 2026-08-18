import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
				"import { Reveal } from '@honeydeck/honeydeck'",
			),
		);
		assert.ok(
			result.slides[2]?.rawMdx.includes(
				"import { Reveal } from '@honeydeck/honeydeck'",
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
					"import { Reveal } from '@honeydeck/honeydeck'",
				),
				1,
			);
		}
	});

	it("anchors multi-line relative imports of nested MDX files to their own directory", () => {
		const tempDir = mkdtempSync(resolve(tmpdir(), "deck-loader-"));
		try {
			const entry = resolve(tempDir, "entry.mdx");
			const nestedDir = resolve(tempDir, "slides");
			const nested = resolve(nestedDir, "nested.mdx");
			mkdirSync(nestedDir);

			writeFileSync(
				entry,
				"import Nested from './slides/nested.mdx'\n\n<Nested />\n",
			);
			writeFileSync(
				nested,
				[
					"import {",
					"  MapIcon,",
					"} from './icons'",
					"",
					"# Nested Slide",
					"",
					"<MapIcon />",
					"",
				].join("\n"),
			);

			const nestedResult = loadDeck(entry);
			const expected = [
				"import {",
				"  MapIcon,",
				`} from '/@fs/${resolve(nestedDir, "icons").replace(/\\/g, "/")}'`,
			].join("\n");

			assert.ok(nestedResult.slides[0]?.rawMdx.includes(expected));
		} finally {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("strips HTML comments from root and imported MDX files", () => {
		const tempDir = mkdtempSync(resolve(tmpdir(), "deck-loader-"));
		try {
			const entry = resolve(tempDir, "entry.mdx");
			const nested = resolve(tempDir, "nested.mdx");

			writeFileSync(
				entry,
				[
					"---",
					"title: Commented Deck",
					"---",
					"",
					"import Nested from './nested.mdx'",
					"",
					"<!-- a root note -->",
					"# Root Slide <!-- inline note -->",
					"",
					"<Nested />",
					"",
					"---",
					"",
					"<!--",
					"multi-line note with a --- separator inside",
					"-->",
					"# Last Slide",
					"",
				].join("\n"),
			);
			writeFileSync(nested, "<!-- nested note -->\n# Nested Slide\n");

			const commentedResult = loadDeck(entry);

			assert.equal(commentedResult.slides.length, 3);
			for (const slide of commentedResult.slides) {
				assert.ok(!slide.rawMdx.includes("<!--"));
				assert.ok(!slide.rawMdx.includes("-->"));
			}
			assert.ok(commentedResult.slides[0]?.rawMdx.includes("# Root Slide"));
			assert.ok(commentedResult.slides[1]?.rawMdx.includes("# Nested Slide"));
			assert.ok(commentedResult.slides[2]?.rawMdx.includes("# Last Slide"));
		} finally {
			rmSync(tempDir, { recursive: true, force: true });
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
