import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	countGridColumnsFromChildren,
	countGridTemplateColumns,
	findNearestListedPosition,
	getOverviewGridSelectionMove,
} from "./overviewGrid.ts";

function childrenWithTops(tops: number[]): HTMLCollection {
	const children = tops.map((offsetTop) => ({ offsetTop }));
	const collection = {
		length: children.length,
		item(index: number) {
			return children[index] ?? null;
		},
	};

	for (const [index, child] of children.entries()) {
		Object.assign(collection, { [index]: child });
	}

	return collection as unknown as HTMLCollection;
}

describe("overview grid column helpers", () => {
	it("counts columns from the first rendered row", () => {
		assert.equal(
			countGridColumnsFromChildren(childrenWithTops([0, 0, 0, 240, 240])),
			3,
		);
	});

	it("tolerates small sub-pixel row differences", () => {
		assert.equal(
			countGridColumnsFromChildren(childrenWithTops([12, 12.5, 13, 260])),
			3,
		);
	});

	it("falls back to parsed computed grid tracks", () => {
		assert.equal(countGridTemplateColumns("360px 360px 360px"), 3);
	});

	it("returns zero for empty or none template columns", () => {
		assert.equal(countGridTemplateColumns(""), 0);
		assert.equal(countGridTemplateColumns("none"), 0);
	});

	it("returns zero when there are no rendered children", () => {
		assert.equal(countGridColumnsFromChildren(childrenWithTops([])), 0);
	});

	it("does not split tracks on whitespace inside functions", () => {
		assert.equal(
			countGridTemplateColumns("minmax(0px, 1fr) minmax(0px, 1fr)"),
			2,
		);
	});
});

describe("overview grid selection movement", () => {
	it("keeps selection in place when moving up from the top row", () => {
		assert.deepEqual(getOverviewGridSelectionMove(2, 10, 4, "ArrowUp"), {
			selected: 2,
			didMove: false,
		});
	});

	it("moves up by the rendered column count below the top row", () => {
		assert.deepEqual(getOverviewGridSelectionMove(6, 10, 4, "ArrowUp"), {
			selected: 2,
			didMove: true,
		});
	});

	it("keeps selection in place when moving down from the bottom row", () => {
		assert.deepEqual(getOverviewGridSelectionMove(8, 10, 4, "ArrowDown"), {
			selected: 8,
			didMove: false,
		});
	});

	it("moves down by the rendered column count above the bottom row", () => {
		assert.deepEqual(getOverviewGridSelectionMove(4, 10, 4, "ArrowDown"), {
			selected: 8,
			didMove: true,
		});
	});
});

describe("overview listed selection mapping", () => {
	it("maps a listed slide index to its grid position", () => {
		assert.equal(findNearestListedPosition([0, 2, 3, 5], 3), 2);
	});

	it("falls back to the nearest preceding listed slide", () => {
		assert.equal(findNearestListedPosition([0, 2, 5], 4), 1);
	});

	it("falls back to the first listed slide when every listed slide comes later", () => {
		assert.equal(findNearestListedPosition([3, 4, 5], 1), 0);
	});

	it("reports no position for an empty grid", () => {
		assert.equal(findNearestListedPosition([], 2), -1);
	});
});
