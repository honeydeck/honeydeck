/**
 * Timeline context for Honeydeck.
 *
 * Each slide is wrapped in a `<TimelineProvider>` that supplies the current
 * step index (read from the route) and the total step count (derived from
 * build-time metadata). Components like `<Reveal>` and `<CodeBlock>` read
 * from this context to decide their visibility state.
 *
 * ### Step semantics
 *  - stepIndex = 0  → initial state, no step content active
 *  - stepIndex = n  → step n is the latest active step (cumulative reveals)
 *  - stepCount      → total number of steps for the slide
 */

import { createContext, type ReactNode, useContext } from "react";

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

export type TimelineContextValue = {
	/** Current step index (0 = initial, no reveals active). */
	stepIndex: number;
	/**
	 * Total number of timeline steps for this slide.
	 * Used by keyboard navigation to detect end-of-slide.
	 */
	stepCount: number;
	/** Show future reveal steps as muted previews instead of hiding them. */
	showFutureSteps: boolean;
	/** Opacity used when future reveal steps are previewed. */
	futureStepOpacity: number;
	/**
	 * True while `honeydeck pdf` is capturing one final-state page per slide.
	 * False for normal presentation mode and step-by-step PDF export.
	 */
	isPdfFinalRender: boolean;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TimelineContext = createContext<TimelineContextValue>({
	stepIndex: 0,
	stepCount: 0,
	showFutureSteps: false,
	futureStepOpacity: 0.28,
	isPdfFinalRender: false,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type TimelineProviderProps = {
	/** Step index driven by the current route (0-based). */
	stepIndex: number;
	/** Total step count for this slide, from build-time metadata. */
	stepCount: number;
	/** Show future reveal steps as muted previews instead of hiding them. */
	showFutureSteps?: boolean;
	/** Opacity used when future reveal steps are previewed. */
	futureStepOpacity?: number;
	/** Whether this render is a PDF final-state capture. */
	isPdfFinalRender?: boolean;
	children?: ReactNode;
};

function readPdfFinalRenderFromLocation(): boolean {
	if (typeof window === "undefined") return false;

	const params = new URLSearchParams(window.location.search);
	return params.get("honeydeckPdfRender") === "final";
}

/**
 * Wrap a slide component in `<TimelineProvider>` to make the timeline state
 * available to all nested `<Reveal>`, `<RevealGroup>`, and code block
 * components.
 */
export function TimelineProvider({
	stepIndex,
	stepCount,
	showFutureSteps = false,
	futureStepOpacity = 0.28,
	isPdfFinalRender = readPdfFinalRenderFromLocation(),
	children,
}: TimelineProviderProps) {
	return (
		<TimelineContext.Provider
			value={{
				stepIndex,
				stepCount,
				showFutureSteps,
				futureStepOpacity,
				isPdfFinalRender,
			}}
		>
			{children}
		</TimelineContext.Provider>
	);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Read the current timeline state from within a slide.
 *
 * @example
 * ```tsx
 * function Reveal({ at }) {
 *   const { stepIndex } = useTimeline();
 *   return <div style={{ opacity: stepIndex >= at ? 1 : 0 }}>{children}</div>;
 * }
 * ```
 */
export function useTimeline(): TimelineContextValue {
	return useContext(TimelineContext);
}
