import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RevealGroup } from "../../runtime/components/RevealGroup.tsx";
import { TimelineProvider } from "../../runtime/TimelineContext.tsx";

function renderRevealGroup(stepIndex: number, showFutureSteps = false) {
	const group = createElement(
		RevealGroup,
		{ at: 1 },
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
});
