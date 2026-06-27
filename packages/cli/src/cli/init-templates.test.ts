import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { compile } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { generateDeckMdx } from "../cli/templates/deck-mdx.ts";
import { generateSparkleButton } from "../cli/templates/sparkle-button.ts";
import { generateStylesCss } from "../cli/templates/styles-css.ts";
import { remarkH1Extract } from "../remark/h1-extract.ts";
import { remarkShikiCodeBlocks } from "../remark/shiki-code-blocks.ts";
import { remarkStepNumbering } from "../remark/step-numbering.ts";
import { splitSlides } from "../vite-plugin/splitter.ts";
import { generatePackageJson } from "./templates/package-json.ts";

const packageJson = JSON.parse(
	readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
) as { version: string };

const starterDeckSource = readFileSync(
	new URL("../cli/templates/starter/deck.mdx", import.meta.url),
	"utf-8",
);

async function compileSlide(source: string): Promise<void> {
	await compile(source, {
		remarkPlugins: [
			remarkFrontmatter,
			remarkGfm,
			remarkH1Extract,
			remarkStepNumbering,
			remarkShikiCodeBlocks,
		],
		jsxImportSource: "react",
		outputFormat: "program",
	});
}

describe("init templates", () => {
	const source = generateDeckMdx("demo-deck");
	const deck = splitSlides(source);

	it("generates the starter deck with the requested project name", () => {
		assert.match(source, /title: demo-deck/);
		assert.match(source, /# demo-deck Deck 🐝/);
		assert.doesNotMatch(source, /Honeydeck Starter/);
	});

	it("documents the default layout, transitions, and theme swap options", () => {
		const styles = generateStylesCss();

		assert.match(source, /transition: fade/);
		assert.match(source, /transitionDuration: 200/);
		assert.match(source, /transitionEasing: ease/);
		assert.match(source, /transition: slide-left/);
		assert.match(source, /transition: none/);
		assert.match(source, /layouts: "@honeydeck\/runtime\/layouts"/);
		assert.match(source, /layouts: "\.\/layouts"/);
		assert.match(source, /layouts: "@honeydeck\/runtime\/layouts\/bee"/);
		assert.match(styles, /@honeydeck\/runtime\/theme\.css/);
		assert.match(styles, /@honeydeck\/runtime\/themes\/bee\.css/);
	});

	it("pins generated projects to the current Honeydeck release line", () => {
		const generatedPackage = JSON.parse(generatePackageJson("demo-deck")) as {
			dependencies: Record<string, string>;
			devDependencies: Record<string, string>;
		};

		assert.equal(
			generatedPackage.dependencies["@honeydeck/runtime"],
			`^${packageJson.version}`,
		);
		assert.equal(
			generatedPackage.devDependencies["@honeydeck/cli"],
			`^${packageJson.version}`,
		);
	});

	it("links the starter deck to the confetti button example", () => {
		const component = generateSparkleButton();

		assert.match(
			source,
			/import \{ SparkleButton \} from '\.\/components\/SparkleButton'/,
		);
		assert.match(component, /export function SparkleButton\(\)/);
		assert.match(component, /Launch confetti/);
	});

	it("closes slide frontmatter before slide content", () => {
		const slidesWithLayout = deck.slides.filter((slide) =>
			slide.rawMdx.includes("layout:"),
		);

		assert.ok(
			slidesWithLayout.length > 0,
			"starter deck should demonstrate layouts",
		);

		for (const slide of slidesWithLayout) {
			const lines = slide.rawMdx.split("\n");
			assert.equal(
				lines[0],
				"---",
				`slide ${slide.index} should start with frontmatter`,
			);
			const closingIndex = lines.indexOf("---", 1);
			assert.ok(
				closingIndex > 1,
				`slide ${slide.index} should close frontmatter`,
			);
			assert.ok(
				lines
					.slice(closingIndex + 1)
					.some((line) => line.startsWith("import ") || line.startsWith("#")),
				`slide ${slide.index} should have content after closed frontmatter`,
			);
		}
	});

	it("does not put raw MDX expressions in speaker notes", () => {
		const notesBlocks = [...source.matchAll(/<Notes>([\s\S]*?)<\/Notes>/g)].map(
			(match) => match[1] ?? "",
		);

		assert.ok(
			notesBlocks.length > 0,
			"starter deck should demonstrate speaker notes",
		);
		for (const notes of notesBlocks) {
			assert.doesNotMatch(notes, /\{1\|3-4\|all\}/);
		}
	});

	it("compiles the generated starter deck through the Honeydeck MDX pipeline", async () => {
		assert.ok(
			deck.slides.length >= 8,
			"starter deck should be educational, not empty",
		);

		for (const slide of deck.slides) {
			await compileSlide(slide.rawMdx);
		}
	});

	it("compiles the starter template deck through the Honeydeck MDX pipeline", async () => {
		const starterDeck = splitSlides(starterDeckSource);

		assert.ok(
			starterDeck.slides.length >= 8,
			"dev:init starter deck should be educational, not empty",
		);

		for (const slide of starterDeck.slides) {
			await compileSlide(slide.rawMdx);
		}
	});
});
