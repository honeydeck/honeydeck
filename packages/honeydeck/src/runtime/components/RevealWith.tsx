import type { ReactNode } from "react";
import {
	TimelineReveal,
	type TimelineRevealElement,
} from "./TimelineReveal.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RevealWithProps = {
	/**
	 * Slide-local reveal target name or existing slide-local timeline step.
	 * String targets are resolved by the compiler to an internal `at` value.
	 */
	target?: string | number;
	/** Existing slide-local timeline step to reveal with. */
	at?: number;
	/**
	 * Wrapper element. Injected by the compiler from MDX context:
	 * flow/block usages use `div`, text/inline usages use `span`.
	 */
	as?: TimelineRevealElement;
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
 * Reveals content at the same timeline step as an existing reveal or explicit
 * slide-local step, without creating a new step.
 */
export function RevealWith({
	as = "div",
	at,
	target,
	className = "",
	ephemeral = false,
	children,
}: RevealWithProps) {
	const revealAt = typeof target === "number" ? target : (at ?? 1);

	return (
		<TimelineReveal
			as={as}
			at={revealAt}
			className={className}
			ephemeral={ephemeral}
			dataAttributes={{
				"data-honeydeck-reveal-with":
					typeof target === "string" ? target : undefined,
			}}
		>
			{children}
		</TimelineReveal>
	);
}
