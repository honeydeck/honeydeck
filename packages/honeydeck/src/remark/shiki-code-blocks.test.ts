/**
 * Tests for Phase 4 — Shiki code highlighting and step-through.
 *
 * Covers:
 *  - parseStepMeta: various meta string formats
 *  - remarkStepNumbering + remarkShikiCodeBlocks coordination: mixed
 *    Reveal/code steps → correct at/startAt values
 *  - Integration smoke test: compiling a fixture MDX file
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compile } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import { remarkH1Extract } from "../remark/h1-extract.ts";
import {
	parseStepMeta,
	remarkShikiCodeBlocks,
} from "../remark/shiki-code-blocks.ts";
import { remarkStepNumbering } from "../remark/step-numbering.ts";

// ---------------------------------------------------------------------------
// parseStepMeta unit tests
// ---------------------------------------------------------------------------

describe("parseStepMeta", () => {
	it("returns [] for null/undefined", () => {
		assert.deepEqual(parseStepMeta(null), []);
		assert.deepEqual(parseStepMeta(undefined), []);
		assert.deepEqual(parseStepMeta(""), []);
	});

	it("returns [] for meta with no {…} block", () => {
		assert.deepEqual(parseStepMeta("show-line-numbers"), []);
	});

	it("parses a single-group meta as a baseline highlight", () => {
		assert.deepEqual(parseStepMeta("{2}"), [[2]]);
	});

	it("parses two groups", () => {
		assert.deepEqual(parseStepMeta("{2|4}"), [[2], [4]]);
	});

	it("parses ranges", () => {
		assert.deepEqual(parseStepMeta("{1-2|4-5}"), [
			[1, 2],
			[4, 5],
		]);
	});

	it('parses "all" group', () => {
		assert.deepEqual(parseStepMeta("{2|4-5|all}"), [[2], [4, 5], "all"]);
	});

	it("parses mixed comma + range groups", () => {
		assert.deepEqual(parseStepMeta("{1,3|2-4|all}"), [
			[1, 3],
			[2, 3, 4],
			"all",
		]);
	});
});

// ---------------------------------------------------------------------------
// Integration tests: compile MDX with all remark plugins
// ---------------------------------------------------------------------------

const allPlugins = [
	remarkFrontmatter,
	remarkH1Extract,
	remarkStepNumbering,
	remarkShikiCodeBlocks,
] as const;

async function compileMdx(source: string) {
	const vfile = await compile(source, {
		remarkPlugins: [...allPlugins],
		jsxImportSource: "react",
		outputFormat: "program",
	});
	return { js: String(vfile), data: vfile.data };
}

describe("remarkShikiCodeBlocks integration", () => {
	it("replaces a plain code block with a HoneydeckCodeBlock import and props", async () => {
		const { js } = await compileMdx(`
# Hello

\`\`\`typescript
const x = 1;
\`\`\`
    `);
		assert.match(
			js,
			/import \{HoneydeckCodeBlock\} from '@honeydeck\/honeydeck\/components\/code-block'/,
			"compiled output should inject the HoneydeckCodeBlock import",
		);
		assert.match(js, /stepsJson:\s*"\[\]"/);
		assert.match(js, /html:\s*"/);
		assert.match(js, /startAt:\s*0/);
		assert.match(js, /source:\s*"const x = 1;"/);
	});

	it("does NOT inject import when no code blocks are present", async () => {
		const { js } = await compileMdx(`# No code here\n\nJust text.`);
		assert.ok(
			!js.includes("HoneydeckCodeBlock"),
			"should not inject HoneydeckCodeBlock for slides without code",
		);
	});

	it("falls back cleanly for an unknown code language", async () => {
		const { js, data } = await compileMdx(`
\`\`\`not-a-real-language
const x = 1;
\`\`\`
    `);

		assert.equal(data.stepCount, 0);
		assert.match(js, /HoneydeckCodeBlock/);
		assert.match(js, /html:\s*"/);
		assert.match(js, /startAt:\s*0/);
	});

	it("step-through code block starts after earlier steps and adds one timeline step", async () => {
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/honeydeck'

<Reveal>Appears at step 1</Reveal>

\`\`\`typescript {1|3}
const a = 1
const b = 2
const c = 3
\`\`\`
    `);

		assert.equal(data.stepCount, 2, "one Reveal plus one code step");
		assert.match(js, /startAt:\s*2/);
		assert.match(js, /stepsJson:\s*"\[\[1\],\[3\]\]"/);
	});

	it("step-through code nested inside a Reveal starts after the parent reveal", async () => {
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/honeydeck'

<Reveal>
  Parent appears first

  \`\`\`typescript {1|2}
  const a = 1
  const b = 2
  \`\`\`
</Reveal>

<Reveal>After nested code</Reveal>
    `);

		assert.equal(
			data.stepCount,
			3,
			"parent Reveal + nested code step + trailing Reveal",
		);
		assert.match(js, /startAt:\s*2/, "nested code should start at step 2");
		assert.match(
			js,
			/at:\s*3/,
			"trailing Reveal should wait for nested code steps",
		);
	});

	it("plain code block emits startAt=0 and does not affect stepCount", async () => {
		const { js, data } = await compileMdx(`
\`\`\`typescript
const x = 1;
\`\`\`
    `);
		assert.equal(data.stepCount, 0, "plain code block should not add steps");
		assert.match(js, /stepsJson:\s*"\[\]"/);
		assert.match(js, /startAt:\s*0/);
	});

	it("serialises step groups into stepsJson JSON", async () => {
		const { js } = await compileMdx(`
\`\`\`typescript {2|4-5|all}
const a = 1
const b = 2
const c = 3
const d = 4
const e = 5
\`\`\`
    `);

		const match = js.match(/stepsJson:\s*"((?:\\.|[^"\\])*)"/);
		assert.ok(match, "compiled output should contain a stepsJson string");

		const encoded = JSON.parse(`"${match[1]}"`);
		assert.equal(encoded, '[[2],[4,5],"all"]');
		assert.deepEqual(JSON.parse(encoded), [[2], [4, 5], "all"]);
	});

	it("compiles the fixture file without errors", async () => {
		const { readFileSync } = await import("node:fs");
		const { resolve, dirname } = await import("node:path");
		const { fileURLToPath } = await import("node:url");
		const __dirname = dirname(fileURLToPath(import.meta.url));
		const source = readFileSync(
			resolve(__dirname, "fixtures/shiki-code-blocks/basic.mdx"),
			"utf-8",
		);
		const { js, data } = await compileMdx(source);
		assert.ok(
			js.includes("HoneydeckCodeBlock"),
			"fixture should produce HoneydeckCodeBlock",
		);
		// basic.mdx has one step-through block {1|3} → 1 step
		assert.equal(data.stepCount, 1, "fixture step count should be 1");
	});
});
