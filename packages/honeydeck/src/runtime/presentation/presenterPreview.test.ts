import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPresenterNextPreview } from "./presenterPreview.ts";

describe("getPresenterNextPreview", () => {
	it("previews the next step on the current slide when steps remain", () => {
		assert.deepEqual(
			getPresenterNextPreview({
				currentIndex: 2,
				step: 1,
				stepCount: 3,
				totalSlides: 10,
			}),
			{ slideIndex: 2, stepIndex: 2 },
		);
	});

	it("previews the next slide at step 0 after the final step", () => {
		assert.deepEqual(
			getPresenterNextPreview({
				currentIndex: 2,
				step: 3,
				stepCount: 3,
				totalSlides: 10,
			}),
			{ slideIndex: 3, stepIndex: 0 },
		);
	});

	it("previews the next slide when the current slide has no steps", () => {
		assert.deepEqual(
			getPresenterNextPreview({
				currentIndex: 2,
				step: 0,
				stepCount: 0,
				totalSlides: 10,
			}),
			{ slideIndex: 3, stepIndex: 0 },
		);
	});

	it("returns no preview on the final slide when there is no next slide", () => {
		assert.equal(
			getPresenterNextPreview({
				currentIndex: 9,
				step: 0,
				stepCount: 0,
				totalSlides: 10,
			}),
			null,
		);
	});
});
