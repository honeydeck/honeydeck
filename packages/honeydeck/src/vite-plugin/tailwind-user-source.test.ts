import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { injectTailwindUserSource } from "../vite-plugin/index.ts";

describe("Tailwind user source injection", () => {
	it("prepends the project root as a Tailwind source for Tailwind entry CSS", () => {
		const css =
			"@import 'tailwindcss';\n@import '@honeydeck/honeydeck/theme.css';\n";
		const result = injectTailwindUserSource(css, "/project/deck");

		assert.match(result, /@source "\/project\/deck";/);
		assert.ok(result.endsWith(css));
	});

	it("does not alter non-Tailwind CSS", () => {
		const css = ".deck { color: red; }\n";
		assert.equal(injectTailwindUserSource(css, "/project/deck"), css);
	});

	it("does not inject the source twice", () => {
		const css = "@import 'tailwindcss';\n";
		const once = injectTailwindUserSource(css, "/project/deck");
		const twice = injectTailwindUserSource(once, "/project/deck");

		assert.equal(twice, once);
	});

	it("normalizes Windows-style paths for Tailwind CSS", () => {
		const result = injectTailwindUserSource(
			'@import "tailwindcss";\n',
			"C:\\honeydeck\\slides",
		);
		assert.match(result, /@source "C:\/honeydeck\/slides";/);
	});
});
