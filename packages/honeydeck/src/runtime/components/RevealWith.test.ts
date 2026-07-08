import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TimelineProvider } from "../timeline/TimelineContext.tsx";
import { RevealWith, type RevealWithProps } from "./RevealWith.tsx";

function renderRevealWith({
	at = 1,
	as,
	target,
	className = "",
	children = "Revealed content",
	stepIndex = 1,
	stepCount = 1,
	showFutureSteps = false,
	futureStepOpacity,
}: {
	at?: number;
	as?: "div" | "span";
	target?: string;
	className?: string;
	children?: string;
	stepIndex?: number;
	stepCount?: number;
	showFutureSteps?: boolean;
	futureStepOpacity?: number;
} = {}) {
	const props = { at, as, target, className } as RevealWithProps;
	const reveal = createElement(RevealWith, props, children);

	return renderToStaticMarkup(
		createElement(
			TimelineProvider,
			{
				stepIndex,
				stepCount,
				showFutureSteps,
				...(futureStepOpacity === undefined ? {} : { futureStepOpacity }),
			},
			reveal,
		),
	);
}

describe("<RevealWith>", () => {
	it("keeps author classes and renders block reveals by default", () => {
		const html = renderRevealWith({ className: "custom-sync" });

		assert.match(html, /class="[^"]*\bhoneydeck-reveal\b[^"]*\bcustom-sync\b/);
		assert.ok(html.includes("display:block"));
	});

	it("renders target debug data without a DOM id", () => {
		const html = renderRevealWith({ target: "intro" });

		assert.match(html, /data-honeydeck-reveal-with="intro"/);
		assert.doesNotMatch(html, /\sid="intro"/);
	});

	it("shows future synced content as muted previews when requested", () => {
		const html = renderRevealWith({
			at: 3,
			children: "Future content",
			stepIndex: 1,
			stepCount: 3,
			showFutureSteps: true,
			futureStepOpacity: 0.4,
		});

		assert.ok(html.includes("visibility:visible"));
		assert.ok(html.includes("opacity:0.4"));
		assert.ok(html.includes("Future content"));
	});

	it("hides future synced content when previews are disabled", () => {
		const html = renderRevealWith({
			at: 3,
			children: "Hidden content",
			stepIndex: 1,
			stepCount: 3,
		});

		assert.ok(html.includes("visibility:hidden"));
		assert.ok(html.includes("opacity:0"));
		assert.ok(html.includes("Hidden content"));
	});

	it("renders inline synced reveals as spans", () => {
		const html = renderRevealWith({ as: "span", children: "Inline content" });

		assert.match(html, /^<span\b/);
		assert.ok(html.includes("honeydeck-reveal"));
		assert.ok(html.includes("display:inline"));
		assert.ok(html.includes("visibility:visible"));
		assert.ok(html.includes("opacity:1"));
		assert.ok(html.includes("Inline content"));
	});
});
