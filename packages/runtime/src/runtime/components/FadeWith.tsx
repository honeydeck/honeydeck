import type { ReactNode } from "react";
import { useTimelineVisibility } from "./timelineVisibility.ts";

export type FadeWithProps = {
	/** Slide-local reveal target name or existing slide-local timeline step. */
	target?: string | number;
	/** Existing slide-local timeline step to fade with. */
	at?: number;
	/** Wrapper element. Injected by the compiler from MDX context. */
	as?: "div" | "span";
	/** Additional CSS class for custom transition overrides. */
	className?: string;
	/** Remove hidden content from the DOM/layout instead of reserving space. */
	ephemeral?: boolean;
	children?: ReactNode;
};

/** Fade content out at an explicit target step without creating a timeline step. */
export function FadeWith({
	as: Component = "div",
	at,
	target,
	className = "",
	ephemeral = false,
	children,
}: FadeWithProps) {
	const fadeAt = typeof target === "number" ? target : (at ?? 1);
	const { shouldRender, style } = useTimelineVisibility({
		mode: "fade",
		at: fadeAt,
		target: fadeAt,
		ephemeral,
	});

	if (!shouldRender) return null;

	return (
		<Component
			className={[
				"honeydeck-fade honeydeck-fade-with mb-[0.75em] text-[length:var(--honeydeck-font-size-body)] leading-[1.6] [&>:last-child]:mb-0",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={{
				display: Component === "span" ? "inline" : "block",
				...style,
			}}
			data-honeydeck-fade-with={typeof target === "string" ? target : undefined}
		>
			{children}
		</Component>
	);
}
