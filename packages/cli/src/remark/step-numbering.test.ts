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
import { Reveal } from '@honeydeck/runtime'

<Reveal>First reveal</Reveal>
    `);

		assert.equal(data.stepCount, 1);
		assert.deepEqual(collectAtValues(js), [1]);
	});

	it("two sequential Reveals get at={1} and at={2}", async () => {
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/runtime'

<Reveal>First</Reveal>

<Reveal>Second</Reveal>
    `);

		assert.equal(data.stepCount, 2);
		assert.deepEqual(collectAtValues(js), [1, 2]);
	});

	it("rejects authored at prop on Reveal", async () => {
		await assert.rejects(
			compileMdx(`
import { Reveal } from '@honeydeck/runtime'

<Reveal at={5}>Pre-numbered</Reveal>
    `),
			/<Reveal> `at` is internal compiler plumbing/,
		);
	});

	it("injects span wrapper for inline nested Reveal inside paragraph text", async () => {
		const { js, data } = await compileMdx(`
import { Reveal } from '@honeydeck/runtime'

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
import { Reveal } from '@honeydeck/runtime'

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

	it("rejects authored at prop on inline Reveal", async () => {
		await assert.rejects(
			compileMdx(`
import { Reveal } from '@honeydeck/runtime'

Text before <Reveal at={5}>inline reveal</Reveal> text after.
    `),
			/<Reveal> `at` is internal compiler plumbing/,
		);
	});

	it("plain text MDX produces stepCount=0", async () => {
		const { data } = await compileMdx(`Just some text.`);
		assert.equal(data.stepCount, 0);
	});
});

// ---------------------------------------------------------------------------
// <RevealWith> resolution
// ---------------------------------------------------------------------------

describe("remarkStepNumbering — <RevealWith> elements", () => {
	it("resolves target references to an earlier named Reveal without adding steps", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealWith } from '@honeydeck/runtime'

<Reveal name="intro">Intro</Reveal>
<RevealWith target="intro">Synced detail</RevealWith>
    `);

		assert.equal(data.stepCount, 1);
		assert.deepEqual(collectAtValues(js), [1, 1]);
		assert.match(js, /RevealWith,[\s\S]*?target:\s*"intro"[\s\S]*?at:\s*1/);
	});

	it("supports forward target references to a later named Reveal", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealWith } from '@honeydeck/runtime'

<RevealWith target="later">Synced detail</RevealWith>
<Reveal name="later">Later reveal</Reveal>
    `);

		assert.equal(data.stepCount, 1);
		assert.deepEqual(collectAtValues(js), [1, 1]);
	});

	it("keeps numeric at targets and does not increment the timeline", async () => {
		const { js, data } = await compileMdx(`
import { RevealGroup, RevealWith, TimelineSteps } from '@honeydeck/runtime'

\`\`\`ts {1|2}
const a = 1
const b = 2
\`\`\`

<RevealGroup>
  <div>Group A</div>
  <div>Group B</div>
</RevealGroup>

<TimelineSteps steps={2}>
  <div />
</TimelineSteps>

<RevealWith at={4}>Custom step sync</RevealWith>
    `);

		assert.equal(data.stepCount, 5);
		assert.deepEqual(collectAtValues(js), [2, 4, 4]);
	});

	it("injects span wrapper for inline RevealWith", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealWith } from '@honeydeck/runtime'

<Reveal name="inline-target">Target</Reveal>
Text before <RevealWith target="inline-target">inline detail</RevealWith> text after.
    `);

		assert.equal(data.stepCount, 1);
		assert.match(
			js,
			/RevealWith,[\s\S]*?target:\s*"inline-target"[\s\S]*?as:\s*"span"[\s\S]*?at:\s*1/,
		);
	});

	it("rejects duplicate Reveal names on the same slide", async () => {
		await assert.rejects(
			compileMdx(`
import { Reveal } from '@honeydeck/runtime'

<Reveal name="dup">First</Reveal>
<Reveal name="dup">Second</Reveal>
      `),
			/duplicated on this slide/,
		);
	});

	it("rejects missing RevealWith targets", async () => {
		await assert.rejects(
			compileMdx(`
import { RevealWith } from '@honeydeck/runtime'

<RevealWith target="missing">No target</RevealWith>
      `),
			/could not find a same-slide <Reveal name="missing">/,
		);
	});

	it("rejects empty and dynamic Reveal names and targets", async () => {
		await assert.rejects(
			compileMdx(`
import { Reveal } from '@honeydeck/runtime'

<Reveal name="">Empty name</Reveal>
      `),
			/<Reveal> `name` must not be empty/,
		);

		await assert.rejects(
			compileMdx(`
import { Reveal } from '@honeydeck/runtime'

export const revealName = 'dynamic';

