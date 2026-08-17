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
		assert.match(source, /\{listedCount\}\s+slide/);
	});

	it("marks the current slide with a badge", () => {
		assert.match(source, /Current/);
		assert.match(
			source,
			/aria-current=\{isActive\s*\?\s*"true"\s*:\s*undefined\}/,
		);
	});

	it("labels each thumbnail with its slide number", () => {
		assert.match(source, /`Go to slide \$\{i \+ 1\}`/);
		assert.match(source, /`Go to hidden slide \$\{i \+ 1\}`/);
	});

	it("lists hidden slides only while hidden slides are shown", () => {
		assert.match(
			source,
			/filter\(\(entry\) => showHiddenSlides \|\| !entry\.slide\.hidden\)/,
		);
	});

	it("shows hidden slides when the overview opens on a hidden slide", () => {
		assert.match(
			source,
			/useState\(\(\) =>\s*isSlideHidden\(currentSlide - 1\),\s*\)/,
		);
		assert.match(
			source,
			/if \(isSlideHidden\(routeSelected\)\) setShowHiddenSlides\(true\)/,
		);
	});

	it("toggles hidden slides with the h hotkey and a header button", () => {
		assert.match(source, /id: "overview\.hidden-slides\.toggle"/);
		assert.match(source, /keys: \["h"\]/);
		assert.match(source, /aria-pressed=\{showHiddenSlides\}/);
		assert.match(source, /"Hide hidden" : "Show hidden"\} \(h\)/);
	});

	it("marks hidden thumbnails with a badge and a dashed outline", () => {
		assert.match(
			source,
			/data-slide-hidden=\{slide\.hidden \? "true" : undefined\}/,
		);
		assert.match(source, /slide\.hidden \? "outline-dashed" : "outline-solid"/);
		assert.match(source, /Hidden\s*<\/div>/);
	});
});
