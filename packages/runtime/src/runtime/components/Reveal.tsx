import type { ReactNode } from "react";
import {
	TimelineReveal,
	type TimelineRevealElement,
} from "./TimelineReveal.tsx";

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
	as?: TimelineRevealElement;
	/** Slide-local target name for <RevealWith target="..."> synchronization. */
	name?: string;
	/** Additional CSS class for custom transition overrides. */
	className?: string;
	/** Remove hidden content from the DOM/layout instead of reserving space. */
	ephemeral?: boolean;
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
 * nearby content to jump around. With `ephemeral`, hidden content is not
 * rendered and does not reserve layout space.
 *
 * Reveals are cumulative: once visible, they stay visible as the presenter
 * advances. The default transition is a simple opacity fade.
 *
 * ```mdx
 * import { Reveal } from '@honeydeck/runtime'
 *
 * Visible from the start.
 *
 * <Reveal name="intro">This appears at step 1.</Reveal>
 *
 * <Reveal>This appears at step 2.</Reveal>
 * ```
 *
 * Honeydeck normally injects `at` during MDX compilation. It also injects `as`
 * from the MDX context so block reveals render as `div` and inline reveals
 * render as `span`. Optional `name` values are slide-local targets for
 * `<RevealWith target="...">`.
 */
export function Reveal({
	as = "div",
	at = 1,
	name,
	className = "",
	ephemeral = false,
	children,
}: RevealProps) {
	return (
		<TimelineReveal
			as={as}
			at={at}
			className={className}
			ephemeral={ephemeral}
			dataAttributes={{
				"data-honeydeck-reveal-id": name,
			}}
		>
			{children}
		</TimelineReveal>
	);
}
