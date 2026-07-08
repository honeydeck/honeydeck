import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TimelineProvider } from "../timeline/TimelineContext.tsx";
import { RevealGroup } from "./RevealGroup.tsx";

function renderRevealGroup(
	stepIndex: number,
	showFutureSteps = false,
	ephemeral = false,
) {
	const group = createElement(
		RevealGroup,
		{ at: 1, ephemeral },
		createElement(
			"ul",
			null,
			createElement("li", null, "Markdown-first"),
			createElement("li", null, "React-powered"),
			createElement("li", null, "PDF-ready"),
		),
	);

	return renderToStaticMarkup(
		createElement(
			TimelineProvider,
			{
				stepIndex,
				stepCount: 3,
				showFutureSteps,
			},
			group,
		),
	);
}

function renderRevealGroupWithTargetSteps(stepIndex: number) {
	const group = createElement(
		RevealGroup,
		{ at: 1, targetStepsJson: "[1,3]" },
		createElement("div", null, "Parent item"),
		createElement("div", null, "Sibling item"),
	);

	return renderToStaticMarkup(
		createElement(
			TimelineProvider,
			{
				stepIndex,
				stepCount: 3,
			},
			group,
		),
	);
}

function renderRevealGroupWithInvalidTargetSteps(stepIndex: number) {
	const group = createElement(
		RevealGroup,
		{ at: 1, targetStepsJson: "not-json" },
		createElement("div", null, "Parent item"),
		createElement("div", null, "Sibling item"),
	);

	return renderToStaticMarkup(
		createElement(
			TimelineProvider,
			{
				stepIndex,
				stepCount: 3,
			},
			group,
		),
	);
}

function renderRevealGroupWithNestedListMode(
	stepIndex: number,
	showFutureSteps = false,
) {
	const group = createElement(
		RevealGroup,
		{ at: 1, listRevealMode: "nested" },
		createElement(
			"ul",
			null,
			createElement(
				"li",
				null,
				"Parent",
				createElement(
					"ul",
					null,
					createElement("li", null, "Child A"),
					createElement("li", null, "Child B"),
				),
			),
			createElement("li", null, "Sibling"),
		),
	);

	return renderToStaticMarkup(
		createElement(
			TimelineProvider,
			{
				stepIndex,
				stepCount: 4,
				showFutureSteps,
			},
			group,
		),
	);
}

function renderRevealGroupWithFragmentNestedList(stepIndex: number) {
	const group = createElement(
		RevealGroup,
		{ at: 1, listRevealMode: "nested" },
		createElement(
			"ul",
			null,
			createElement(
				"li",
				null,
				"Parent",
				createElement(
					Fragment,
					null,
					createElement(
						"ul",
						null,
						createElement("li", null, "Fragment child"),
					),
				),
			),
		),
	);

	return renderToStaticMarkup(
		createElement(
			TimelineProvider,
			{
				stepIndex,
				stepCount: 2,
			},
			group,
		),
	);
}

describe("<RevealGroup>", () => {
	it("reveals direct list children in order", () => {
		const html = renderRevealGroup(2);

		assert.doesNotMatch(
			html,
			/<ul><div/,
			"RevealGroup should preserve valid list structure",
		);
		assert.match(
			html,
			/<li style="visibility:visible;opacity:1;transition:opacity 300ms ease">Markdown-first<\/li>/,
		);
		assert.match(
			html,
			/<li style="visibility:visible;opacity:1;transition:opacity 300ms ease">React-powered<\/li>/,
		);
		assert.match(
			html,
			/<li style="visibility:hidden;opacity:0;transition:opacity 300ms ease">PDF-ready<\/li>/,
		);
	});

	it("shows future list items as muted previews when requested", () => {
		const html = renderRevealGroup(2, true);

		assert.match(
			html,
			/<li style="visibility:visible;opacity:0.28;transition:opacity 300ms ease">PDF-ready<\/li>/,
		);
	});

	it("omits empty ephemeral list wrappers", () => {
		const html = renderRevealGroup(0, false, true);

		assert.equal(html, "");
	});

	it("uses compiler-provided target steps when group children are not consecutive", () => {
		const html = renderRevealGroupWithTargetSteps(2);

		assert.match(
			html,
			/<div[^>]*style="display:block;visibility:visible;opacity:1;transition:opacity 300ms ease"><div>Parent item<\/div><\/div>/,
		);
		assert.match(
			html,
			/<div[^>]*style="display:block;visibility:hidden;opacity:0;transition:opacity 300ms ease"><div>Sibling item<\/div><\/div>/,
		);
	});

	it("falls back to sequential steps when target steps JSON is invalid", () => {
		const html = renderRevealGroupWithInvalidTargetSteps(2);

		assert.match(
			html,
			/<div[^>]*style="display:block;visibility:visible;opacity:1;transition:opacity 300ms ease"><div>Parent item<\/div><\/div>/,
		);
		assert.match(
			html,
			/<div[^>]*style="display:block;visibility:visible;opacity:1;transition:opacity 300ms ease"><div>Sibling item<\/div><\/div>/,
		);
	});

	it("reveals nested list items depth-first when requested", () => {
		const html = renderRevealGroupWithNestedListMode(2);

		assert.doesNotMatch(html, /<ul><div/);
		assert.match(
			html,
			/<li style="visibility:visible;opacity:1;transition:opacity 300ms ease">Parent<ul><li style="visibility:visible;opacity:1;transition:opacity 300ms ease">Child A<\/li><li style="visibility:hidden;opacity:0;transition:opacity 300ms ease">Child B<\/li><\/ul><\/li>/,
		);
		assert.match(
			html,
			/<li style="visibility:hidden;opacity:0;transition:opacity 300ms ease">Sibling<\/li>/,
		);
	});

	it("shows future nested list items as muted previews when requested", () => {
		const html = renderRevealGroupWithNestedListMode(2, true);

		assert.match(
			html,
			/<li style="visibility:visible;opacity:0.28;transition:opacity 300ms ease">Child B<\/li>/,
		);
		assert.match(
			html,
			/<li style="visibility:visible;opacity:0.28;transition:opacity 300ms ease">Sibling<\/li>/,
		);
	});

	it("reveals nested list items through fragments", () => {
		const html = renderRevealGroupWithFragmentNestedList(1);

		assert.match(
			html,
			/<li style="visibility:visible;opacity:1;transition:opacity 300ms ease">Parent<ul><li style="visibility:hidden;opacity:0;transition:opacity 300ms ease">Fragment child<\/li><\/ul><\/li>/,
		);
	});
});
