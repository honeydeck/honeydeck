import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveEffectiveColorMode } from "./colorMode.ts";

describe("resolveEffectiveColorMode", () => {
	it("honors pinned light and dark modes", () => {
		assert.equal(resolveEffectiveColorMode("light", true), "light");
		assert.equal(resolveEffectiveColorMode("dark", false), "dark");
	});

	it("resolves system and invalid values from the system preference", () => {
		assert.equal(resolveEffectiveColorMode("system", true), "dark");
		assert.equal(resolveEffectiveColorMode("system", false), "light");
		assert.equal(resolveEffectiveColorMode(undefined, true), "dark");
		assert.equal(resolveEffectiveColorMode("sepia", false), "light");
	});
});
