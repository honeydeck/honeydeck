import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluate } from "@mdx-js/mdx";
import { createElement } from "react";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import type { Pluggable } from "unified";
import { remarkH1Extract } from "../remark/h1-extract.ts";
import { remarkShikiCodeBlocks } from "../remark/shiki-code-blocks.ts";
import { remarkStepNumbering } from "../remark/step-numbering.ts";

const tableMarkdown = [
	"# API",
	"",
	"| Prop | Type |",
	"| --- | --- |",
	"| layout | string |",
].join("\n");

async function renderToHtml(
	source: string,
	remarkPlugins: Pluggable[],
): Promise<string> {
	const { default: Content } = await evaluate(source, {
		...runtime,
		remarkPlugins,
	});

	return renderToStaticMarkup(createElement(Content));
}

function assertRenderedTable(html: string): void {
	assert.match(html, /<table\b/);
	assert.match(html, /<thead\b/);
	assert.match(html, /<tbody\b/);
	assert.match(html, /<th>Prop<\/th>/);
	assert.match(html, /<td>layout<\/td>/);
}

describe("GFM table markdown", () => {
	it("renders tables in the main MDX pipeline", async () => {
		const html = await renderToHtml(tableMarkdown, [
			remarkFrontmatter,
			remarkGfm,
			remarkH1Extract,
			remarkStepNumbering,
			remarkShikiCodeBlocks,
		]);

		assertRenderedTable(html);
	});

	it("renders tables in documentation markdown", async () => {
		const html = await renderToHtml(tableMarkdown, [
			remarkFrontmatter,
			remarkGfm,
			remarkShikiCodeBlocks,
		]);

		assertRenderedTable(html);
	});
});
