import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FadeGroup } from "../../runtime/components/FadeGroup.tsx";
import { TimelineProvider } from "../../runtime/TimelineContext.tsx";

function renderFadeGroup(
	stepIndex: number,
	showFutureSteps = false,
	ephemeral = false,
) {
	const group = createElement(
		FadeGroup,
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

function renderEphemeralFadeGroup(stepIndex: number, showFutureSteps = false) {
	const group = createElement(
		FadeGroup,
		{ at: 1, ephemeral: true },
		createElement("div", null, "First"),
		createElement("div", null, "Second"),
	);

	return renderToStaticMarkup(
		createElement(
			TimelineProvider,
			{
				stepIndex,
				stepCount: 2,
				showFutureSteps,
			},
			group,
		),
	);
}

describe("<FadeGroup>", () => {
	it("fades direct list children in order", () => {
		const html = renderFadeGroup(2);

		assert.doesNotMatch(
			html,
			/<ul><div/,
			"FadeGroup should preserve valid list structure",
		);
		assert.match(
			html,
			/<li style="visibility:hidden;opacity:0;transition:opacity 300ms ease">Markdown-first<\/li>/,
		);
		assert.match(
			html,
			/<li style="visibility:hidden;opacity:0;transition:opacity 300ms ease">React-powered<\/li>/,
		);
		assert.match(
			html,
			/<li style="visibility:visible;opacity:1;transition:opacity 300ms ease">PDF-ready<\/li>/,
		);
	});

	it("shows faded list items as muted previews when requested", () => {
		const html = renderFadeGroup(2, true);

		assert.match(
			html,
			/<li style="visibility:visible;opacity:0.28;transition:opacity 300ms ease">Markdown-first<\/li>/,
		);
	});

	it("omits hidden ephemeral children", () => {
		const html = renderEphemeralFadeGroup(1);

		assert.doesNotMatch(html, /First/);
		assert.match(html, /Second/);
	});

	it("omits empty ephemeral list wrappers", () => {
		const html = renderFadeGroup(3, false, true);

		assert.equal(html, "");
	});

	it("renders hidden ephemeral children as ghost previews", () => {
		const html = renderEphemeralFadeGroup(1, true);

		assert.match(html, /First/);
		assert.match(html, /opacity:0.28/);
	});
});
