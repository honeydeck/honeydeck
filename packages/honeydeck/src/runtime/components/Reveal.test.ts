import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TimelineProvider } from "../timeline/TimelineContext.tsx";
import { Reveal } from "./Reveal.tsx";
import { RevealWith } from "./RevealWith.tsx";

function renderReveal({
	at = 1,
	as,
	className = "",
	children = "Revealed content",
	name,
	stepIndex = 1,
	stepCount = 1,
	showFutureSteps = false,
	futureStepOpacity,
	ephemeral = false,
	target,
	withTarget = false,
}: {
	at?: number;
	as?: "div" | "span";
	className?: string;
	children?: string;
	name?: string;
	stepIndex?: number;
	stepCount?: number;
	showFutureSteps?: boolean;
	futureStepOpacity?: number;
	ephemeral?: boolean;
	target?: number;
	withTarget?: boolean;
} = {}) {
	const props = withTarget
		? { as, className, ephemeral, ...(target ? { target } : {}) }
		: { at, as, className, name, ephemeral };
	const reveal = createElement(
		withTarget ? RevealWith : Reveal,
		props,
		children,
	);

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

describe("<Reveal>", () => {
	it("keeps author classes and renders block reveals by default", () => {
		const html = renderReveal({ className: "custom-fade" });

		assert.match(html, /class="[^"]*\bhoneydeck-reveal\b[^"]*\bcustom-fade\b/);
		assert.ok(html.includes("display:block"));
	});

	it("marks named reveals with a Honeydeck data attribute", () => {
		const html = renderReveal({ name: "intro" });

		assert.match(html, /data-honeydeck-reveal-id="intro"/);
		assert.doesNotMatch(html, /\sid="intro"/);
	});

	it("shows future reveals as muted previews when requested", () => {
		const html = renderReveal({
			at: 2,
			children: "Future content",
			stepIndex: 1,
			stepCount: 2,
			showFutureSteps: true,
			futureStepOpacity: 0.4,
		});

		assert.ok(html.includes("visibility:visible"));
		assert.ok(html.includes("opacity:0.4"));
		assert.ok(html.includes("Future content"));
	});

	it("hides future reveals when previews are disabled", () => {
		const html = renderReveal({
			at: 2,
			children: "Hidden content",
			stepIndex: 1,
			stepCount: 2,
		});

		assert.ok(html.includes("visibility:hidden"));
		assert.ok(html.includes("opacity:0"));
		assert.ok(html.includes("Hidden content"));
	});

	it("renders inline reveals as spans", () => {
		const html = renderReveal({ as: "span", children: "Inline content" });

		assert.match(html, /^<span\b/);
		assert.ok(html.includes("honeydeck-reveal"));
		assert.ok(html.includes("display:inline"));
		assert.ok(html.includes("visibility:visible"));
		assert.ok(html.includes("opacity:1"));
		assert.ok(html.includes("Inline content"));
	});

	it("returns null when ephemeral content is hidden", () => {
		const html = renderReveal({ at: 2, stepIndex: 1, ephemeral: true });

		assert.equal(html, "");
	});

	it("keeps ephemeral ghost previews renderable", () => {
		const html = renderReveal({
			at: 2,
			stepIndex: 1,
			ephemeral: true,
			showFutureSteps: true,
			futureStepOpacity: 0.4,
		});

		assert.ok(html.includes("opacity:0.4"));
		assert.ok(html.includes("Revealed content"));
	});
});

describe("<RevealWith>", () => {
	it("uses target as reveal condition", () => {
		const before = renderReveal({
			withTarget: true,
			target: 3,
			stepIndex: 2,
		});
		const after = renderReveal({
			withTarget: true,
			target: 3,
			stepIndex: 3,
		});

		assert.ok(before.includes("visibility:hidden"));
		assert.ok(after.includes("visibility:visible"));
	});
});
