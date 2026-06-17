import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PresenterCastButton } from "../../runtime/views/PresenterCastButton.tsx";

describe("<PresenterCastButton>", () => {
	it("renders the supported idle state", () => {
		const html = renderToStaticMarkup(
			createElement(PresenterCastButton, {
				supported: true,
				isCasting: false,
				onStartCasting: () => {},
				onStopCasting: () => {},
			}),
		);

		assert.match(html, /Cast audience view/);
		assert.match(html, /aria-label="Cast audience view"/);
		assert.doesNotMatch(html, /disabled=""/);
	});

	it("renders the active stop-casting state", () => {
		const html = renderToStaticMarkup(
			createElement(PresenterCastButton, {
				supported: true,
				isCasting: true,
				onStartCasting: () => {},
				onStopCasting: () => {},
			}),
		);

		assert.match(html, /Stop casting/);
		assert.match(html, /aria-label="Stop casting"/);
	});

	it("renders the unsupported disabled state", () => {
		const html = renderToStaticMarkup(
			createElement(PresenterCastButton, {
				supported: false,
				isCasting: false,
				onStartCasting: () => {},
				onStopCasting: () => {},
			}),
		);

		assert.match(html, /Cast audience view/);
		assert.match(html, /Presentation casting is not supported in this browser/);
		assert.match(html, /disabled=""/);
	});
});