<Reveal name={revealName}>Dynamic name</Reveal>
      `),
			/<Reveal> `name` must be a literal string/,
		);

		await assert.rejects(
			compileMdx(`
import { RevealWith } from '@honeydeck/runtime'

<RevealWith target="">Empty target</RevealWith>
      `),
			/<RevealWith> `target` must not be empty/,
		);

		await assert.rejects(
			compileMdx(`
import { RevealWith } from '@honeydeck/runtime'

export const target = 'dynamic';

<RevealWith target={target}>Dynamic target</RevealWith>
      `),
			/<RevealWith> `target` must be a literal string/,
		);
	});

	it("rejects invalid RevealWith prop combinations and numeric at values", async () => {
		await assert.rejects(
			compileMdx(`
import { RevealWith } from '@honeydeck/runtime'

<RevealWith>Missing props</RevealWith>
      `),
			/requires exactly one of `target` or `at`/,
		);

		await assert.rejects(
			compileMdx(`
import { RevealWith } from '@honeydeck/runtime'

<RevealWith target="x" at={1}>Both props</RevealWith>
      `),
			/requires exactly one of `target` or `at`/,
		);

		await assert.rejects(
			compileMdx(`
import { RevealWith } from '@honeydeck/runtime'

<RevealWith at={0}>Zero</RevealWith>
      `),
			/`at` must be a literal positive integer/,
		);

		await assert.rejects(
			compileMdx(`
import { RevealWith } from '@honeydeck/runtime'

export const step = 1;

<RevealWith at={step}>Dynamic</RevealWith>
      `),
			/`at` must be a literal positive integer/,
		);

		await assert.rejects(
			compileMdx(`
import { Reveal, RevealWith } from '@honeydeck/runtime'

<Reveal>Only step</Reveal>
<RevealWith at={2}>Out of range</RevealWith>
      `),
			/targets step 2, but this slide only has 1 timeline step/,
		);
	});
});

// ---------------------------------------------------------------------------
// <Fade> / <FadeWith> numbering
// ---------------------------------------------------------------------------

describe("remarkStepNumbering — fade/with elements", () => {
	it("Fade participates in the same timeline as Reveal", async () => {
		const { js, data } = await compileMdx(`
import { Fade, Reveal } from '@honeydeck/runtime'

<Fade>Gone first</Fade>

<Reveal>Then appears</Reveal>
    `);

		assert.equal(data.stepCount, 2);
		assert.deepEqual(collectAtValues(js), [1, 2]);
	});

	it("FadeWith preserves numeric target props without adding timeline steps", async () => {
		const { js, data } = await compileMdx(`
import { FadeWith, Reveal } from '@honeydeck/runtime'

<Reveal>Step one</Reveal>

<FadeWith target={1}>Fades with target</FadeWith>
    `);

		assert.equal(data.stepCount, 1);
		assert.deepEqual(collectAtValues(js), [1]);
		assert.match(js, /target:\s*1/);
	});

	it("injects span wrapper for inline Fade", async () => {
		const { js, data } = await compileMdx(`
import { Fade } from '@honeydeck/runtime'

Text before <Fade>inline fade</Fade> text after.
    `);

		assert.equal(data.stepCount, 1);
		assert.match(js, /Fade,[\s\S]*?as:\s*"span"/);
	});

	it("allows Fade inside Reveal", async () => {
		const { js, data } = await compileMdx(`
import { Fade, Reveal } from '@honeydeck/runtime'

<Reveal>
  Parent appears
  <Fade>Then fades</Fade>
</Reveal>
    `);

		assert.equal(data.stepCount, 2);
		assert.deepEqual(collectAtValues(js), [1, 2]);
	});

	it("rejects nested timeline producers inside Fade", async () => {
		await assert.rejects(
			compileMdx(`
import { Fade, Reveal } from '@honeydeck/runtime'

<Fade>
  <Reveal>Nested reveal</Reveal>
</Fade>
    `),
			/cannot contain nested timeline producers \(<Reveal>\)/,
		);
	});

	it("rejects nested timeline producers inside FadeWith", async () => {
		await assert.rejects(
			compileMdx(`
import { FadeWith, Reveal } from '@honeydeck/runtime'

<Reveal>Step one</Reveal>
<FadeWith target={1}>
  <Reveal>Nested reveal</Reveal>
</FadeWith>
    `),
			/With components do not create timeline steps/,
		);
	});
});

// ---------------------------------------------------------------------------
// <RevealGroup> numbering
// ---------------------------------------------------------------------------

describe("remarkStepNumbering — <RevealGroup> elements", () => {
	it("RevealGroup with 3 children: at={1} and stepCount=3", async () => {
		const { js, data } = await compileMdx(`
import { RevealGroup } from '@honeydeck/runtime'

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
import { RevealGroup } from '@honeydeck/runtime'

<RevealGroup>
  <span>Solo</span>
