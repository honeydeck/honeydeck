/**
 * SlideCanvas — renders a single slide at an arbitrary scale.
 *
 * Used by Deck (full-size, scale from viewport), PresenterView (medium
 * previews), and OverviewView (thumbnail grid).
 *
 * The canvas is always 1920 × 1080 px internally, then scaled down via
 * `transform: scale()` with `transformOrigin: 'top left'`.  The wrapper
 * div shrinks to the visual size (`BASE_WIDTH * scale × BASE_HEIGHT * scale`)
 * so that surrounding layout can measure and position it correctly.
 */

// Keep preview timeline providers on the public package graph so previewed deck
// components read the same React context as normal slide renders.
import { TimelineProvider } from "@honeydeck/runtime";
import { SlideScaleProvider } from "./SlideScaleContext.tsx";
import {
	BASE_HEIGHT,
	BASE_WIDTH,
	resolveLayout,
	slideData,
} from "./slideData.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SlideCanvasProps = {
	/** 0-based slide index. */
	slideIndex: number;
	/** Current step index for the timeline. */
	stepIndex: number;
	/**
	 * Uniform scale factor.  `1` = full 1920 × 1080.
	 * The wrapper div will have dimensions `BASE_WIDTH * scale × BASE_HEIGHT * scale`.
	 */
	scale: number;
	/** Optional extra styles applied to the outer wrapper. */
	style?: React.CSSProperties;
	/** Optional className applied to the outer wrapper. */
	className?: string;
	/** Show future reveal steps as muted previews instead of hiding them. */
	showFutureSteps?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SlideCanvas({
	slideIndex,
	stepIndex,
	scale,
	style,
	className,
	showFutureSteps = false,
}: SlideCanvasProps) {
	const data = slideData[slideIndex];
	if (!data) return null;

	const { Component, stepCount, title, frontmatter, layoutName } = data;
	const LayoutComponent = resolveLayout(layoutName);

	return (
		<div
			className={`relative overflow-hidden shrink-0 ${className ?? ""}`}
			style={{
				width: BASE_WIDTH * scale,
				height: BASE_HEIGHT * scale,
				...style,
			}}
		>
			<TimelineProvider
				stepIndex={stepIndex}
				stepCount={stepCount}
				showFutureSteps={showFutureSteps}
			>
				<SlideScaleProvider scale={scale}>
					<div
						className="honeydeck-slide-canvas absolute top-0 left-0 overflow-hidden box-border"
						style={{
							width: BASE_WIDTH,
							height: BASE_HEIGHT,
							transform: `scale(${scale})`,
							transformOrigin: "top left",
						}}
					>
						<LayoutComponent
							title={title || null}
							frontmatter={frontmatter}
							rawChildren={<Component />}
						>
							<Component />
						</LayoutComponent>
					</div>
				</SlideScaleProvider>
			</TimelineProvider>
		</div>
	);
}
