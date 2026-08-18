/**
 * Tests for remarkH1Extract remark plugin.
 *
 * Strategy: compile MDX snippets with the remark pipeline and assert on
 * - vfile.data.title      (extracted h1 text, or '' if none)
 * - vfile.data.frontmatter (parsed YAML, or undefined if none)
 * - presence / absence of extracted heading text in compiled output
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compile } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { remarkH1Extract } from "../remark/h1-extract.ts";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function compileMdx(source: string) {
	const vfile = await compile(source, {
		remarkPlugins: [remarkFrontmatter, remarkGfm, remarkH1Extract],
		jsxImportSource: "react",
		outputFormat: "program",
	});
	return { js: String(vfile), data: vfile.data };
}

// ---------------------------------------------------------------------------
// H1 extraction — basic
// ---------------------------------------------------------------------------

describe("remarkH1Extract — h1 extraction", () => {
	it("extracts the first h1 text into vfile.data.title", async () => {
		const { data } = await compileMdx(`# Hello World\n\nSome paragraph.`);
		assert.equal(data.title, "Hello World");
	});

	it("removes the h1 text from the compiled output", async () => {
		const { js } = await compileMdx(`# My Slide Title\n\nBody text.`);

		assert.ok(
			!js.includes("My Slide Title"),
			"h1 text should not be rendered in the compiled output",
		);
	});

	it("h2 and below are NOT extracted (they stay in the output)", async () => {
		const { js, data } = await compileMdx(
			`## Section Heading\n\n### Sub-heading\n\nText.`,
		);

		assert.equal(data.title, "");
		assert.ok(js.includes("Section Heading"), "h2 text should remain");
		assert.ok(js.includes("Sub-heading"), "h3 text should remain");
	});

	it('slide with no h1 gets title=""', async () => {
		const { data } = await compileMdx(`Just a paragraph. No heading.`);
		assert.equal(data.title, "");
	});

	it('slide with only whitespace/empty lines gets title=""', async () => {
		const { data } = await compileMdx(`\n\n   \n\n`);
		assert.equal(data.title, "");
	});
});

// ---------------------------------------------------------------------------
// H1 extraction — content after h1 is preserved
// ---------------------------------------------------------------------------

describe("remarkH1Extract — content after h1 is preserved", () => {
	it("body paragraphs after h1 remain in compiled output", async () => {
		const { js } = await compileMdx(`# Title\n\nThis paragraph stays.`);

		assert.ok(
			js.includes("This paragraph stays"),
			"body paragraph should still be in compiled output",
		);
	});

	it("h2 after h1 remains in compiled output", async () => {
		const { js } = await compileMdx(`# Title\n\n## Sub-section\n\nContent.`);

		assert.ok(js.includes("Sub-section"), "h2 text should remain");
	});

	it("only the first h1 is extracted; a second h1 remains rendered", async () => {
		const { js, data } = await compileMdx(
			`# First Heading\n\n# Second Heading\n\nText.`,
		);

		assert.equal(data.title, "First Heading", "title = first h1 text");
		assert.ok(!js.includes("First Heading"), "first h1 should be removed");
		assert.ok(js.includes("Second Heading"), "second h1 should remain");
	});

	it("h1 text with inline emphasis is extracted as plain text", async () => {
		const { data } = await compileMdx(`# **Bold** and _italic_\n\nContent.`);

		// mdast-util-to-string strips markdown syntax → plain text
		assert.equal(data.title, "Bold and italic");
	});
});

// ---------------------------------------------------------------------------
// Frontmatter extraction
// ---------------------------------------------------------------------------

describe("remarkH1Extract — frontmatter extraction", () => {
	it("extracts a flat YAML block into vfile.data.frontmatter", async () => {
		const { data } = await compileMdx(`---
layout: Cover
---

# My Slide
    `);

		const fm = data.frontmatter as Record<string, unknown>;
		assert.equal(fm.layout, "Cover");
	});

	it("coerces boolean YAML values", async () => {
		const { data } = await compileMdx(`---
showNumbers: true
hidden: false
---

# Slide
    `);

		const fm = data.frontmatter as Record<string, unknown>;
		assert.strictEqual(fm.showNumbers, true);
		assert.strictEqual(fm.hidden, false);
	});

	it("coerces numeric YAML values", async () => {
		const { data } = await compileMdx(`---
order: 42
ratio: 1.5
---

# Slide
    `);

		const fm = data.frontmatter as Record<string, unknown>;
		assert.strictEqual(fm.order, 42);
		assert.strictEqual(fm.ratio, 1.5);
	});

	it("keeps string YAML values as strings", async () => {
		const { data } = await compileMdx(`---
author: Jane Doe
mode: dark
---

# Slide
    `);

		const fm = data.frontmatter as Record<string, unknown>;
		assert.equal(fm.author, "Jane Doe");
		assert.equal(fm.mode, "dark");
	});

	it("multiple frontmatter keys all parsed", async () => {
		const { data } = await compileMdx(`---
layout: TwoCol
title: My Talk
count: 7
published: true
---

# Slide
    `);

		const fm = data.frontmatter as Record<string, unknown>;
		assert.equal(fm.layout, "TwoCol");
		assert.equal(fm.title, "My Talk");
		assert.strictEqual(fm.count, 7);
		assert.strictEqual(fm.published, true);
	});

	it("does not set frontmatter when YAML is absent", async () => {
		const { data } = await compileMdx(`# No frontmatter here`);

		assert.equal(data.frontmatter, undefined);
	});

	it("frontmatter and h1 both work together on the same slide", async () => {
		const { data } = await compileMdx(`---
layout: Section
---

# Section Title

Body text.
    `);

		assert.equal(data.title, "Section Title");
		const fm = data.frontmatter as Record<string, unknown>;
		assert.equal(fm.layout, "Section");
	});
});

// ---------------------------------------------------------------------------
// Rich title preservation
// ---------------------------------------------------------------------------

describe("remarkH1Extract — rich title preservation", () => {
	it("serializes inline Markdown emphasis into titleMdx", async () => {
		const { data } = await compileMdx(`# **Bold** and _italic_\n\nBody.`);

		assert.equal(
			data.titleMdx,
			'<span className="flex items-center gap-4">**Bold** and *italic*</span>',
			"titleMdx preserves inline Markdown emphasis",
		);
	});

	it("serializes inline code into titleMdx", async () => {
		const { data } = await compileMdx(`# Use \`npm install\`\n\nBody.`);

		assert.ok(
			(data.titleMdx as string).includes("`npm install`"),
			"titleMdx preserves inline code",
		);
	});

	it("serializes custom JSX components into titleMdx", async () => {
		const { data } = await compileMdx(
			`import SparkleButton from './SparkleButton'\n\n# Hello <SparkleButton /> world\n\nBody.`,
		);

		assert.equal(
			data.titleMdx,
			'<span className="flex items-center gap-4">Hello <SparkleButton /> world</span>',
			"titleMdx preserves custom JSX components",
		);
		assert.deepEqual(data.titleImports, [
			"import SparkleButton from './SparkleButton'",
		]);
	});

	it("does not include export declarations in titleImports", async () => {
		const { data } = await compileMdx(
			`import SparkleButton from './SparkleButton'\n\nexport const meta = { version: 1 }\n\n# Hello <SparkleButton />\n\nBody.`,
		);

		assert.deepEqual(data.titleImports, [
			"import SparkleButton from './SparkleButton'",
		]);
	});

	it("does not set titleMdx or titleImports when there is no h1", async () => {
		const { data } = await compileMdx(`Just body content.`);

		assert.equal(data.titleMdx, undefined);
		assert.equal(data.titleImports, undefined);
	});

	it("does not set titleMdx for an empty h1", async () => {
		const { data } = await compileMdx(`# \n\nBody.`);

		assert.equal(data.titleMdx, undefined);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("remarkH1Extract — edge cases", () => {
	it("h1 at end of document is still extracted", async () => {
		const { data } = await compileMdx(`Some preamble text.\n\n# Late Title`);

		assert.equal(data.title, "Late Title");
	});
});
