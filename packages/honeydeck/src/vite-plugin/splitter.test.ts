import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { splitSlides } from "../vite-plugin/splitter.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
	readFileSync(resolve(__dirname, "fixtures/splitter", name), "utf-8");

// ---------------------------------------------------------------------------
// basic.mdx — 3 slides, no frontmatter, no imports
// ---------------------------------------------------------------------------
describe("splitSlides — basic.mdx", () => {
	const result = splitSlides(fixture("basic.mdx"));

	it("produces exactly 3 slides", () => {
		assert.equal(result.slides.length, 3);
	});

	it("indexes are 0-based and sequential", () => {
		assert.deepEqual(
			result.slides.map((s) => s.index),
			[0, 1, 2],
		);
	});

	it("keeps each slide heading in order", () => {
		const headings = ["# Slide One", "# Slide Two", "# Slide Three"];

		for (const [index, heading] of headings.entries()) {
			assert.ok(result.slides[index]?.rawMdx.includes(heading));
		}
	});

	it("deck frontmatter is empty", () => {
		assert.deepEqual(result.deckFrontmatter, {});
	});

	it("shared imports are empty", () => {
		assert.equal(result.sharedImports, "");
	});

	it('no slide rawMdx contains the separator "---"', () => {
		for (const slide of result.slides) {
			const lines = slide.rawMdx.split("\n");
			for (const line of lines) {
				assert.notEqual(
					line.trim(),
					"---",
					`Slide ${slide.index} rawMdx contains a separator line`,
				);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// with-separators-crlf.mdx — CRLF slide separators
// ---------------------------------------------------------------------------
describe("splitSlides — with-separators-crlf.mdx", () => {
	const result = splitSlides(fixture("with-separators-crlf.mdx"));

	it("splits slides on CRLF separator lines", () => {
		assert.equal(result.slides.length, 3);
		assert.ok(result.slides[0]?.rawMdx.includes("# Slide One"));
		assert.ok(result.slides[1]?.rawMdx.includes("# Slide Two"));
		assert.ok(result.slides[2]?.rawMdx.includes("# Slide Three"));
	});

	it("keeps deck frontmatter empty when there is none", () => {
		assert.deepEqual(result.deckFrontmatter, {});
	});
});

// ---------------------------------------------------------------------------
// with-frontmatter.mdx — 2 slides, deck frontmatter parsed
// ---------------------------------------------------------------------------
describe("splitSlides — with-frontmatter.mdx", () => {
	const result = splitSlides(fixture("with-frontmatter.mdx"));

	it("produces exactly 2 slides", () => {
		assert.equal(result.slides.length, 2);
	});

	it("extracts title from frontmatter", () => {
		assert.equal(result.deckFrontmatter.title, "My Presentation");
	});

	it("extracts description from frontmatter", () => {
		assert.equal(result.deckFrontmatter.description, "A demo deck");
	});

	it("coerces boolean frontmatter values", () => {
		assert.equal(result.deckFrontmatter.showSlideNumbers, true);
	});

	it("keeps string values as strings", () => {
		assert.equal(result.deckFrontmatter.colorMode, "dark");
	});

	it("extracts Magic Code duration as deck-level frontmatter", () => {
		assert.equal(result.deckFrontmatter.magicCodeDuration, 500);
		assert.ok(
			!result.slides[0]?.rawMdx.includes("magicCodeDuration"),
			"deck-level Magic Code duration should not leak into first slide frontmatter",
		);
	});

	it("frontmatter YAML does not leak into slide content", () => {
		for (const slide of result.slides) {
			assert.ok(
				!slide.rawMdx.includes("title:"),
				`Slide ${slide.index} rawMdx contains frontmatter`,
			);
		}
	});

	it("keeps slide headings in order", () => {
		assert.ok(result.slides[0]?.rawMdx.includes("# First Slide"));
		assert.ok(result.slides[1]?.rawMdx.includes("# Second Slide"));
	});

	it("shared imports are empty", () => {
		assert.equal(result.sharedImports, "");
	});
});

// ---------------------------------------------------------------------------
// with-frontmatter-crlf.mdx — CRLF deck frontmatter
// ---------------------------------------------------------------------------
describe("splitSlides — with-frontmatter-crlf.mdx", () => {
	const result = splitSlides(fixture("with-frontmatter-crlf.mdx"));

	it("parses deck frontmatter from CRLF line endings", () => {
		assert.equal(result.deckFrontmatter.title, "CRLF Frontmatter");
		assert.equal(result.deckFrontmatter.description, "Windows line endings");
		assert.equal(result.deckFrontmatter.showSlideNumbers, true);
	});

	it("splits slides on CRLF separators", () => {
		assert.equal(result.slides.length, 2);
		assert.ok(result.slides[0]?.rawMdx.includes("# First Slide"));
		assert.ok(result.slides[1]?.rawMdx.includes("# Second Slide"));
	});
});

// ---------------------------------------------------------------------------
// with-imports.mdx — 2 slides, shared imports prepended to both
// ---------------------------------------------------------------------------
describe("splitSlides — with-imports.mdx", () => {
	const result = splitSlides(fixture("with-imports.mdx"));

	it("produces exactly 2 slides", () => {
		assert.equal(result.slides.length, 2);
	});

	it("extracts both shared import lines", () => {
		assert.ok(
			result.sharedImports.includes(
				"import { Reveal } from '@honeydeck/honeydeck'",
			),
		);
		assert.ok(
			result.sharedImports.includes(
				"import { SparkleButton } from './components/SparkleButton'",
			),
		);
	});

	it("prepends shared imports to every slide and keeps slide content", () => {
		const expectedImports = [
			"import { Reveal } from '@honeydeck/honeydeck'",
			"import { SparkleButton } from './components/SparkleButton'",
		];
		for (const mdx of result.slides.map((slide) => slide.rawMdx)) {
			for (const imp of expectedImports) {
				assert.ok(mdx.includes(imp));
			}
		}

		assert.ok(result.slides[0]?.rawMdx.includes("# First Slide"));
		assert.ok(
			result.slides[0]?.rawMdx.includes("<Reveal>Revealed content</Reveal>"),
		);
		assert.ok(result.slides[1]?.rawMdx.includes("# Second Slide"));
		assert.ok(result.slides[1]?.rawMdx.includes("<SparkleButton />"));
	});

	it("import lines appear before slide content in rawMdx", () => {
		const mdx = result.slides[0]?.rawMdx;
		const importPos = mdx.indexOf("import { Reveal }");
		const headingPos = mdx.indexOf("# First Slide");
		assert.ok(importPos < headingPos, "imports should precede slide heading");
	});

	it("deck frontmatter has the title", () => {
		assert.equal(result.deckFrontmatter.title, "Import Test");
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("splitSlides — edge cases", () => {
	it("empty string produces 0 slides", () => {
		const result = splitSlides("");
		assert.equal(result.slides.length, 0);
		assert.deepEqual(result.deckFrontmatter, {});
		assert.equal(result.sharedImports, "");
	});

	it("single slide with no separator", () => {
		const result = splitSlides("# Only Slide\n\nJust one.");
		assert.equal(result.slides.length, 1);
		assert.ok(result.slides[0]?.rawMdx.includes("# Only Slide"));
	});

	it("whitespace-only blocks between separators are skipped", () => {
		const source = "# Slide A\n\n---\n\n   \n\n---\n\n# Slide B";
		const result = splitSlides(source);
		assert.equal(result.slides.length, 2);
	});

	it("leaves unmatched opening frontmatter as slide content", () => {
		const source = "---\ntitle: Unclosed\n\n# Slide";
		const result = splitSlides(source);

		assert.equal(result.slides.length, 1);
		assert.deepEqual(result.deckFrontmatter, {});
		assert.ok(result.slides[0]?.rawMdx.includes("title: Unclosed"));
		assert.ok(result.slides[0]?.rawMdx.includes("# Slide"));
	});

	it("keeps separator-looking lines inside fenced code blocks as literal text", () => {
		const source = `# Slide A

\`\`\`md
before
---
after
\`\`\`

---

# Slide B`;
		const result = splitSlides(source);
		assert.equal(result.slides.length, 2);
		assert.match(result.slides[0]?.rawMdx ?? "", /\n---\n/);
		assert.ok(result.slides[0]?.rawMdx.includes("after"));
		assert.ok(result.slides[1]?.rawMdx.includes("# Slide B"));
	});

	it("keeps separator-looking lines inside tilde fenced code blocks", () => {
		const source = `# Slide A

~~~md
---
~~~

---

# Slide B`;
		const result = splitSlides(source);
		assert.equal(result.slides.length, 2);
		assert.match(result.slides[0]?.rawMdx ?? "", /\n---\n/);
	});

	it("numeric frontmatter values are coerced to number", () => {
		const source = "---\ncount: 42\n---\n\n# Slide";
		const result = splitSlides(source);
		assert.equal(result.deckFrontmatter.count, 42);
	});

	it("keeps opening frontmatter in the slide when frontmatterMode is slide", () => {
		const source = "---\ntitle: Not deck frontmatter\n---\n\n# Slide";
		const result = splitSlides(source, { frontmatterMode: "slide" });
		const raw = result.slides[0]?.rawMdx ?? "";

		assert.equal(result.deckFrontmatter.title, undefined);
		assert.equal(result.slides.length, 1);
		assert.ok(raw.startsWith("---"));
		assert.ok(raw.includes("title: Not deck frontmatter"));
		assert.ok(raw.includes("# Slide"));
	});
});

// ---------------------------------------------------------------------------
// with-slide-frontmatter.mdx — per-slide layout frontmatter
// ---------------------------------------------------------------------------
describe("splitSlides — with-slide-frontmatter.mdx", () => {
	const result = splitSlides(fixture("with-slide-frontmatter.mdx"));

	it("produces exactly 4 slides", () => {
		assert.equal(result.slides.length, 4);
	});

	it("slides keep per-slide frontmatter with the right content", () => {
		const cover = result.slides[1]?.rawMdx ?? "";
		const section = result.slides[2]?.rawMdx ?? "";
		const normal = result.slides[3]?.rawMdx ?? "";

		assert.ok(cover.startsWith("---"));
		assert.ok(cover.includes("layout: Cover"));
		assert.ok(cover.includes("author: Honeydeck Team"));
		assert.ok(cover.includes("# Cover Slide"));
		assert.ok(section.includes("layout: Section"));
		assert.ok(!normal.startsWith("---"));
	});

	it("deck frontmatter is extracted correctly", () => {
		assert.equal(result.deckFrontmatter.title, "Demo Deck");
	});
});

describe("splitSlides — shared imports + slide frontmatter ordering", () => {
	const src = `---
deck: true
---

import './styles.css'
import { Reveal } from '@honeydeck/honeydeck'

# First Slide

---
layout: Cover
---

# Cover Slide
`;
	const result = splitSlides(src);

	it("produces 2 slides", () => {
		assert.equal(result.slides.length, 2);
	});

	it("slide 0 has imports before content", () => {
		const raw = result.slides[0]?.rawMdx;
		assert.ok(
			raw.startsWith("import './styles.css'"),
			"imports should come first in a normal slide",
		);
	});

	it("slide 1 keeps frontmatter before imports and body content", () => {
		const raw = result.slides[1]?.rawMdx ?? "";
		const frontmatterPos = raw.indexOf("layout: Cover");
		const importPos = raw.indexOf("import './styles.css'");
		const headingPos = raw.indexOf("# Cover Slide");

		assert.ok(raw.startsWith("---"), "frontmatter block must be first");
		assert.ok(frontmatterPos !== -1, "frontmatter should be present");
		assert.ok(importPos !== -1, "imports should be present");
		assert.ok(headingPos !== -1, "slide body should be present");
		assert.ok(frontmatterPos < importPos, "frontmatter before imports");
		assert.ok(importPos < headingPos, "imports before slide body");
	});
});

describe("splitSlides — first slide layout in opening frontmatter", () => {
	const src = `---
title: Opening Deck
aspectRatio: "16:9"
layout: Cover
author: Honeydeck Team
---

import './styles.css'

# Welcome

---

# Second Slide
`;
	const result = splitSlides(src);

	it("still extracts deck-level frontmatter", () => {
		assert.equal(result.deckFrontmatter.title, "Opening Deck");
		assert.equal(result.deckFrontmatter.layout, "Cover");
	});

	it("applies non-deck opening frontmatter to slide 0", () => {
		const raw = result.slides[0]?.rawMdx;
		assert.ok(
			raw.startsWith("---"),
			"slide 0 should start with YAML frontmatter",
		);
		assert.ok(raw.includes("layout: Cover"));
		assert.ok(raw.includes("author: Honeydeck Team"));
	});

	it("does not copy deck-only settings into slide 0 frontmatter", () => {
		const raw = result.slides[0]?.rawMdx;
		assert.ok(!raw.includes("title: Opening Deck"));
		assert.ok(!raw.includes('aspectRatio: "16:9"'));
	});

	it("keeps shared imports after slide 0 frontmatter", () => {
		const raw = result.slides[0]?.rawMdx;
		assert.ok(raw.indexOf("---") < raw.indexOf("import './styles.css'"));
		assert.ok(raw.indexOf("import './styles.css'") < raw.indexOf("# Welcome"));
	});
});
