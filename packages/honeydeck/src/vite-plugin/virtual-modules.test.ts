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
			assert.match(String(demoModule), /export const slideTitle = "Hero Demo"/);
			assert.match(
				String(demoModule),
				/export const slideFrontmatter = \{"layout":"Hero"\}/,
			);
			assert.match(String(demoModule), /export const slideLayout = "Hero"/);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("invalidates layout demo modules when deck frontmatter changes", async () => {
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
					"\0virtual:honeydeck/layouts",
				].sort(),
			);
			assert.deepEqual(
				affected?.map((module) => module.id).sort(),
				[
					"\0virtual:honeydeck/config",
					"\0virtual:honeydeck/layout-demo/0.mdx",
					"\0virtual:honeydeck/layouts",
				].sort(),
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
