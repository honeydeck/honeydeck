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
	 * Slide-local reveal target name. Authored as `target="name"` and resolved
	 * by the compiler to an internal `at` value.
	 */
	target?: string;
	/**
	 * Existing slide-local timeline step to reveal with. Authored for numeric
	 * step sync or injected by the compiler when `target` is used.
	 */
	at?: number;
	/**
	 * Wrapper element. Injected by the compiler from MDX context:
	 * flow/block usages use `div`, text/inline usages use `span`.
	 */
	as?: TimelineRevealElement;
	/** Additional CSS class for custom transition overrides. */
	className?: string;
	children?: ReactNode;
} & ({ target: string; at?: never } | { target?: never; at: number });

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Reveals content at the same timeline step as an existing reveal or explicit
 * slide-local step, without creating a new step.
 *
 * Use `target` to sync with a named `<Reveal name="...">`, or `at` to sync
 * with any existing slide-local timeline step such as a code highlight,
 * `RevealGroup` item, Magic Code state, or `TimelineSteps` state.
 *
 * ```mdx
 * import { Reveal, RevealWith } from '@honeydeck/honeydeck'
 *
 * <Reveal name="intro">Intro appears first</Reveal>
 * <RevealWith target="intro">This appears with the intro reveal</RevealWith>
 *
 * ```ts {1|2|3}
 * const answer = 42
 * console.log(answer)
 * ```
 *
 * <RevealWith at={2}>This appears with step 2</RevealWith>
 * ```
 *
 * Honeydeck resolves `target` and validates `at` during MDX compilation. The
 * component shares the same cumulative fade and future-step preview behavior as
 * `<Reveal>`.
 */
export function RevealWith({
	as = "div",
	at = 1,
	target,
	className = "",
	children,
}: RevealWithProps) {
	return (
		<TimelineReveal
			as={as}
			at={at}
			className={className}
			dataAttributes={{
				"data-honeydeck-reveal-with": target,
			}}
		>
			{children}
		</TimelineReveal>
	);
}
