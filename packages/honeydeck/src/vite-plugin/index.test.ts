import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { Plugin, UserConfig } from "vite";
import {
	HONEYDECK_DEPENDENCY_POLICY_PLUGIN_NAME,
	HONEYDECK_RUNTIME_OPTIMIZE_DEPS,
} from "./dep-optimizer.ts";
import {
	HONEYDECK_OPTIMIZE_DEPS_EXCLUDE,
	HONEYDECK_REACT_DEDUPE_DEPENDENCIES,
	honeydeckPlugin,
} from "./index.ts";

function findPluginIn(
	plugins: ReturnType<typeof honeydeckPlugin>,
	name: string,
): Plugin {
	const plugin = plugins.find(
		(entry): entry is Plugin =>
			typeof entry === "object" &&
			entry !== null &&
			"name" in entry &&
			entry.name === name,
	);

	assert.ok(plugin, `${name} plugin should be registered`);
	return plugin;
}

function findPlugin(name: string): Plugin {
	return findPluginIn(honeydeckPlugin(), name);
}

function policyConfigFor(root: string): UserConfig {
	const policyPlugin = findPluginIn(
		honeydeckPlugin({ root, entry: "deck.mdx" }),
		HONEYDECK_DEPENDENCY_POLICY_PLUGIN_NAME,
	);
	assert.equal(typeof policyPlugin.config, "function");
	return (policyPlugin.config as () => UserConfig)();
}

describe("honeydeck Vite plugin", () => {
	it("dedupes React peer dependencies through Vite", () => {
		const policyPlugin = findPlugin(HONEYDECK_DEPENDENCY_POLICY_PLUGIN_NAME);
		assert.equal(typeof policyPlugin.config, "function");

		const config = (policyPlugin.config as () => UserConfig)();
		assert.deepEqual(config.resolve?.dedupe, [
			...HONEYDECK_REACT_DEDUPE_DEPENDENCIES,
		]);
		assert.equal(config.resolve?.alias, undefined);
	});

	it("keeps Honeydeck package entries out of dependency pre-bundling", () => {
		const policyPlugin = findPlugin(HONEYDECK_DEPENDENCY_POLICY_PLUGIN_NAME);
		assert.equal(typeof policyPlugin.config, "function");

		const config = (policyPlugin.config as () => UserConfig)();
		assert.deepEqual(config.optimizeDeps?.exclude, [
			...HONEYDECK_OPTIMIZE_DEPS_EXCLUDE,
		]);
	});

	it("pre-declares runtime and deck dependencies for pre-bundling", () => {
		const dir = mkdtempSync(join(tmpdir(), "honeydeck-plugin-include-"));
		try {
			writeFileSync(
				join(dir, "deck.mdx"),
				[
					'import Chart from "chart-pkg";',
					'import Local from "./components/Local.tsx";',
					"",
					"# Intro",
				].join("\n"),
				"utf-8",
			);

			const include = policyConfigFor(dir).optimizeDeps?.include ?? [];

			for (const dep of HONEYDECK_RUNTIME_OPTIMIZE_DEPS) {
				assert.ok(include.includes(dep), `expected ${dep} to be included`);
			}
			assert.ok(include.includes("chart-pkg"));
			assert.ok(!include.some((entry) => entry.startsWith(".")));
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("falls back to runtime dependencies when the deck is missing", () => {
		const dir = mkdtempSync(join(tmpdir(), "honeydeck-plugin-include-"));
		try {
			assert.deepEqual(policyConfigFor(dir).optimizeDeps?.include, [
				...HONEYDECK_RUNTIME_OPTIMIZE_DEPS,
			]);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
