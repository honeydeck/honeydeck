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

type AliasEntry = { find: string | RegExp; replacement: string };

function getAliasEntries(config: UserConfig): AliasEntry[] {
	const alias = config.resolve?.alias;
	assert.ok(Array.isArray(alias), "aliases should be an ordered array");
	return alias as AliasEntry[];
}

describe("honeydeck Vite plugin", () => {
	it("aliases the package app shell before the bare runtime entry", () => {
		const aliasesPlugin = findPlugin("honeydeck:aliases");
		assert.equal(typeof aliasesPlugin.config, "function");

		const config = (aliasesPlugin.config as () => UserConfig)();
		const aliases = getAliasEntries(config);
		const appShellIndex = aliases.findIndex(
			(alias) => alias.find === "@honeydeck/honeydeck/app-shell",
		);
		const runtimeIndex = aliases.findIndex(
			(alias) => alias.find === "@honeydeck/honeydeck",
		);

		assert.notEqual(appShellIndex, -1);
		assert.notEqual(runtimeIndex, -1);
		assert.ok(appShellIndex < runtimeIndex);
	});
});
