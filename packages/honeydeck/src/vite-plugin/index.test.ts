import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Plugin, UserConfig } from "vite";
import {
	HONEYDECK_OPTIMIZE_DEPS_EXCLUDE,
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
	it("excludes Honeydeck from Vite dependency pre-bundling", () => {
		const aliases = findPlugin("honeydeck:aliases");
		assert.equal(typeof aliases.config, "function");

		const config = (aliases.config as () => UserConfig)();

		assert.deepEqual(config.optimizeDeps?.exclude, [
			...HONEYDECK_OPTIMIZE_DEPS_EXCLUDE,
		]);
	});
});
