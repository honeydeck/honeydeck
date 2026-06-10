import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCodeStepDimming } from "../../runtime/components/CodeBlock.tsx";

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
		assert.match(result, /data-line="2">two/);
		assert.match(result, /data-line="3" data-dim="1"/);
	});

	it("dims every non-highlighted line for the active code step", () => {
		const result = applyCodeStepDimming(html, [[2], [3]], 2, 2);

		assert.match(result, /data-line="1" data-dim="1"/);
		assert.match(result, /data-line="2" data-dim="1"/);
		assert.match(result, dimStyle);
		assert.match(result, /data-line="3">three/);
	});

	it("keeps the final group active after the last code step", () => {
		const result = applyCodeStepDimming(html, [[2], [3]], 4, 2);

		assert.match(result, /data-line="1" data-dim="1"/);
		assert.match(result, /data-line="2" data-dim="1"/);
		assert.match(result, dimStyle);
		assert.match(result, /data-line="3">three/);
	});

	it("clears dimming for all steps", () => {
		const result = applyCodeStepDimming(html, [[2], "all"], 3, 2);

		assert.equal(result.includes('data-dim="1"'), false);
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
	});
});
