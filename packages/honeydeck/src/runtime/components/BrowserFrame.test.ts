import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BrowserFrame as RootBrowserFrame } from "../index.ts";
import { BrowserFrame } from "./BrowserFrame.tsx";
import { BrowserFrame as BarrelBrowserFrame } from "./index.ts";

describe("<BrowserFrame>", () => {
	it("renders live browser chrome with the iframe and address bar", () => {
		const html = renderToStaticMarkup(
			createElement(BrowserFrame, {
				src: "https://example.com",
				addressBar: "example.com",
			}),
		);

		assert.match(html, /data-honeydeck-browser-frame=""/);
		assert.match(html, /data-honeydeck-browser-frame-chrome=""/);
		assert.match(
			html,
			/data-honeydeck-browser-frame-address="">example\.com<\/div>/,
		);
		assert.match(
			html,
			/<iframe[^>]*src="https:\/\/example\.com"[^>]*title="example\.com"[^>]*><\/iframe>/,
		);
		assert.doesNotMatch(html, /data-fallback="true"/);
		assert.doesNotMatch(html, /data-honeydeck-browser-frame-toggle=""/);
	});

	it("forwards iframe attributes and appends custom classes", () => {
		const html = renderToStaticMarkup(
			createElement(BrowserFrame, {
				src: "https://example.com/app",
				className: "outer",
				iframeClassName: "inner",
				loading: "lazy",
				sandbox: "allow-scripts",
				allow: "fullscreen",
				aspectRatio: "4 / 3",
			}),
		);

		assert.match(html, /class="[^"]*\bouter\b[^"]*"/);
		assert.match(html, /--honeydeck-browser-frame-aspect-ratio:4 \/ 3/);
		assert.match(html, /<iframe[^>]*class="[^"]*\binner\b[^"]*"[^>]*>/);
		assert.match(html, /loading="lazy"/);
		assert.match(html, /sandbox="allow-scripts"/);
		assert.match(html, /allow="fullscreen"/);
		assert.match(html, /title="Embedded page"/);
	});

	it("renders fallback preview with light and dark images plus a status badge", () => {
		const html = renderToStaticMarkup(
			createElement(BrowserFrame, {
				src: "https://example.invalid",
				addressBar: "example.invalid",
				fallbackImage: "/fallback-light.png",
				fallbackDarkImage: "/fallback-dark.png",
				defaultFallback: true,
			}),
		);

		assert.match(html, /data-fallback="true"/);
		assert.match(html, /data-honeydeck-browser-frame-toggle=""/);
		assert.match(html, /aria-label="Show live browser content"/);
		assert.match(html, /aria-pressed="true"/);
		assert.match(
			html,
			/data-honeydeck-browser-frame-badge="">Fallback preview/,
		);
		assert.match(html, /src="\/fallback-light\.png"/);
		assert.match(html, /alt="Fallback preview"/);
		assert.match(html, /src="\/fallback-dark\.png"/);
		assert.doesNotMatch(html, /<iframe/);
	});

	it("renders a rich address bar and still uses the default iframe title", () => {
		const html = renderToStaticMarkup(
			createElement(BrowserFrame, {
				src: "https://example.com",
				addressBar: createElement("strong", null, "Example"),
			}),
		);

		assert.match(html, /data-honeydeck-browser-frame-address=""/);
		assert.match(html, /<strong>Example<\/strong>/);
		assert.match(html, /title="Embedded page"/);
	});

	it("hides the address bar when addressBar is omitted", () => {
		const html = renderToStaticMarkup(
			createElement(BrowserFrame, {
				src: "https://example.com",
			}),
		);

		assert.doesNotMatch(html, /data-honeydeck-browser-frame-address/);
	});

	it("exports from both public barrels", () => {
		assert.equal(RootBrowserFrame, BrowserFrame);
		assert.equal(BarrelBrowserFrame, BrowserFrame);
	});
});
