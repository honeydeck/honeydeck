/**
 * Tests for remarkStepNumbering remark plugin.
 *
 * Strategy: compile MDX snippets with the remark pipeline and assert on
 * - vfile.data.stepCount (total timeline steps)
 * - compiled `at` values in emitted JS (JSX prop injection)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compile } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import { remarkH1Extract } from "../remark/h1-extract.ts";
import { remarkStepNumbering } from "../remark/step-numbering.ts";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function compileMdx(source: string) {
	const vfile = await compile(source, {
		remarkPlugins: [remarkFrontmatter, remarkH1Extract, remarkStepNumbering],
		jsxImportSource: "react",
		outputFormat: "program",
	});
	return { js: String(vfile), data: vfile.data };
}

function collectAtValues(js: string): number[] {
	return [...js.matchAll(/at:\s*(\d+)/g)].map((match) => Number(match[1]));
}

// ---------------------------------------------------------------------------
// <Reveal> numbering
// ---------------------------------------------------------------------------

describe("remarkStepNumbering — <Reveal> elements", () => {
	it("single Reveal gets at={1} and stepCount=1", async () => {
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/honeydeck'

<Reveal>First reveal</Reveal>
    `);

		assert.equal(data.stepCount, 1);
		assert.deepEqual(collectAtValues(js), [1]);
	});

	it("two sequential Reveals get at={1} and at={2}", async () => {
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/honeydeck'

<Reveal>First</Reveal>

<Reveal>Second</Reveal>
    `);

		assert.equal(data.stepCount, 2);
		assert.deepEqual(collectAtValues(js), [1, 2]);
	});

	it("existing at prop on Reveal is left untouched", async () => {
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/honeydeck'

<Reveal at={5}>Pre-numbered</Reveal>
    `);

		assert.equal(
			data.stepCount,
			0,
			"pre-existing at should not advance the counter",
		);
		assert.deepEqual(collectAtValues(js), [5]);
	});

	it("injects span wrapper for inline nested Reveal inside paragraph text", async () => {
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/honeydeck'

<Reveal>
Parent text <Reveal>Nested detail</Reveal>
</Reveal>
    `);

		assert.equal(data.stepCount, 2, "parent + inline nested reveal");
		assert.match(js, /Reveal,[\s\S]*?as:\s*"div"[\s\S]*?at:\s*1/);
		assert.match(js, /Reveal,[\s\S]*?as:\s*"span"[\s\S]*?at:\s*2/);
	});

	it("keeps block nested Reveal as a div wrapper", async () => {
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/honeydeck'

<Reveal>
Parent

<Reveal>
## Nested block
</Reveal>
</Reveal>
    `);

		assert.equal(data.stepCount, 2, "parent + block nested reveal");
		assert.match(js, /Reveal,[\s\S]*?as:\s*"div"[\s\S]*?at:\s*1/);
		assert.match(js, /Reveal,[\s\S]*?as:\s*"div"[\s\S]*?at:\s*2/);
	});

	it("injects span wrapper for manually numbered inline Reveal", async () => {
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/honeydeck'

Text before <Reveal at={5}>manual inline</Reveal> text after.
    `);

		assert.equal(data.stepCount, 0, "manual at remains excluded from counting");
		assert.match(js, /Reveal,[\s\S]*?at:\s*5[\s\S]*?as:\s*"span"/);
	});

	it("plain text MDX produces stepCount=0", async () => {
		const { data } = await compileMdx(`Just some text.`);
		assert.equal(data.stepCount, 0);
	});
});

// ---------------------------------------------------------------------------
// <RevealGroup> numbering
// ---------------------------------------------------------------------------

describe("remarkStepNumbering — <RevealGroup> elements", () => {
	it("RevealGroup with 3 children: at={1} and stepCount=3", async () => {
		const { js, data } = await compileMdx(`
import { RevealGroup } from '@honeydeck/honeydeck'

<RevealGroup>
  <div>Child A</div>
  <div>Child B</div>
  <div>Child C</div>
</RevealGroup>
    `);

		assert.equal(
			data.stepCount,
			3,
			"each child in RevealGroup counts as one step",
		);
		assert.deepEqual(collectAtValues(js), [1]);
	});

	it("RevealGroup with 1 child: at={1} and stepCount=1", async () => {
		const { js, data } = await compileMdx(`
import { RevealGroup } from '@honeydeck/honeydeck'

<RevealGroup>
  <span>Solo</span>
</RevealGroup>
    `);

		assert.equal(data.stepCount, 1);
		assert.deepEqual(collectAtValues(js), [1]);
	});

	it("empty RevealGroup still reserves one step", async () => {
		const { js, data } = await compileMdx(`
import { RevealGroup } from '@honeydeck/honeydeck'

<RevealGroup />
    `);

		assert.equal(data.stepCount, 1);
		assert.deepEqual(collectAtValues(js), [1]);
	});

	it("RevealGroup with a Markdown list counts each list item as one step", async () => {
		const { js, data } = await compileMdx(`
import { RevealGroup } from '@honeydeck/honeydeck'

<RevealGroup>

- Markdown-first
- React-powered
- PDF-ready

</RevealGroup>
    `);

		assert.equal(
			data.stepCount,
			3,
			"each Markdown list item counts as one step",
		);
		assert.deepEqual(collectAtValues(js), [1]);
	});

	it("RevealGroup with a JSX list advances the next Reveal past every list item", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealGroup } from '@honeydeck/honeydeck'

<RevealGroup>
  <ul>
    <li>Markdown-first</li>
    <li>React-powered</li>
    <li>PDF-ready</li>
  </ul>
</RevealGroup>

<Reveal>After list</Reveal>
    `);

		assert.equal(data.stepCount, 4, "list items(3) + Reveal(1) = 4");
		assert.deepEqual(collectAtValues(js), [1, 4]);
	});

	it("RevealGroup advances counter so subsequent Reveal starts after the group", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealGroup } from '@honeydeck/honeydeck'

<RevealGroup>
  <p>First group child</p>
  <p>Second group child</p>
</RevealGroup>

<Reveal>After group</Reveal>
    `);

		assert.equal(data.stepCount, 3, "group(2) + Reveal(1) = 3");
		assert.deepEqual(collectAtValues(js), [1, 3]);
	});

	it("existing at prop on RevealGroup is left untouched", async () => {
		const { js, data } = await compileMdx(`
import { RevealGroup } from '@honeydeck/honeydeck'

<RevealGroup at={10}>
  <div>A</div>
</RevealGroup>
    `);

		assert.equal(
			data.stepCount,
			0,
			"pre-existing at should not advance the counter",
		);
		assert.deepEqual(collectAtValues(js), [10]);
	});
});

// ---------------------------------------------------------------------------
// <TimelineSteps> numbering
// ---------------------------------------------------------------------------

describe("remarkStepNumbering — <TimelineSteps> elements", () => {
	it("TimelineSteps with steps={3} reserves 3 steps and receives at={1}", async () => {
		const { js, data } = await compileMdx(`
import { TimelineSteps } from '@honeydeck/honeydeck'
import { AccordionDemo } from './AccordionDemo'

<TimelineSteps steps={3}>
  <AccordionDemo />
</TimelineSteps>
    `);

		assert.equal(data.stepCount, 3);
		assert.deepEqual(collectAtValues(js), [1]);
	});

	it("TimelineSteps participates in mixed document order", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, TimelineSteps } from '@honeydeck/honeydeck'
import { AccordionDemo } from './AccordionDemo'

<Reveal>Before custom component</Reveal>

<TimelineSteps steps={3}>
  <AccordionDemo />
</TimelineSteps>

<Reveal>After custom component</Reveal>
    `);

		assert.equal(data.stepCount, 5, "Reveal(1) + TimelineSteps(3) + Reveal(1)");
		assert.deepEqual(collectAtValues(js), [1, 2, 5]);
	});

	it("TimelineSteps accepts a literal string steps value", async () => {
		const { js, data } = await compileMdx(`
import { TimelineSteps } from '@honeydeck/honeydeck'
import { AccordionDemo } from './AccordionDemo'

<TimelineSteps steps="2">
  <AccordionDemo />
</TimelineSteps>
    `);

		assert.equal(data.stepCount, 2);
		assert.deepEqual(collectAtValues(js), [1]);
	});

	it("TimelineSteps rejects a missing steps prop", async () => {
		await assert.rejects(
			compileMdx(`
import { TimelineSteps } from '@honeydeck/honeydeck'

<TimelineSteps>
  <div />
</TimelineSteps>
      `),
			/requires a literal positive integer `steps` prop/,
		);
	});

	it("TimelineSteps rejects dynamic steps expressions", async () => {
		await assert.rejects(
			compileMdx(`
import { TimelineSteps } from '@honeydeck/honeydeck'

export const count = 3

<TimelineSteps steps={count}>
  <div />
</TimelineSteps>
      `),
			/steps` must be a literal positive integer/,
		);
	});

	it("TimelineSteps rejects zero and negative step counts", async () => {
		await assert.rejects(
			compileMdx(`
import { TimelineSteps } from '@honeydeck/honeydeck'

<TimelineSteps steps={0}>
  <div />
</TimelineSteps>
      `),
			/steps` must be a literal positive integer/,
		);

		await assert.rejects(
			compileMdx(`
import { TimelineSteps } from '@honeydeck/honeydeck'

<TimelineSteps steps={-1}>
  <div />
</TimelineSteps>
      `),
			/steps` must be a literal positive integer/,
		);
	});

	it("TimelineSteps rejects nested Reveal producers", async () => {
		await assert.rejects(
			compileMdx(`
import { Reveal, TimelineSteps } from '@honeydeck/honeydeck'

<TimelineSteps steps={2}>
  <Reveal>Nested reveal</Reveal>
</TimelineSteps>
      `),
			/cannot contain nested timeline producers \(<Reveal>\)/,
		);
	});

	it("TimelineSteps rejects nested stepped code fences", async () => {
		await assert.rejects(
			compileMdx(`
import { TimelineSteps } from '@honeydeck/honeydeck'

<TimelineSteps steps={2}>

\`\`\`ts {1|2}
const a = 1
const b = 2
\`\`\`

</TimelineSteps>
      `),
			/cannot contain nested timeline producers \(stepped code fence\)/,
		);
	});
});

// ---------------------------------------------------------------------------
// Code fence step counting
// ---------------------------------------------------------------------------

describe("remarkStepNumbering — code fence step groups", () => {
	it("code fence with 3 pipe-separated groups adds 2 steps", async () => {
		const { data } = await compileMdx(`
\`\`\`typescript {2|4|all}
const x = 1;
\`\`\`
    `);

		assert.equal(data.stepCount, 2, "{2|4|all} → 3 groups → 2 steps");
	});

	it("code fence with 2 pipe-separated groups adds 1 step", async () => {
		const { data } = await compileMdx(`
\`\`\`typescript {1|3}
const a = 1;
const b = 2;
const c = 3;
\`\`\`
    `);

		assert.equal(data.stepCount, 1);
	});

	it("code fence with single group {2} adds 0 steps", async () => {
		const { data } = await compileMdx(`
\`\`\`typescript {2}
const a = 1;
const b = 2;
\`\`\`
    `);

		assert.equal(data.stepCount, 0, "{2} is baseline highlight, not a step");
	});

	it("plain code fence (no meta) adds 0 steps", async () => {
		const { data } = await compileMdx(`
\`\`\`typescript
const x = 1;
\`\`\`
    `);

		assert.equal(data.stepCount, 0, "no meta → no steps");
	});

	it("code fence meta without a {…} block adds 0 steps", async () => {
		const { data } = await compileMdx(`
\`\`\`typescript show-line-numbers
const x = 1;
\`\`\`
    `);

		assert.equal(data.stepCount, 0);
	});

	it("Magic Code counts flattened inner fence states", async () => {
		const { data } = await compileMdx(`
\`\`\`\`md magic-code {duration:500}
\`\`\`ts {1|2}
const a = 1
const b = 2
\`\`\`

\`\`\`ts {all}
const sum = a + b
\`\`\`
\`\`\`\`
    `);

		assert.equal(data.stepCount, 2, "3 Magic Code states add 2 steps");
	});

	it("Magic Code duration metadata is not counted as code step metadata", async () => {
		const { data } = await compileMdx(`
\`\`\`\`md magic-code {duration:500}
No inner code fences.
\`\`\`\`
    `);

		assert.equal(data.stepCount, 0);
	});
});

// ---------------------------------------------------------------------------
// Mixed document order
// ---------------------------------------------------------------------------

describe("remarkStepNumbering — mixed document order", () => {
	it("Reveal → code{2 groups} → Reveal: at values respect document order", async () => {
		// Step 1: <Reveal> at=1
		// Step 2: code fence {3|4} second group, counter goes 2→3
		// Step 3: <Reveal> at=3
		// stepCount = 3
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/honeydeck'

<Reveal>First</Reveal>

\`\`\`typescript {3|4}
const x = 1;
const y = 2;
const z = 3;
const w = 4;
\`\`\`

<Reveal>After code</Reveal>
    `);

		assert.equal(
			data.stepCount,
			3,
			"1 Reveal + 1 code step + 1 Reveal = 3 steps",
		);

		assert.deepEqual(collectAtValues(js), [1, 3]);
	});

	it("code first, then Reveals: code steps precede Reveal steps", async () => {
		// Code {1|2} → 1 step (counter at 2)
		// Reveal → at=2, counter at 3
		// stepCount = 2
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/honeydeck'

\`\`\`typescript {1|2}
const a = 1;
const b = 2;
\`\`\`

<Reveal>After code</Reveal>
    `);

		assert.equal(data.stepCount, 2, "1 code step + 1 Reveal = 2 steps");
		assert.deepEqual(collectAtValues(js), [2]);
	});

	it("multiple code fences accumulate steps independently", async () => {
		// Code {1|2} → 1 step, Code {3|4|5} → 2 steps, total = 3
		const { data } = await compileMdx(`
\`\`\`typescript {1|2}
const a = 1;
\`\`\`

\`\`\`typescript {3|4|5}
const b = 2;
\`\`\`
    `);

		assert.equal(data.stepCount, 3, "two code fences: 1 + 2 = 3 steps");
	});

	it("stepCount equals counter-1 across a realistic slide", async () => {
		// Reveal(1) + RevealGroup(2,3) + code{4|5}(4) + Reveal(5) = stepCount 5
		const { data } = await compileMdx(`
import { Reveal, RevealGroup } from '@honeydeck/honeydeck'

<Reveal>Item one</Reveal>

<RevealGroup>
  <p>Group A</p>
  <p>Group B</p>
</RevealGroup>

\`\`\`typescript {4|5}
const x = 1;
\`\`\`

<Reveal>Final item</Reveal>
    `);

		assert.equal(data.stepCount, 5, "realistic slide: 1 + 2 + 1 + 1 = 5 steps");
	});
});

// ---------------------------------------------------------------------------
// Nested timeline flattening
// ---------------------------------------------------------------------------

describe("remarkStepNumbering — nested timeline flattening", () => {
	it("numbers nested Reveals after their parent and before trailing siblings", async () => {
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/honeydeck'

<Reveal>
  Parent
  <Reveal>Nested child</Reveal>
</Reveal>

<Reveal>After nested parent</Reveal>
    `);

		assert.equal(data.stepCount, 3, "parent + nested child + trailing sibling");
		assert.deepEqual(collectAtValues(js), [1, 2, 3]);
	});

	it("counts code steps nested inside a Reveal before the following sibling", async () => {
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/honeydeck'

<Reveal>
  Parent

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
			"parent + one nested code step + trailing sibling",
		);
		assert.deepEqual(collectAtValues(js), [1, 3]);
	});

	it("flattens nested RevealGroup children before the next group target", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealGroup } from '@honeydeck/honeydeck'

<RevealGroup>
  <div>
    Parent group item
    <Reveal>Nested group detail</Reveal>
  </div>
  <div>Sibling group item</div>
</RevealGroup>
    `);

		assert.equal(
			data.stepCount,
			3,
			"group item + nested reveal + sibling item",
		);
		assert.deepEqual(collectAtValues(js), [1, 2]);
	});

	it("flattens nested steps inside RevealGroup list items", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealGroup } from '@honeydeck/honeydeck'

<RevealGroup>
  <ul>
    <li>
      Parent list item
      <Reveal>Nested list detail</Reveal>
    </li>
    <li>Sibling list item</li>
  </ul>
</RevealGroup>
    `);

		assert.equal(
			data.stepCount,
			3,
			"list item + nested reveal + sibling list item",
		);
		assert.deepEqual(collectAtValues(js), [1, 2]);
	});

	it("flattens nested code steps inside RevealGroup children", async () => {
		const { js, data } = await compileMdx(`
import { RevealGroup } from '@honeydeck/honeydeck'

<RevealGroup>
  <div>
    Code group item

    \`\`\`typescript {1|2}
    const a = 1
    const b = 2
    \`\`\`
  </div>
  <div>Sibling group item</div>
</RevealGroup>
    `);

		assert.equal(
			data.stepCount,
			3,
			"group item + one code step + sibling item",
		);
		assert.deepEqual(collectAtValues(js), [1]);
	});
});