</RevealGroup>
    `);

		assert.equal(data.stepCount, 1);
		assert.deepEqual(collectAtValues(js), [1]);
	});

	it("empty RevealGroup still reserves one step", async () => {
		const { js, data } = await compileMdx(`
import { RevealGroup } from '@honeydeck/runtime'

<RevealGroup />
    `);

		assert.equal(data.stepCount, 1);
		assert.deepEqual(collectAtValues(js), [1]);
	});

	it("RevealGroup with a Markdown list counts each list item as one step", async () => {
		const { js, data } = await compileMdx(`
import { RevealGroup } from '@honeydeck/runtime'

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
import { Reveal, RevealGroup } from '@honeydeck/runtime'

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

	it("RevealGroup keeps nested Markdown list items grouped by default", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealGroup } from '@honeydeck/runtime'

<RevealGroup>

- Parent
  - Child A
  - Child B
- Sibling

</RevealGroup>

<Reveal>After list</Reveal>
    `);

		assert.equal(data.stepCount, 3, "top-level list items(2) + Reveal(1)");
		assert.deepEqual(collectAtValues(js), [1, 3]);
	});

	it("RevealGroup listRevealMode nested counts nested Markdown list items", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealGroup } from '@honeydeck/runtime'

<RevealGroup listRevealMode="nested">

- Parent
  - Child A
  - Child B
- Sibling

</RevealGroup>

<Reveal>After list</Reveal>
    `);

		assert.equal(data.stepCount, 5, "nested list items(4) + Reveal(1)");
		assert.deepEqual(collectAtValues(js), [1, 5]);
	});

	it("RevealGroup listRevealMode nested counts nested JSX list items", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealGroup } from '@honeydeck/runtime'

<RevealGroup listRevealMode="nested">
  <ul>
    <li>
      Parent
      <ul>
        <li>Child A</li>
        <li>Child B</li>
      </ul>
    </li>
    <li>Sibling</li>
  </ul>
</RevealGroup>

<Reveal>After list</Reveal>
    `);

		assert.equal(data.stepCount, 5, "nested list items(4) + Reveal(1)");
		assert.deepEqual(collectAtValues(js), [1, 5]);
	});

	it("RevealGroup listRevealMode nested counts deeply nested Markdown list items", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealGroup } from '@honeydeck/runtime'

<RevealGroup listRevealMode="nested">

- Parent
  - Child
    - Grandchild
- Sibling

</RevealGroup>

<Reveal>After list</Reveal>
    `);

		assert.equal(data.stepCount, 5, "deep list items(4) + Reveal(1)");
		assert.deepEqual(collectAtValues(js), [1, 5]);
	});

	it("RevealGroup listRevealMode nested counts nested JSX list items through fragments", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealGroup } from '@honeydeck/runtime'

<RevealGroup listRevealMode="nested">
  <ul>
    <li>
      Parent
      <>
        <ul>
          <li>Fragment child</li>
        </ul>
      </>
    </li>
  </ul>
</RevealGroup>

<Reveal>After list</Reveal>
    `);

		assert.equal(data.stepCount, 3, "parent + fragment child + Reveal(1)");
		assert.deepEqual(collectAtValues(js), [1, 3]);
	});

	it("RevealGroup advances counter so subsequent Reveal starts after the group", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealGroup } from '@honeydeck/runtime'

<RevealGroup>
  <p>First group child</p>
  <p>Second group child</p>
</RevealGroup>

<Reveal>After group</Reveal>
    `);

		assert.equal(data.stepCount, 3, "group(2) + Reveal(1) = 3");
		assert.deepEqual(collectAtValues(js), [1, 3]);
	});

	it("rejects authored at prop on RevealGroup", async () => {
		await assert.rejects(
			compileMdx(`
import { RevealGroup } from '@honeydeck/runtime'

<RevealGroup at={10}>
  <div>A</div>
</RevealGroup>
    `),
			/<RevealGroup> `at` is internal compiler plumbing/,
		);
	});
});

// ---------------------------------------------------------------------------
// <FadeGroup> numbering
// ---------------------------------------------------------------------------

