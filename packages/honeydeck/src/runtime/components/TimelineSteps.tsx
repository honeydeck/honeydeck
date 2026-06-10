import { createContext, type ReactNode, useContext } from "react";
import { useTimeline } from "../TimelineContext.tsx";

export type TimelineStepsPhase = "before" | "active" | "after";

export type TimelineStepsState = {
	/** Local step index within this block. 0 before start, 1..stepCount while active. */
	stepIndex: number;
	/** Number of steps reserved by this block. */
	stepCount: number;
	/** Where the slide timeline is relative to this block. */
	phase: TimelineStepsPhase;
	/** First absolute slide step reserved by this block. */
	startAt: number;
	/** Last absolute slide step reserved by this block. */
	endAt: number;
	/**
	 * True while `honeydeck pdf` is capturing one final-state page per slide.
	 * Use this for components that should render an all-open/all-visible PDF state.
	 */
	isPdfFinalRender: boolean;
};

export type TimelineStepsProps = {
	/**
	 * Number of slide timeline steps reserved for the children.
	 * Must be a literal positive integer in MDX.
	 */
	steps: number;
	/**
	 * First absolute slide step. Injected by the Honeydeck compiler.
	 * Defaults to 1 only for direct runtime/test usage.
	 */
	at?: number;
	children?: ReactNode;
};

const TimelineStepsContext = createContext<TimelineStepsState | null>(null);

function assertPositiveInteger(value: number, propName: string): void {
	if (!Number.isInteger(value) || value < 1) {
		throw new Error(
			`Honeydeck <TimelineSteps> requires ${propName} to be a positive integer.`,
		);
	}
}

/**
 * Reserves a static block of slide timeline steps for a custom component.
 *
 * Wrap custom interactive content in `TimelineSteps`, then call
 * `useTimelineSteps()` inside that content to read the local step index,
 * total step count, phase, and PDF-final-render state.
 *
 * ```mdx
 * import { TimelineSteps, useTimelineSteps } from '@honeydeck/honeydeck'
 *
 * function AccordionDemo() {
 *   const { phase, stepIndex, stepCount, isPdfFinalRender } = useTimelineSteps()
 *   return <div>{phase}: {stepIndex} / {stepCount}</div>
 * }
 *
 * <TimelineSteps steps={3}>
 *   <AccordionDemo />
 * </TimelineSteps>
 * ```
 *
 * Keep `steps` as a literal positive integer in slide MDX so Honeydeck can
 * calculate the slide step count at build time. The compiler injects `at`;
 * set it manually only in runtime tests or highly controlled custom usage.
 */
export function TimelineSteps({ steps, at = 1, children }: TimelineStepsProps) {
	assertPositiveInteger(steps, "steps");
	assertPositiveInteger(at, "at");

	const { stepIndex: slideStepIndex, isPdfFinalRender } = useTimeline();
	const startAt = at;
	const endAt = at + steps - 1;

	let phase: TimelineStepsPhase = "active";
	let localStepIndex = slideStepIndex - startAt + 1;

	if (slideStepIndex < startAt) {
		phase = "before";
		localStepIndex = 0;
	} else if (slideStepIndex > endAt) {
		phase = "after";
		localStepIndex = steps;
	}

	const value: TimelineStepsState = {
		stepIndex: localStepIndex,
		stepCount: steps,
		phase,
		startAt,
		endAt,
		isPdfFinalRender,
	};

	return (
		<TimelineStepsContext.Provider value={value}>
			{children}
		</TimelineStepsContext.Provider>
	);
}

export function useTimelineSteps(): TimelineStepsState {
	const value = useContext(TimelineStepsContext);
	if (!value) {
		throw new Error(
			"Honeydeck useTimelineSteps() must be used inside <TimelineSteps>.",
		);
	}
	return value;
}
