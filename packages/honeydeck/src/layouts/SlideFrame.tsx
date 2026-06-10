/**
 * SlideFrame — shared wrapper for all slide layouts.
 *
 * Provides the common structure every layout needs:
 * - Full-size container (fills the deck canvas)
 * - Content padding from `--honeydeck-slide-padding` CSS variable
 * - Flex column layout
 * - Overflow clipping
 *
 * Layouts compose on top of this by passing `className` for their specific
 * styling (background, text color, alignment, etc.).
 *
 * @example
 * ```tsx
 * <SlideFrame className="bg-primary text-primary-foreground items-center justify-center text-center">
 *   <h1>Section Title</h1>
 * </SlideFrame>
 * ```
 */

import type { ReactNode } from "react";
import { cn } from "./utils.ts";

export type SlideFrameProps = {
	children: ReactNode;
	/** Additional Tailwind classes for layout-specific styling (bg, alignment, etc.) */
	className?: string;
	/** Set to false for layouts that manage their own padding (e.g. Image with edge-to-edge elements). */
	padded?: boolean;
};

export function SlideFrame({
	children,
	className = "",
	padded = true,
}: SlideFrameProps) {
	return (
		<div
			className={cn(
				"relative size-full flex flex-col overflow-hidden bg-background text-foreground font-body",
				padded && "p-[var(--honeydeck-slide-padding)]",
				className,
			)}
		>
			{children}
		</div>
	);
}
