import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { KeyedTokensInfo } from "@shikijs/magic-move/core";
import { parseJsonProp } from "./CodeBlockShared.ts";
import {
	applyMagicCodeDimming,
	getActiveCodeStateIndex,
	getMagicCodeTransitionOptions,
	isPdfExportRender,
} from "./MagicCodeBlock.tsx";
import { applyCodeStepDimming } from "./NormalCodeBlock.tsx";

const html = [
	"<pre><code>",
	'<span class="line" data-line="1">one</span>',
	'<span class="line" data-line="2">two</span>',
	'<span class="line" data-line="3">three</span>',
	"</code></pre>",
].join("\n");

const dimStyle = /style="opacity: var\(--honeydeck-code-line-dim-opacity\);"/;

describe("applyCodeStepDimming", () => {
	it("dims only non-baseline lines before the first timeline step", () => {
		const result = applyCodeStepDimming(html, [[2], [3]], 1, 2);

		assert.match(result, /data-line="1" data-dim="1"/);
		assert.match(result, dimStyle);
		assert.match(result, /data-line="2" data-highlight="1">two/);
		assert.match(result, /data-line="3" data-dim="1"/);
	});

	it("dims every non-highlighted line for the active code step", () => {
		const result = applyCodeStepDimming(html, [[2], [3]], 2, 2);

		assert.match(result, /data-line="1" data-dim="1"/);
		assert.match(result, /data-line="2" data-dim="1"/);
		assert.match(result, dimStyle);
		assert.match(result, /data-line="3" data-highlight="1">three/);
	});

	it("keeps the final group active after the last code step", () => {
		const result = applyCodeStepDimming(html, [[2], [3]], 4, 2);

		assert.match(result, /data-line="1" data-dim="1"/);
		assert.match(result, /data-line="2" data-dim="1"/);
		assert.match(result, dimStyle);
		assert.match(result, /data-line="3" data-highlight="1">three/);
	});

	it("clears dimming for all steps", () => {
		const result = applyCodeStepDimming(html, [[2], "all"], 3, 2);

		assert.equal(result.includes('data-dim="1"'), false);
		assert.equal(result.includes('data-highlight="1"'), false);
		assert.equal(result.includes("--honeydeck-code-line-dim-opacity"), false);
	});

	it("preserves existing line styles when adding and clearing dimming", () => {
		const styledHtml =
			'<pre><code><span class="line" data-line="1" style="display: block;">one</span><span class="line" data-line="2">two</span></code></pre>';
		const dimmedHtml = applyCodeStepDimming(styledHtml, [[2], "all"], 1, 2);

		assert.match(
			dimmedHtml,
			/style="display: block; opacity: var\(--honeydeck-code-line-dim-opacity\);" data-dim="1"/,
		);

		const clearedHtml = applyCodeStepDimming(dimmedHtml, [[2], "all"], 2, 2);

		assert.match(clearedHtml, /style="display: block;"/);
		assert.equal(
			clearedHtml.includes("--honeydeck-code-line-dim-opacity"),
			false,
		);
		assert.equal(clearedHtml.includes('data-dim="1"'), false);
		assert.equal(clearedHtml.includes('data-highlight="1"'), false);
	});
});

describe("Magic Code helpers", () => {
	const tokens = {
		code: "one\ntwo",
		tokens: [
			{ content: "one", htmlStyle: {} },
			{ content: "\n", htmlStyle: {} },
			{ content: "two", htmlStyle: {} },
		],
	} as KeyedTokensInfo;

	it("maps timeline steps to Magic Code states", () => {
		assert.equal(getActiveCodeStateIndex(3, 0, 2), 0);
		assert.equal(getActiveCodeStateIndex(3, 1, 2), 0);
		assert.equal(getActiveCodeStateIndex(3, 2, 2), 1);
		assert.equal(getActiveCodeStateIndex(3, 3, 2), 2);
		assert.equal(getActiveCodeStateIndex(3, 99, 2), 2);
	});

	it("dims Magic Code tokens by active line group", () => {
		const result = applyMagicCodeDimming(tokens, [2]);

		assert.equal(
			result.tokens[0]?.htmlStyle?.["--honeydeck-magic-code-token-opacity"],
			"var(--honeydeck-code-line-dim-opacity)",
		);
		assert.equal(
			result.tokens[2]?.htmlStyle?.["--honeydeck-magic-code-token-opacity"],
			"1",
		);
	});

	it("keeps Magic Code movement and container transitions in the same window", () => {
		assert.deepEqual(getMagicCodeTransitionOptions(700, 0.5), {
			duration: 700,
			lineNumbers: false,
			animateContainer: true,
			easing: "ease-in",
			delayMove: 0,
			delayEnter: 0,
			delayLeave: 0,
			delayContainer: 0,
			globalScale: 0.5,
		});
	});

	it("can disable Magic Code container animation for PDF export", () => {
		assert.equal(
			getMagicCodeTransitionOptions(700, 1, false).animateContainer,
			false,
		);
	});

	it("detects PDF export renders from the URL query", () => {
		assert.equal(isPdfExportRender(), false);

		const previousWindow = globalThis.window;
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			value: { location: { search: "?honeydeckPdfRender=step" } },
		});

		try {
			assert.equal(isPdfExportRender(), true);
		} finally {
			Object.defineProperty(globalThis, "window", {
				configurable: true,
				value: previousWindow,
			});
		}
	});

	it("falls back on malformed JSON props", () => {
		assert.deepEqual(parseJsonProp("not json", ["fallback"]), ["fallback"]);
	});
});
