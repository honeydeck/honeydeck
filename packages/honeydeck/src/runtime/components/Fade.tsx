import type { ReactNode } from "react";
import { useTimelineVisibility } from "./timelineVisibility.ts";

export type FadeProps = {
	/** The step index at which this content fades out. */
	at?: number;
	/** Wrapper element. Injected by the compiler from MDX context. */
	as?: "div" | "span";
	/** Additional CSS class for custom transition overrides. */
	className?: string;
	/** Remove hidden content from the DOM/layout instead of reserving space. */
	ephemeral?: boolean;
	children?: ReactNode;
};

/**
 * Timeline-driven fade component for content that starts visible and disappears
 * once the slide reaches its assigned step.
 */
export function Fade({
	as: Component = "div",
	at = 1,
	className = "",
	ephemeral = false,
	children,
}: FadeProps) {
	const { shouldRender, style } = useTimelineVisibility({
		mode: "fade",
		at,
		ephemeral,
	});

	if (!shouldRender) return null;

	return (
		<Component
			className={[
				"honeydeck-fade mb-[0.75em] text-[length:var(--honeydeck-font-size-body)] leading-[1.6] [&>:last-child]:mb-0",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={{
				display: Component === "span" ? "inline" : "block",
				...style,
			}}
		>
			{children}
		</Component>
	);
}
