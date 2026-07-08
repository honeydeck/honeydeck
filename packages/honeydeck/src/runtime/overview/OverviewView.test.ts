import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("<OverviewView>", () => {
	const source = readFileSync(
		new URL("./OverviewView.tsx", import.meta.url),
		"utf8",
	);

	it("is a contained panel without full-screen positioning", () => {
		assert.doesNotMatch(source, /fixed\s+inset-0/);
		assert.match(source, /sticky\s+top-0[\s\S]*?backdrop-blur-xl/);
		assert.match(
			source,
			/flex\s+flex-col\s+h-full\s+w-full\s+min-h-0\s+overflow-y-auto/,
		);
	});

	it("accepts a targetView prop to control jump destination", () => {
		assert.match(source, /targetView\?:\s*"slide"\s*\|\s*"presenter"/);
		assert.match(source, /targetView\s*=\s*"slide"/);
	});

	it("returns to the current slide and step when the already-current slide is selected", () => {
		assert.match(
			source,
			/if\s*\(\s*index\s*===\s*currentSlide\s*-\s*1\s*\)\s*\{/,
		);
		assert.match(
			source,
			/navigate\(\{[\s\S]*?view:\s*targetView,[\s\S]*?slide:\s*currentSlide,[\s\S]*?step:\s*currentStep[\s\S]*?\}\)/,
		);
	});

	it("renders a close button and a slide count header", () => {
		assert.match(source, /onClick=\{onClose\}/);
		assert.match(source, />\s*Close\s*</);
		assert.match(source, /\{total\}\s+slide/);
	});

	it("marks the current slide with a badge", () => {
		assert.match(source, /Current/);
		assert.match(
			source,
			/aria-current=\{isActive\s*\?\s*"true"\s*:\s*undefined\}/,
		);
	});

	it("labels each thumbnail with its slide number", () => {
		assert.match(source, /aria-label=\{`Go to slide \$\{i \+ 1\}`\}/);
	});
});
