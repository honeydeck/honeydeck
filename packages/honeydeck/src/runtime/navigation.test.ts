import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getDocsWebsiteUrl,
	getNextSlideRoute,
	getNextStepRoute,
	getOverviewRoute,
	getPreviousSlideRoute,
	getPreviousStepRoute,
	getReferenceRoute,
	getRouteUrl,
	getSlideRouteFromRoute,
	getToggleOverviewRoute,
} from "./navigation.ts";

const options = {
	slideCount: 3,
	getStepCount: (index: number) => [0, 2, 1][index] ?? 0,
};

describe("navigation route helpers", () => {
	it("advances through steps before crossing slide boundaries", () => {
		assert.deepEqual(
			getNextStepRoute({ view: "slide", slide: 2, step: 1 }, options),
			{ view: "slide", slide: 2, step: 2 },
		);
	});

	it("crosses to the next slide at step 0", () => {
		assert.deepEqual(
			getNextStepRoute({ view: "slide", slide: 2, step: 2 }, options),
			{ view: "slide", slide: 3, step: 0 },
		);
	});

	it("crosses to previous slide final step", () => {
		assert.deepEqual(
			getPreviousStepRoute({ view: "slide", slide: 3, step: 0 }, options),
			{ view: "slide", slide: 2, step: 2 },
		);
	});

	it("jumps slides directly", () => {
		assert.deepEqual(
			getNextSlideRoute({ view: "slide", slide: 1, step: 0 }, options),
			{ view: "slide", slide: 2, step: 0 },
		);
		assert.deepEqual(
			getPreviousSlideRoute({ view: "slide", slide: 2, step: 2 }, options),
			{ view: "slide", slide: 1, step: 0 },
		);
	});

	it("clamps overflowing route slides before navigating", () => {
		assert.deepEqual(
			getPreviousSlideRoute({ view: "slide", slide: 999, step: 0 }, options),
			{ view: "slide", slide: 2, step: 0 },
		);
		assert.equal(
			getNextSlideRoute({ view: "slide", slide: 999, step: 0 }, options),
			null,
		);
	});

	it("preserves presenter view while navigating", () => {
		assert.deepEqual(
			getNextStepRoute({ view: "presenter", slide: 2, step: 2 }, options),
			{ view: "presenter", slide: 3, step: 0 },
		);
	});

	it("opens and closes overview routes", () => {
		assert.deepEqual(getOverviewRoute({ view: "slide", slide: 3, step: 1 }), {
			view: "overview",
			slide: 3,
			step: 1,
		});
		assert.deepEqual(
			getSlideRouteFromRoute({ view: "overview", slide: 3, step: 1 }),
			{ view: "slide", slide: 3, step: 1 },
		);
	});

	it("toggles overview route state", () => {
		assert.deepEqual(
			getToggleOverviewRoute({ view: "slide", slide: 2, step: 1 }),
			{ view: "overview", slide: 2, step: 1 },
		);
		assert.deepEqual(
			getToggleOverviewRoute({ view: "overview", slide: 2, step: 1 }),
			{ view: "slide", slide: 2, step: 1 },
		);
	});

	it("opens the layouts reference by default", () => {
		assert.deepEqual(getReferenceRoute(), {
			view: "kit",
			slide: 1,
			step: 0,
			kitTab: "layouts",
		});
	});

	it("builds new-tab URLs from the current base path", () => {
		assert.equal(
			getRouteUrl(
				{ view: "slide", slide: 2, step: 1 },
				"https://example.com/presentations/talk/index.html?mode=live",
			),
			"https://example.com/presentations/talk/index.html?mode=live#/2/1",
		);
	});

	it("opens the public docs website separately", () => {
		assert.equal(getDocsWebsiteUrl(), "https://honeydeck.dev");
	});
});
