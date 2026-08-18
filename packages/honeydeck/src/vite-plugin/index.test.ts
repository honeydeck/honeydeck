import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import type { Plugin, UserConfig } from "vite";
import {
	collectDeckOptimizeDepsInclude,
	HONEYDECK_DEPENDENCY_POLICY_PLUGIN_NAME,
} from "../vite-plugin/dep-optimizer.ts";
import {
	HONEYDECK_OPTIMIZE_DEPS_EXCLUDE,
	HONEYDECK_REACT_DEDUPE_DEPENDENCIES,
	honeydeckPlugin,
} from "../vite-plugin/index.ts";

function findPlugin(name: string): Plugin {
	const plugin = honeydeckPlugin().find(
		(entry): entry is Plugin =>
			typeof entry === "object" &&
			entry !== null &&
			"name" in entry &&
			entry.name === name,
	);

	assert.ok(plugin, `${name} plugin should be registered`);
	return plugin;
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

	it("pre-declares the deck dependency pre-bundle include list", () => {
		const policyPlugin = findPlugin(HONEYDECK_DEPENDENCY_POLICY_PLUGIN_NAME);
		assert.equal(typeof policyPlugin.config, "function");

		const config = (policyPlugin.config as () => UserConfig)();
		assert.deepEqual(
			config.optimizeDeps?.include,
			collectDeckOptimizeDepsInclude(resolve(process.cwd(), "deck.mdx")),
		);
	});
});
