import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Plugin, UserConfig } from "vite";
import { honeydeckPlugin } from "../vite-plugin/index.ts";

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
	it("predeclares runtime optimizer entries without file aliases", () => {
		const optimizerPlugin = findPlugin("honeydeck:runtime-optimizer");
		assert.equal(typeof optimizerPlugin.config, "function");

		const config = (optimizerPlugin.config as () => UserConfig)();
		assert.deepEqual(config.resolve?.alias, undefined);
		assert.deepEqual(config.optimizeDeps?.include, [
			"react",
			"react/jsx-runtime",
			"react/jsx-dev-runtime",
			"react-dom/client",
			"lucide-react",
			"@honeydeck/runtime",
			"@honeydeck/runtime/layouts",
			"@honeydeck/runtime/components",
		]);
	});
});
