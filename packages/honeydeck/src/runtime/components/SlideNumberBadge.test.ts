import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SlideNumberBadge } from "../../runtime/components/SlideNumberBadge.tsx";

describe("<SlideNumberBadge>", () => {
	it("exposes the current slide number to screen readers and sighted users", () => {
		const html = renderToStaticMarkup(
			createElement(SlideNumberBadge, { slide: 3 }),
		);

		assert.match(html, /role="status"/);
		assert.match(html, /aria-label="Slide 3"/);
		assert.match(html, />3</);
	});

	it("renders zero as a visible slide number", () => {
		const html = renderToStaticMarkup(
			createElement(SlideNumberBadge, { slide: 0 }),
		);

		assert.match(html, /aria-label="Slide 0"/);
		assert.match(html, />0</);
	});
});
