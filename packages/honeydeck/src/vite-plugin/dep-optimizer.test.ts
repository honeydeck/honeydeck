import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import packageJson from "../../package.json" with { type: "json" };
import {
	collectBareImportSpecifiers,
	collectDeckOptimizeDepsInclude,
	HONEYDECK_DEPENDENCY_POLICY_PLUGIN_NAME,
	HONEYDECK_RUNTIME_OPTIMIZE_DEPS,
	isPrebundlableSpecifier,
} from "./dep-optimizer.ts";

function withTempDeck(
	files: Record<string, string>,
	run: (dir: string) => void,
): void {
	const dir = mkdtempSync(join(tmpdir(), "honeydeck-dep-optimizer-"));
	try {
		for (const [name, content] of Object.entries(files)) {
			writeFileSync(join(dir, name), content, "utf-8");
		}
		run(dir);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

describe("dependency policy plugin name", () => {
	it("carries the installed Honeydeck version so Vite re-optimizes on upgrade", () => {
		assert.equal(
			HONEYDECK_DEPENDENCY_POLICY_PLUGIN_NAME,
			`honeydeck:dependency-policy@${packageJson.version}`,
		);
	});
});

describe("isPrebundlableSpecifier", () => {
	it("accepts bare package specifiers and subpaths", () => {
		assert.equal(isPrebundlableSpecifier("lucide-react"), true);
		assert.equal(isPrebundlableSpecifier("@moia-dev/pace-icons"), true);
		assert.equal(isPrebundlableSpecifier("some-pkg/dist/index.js"), true);
	});

	it("rejects specifiers Vite must not pre-bundle", () => {
		assert.equal(isPrebundlableSpecifier(""), false);
		assert.equal(isPrebundlableSpecifier("./components/Foo.tsx"), false);
		assert.equal(isPrebundlableSpecifier("../shared/bar.ts"), false);
		assert.equal(isPrebundlableSpecifier("/abs/path.ts"), false);
		assert.equal(isPrebundlableSpecifier("node:fs"), false);
		assert.equal(isPrebundlableSpecifier("https://esm.sh/pkg"), false);
		assert.equal(isPrebundlableSpecifier("virtual:honeydeck/config"), false);
		assert.equal(isPrebundlableSpecifier("some-pkg/logo.svg"), false);
		assert.equal(isPrebundlableSpecifier("some-pkg/styles.css"), false);
		assert.equal(isPrebundlableSpecifier("some-pkg/data.json?raw"), false);
		assert.equal(isPrebundlableSpecifier("@honeydeck/honeydeck"), false);
		assert.equal(
			isPrebundlableSpecifier("@honeydeck/honeydeck/components"),
			false,
		);
	});
});

describe("collectBareImportSpecifiers", () => {
	it("collects named, default, side-effect, and multi-line imports", () => {
		const source = [
			'import Chart from "chart-pkg";',
			'import { A, B } from "@scope/icons";',
			'import "some-pkg/setup";',
			"import {",
			"  MapIcon,",
			"  RouteIcon,",
			'} from "@moia-dev/pace-icons";',
			'import Local from "./components/Local.tsx";',
			"",
			"# Slide",
		].join("\n");

		assert.deepEqual(collectBareImportSpecifiers(source), [
			"@moia-dev/pace-icons",
			"@scope/icons",
			"chart-pkg",
			"some-pkg/setup",
		]);
	});

	it("ignores imports inside code fences and prose starting with import", () => {
		const source = [
			"```ts",
			'import Fake from "never-installed";',
			"```",
			"",
			"import maps are a browser feature",
		].join("\n");

		assert.deepEqual(collectBareImportSpecifiers(source), []);
	});

	it("handles CRLF sources", () => {
		const source = 'import Chart from "chart-pkg";\r\n\r\n# Slide\r\n';
		assert.deepEqual(collectBareImportSpecifiers(source), ["chart-pkg"]);
	});
});

describe("collectDeckOptimizeDepsInclude", () => {
	it("includes runtime dependencies plus deck and imported-MDX packages", () => {
		withTempDeck(
			{
				"deck.mdx": [
					'import { MapIcon } from "@moia-dev/pace-icons";',
					'import Extra from "./extra.mdx";',
					"",
					"# Intro",
					"",
					"---",
					"",
					"<Extra />",
				].join("\n"),
				"extra.mdx": [
					'import Chart from "chart-pkg";',
					"",
					"# Chart slide",
				].join("\n"),
			},
			(dir) => {
				const include = collectDeckOptimizeDepsInclude(
					join(dir, "deck.mdx"),
				).sort();

				for (const dep of HONEYDECK_RUNTIME_OPTIMIZE_DEPS) {
					assert.ok(include.includes(dep), `expected ${dep} to be included`);
				}
				assert.ok(include.includes("@moia-dev/pace-icons"));
				assert.ok(include.includes("chart-pkg"));
				assert.ok(!include.some((entry) => entry.startsWith(".")));
			},
		);
	});

	it("falls back to runtime dependencies when the deck cannot be read", () => {
		assert.deepEqual(
			collectDeckOptimizeDepsInclude("/does/not/exist/deck.mdx"),
			[...HONEYDECK_RUNTIME_OPTIMIZE_DEPS],
		);
	});
});
