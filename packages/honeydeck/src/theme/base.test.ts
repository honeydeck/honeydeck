import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const baseCss = readFileSync(
	new URL("../theme/base.css", import.meta.url),
	"utf-8",
);

describe("base theme CSS", () => {
	it("restores slide list markers and indentation after Tailwind preflight", () => {
		assert.match(
			baseCss,
			/\.honeydeck-slide-canvas ul\s*{\s*list-style:\s*disc;/,
		);
		assert.match(
			baseCss,
			/\.honeydeck-slide-canvas ol\s*{\s*list-style:\s*decimal;/,
		);
		assert.match(
			baseCss,
			/\.honeydeck-slide-canvas (?:ul|ol)\s*{[^}]*padding-left:\s*1\.5em;/s,
		);
	});

	it("keeps list styling scoped to slide canvases", () => {
		assert.doesNotMatch(baseCss, /^\s*ul\s*{[^}]*list-style:/m);
		assert.doesNotMatch(baseCss, /^\s*ol\s*{[^}]*list-style:/m);
	});
});
