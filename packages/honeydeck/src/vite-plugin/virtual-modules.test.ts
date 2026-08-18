import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
	resolveRelativeImport,
	virtualModulesPlugin,
} from "../vite-plugin/virtual-modules.ts";

describe("resolveRelativeImport", () => {
	it("resolves extensionless file imports to .tsx files", () => {
		const root = mkdtempSync(join(tmpdir(), "honeydeck-virtual-import-"));

		try {
			mkdirSync(join(root, "components"));
			writeFileSync(join(root, "components", "SparkleButton.tsx"), "export {}");

			assert.equal(
				resolveRelativeImport(root, "./components/SparkleButton"),
				join(root, "components", "SparkleButton.tsx"),
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("resolves extensionless directory imports to index files", () => {
		const root = mkdtempSync(join(tmpdir(), "honeydeck-virtual-import-"));

		try {
			mkdirSync(join(root, "layouts"));
			writeFileSync(join(root, "layouts", "index.ts"), "export {}");

			assert.equal(
				resolveRelativeImport(root, "./layouts"),
				join(root, "layouts", "index.ts"),
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("loads layout demo metadata and demo modules", async () => {
		const root = mkdtempSync(join(tmpdir(), "honeydeck-layout-demo-"));

		try {
			writeFileSync(
				join(root, "deck.mdx"),
				'---\nlayouts: "./layouts"\n---\n\n# Hello',
			);
			writeFileSync(
				join(root, "layouts.ts"),
				`
import HeroLayout from './Hero'

export default {
  Hero: HeroLayout,
}
`,
			);
			writeFileSync(
				join(root, "Hero.tsx"),
				`
import type { LayoutProps } from '@honeydeck/honeydeck/types'

type HeroFrontmatter = {
  /** Short label above the hero. */
  kicker?: string
}

export default function HeroLayout(_props: LayoutProps<HeroFrontmatter>) { return null }
export const demo = {
  mdx: '---\\nlayout: Hero\\n---\\n\\n# Hero Demo\\n\\nRendered from MDX.',
}
`,
			);

			const plugin = virtualModulesPlugin({
				entryPath: join(root, "deck.mdx"),
			});
			const context = {
				addWatchFile() {},
				error(message: string): never {
					throw new Error(message);
				},
			};
			const load = plugin.load as unknown as (
				this: typeof context,
				id: string,
			) => Promise<string> | string | null;

			const layoutsModule = await load.call(
				context,
				"\0virtual:honeydeck/layouts",
			);
			assert.match(
				String(layoutsModule),
				/export const layoutDemos = \{ "Hero": \{ mdx: "---\\nlayout: Hero/,
			);
			assert.match(
				String(layoutsModule),
				/export const layoutPropDocs = \{ "Hero": \[/,
			);
			assert.match(String(layoutsModule), /"name":"kicker"/);
			assert.match(String(layoutsModule), /"type":"string"/);
			assert.match(String(layoutsModule), /Short label above the hero\./);
			assert.match(
				String(layoutsModule),
				/export const layoutDemoWarnings = \[\];/,
			);

			const demoModule = await load.call(
				context,
				"\0virtual:honeydeck/layout-demo/0.mdx",
			);
			assert.match(String(demoModule), /export const stepCount = 0;/);
			assert.match(
				String(demoModule),
				/import _Title0 from 'virtual:honeydeck\/layout-demo-title\/0\.mdx'/,
			);
			assert.match(
				String(demoModule),
				/export const slideTitle = _jsxHd\(_Title0, \{\}\)/,
			);
			assert.match(
				String(demoModule),
				/export const slideFrontmatter = \{"layout":"Hero"\}/,
			);
			assert.match(String(demoModule), /export const slideLayout = "Hero"/);

			const demoTitleModule = await load.call(
				context,
				"\0virtual:honeydeck/layout-demo-title/0.mdx",
			);
			assert.match(String(demoTitleModule), /Hero Demo/);
			assert.match(String(demoTitleModule), /_createMdxContent/);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("invalidates compiled slide and layout demo modules when deck frontmatter changes", async () => {
		const root = mkdtempSync(join(tmpdir(), "honeydeck-layout-demo-hmr-"));
		const deckPath = join(root, "deck.mdx");

		try {
			writeFileSync(deckPath, '---\nlayouts: "./layouts"\n---\n\n# Hello');
			writeFileSync(
				join(root, "layouts.ts"),
				`
import HeroLayout from './Hero'

export default {
  Hero: HeroLayout,
}
`,
			);
			writeFileSync(
				join(root, "Hero.tsx"),
				`
export default function HeroLayout() { return null }
export const demo = {
  mdx: '# Hero Demo',
}
`,
			);

			const plugin = virtualModulesPlugin({ entryPath: deckPath });
			const loadContext = {
				addWatchFile() {},
				error(message: string): never {
					throw new Error(message);
				},
			};
			const load = plugin.load as unknown as (
				this: typeof loadContext,
				id: string,
			) => Promise<string> | string | null;
			await load.call(loadContext, "\0virtual:honeydeck/layouts");

			writeFileSync(
				deckPath,
				'---\nlayouts: "@honeydeck/honeydeck/layouts/bee"\n---\n\n# Hello',
			);

			const invalidated: string[] = [];
			const modules = new Map(
				[
					"\0virtual:honeydeck/config",
					"\0virtual:honeydeck/layouts",
					"\0virtual:honeydeck/layout-demo/0.mdx",
					"\0virtual:honeydeck/layout-demo-title/0.mdx",
					"\0virtual:honeydeck/slide/0.mdx",
					"\0virtual:honeydeck/slide-title/0.mdx",
				].map((id) => [id, { id }]),
			);
			const handleHotUpdate = plugin.handleHotUpdate as unknown as (
				this: undefined,
				context: {
					file: string;
					server: {
						moduleGraph: {
							getModuleById(id: string): { id: string } | undefined;
							invalidateModule(module: { id: string }): void;
						};
					};
				},
			) => Array<{ id: string }> | undefined;

			const affected = handleHotUpdate.call(undefined, {
				file: deckPath,
				server: {
					moduleGraph: {
						getModuleById(id: string) {
							return modules.get(id);
						},
						invalidateModule(module: { id: string }) {
							invalidated.push(module.id);
						},
					},
				},
			});

			assert.deepEqual(
				invalidated.sort(),
				[
					"\0virtual:honeydeck/config",
					"\0virtual:honeydeck/layout-demo/0.mdx",
					"\0virtual:honeydeck/layout-demo-title/0.mdx",
					"\0virtual:honeydeck/layouts",
					"\0virtual:honeydeck/slide/0.mdx",
					"\0virtual:honeydeck/slide-title/0.mdx",
				].sort(),
			);
			assert.deepEqual(
				affected?.map((module) => module.id).sort(),
				[
					"\0virtual:honeydeck/config",
					"\0virtual:honeydeck/layout-demo/0.mdx",
					"\0virtual:honeydeck/layout-demo-title/0.mdx",
					"\0virtual:honeydeck/layouts",
					"\0virtual:honeydeck/slide/0.mdx",
					"\0virtual:honeydeck/slide-title/0.mdx",
				].sort(),
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("compiles every slide when the deck preamble uses a multi-line import", async () => {
		const root = mkdtempSync(join(tmpdir(), "honeydeck-multiline-import-"));

		try {
			writeFileSync(
				join(root, "icons.tsx"),
				`
export function MapIcon() { return null }
export function RouteIcon() { return null }
`,
			);
			writeFileSync(
				join(root, "deck.mdx"),
				[
					"import {",
					"  MapIcon,",
					"  RouteIcon,",
					'} from "./icons"',
					"",
					"# First",
					"",
					"<MapIcon />",
					"",
					"---",
					"",
					"# Second",
					"",
					"<RouteIcon />",
					"",
				].join("\n"),
			);

			const plugin = virtualModulesPlugin({
				entryPath: join(root, "deck.mdx"),
			});
			const context = {
				addWatchFile() {},
				error(message: string): never {
					throw new Error(message);
				},
			};
			const load = plugin.load as unknown as (
				this: typeof context,
				id: string,
			) => Promise<string> | string | null;

			for (const index of [0, 1]) {
				const module = String(
					await load.call(context, `\0virtual:honeydeck/slide/${index}.mdx`),
				);
				assert.match(module, /from "\.\/icons"/);
				assert.match(module, /export const stepCount = 0;/);
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("generates a companion title module for slides with rich h1 content", async () => {
		const root = mkdtempSync(join(tmpdir(), "honeydeck-slide-title-"));

		try {
			writeFileSync(
				join(root, "deck.mdx"),
				[
					'import SparkleButton from "./SparkleButton"',
					"",
					"# Hello **world** <SparkleButton />",
					"",
					"Body.",
				].join("\n"),
			);

			const plugin = virtualModulesPlugin({
				entryPath: join(root, "deck.mdx"),
			});
			const context = {
				addWatchFile() {},
				error(message: string): never {
					throw new Error(message);
				},
			};
			const load = plugin.load as unknown as (
				this: typeof context,
				id: string,
			) => Promise<string> | string | null;

			const slideModule = String(
				await load.call(context, "\0virtual:honeydeck/slide/0.mdx"),
			);
			assert.match(
				slideModule,
				/import _Title0 from 'virtual:honeydeck\/slide-title\/0\.mdx'/,
			);
			assert.match(
				slideModule,
				/export const slideTitle = _jsxHd\(_Title0, \{\}\)/,
			);

			const titleModule = String(
				await load.call(context, "\0virtual:honeydeck/slide-title/0.mdx"),
			);
			assert.match(
				titleModule,
				/import SparkleButton from "\.\/SparkleButton"/,
			);
			assert.match(titleModule, /Hello[\s\S]*world/);
			assert.match(titleModule, /_createMdxContent/);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("exports slideTitle = null for slides without an h1", async () => {
		const root = mkdtempSync(join(tmpdir(), "honeydeck-slide-no-title-"));

		try {
			writeFileSync(join(root, "deck.mdx"), "Just body content.\n");

			const plugin = virtualModulesPlugin({
				entryPath: join(root, "deck.mdx"),
			});
			const context = {
				addWatchFile() {},
				error(message: string): never {
					throw new Error(message);
				},
			};
			const load = plugin.load as unknown as (
				this: typeof context,
				id: string,
			) => Promise<string> | string | null;

			const slideModule = String(
				await load.call(context, "\0virtual:honeydeck/slide/0.mdx"),
			);
			assert.match(slideModule, /export const slideTitle = null;/);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("reports the slide index and generated source when a slide fails to compile", async () => {
		const root = mkdtempSync(join(tmpdir(), "honeydeck-compile-error-"));

		try {
			writeFileSync(
				join(root, "deck.mdx"),
				["# First", "", "---", "", "export const = 5", ""].join("\n"),
			);

			const plugin = virtualModulesPlugin({
				entryPath: join(root, "deck.mdx"),
			});
			const context = {
				addWatchFile() {},
				error(message: string): never {
					throw new Error(message);
				},
			};
			const load = plugin.load as unknown as (
				this: typeof context,
				id: string,
			) => Promise<string> | string | null;

			await assert.rejects(
				async () => {
					await load.call(context, "\0virtual:honeydeck/slide/1.mdx");
				},
				(error: unknown) => {
					const message =
						error instanceof Error ? error.message : String(error);
					assert.match(message, /failed to compile slide 1 of deck\.mdx/);
					assert.match(message, /Generated MDX source:/);
					assert.match(message, /1 \| export const = 5/);
					return true;
				},
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
