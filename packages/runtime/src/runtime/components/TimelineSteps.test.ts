import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	TimelineSteps,
	useTimelineSteps,
} from "../../runtime/components/TimelineSteps.tsx";
import {
	TimelineProvider,
	useTimeline,
} from "../../runtime/TimelineContext.tsx";

function Probe() {
	const state = useTimelineSteps();
	const slideTimeline = useTimeline();

	return createElement(
		"output",
		{
			"data-phase": state.phase,
			"data-step-index": state.stepIndex,
			"data-step-count": state.stepCount,
			"data-start-at": state.startAt,
			"data-end-at": state.endAt,
			"data-slide-step-index": slideTimeline.stepIndex,
			"data-pdf-final-render": state.isPdfFinalRender,
			"data-slide-pdf-final-render": slideTimeline.isPdfFinalRender,
		},
		state.phase,
	);
}

function renderProbe(slideStepIndex: number, isPdfFinalRender = false): string {
	return renderToStaticMarkup(
		createElement(
			TimelineProvider,
			{
				stepIndex: slideStepIndex,
				stepCount: 5,
				isPdfFinalRender,
			},
			createElement(TimelineSteps, { steps: 3, at: 2 }, createElement(Probe)),
		),
	);
}

describe("<TimelineSteps>", () => {
	it("reports a before state before the reserved step block starts", () => {
		const html = renderProbe(1);

		assert.match(html, /data-phase="before"/);
		assert.match(html, /data-step-index="0"/);
		assert.match(html, /data-step-count="3"/);
		assert.match(html, /data-start-at="2"/);
		assert.match(html, /data-end-at="4"/);
	});

	it("reports an active local step while the reserved block is current", () => {
		const html = renderProbe(3);

		assert.match(html, /data-phase="active"/);
		assert.match(html, /data-step-index="2"/);
		assert.match(html, /data-slide-step-index="3"/);
	});

	it("exposes PDF final-state capture to custom step components", () => {
		const html = renderProbe(5, true);

		assert.match(html, /data-pdf-final-render="true"/);
		assert.match(html, /data-slide-pdf-final-render="true"/);
	});

	it("reports an after state once the reserved step block has completed", () => {
		const html = renderProbe(5);

		assert.match(html, /data-phase="after"/);
		assert.match(html, /data-step-index="3"/);
	});

	it("throws a helpful error when useTimelineSteps is used outside TimelineSteps", () => {
		assert.throws(
			() => renderToStaticMarkup(createElement(Probe)),
			/useTimelineSteps\(\) must be used inside <TimelineSteps>/,
		);
	});

	it("rejects non-positive step reservations", () => {
		assert.throws(
			() =>
				renderToStaticMarkup(
					createElement(
						TimelineProvider,
						{
							stepIndex: 0,
							stepCount: 0,
						},
						createElement(TimelineSteps, { steps: 0 }, createElement("div")),
					),
				),
			/requires steps to be a positive integer/,
		);
	});

	it("rejects non-positive starting positions", () => {
		assert.throws(
			() =>
				renderToStaticMarkup(
					createElement(
						TimelineProvider,
						{
							stepIndex: 0,
							stepCount: 1,
						},
						createElement(
							TimelineSteps,
							{ steps: 1, at: 0 },
							createElement("div"),
						),
					),
				),
			/requires at to be a positive integer/,
		);
	});
});
