import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const baseCss = readFileSync(
	new URL("../theme/base.css", import.meta.url),
	"utf-8",
);

describe("base theme CSS", () => {
	it("makes slide canvases establish themed background and foreground colors", () => {
		assert.match(
			baseCss,
			/\.honeydeck-slide-canvas\s*{[^}]*background:\s*var\(--honeydeck-background\);[^}]*color:\s*var\(--honeydeck-foreground\);/s,
		);
	});

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

	it("ships Magic Move base CSS with Honeydeck-specific fade overrides", () => {
		assert.match(baseCss, /@import "@shikijs\/magic-move\/style\.css";/);
		assert.match(baseCss, /\.shiki-magic-move-container/);
		assert.match(baseCss, /\.shiki-magic-move-item/);
		assert.match(baseCss, /honeydeck-magic-code-token-enter/);
		assert.match(baseCss, /honeydeck-magic-code-token-leave/);
		assert.match(baseCss, /animation-duration:\s*var\(--smm-duration, 500ms\)/);
		assert.doesNotMatch(baseCss, /--honeydeck-magic-code-enter-delay/);
	});

	it("ships magic transition layer crossfade hooks", () => {
		assert.match(
			baseCss,
			/\.honeydeck-slide-layer\.honeydeck-transition-magic\.honeydeck-transition-enter/,
		);
		assert.match(
			baseCss,
			/\.honeydeck-slide-layer\.honeydeck-transition-magic\.honeydeck-transition-exit/,
		);
		assert.match(baseCss, /animation-name:\s*honeydeck-transition-fade-enter/);
		assert.match(baseCss, /animation-name:\s*honeydeck-transition-fade-exit/);
	});

	it("fades normal code line highlights from dimmed to full opacity", () => {
		assert.match(baseCss, /honeydeck-code-line-highlight-enter/);
		assert.match(
			baseCss,
			/\.honeydeck-code-block \.line\[data-highlight="1"\]/,
		);
		assert.match(
			baseCss,
			/opacity:\s*var\(--honeydeck-code-line-dim-opacity\)/,
		);
	});
});
