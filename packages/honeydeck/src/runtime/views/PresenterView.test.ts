import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PresenterCastButton } from "../../runtime/views/PresenterCastButton.tsx";
import { formatPresenterElapsedTime } from "../../runtime/views/presenterTime.ts";

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

	it("renders the unsupported disabled-looking state without inline feedback", () => {
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
		assert.match(html, /aria-disabled="true"/);
		assert.match(html, /cursor-not-allowed/);
		assert.doesNotMatch(html, /disabled=""/);
		assert.doesNotMatch(html, /aria-live/);
	});
});

describe("<PresenterView>", () => {
	it("shows a mobile unsupported hint and keeps desktop layout md-gated", () => {
		const source = readFileSync(
			new URL("./PresenterView.tsx", import.meta.url),
			"utf8",
		);

		assert.match(source, /Presenter mode is not supported on mobile\./);
		assert.match(source, />\s*Go to slide\s*</);
		assert.match(source, /md:hidden/);
		assert.match(source, /md:grid/);
		assert.match(source, /\[&_\.honeydeck-code-block_\.line\]:transition-none/);
		assert.match(
			source,
			/\[&_\.honeydeck-code-block_\.line\[data-highlight='1'\]\]:animate-none/,
		);
		assert.doesNotMatch(source, /usePresenterMobile/);
		assert.doesNotMatch(source, /useSwipeNav/);
	});
});

describe("formatPresenterElapsedTime", () => {
	it("formats elapsed presenter time", () => {
		assert.equal(formatPresenterElapsedTime(0), "0:00");
		assert.equal(formatPresenterElapsedTime(65_000), "1:05");
		assert.equal(formatPresenterElapsedTime(3_661_000), "1:01:01");
	});

	it("clamps negative elapsed time", () => {
		assert.equal(formatPresenterElapsedTime(-1_000), "0:00");
	});
});
