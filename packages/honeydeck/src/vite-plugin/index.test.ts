import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Plugin, UserConfig } from "vite";
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
		const policyPlugin = findPlugin("honeydeck:dependency-policy");
		assert.equal(typeof policyPlugin.config, "function");

		const config = (policyPlugin.config as () => UserConfig)();
		assert.deepEqual(config.resolve?.dedupe, [
			...HONEYDECK_REACT_DEDUPE_DEPENDENCIES,
		]);
		assert.equal(config.resolve?.alias, undefined);
	});

	it("keeps Honeydeck package entries out of dependency pre-bundling", () => {
		const policyPlugin = findPlugin("honeydeck:dependency-policy");
		assert.equal(typeof policyPlugin.config, "function");

		const config = (policyPlugin.config as () => UserConfig)();
		assert.deepEqual(config.optimizeDeps?.exclude, [
			...HONEYDECK_OPTIMIZE_DEPS_EXCLUDE,
		]);
	});
});
