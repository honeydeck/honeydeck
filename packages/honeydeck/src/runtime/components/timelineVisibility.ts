import type { CSSProperties, ReactNode } from "react";
import { useTimeline } from "../timeline/TimelineContext.tsx";

export type TimelineVisibilityMode = "reveal" | "fade";

export type TimelineVisibilityOptions = {
	mode: TimelineVisibilityMode;
	at: number;
	target?: number;
	ephemeral?: boolean;
};

export type TimelineVisibilityState = {
	visible: boolean;
	previewFuture: boolean;
	shouldRender: boolean;
	style: CSSProperties;
};

export function useTimelineVisibility({
	mode,
	at,
	target = at,
	ephemeral = false,
}: TimelineVisibilityOptions): TimelineVisibilityState {
	const { stepIndex, showFutureSteps, futureStepOpacity } = useTimeline();
	const visible = mode === "reveal" ? stepIndex >= target : stepIndex < target;
	const previewFuture = !visible && showFutureSteps;
	const shouldRender = visible || previewFuture || !ephemeral;

	return {
		visible,
		previewFuture,
		shouldRender,
		style: {
			visibility: visible || previewFuture ? "visible" : "hidden",
			opacity: visible ? 1 : previewFuture ? futureStepOpacity : 0,
			transition: "opacity 300ms ease",
		},
	};
}

export type TimelineVisibilityWrapperProps = {
	children?: ReactNode;
};
