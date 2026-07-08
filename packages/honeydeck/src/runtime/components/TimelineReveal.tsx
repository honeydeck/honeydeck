import type { CSSProperties, ReactNode } from "react";
import { useTimeline } from "../timeline/TimelineContext.tsx";

export type TimelineRevealElement = "div" | "span";

export type TimelineRevealProps = {
	/** The step index at which this content becomes visible. */
	at?: number;
	/** Wrapper element chosen from MDX block/inline context. */
	as?: TimelineRevealElement;
	/** Additional CSS class for custom transition overrides. */
	className?: string;
	/** Remove hidden content from the DOM/layout instead of reserving space. */
	ephemeral?: boolean;
	/** Extra data attributes for debugging/inspection. */
	dataAttributes?: Record<string, string | undefined>;
	children?: ReactNode;
};

export type TimelineRevealStyleOptions = {
	stepIndex: number;
	at: number;
	showFutureSteps: boolean;
	futureStepOpacity: number;
	display?: CSSProperties["display"];
};

export function getTimelineRevealStyle({
	stepIndex,
	at,
	showFutureSteps,
	futureStepOpacity,
	display,
}: TimelineRevealStyleOptions): CSSProperties {
	const visible = stepIndex >= at;
	const previewFuture = !visible && showFutureSteps;

	return {
		...(display ? { display } : {}),
		visibility: visible || previewFuture ? "visible" : "hidden",
		opacity: visible ? 1 : previewFuture ? futureStepOpacity : 0,
		transition: "opacity 300ms ease",
	};
}

export function TimelineReveal({
	as: Component = "div",
	at = 1,
	className = "",
	ephemeral = false,
	dataAttributes,
	children,
}: TimelineRevealProps) {
	const { stepIndex, showFutureSteps, futureStepOpacity } = useTimeline();
	const visible = stepIndex >= at;
	const previewFuture = !visible && showFutureSteps;
	const style = getTimelineRevealStyle({
		stepIndex,
		at,
		showFutureSteps,
		futureStepOpacity,
		display: Component === "span" ? "inline" : "block",
	});

	if (ephemeral && !visible && !previewFuture) return null;

	return (
		<Component
			className={[
				"honeydeck-reveal mb-[0.75em] text-[length:var(--honeydeck-font-size-body)] leading-[1.6] [&>:last-child]:mb-0",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={style}
			{...dataAttributes}
		>
			{children}
		</Component>
	);
}