describe("remarkStepNumbering — <FadeGroup> elements", () => {
	it("FadeGroup with 3 children: at={1} and stepCount=3", async () => {
		const { js, data } = await compileMdx(`
import { FadeGroup } from '@honeydeck/runtime'

<FadeGroup>
  <div>Child A</div>
  <div>Child B</div>
  <div>Child C</div>
</FadeGroup>
    `);

		assert.equal(data.stepCount, 3);
		assert.deepEqual(collectAtValues(js), [1]);
	});

	it("FadeGroup with a JSX list advances the next Reveal past every list item", async () => {
		const { js, data } = await compileMdx(`
import { FadeGroup, Reveal } from '@honeydeck/runtime'

<FadeGroup>
  <ul>
    <li>Markdown-first</li>
    <li>React-powered</li>
    <li>PDF-ready</li>
  </ul>
</FadeGroup>

<Reveal>After list</Reveal>
    `);

		assert.equal(data.stepCount, 4);
		assert.deepEqual(collectAtValues(js), [1, 4]);
	});

	it("rejects nested timeline producers inside FadeGroup targets", async () => {
		await assert.rejects(
			compileMdx(`
import { FadeGroup, Reveal } from '@honeydeck/runtime'

<FadeGroup>
  <div>
    Parent item
    <Reveal>Nested reveal</Reveal>
  </div>
</FadeGroup>
    `),
			/FadeGroup> targets cannot contain nested timeline producers \(<Reveal>\)/,
		);
	});

	it("rejects non-literal RevealGroup listRevealMode", async () => {
		await assert.rejects(
			compileMdx(`
import { RevealGroup } from '@honeydeck/runtime'

export const mode = "nested"

<RevealGroup listRevealMode={mode}>
  <div>A</div>
</RevealGroup>
    `),
			/listRevealMode.*literal string/,
		);
	});

	it("rejects invalid literal RevealGroup listRevealMode", async () => {
		await assert.rejects(
			compileMdx(`
import { RevealGroup } from '@honeydeck/runtime'

<RevealGroup listRevealMode="nestedd">
  <div>A</div>
</RevealGroup>
    `),
			/listRevealMode.*literal string/,
		);
	});
});

// ---------------------------------------------------------------------------
// <TimelineSteps> numbering
// ---------------------------------------------------------------------------

describe("remarkStepNumbering — <TimelineSteps> elements", () => {
	it("TimelineSteps with steps={3} reserves 3 steps and receives at={1}", async () => {
		const { js, data } = await compileMdx(`
import { TimelineSteps } from '@honeydeck/runtime'
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
import { Reveal, TimelineSteps } from '@honeydeck/runtime'
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
import { TimelineSteps } from '@honeydeck/runtime'
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
import { TimelineSteps } from '@honeydeck/runtime'

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
import { TimelineSteps } from '@honeydeck/runtime'

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
import { TimelineSteps } from '@honeydeck/runtime'

<TimelineSteps steps={0}>
  <div />
</TimelineSteps>
      `),
			/steps` must be a literal positive integer/,
		);

		await assert.rejects(
			compileMdx(`
import { TimelineSteps } from '@honeydeck/runtime'

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
import { Reveal, TimelineSteps } from '@honeydeck/runtime'

<TimelineSteps steps={2}>
  <Reveal>Nested reveal</Reveal>
</TimelineSteps>
      `),
			/cannot contain nested timeline producers \(<Reveal>\)/,
		);
	});

	it("TimelineSteps validates nested RevealWith without adding steps", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealWith, TimelineSteps } from '@honeydeck/runtime'

<Reveal name="outside">Outside reveal</Reveal>

<TimelineSteps steps={2}>
  <RevealWith target="outside">Nested synced reveal</RevealWith>
</TimelineSteps>
      `);

		assert.equal(data.stepCount, 3, "Reveal(1) + TimelineSteps(2)");
		assert.deepEqual(collectAtValues(js), [1, 2, 1]);
	});

	it("TimelineSteps rejects nested stepped code fences", async () => {
		await assert.rejects(
			compileMdx(`
import { TimelineSteps } from '@honeydeck/runtime'

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
import { Reveal } from '@honeydeck/runtime'

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
import { Reveal } from '@honeydeck/runtime'

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
import { Reveal, RevealGroup } from '@honeydeck/runtime'

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
import { Reveal } from '@honeydeck/runtime'

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
import { Reveal } from '@honeydeck/runtime'

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
import { Reveal, RevealGroup } from '@honeydeck/runtime'

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
import { Reveal, RevealGroup } from '@honeydeck/runtime'

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

	it("flattens nested steps inside nested RevealGroup list items", async () => {
		const { js, data } = await compileMdx(`
import { Reveal, RevealGroup } from '@honeydeck/runtime'

<RevealGroup listRevealMode="nested">
  <ul>
    <li>
      Parent list item
      <ul>
        <li>
          Child list item
          <Reveal>Nested child detail</Reveal>
        </li>
      </ul>
    </li>
    <li>Sibling list item</li>
  </ul>
</RevealGroup>

<Reveal>After list</Reveal>
    `);

		assert.equal(
			data.stepCount,
			5,
			"parent item + child item + nested reveal + sibling item + after reveal",
		);
		assert.deepEqual(collectAtValues(js), [1, 3, 5]);
	});

	it("flattens nested code steps inside RevealGroup children", async () => {
		const { js, data } = await compileMdx(`
import { RevealGroup } from '@honeydeck/runtime'

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
