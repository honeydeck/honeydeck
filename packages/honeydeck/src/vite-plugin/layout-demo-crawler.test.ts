import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { crawlLayoutDemos } from "../vite-plugin/layout-demo-crawler.ts";

function createTempRoot(prefix: string): string {
	return mkdtempSync(join(tmpdir(), prefix));
}

function writeCleanLayoutFixtures(packageRoot: string): void {
	mkdirSync(join(packageRoot, "src", "layouts", "clean", "Image"), {
		recursive: true,
	});
	writeFileSync(
		join(packageRoot, "src", "layouts", "clean", "index.ts"),
		`
import BlankLayout from './Blank'
import DefaultLayout from './Default'
import TwoColLayout from './TwoCol'
import ImageLayout from './Image/Image'

export default {
  Blank: BlankLayout,
  Default: DefaultLayout,
  TwoCol: TwoColLayout,
  Image: ImageLayout,
}
`,
	);
	writeFileSync(
		join(packageRoot, "src", "layouts", "clean", "Blank.tsx"),
		`
export default function BlankLayout() { return null }
export const demo = { mdx: '# Clean Blank Demo' }
`,
	);
	writeFileSync(
		join(packageRoot, "src", "layouts", "clean", "Default.tsx"),
		`
export default function DefaultLayout() { return null }
export const demo = { mdx: '# Clean Default Demo' }
`,
	);
	writeFileSync(
		join(packageRoot, "src", "layouts", "clean", "TwoCol.tsx"),
		`
export default function TwoColLayout() { return null }
export const demo = {
  mdx: "import { Left, Right } from '@honeydeck/honeydeck/layouts/clean/TwoCol'\n\n# Clean TwoCol Demo",
}
`,
	);
	writeFileSync(
		join(packageRoot, "src", "layouts", "clean", "Image", "Image.tsx"),
		`
import type { LayoutProps } from '@honeydeck/honeydeck/types'

type ImageFrontmatter = {
  /** Fixture image URL. */
  image?: string
  /** Fixture accessible text. */
  alt: string
}

export default function ImageLayout(_props: LayoutProps<ImageFrontmatter>) { return null }
export const demo = { mdx: '# Clean Image Demo' }
`,
	);
}

function writeDefaultLayoutFixture(packageRoot: string): void {
	mkdirSync(join(packageRoot, "src", "layouts"), { recursive: true });
	writeFileSync(
		join(packageRoot, "src", "layouts", "index.ts"),
		`
import BlankLayout from './clean/Blank'
import DefaultLayout from './clean/Default'
import TwoColLayout from './clean/TwoCol'
import ImageLayout from './clean/Image/Image'

export default {
  Blank: BlankLayout,
  Default: DefaultLayout,
  TwoCol: TwoColLayout,
  Image: ImageLayout,
}

export { BlankLayout, DefaultLayout, TwoColLayout, ImageLayout }
`,
	);
	writeCleanLayoutFixtures(packageRoot);
}

function writeBeeLayoutFixtures(packageRoot: string): void {
	mkdirSync(join(packageRoot, "src", "layouts", "bee"), { recursive: true });
	writeFileSync(
		join(packageRoot, "src", "layouts", "bee", "index.ts"),
		`
import HoneyLayout from './Honey'
import HiveLayout from './Hive'

export default {
  Honey: HoneyLayout,
  Hive: HiveLayout,
}
`,
	);
	writeFileSync(
		join(packageRoot, "src", "layouts", "bee", "Honey.tsx"),
		`
export default function HoneyLayout() { return null }
export const demo = { mdx: '# Bee Honey Demo' }
`,
	);
	writeFileSync(
		join(packageRoot, "src", "layouts", "bee", "Hive.tsx"),
		`
export default function HiveLayout() { return null }
export const demo = { mdx: "import Hive from '@honeydeck/honeydeck/layouts/bee/Hive'\n\n# Bee Hive Demo" }
`,
	);
}

