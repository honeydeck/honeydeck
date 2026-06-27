import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Fade } from "../../runtime/components/Fade.tsx";
import { FadeWith } from "../../runtime/components/FadeWith.tsx";
import { TimelineProvider } from "../../runtime/TimelineContext.tsx";

function renderFade({
	at = 1,
	target,
	as,
	className = "",
	children = "Fading content",
	stepIndex = 0,
	stepCount = 1,
	showFutureSteps = false,
	futureStepOpacity,
	ephemeral = false,
	withTarget = false,
}: {
	at?: number;
	target?: number;
	as?: "div" | "span";
	className?: string;
	children?: string;
	stepIndex?: number;
	stepCount?: number;
	showFutureSteps?: boolean;
	futureStepOpacity?: number;
	ephemeral?: boolean;
	withTarget?: boolean;
} = {}) {
	const props = { at, as, className, ephemeral, ...(target ? { target } : {}) };
	const fade = createElement(withTarget ? FadeWith : Fade, props, children);

	return renderToStaticMarkup(
		createElement(
			TimelineProvider,
			{
				stepIndex,
				stepCount,
				showFutureSteps,
				...(futureStepOpacity === undefined ? {} : { futureStepOpacity }),
			},
			fade,
		),
	);
}

describe("<Fade>", () => {
	it("starts visible and fades out at its step", () => {
		const before = renderFade({ stepIndex: 0 });
		const after = renderFade({ stepIndex: 1 });

		assert.match(before, /class="[^"]*\bhoneydeck-fade\b/);
		assert.ok(before.includes("visibility:visible"));
		assert.ok(before.includes("opacity:1"));
		assert.ok(after.includes("visibility:hidden"));
		assert.ok(after.includes("opacity:0"));
		assert.ok(after.includes("Fading content"));
	});

	it("renders inline fades as spans", () => {
		const html = renderFade({ as: "span", children: "Inline content" });

		assert.match(html, /^<span\b/);
		assert.ok(html.includes("display:inline"));
	});

	it("shows faded content as muted previews when requested", () => {
		const html = renderFade({
			stepIndex: 1,
			showFutureSteps: true,
			futureStepOpacity: 0.4,
		});

		assert.ok(html.includes("visibility:visible"));
		assert.ok(html.includes("opacity:0.4"));
		assert.ok(html.includes("Fading content"));
	});

	it("returns null when ephemeral content is hidden", () => {
		const html = renderFade({ stepIndex: 1, ephemeral: true });

		assert.equal(html, "");
	});

	it("keeps ephemeral ghost previews renderable", () => {
		const html = renderFade({
			stepIndex: 1,
			ephemeral: true,
			showFutureSteps: true,
			futureStepOpacity: 0.4,
		});

		assert.ok(html.includes("opacity:0.4"));
		assert.ok(html.includes("Fading content"));
	});
});

describe("<FadeWith>", () => {
	it("uses target as fade-out condition", () => {
		const before = renderFade({
			withTarget: true,
			target: 3,
			stepIndex: 2,
		});
		const after = renderFade({
			withTarget: true,
			target: 3,
			stepIndex: 3,
		});

		assert.ok(before.includes("visibility:visible"));
		assert.ok(after.includes("visibility:hidden"));
	});
});
