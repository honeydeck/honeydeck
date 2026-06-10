import type { CSSProperties, ReactNode } from "react";
import { useTimeline } from "../TimelineContext.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RevealProps = {
	/**
	 * The step index at which this content becomes visible.
	 * Injected by the remark step-numbering plugin; defaults to 1.
	 */
	at?: number;
	/**
	 * Wrapper element. Injected by the compiler from MDX context:
	 * flow/block reveals use `div`, text/inline reveals use `span`.
	 */
	as?: "div" | "span";
	/** Additional CSS class for custom transition overrides. */
	className?: string;
	children?: ReactNode;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Timeline-driven reveal component for progressive slide content.
 *
 * Content appears when the slide's current step reaches `at`. Before that it
 * is invisible while still occupying layout space, so reveals do not cause
 * nearby content to jump around.
 *
 * Reveals are cumulative: once visible, they stay visible as the presenter
 * advances. The default transition is a simple opacity fade.
 *
 * ```mdx
 * import { Reveal } from '@honeydeck/honeydeck'
 *
 * Visible from the start.
 *
 * <Reveal>This appears at step 1.</Reveal>
 *
 * <Reveal>This appears at step 2.</Reveal>
 * ```
 *
 * Honeydeck normally injects `at` during MDX compilation. It also injects `as`
 * from the MDX context so block reveals render as `div` and inline reveals
 * render as `span`.
 */
export function Reveal({
	as: Component = "div",
	at = 1,
	className = "",
	children,
}: RevealProps) {
	const { stepIndex, showFutureSteps, futureStepOpacity } = useTimeline();
	const visible = stepIndex >= at;
	const previewFuture = !visible && showFutureSteps;

	const style: CSSProperties = {
		display: Component === "span" ? "inline" : "block",
		visibility: visible || previewFuture ? "visible" : "hidden",
		opacity: visible ? 1 : previewFuture ? futureStepOpacity : 0,
		transition: "opacity 300ms ease",
	};

	return (
		<Component
			className={[
				"honeydeck-reveal mb-[0.75em] text-[length:var(--honeydeck-font-size-body)] leading-[1.6] [&>:last-child]:mb-0",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={style}
		>
			{children}
		</Component>
	);
}