describe("layout demo crawler", () => {
	it("discovers demos from honeydeck/layouts spreads and local layout files", () => {
		const root = createTempRoot("honeydeck-layout-crawler-defaults-");
		writeDefaultLayoutFixture(root);
		writeFileSync(
			join(root, "deck.mdx"),
			'---\nlayouts: "./layouts"\n---\n\n# Hello',
		);
		writeFileSync(
			join(root, "layouts.ts"),
			`
import defaultLayouts from '@honeydeck/honeydeck/layouts'
import HeroLayout from './Hero'

export default {
  ...defaultLayouts,
  Hero: HeroLayout,
}
`,
		);
		writeFileSync(
			join(root, "Hero.tsx"),
			`
export default function HeroLayout() { return null }
export const demo = { mdx: '# Hero Demo' }
`,
		);

		const result = crawlLayoutDemos({
			entryPath: join(root, "deck.mdx"),
			packageRoot: root,
			layoutSpecifier: "./layouts",
		});

		assert.deepEqual(result.warnings, []);
		assert.deepEqual(
			result.demos.map((demo) => demo.layoutName),
			["Blank", "Default", "TwoCol", "Image", "Hero"],
		);
		assert.equal(
			result.demos.find((demo) => demo.layoutName === "Default")?.demoMetadata
				?.mdx,
			"# Clean Default Demo",
		);
		assert.equal(
			result.demos.find((demo) => demo.layoutName === "TwoCol")
				?.publicModuleSpecifier,
			"@honeydeck/honeydeck/layouts/TwoCol",
		);
		assert.equal(
			result.demos.find((demo) => demo.layoutName === "Hero")?.demoMetadata
				?.mdx,
			"# Hero Demo",
		);
	});

	it("discovers demos from named imports re-exported by layout barrels", () => {
		const root = createTempRoot("honeydeck-layout-crawler-named-barrel-");
		writeDefaultLayoutFixture(root);
		writeFileSync(
			join(root, "deck.mdx"),
			'---\nlayouts: "./layouts"\n---\n\n# Hello',
		);
		writeFileSync(
			join(root, "layouts.ts"),
			`
import { DefaultLayout as CleanDefaultLayout } from '@honeydeck/honeydeck/layouts'
import type { LayoutMap } from '@honeydeck/honeydeck/types'

export default {
  Default: CleanDefaultLayout,
} satisfies LayoutMap
`,
		);

		const result = crawlLayoutDemos({
			entryPath: join(root, "deck.mdx"),
			packageRoot: root,
			layoutSpecifier: "./layouts",
		});

		assert.deepEqual(result.warnings, []);
		assert.equal(result.demos.length, 1);
		assert.equal(result.demos[0]?.layoutName, "Default");
		assert.equal(result.demos[0]?.demoMetadata?.mdx, "# Clean Default Demo");
		assert.equal(
			result.demos[0]?.publicModuleSpecifier,
			"@honeydeck/honeydeck/layouts/Default",
		);
	});

	it("discovers demos from named imports re-exported through export-star barrels", () => {
		const root = createTempRoot("honeydeck-layout-crawler-export-star-");
		writeFileSync(
			join(root, "deck.mdx"),
			'---\nlayouts: "./layouts"\n---\n\n# Hello',
		);
		writeFileSync(
			join(root, "layouts.ts"),
			`
import { StarLayout } from './barrel'

export default {
  Star: StarLayout,
}
`,
		);
		writeFileSync(join(root, "barrel.ts"), "export * from './StarLayout'\n");
		writeFileSync(
			join(root, "StarLayout.tsx"),
			`
export function StarLayout() { return null }
export const demo = { mdx: '# Star Demo' }
`,
		);

		const result = crawlLayoutDemos({
			entryPath: join(root, "deck.mdx"),
			packageRoot: root,
			layoutSpecifier: "./layouts",
		});

		assert.deepEqual(result.warnings, []);
		assert.equal(result.demos.length, 1);
		assert.equal(result.demos[0]?.layoutName, "Star");
		assert.equal(result.demos[0]?.demoMetadata?.mdx, "# Star Demo");
	});

	it("discovers demos from static member references into imported layout maps", () => {
		const root = createTempRoot("honeydeck-layout-crawler-member-");
		writeDefaultLayoutFixture(root);
		writeFileSync(
			join(root, "deck.mdx"),
			'---\nlayouts: "./layouts"\n---\n\n# Hello',
		);
		writeFileSync(
			join(root, "layouts.ts"),
			`
import defaultLayouts from '@honeydeck/honeydeck/layouts'
import HeroLayout from './Hero'

export default {
  Default: defaultLayouts.Default,
  Hero: HeroLayout,
}
`,
		);
		writeFileSync(
			join(root, "Hero.tsx"),
			`
export default function HeroLayout() { return null }
export const demo = { mdx: '# Hero Demo' }
`,
		);

		const result = crawlLayoutDemos({
			entryPath: join(root, "deck.mdx"),
			packageRoot: root,
			layoutSpecifier: "./layouts",
		});

		assert.deepEqual(result.warnings, []);
		assert.deepEqual(
			result.demos.map((demo) => demo.layoutName),
			["Default", "Hero"],
		);
		assert.equal(
			result.demos.find((demo) => demo.layoutName === "Default")?.demoMetadata
				?.mdx,
			"# Clean Default Demo",
		);
		assert.equal(
			result.demos.find((demo) => demo.layoutName === "Default")
				?.publicModuleSpecifier,
			"@honeydeck/honeydeck/layouts/Default",
		);
	});

	it("discovers member-reference demos after spreading the same layout map", () => {
		const root = createTempRoot("honeydeck-layout-crawler-member-spread-");
		writeDefaultLayoutFixture(root);
		writeFileSync(
			join(root, "deck.mdx"),
			'---\nlayouts: "./layouts"\n---\n\n# Hello',
		);
		writeFileSync(
			join(root, "layouts.ts"),
			`
import defaultLayouts from '@honeydeck/honeydeck/layouts'

export default {
  ...defaultLayouts,
  AliasDefault: defaultLayouts.Default,
}
`,
		);

		const result = crawlLayoutDemos({
			entryPath: join(root, "deck.mdx"),
			packageRoot: root,
			layoutSpecifier: "./layouts",
		});

		assert.deepEqual(result.warnings, []);
		assert.equal(
			result.demos.find((demo) => demo.layoutName === "AliasDefault")
				?.demoMetadata?.mdx,
			"# Clean Default Demo",
		);
	});

	it("discovers demos from a dedicated clean layout map fixture", () => {
		const root = createTempRoot("honeydeck-layout-crawler-clean-");
		writeCleanLayoutFixtures(root);
		writeFileSync(
			join(root, "deck.mdx"),
			'---\nlayouts: "@honeydeck/honeydeck/layouts/clean"\n---\n\n# Hello',
		);

		const result = crawlLayoutDemos({
			entryPath: join(root, "deck.mdx"),
			packageRoot: root,
			layoutSpecifier: "@honeydeck/honeydeck/layouts/clean",
		});

		assert.deepEqual(result.warnings, []);
		assert.deepEqual(
			result.demos.map((demo) => demo.layoutName),
			["Blank", "Default", "TwoCol", "Image"],
		);
		assert.equal(
			result.demos.find((demo) => demo.layoutName === "TwoCol")
				?.publicModuleSpecifier,
			"@honeydeck/honeydeck/layouts/clean/TwoCol",
		);
		assert.match(
			result.demos.find((demo) => demo.layoutName === "TwoCol")?.demoMetadata
				?.mdx ?? "",
			/import \{ Left, Right \} from '@honeydeck\/honeydeck\/layouts\/clean\/TwoCol'/,
		);
		assert.deepEqual(
			result.demos.find((demo) => demo.layoutName === "Image")?.propDocs,
			[
				{
					name: "image",
					type: "string",
					required: false,
					description: "Fixture image URL.",
				},
				{
					name: "alt",
					type: "string",
					required: true,
					description: "Fixture accessible text.",
				},
			],
		);
	});

	it("discovers demos from a dedicated Bee layout map fixture", () => {
		const root = createTempRoot("honeydeck-layout-crawler-bee-");
		writeBeeLayoutFixtures(root);
		writeFileSync(
			join(root, "deck.mdx"),
			'---\nlayouts: "@honeydeck/honeydeck/layouts/bee"\n---\n\n# Hello',
		);

		const result = crawlLayoutDemos({
			entryPath: join(root, "deck.mdx"),
			packageRoot: root,
			layoutSpecifier: "@honeydeck/honeydeck/layouts/bee",
		});

		assert.deepEqual(result.warnings, []);
		assert.deepEqual(
			result.demos.map((demo) => demo.layoutName),
			["Honey", "Hive"],
		);
		assert.equal(
			result.demos.find((demo) => demo.layoutName === "Hive")
				?.publicModuleSpecifier,
			"@honeydeck/honeydeck/layouts/bee/Hive",
		);
		assert.match(
			result.demos.find((demo) => demo.layoutName === "Hive")?.demoMetadata
				?.mdx ?? "",
			/@honeydeck\/honeydeck\/layouts\/bee\/Hive/,
		);
	});

	it("discovers demos and explicit MDX from a relative layout map", () => {
		const root = createTempRoot("honeydeck-layout-crawler-");
		writeFileSync(
			join(root, "deck.mdx"),
			'---\nlayouts: "./layouts"\n---\n\n# Hello',
		);
		writeFileSync(
			join(root, "layouts.ts"),
			`
import baseLayouts from './baseLayouts'
import HeroLayout from './Hero'

export default {
  ...baseLayouts,
  Hero: HeroLayout,
}
`,
		);
		writeFileSync(
			join(root, "baseLayouts.ts"),
			`
import { CardLayout } from './Card'

export default {
  Card: CardLayout,
}
`,
		);
		writeFileSync(
			join(root, "Hero.tsx"),
			`
import type { LayoutProps } from '@honeydeck/honeydeck/types'

export function Badge() { return null }
type HeroFrontmatter = {
  /** Short label above the hero. */
  kicker?: string
  /** Whether the hero is visually emphasized. */
  featured: boolean
}
export default function HeroLayout(_props: LayoutProps<HeroFrontmatter>) { return null }
export const demo = {
  mdx: '# Hero Demo',
}
`,
		);
		writeFileSync(
			join(root, "Card.tsx"),
			`
export function CardLayout() { return null }
export const demo = {
  mdx: '# Card Demo',
}
`,
		);

		const result = crawlLayoutDemos({
			entryPath: join(root, "deck.mdx"),
			packageRoot: root,
			layoutSpecifier: "./layouts",
		});

		assert.deepEqual(result.warnings, []);
		assert.deepEqual(
			result.demos.map((demo) => demo.layoutName),
			["Card", "Hero"],
		);

		const hero = result.demos.find((demo) => demo.layoutName === "Hero");
		assert.ok(hero);
		assert.equal(hero.demoMetadata?.mdx, "# Hero Demo");
		assert.deepEqual(hero.propDocs, [
			{
				name: "kicker",
				type: "string",
				required: false,
				description: "Short label above the hero.",
			},
			{
				name: "featured",
				type: "boolean",
				required: true,
				description: "Whether the hero is visually emphasized.",
			},
		]);

		const card = result.demos.find((demo) => demo.layoutName === "Card");
		assert.equal(card?.demoMetadata?.mdx, "# Card Demo");
	});
});
