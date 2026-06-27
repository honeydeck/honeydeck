/**
 * NavBar — floating navigation controls for Honeydeck.
 *
 * ### Visibility
 * - **Desktop** (pointer: fine): hidden by default, fades in when the
 *   cursor hovers near the bottom edge of the screen (within the hover zone).
 * - **Touch/mobile** (pointer: coarse): always visible.
 *
 * ### Controls
 * - Previous step (←)
 * - Current slide number
 * - Next step (→)
 * - Overview grid toggle
 * - Layouts reference
 * - Docs website (opens new window)
 * - Presenter mode (opens current tab)
 * - Fullscreen toggle
 * - Mobile slide text selection toggle
 * - Color mode cycle (system → light → dark → system)
 */

import {
	BookOpenTextIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ExternalLinkIcon,
	LayoutGridIcon,
	MaximizeIcon,
	MinimizeIcon,
	PresentationIcon,
	RotateCcwIcon,
	TextSelectIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	getNextStepRoute,
	getPreviousStepRoute,
	nextStep,
	openDocsWebsite,
	openPresenter,
	openReference,
	previousStep,
} from "../navigation.ts";
import type { Route } from "../router.ts";
import { slideData } from "../slideData.ts";
import type { ColorMode } from "./ColorModeCycleButton.tsx";
import { ColorModeCycleButton } from "./ColorModeCycleButton.tsx";
import { NavBarButton, navBarButtonClass } from "./NavBarButton.tsx";
import { NavBarDivider } from "./NavBarDivider.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NavBarProps = {
	route: Route;
	isOverview: boolean;
	colorMode: ColorMode;
	onToggleOverview: () => void;
	onSetColorMode: (mode: ColorMode) => void;
	isZoomed?: boolean;
	onResetZoom?: () => void;
	showTextSelectionToggle?: boolean;
	isTextSelectionEnabled?: boolean;
	onToggleTextSelection?: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NavBar({
	route,
	isOverview,
	colorMode,
	onToggleOverview,
	onSetColorMode,
	isZoomed = false,
	onResetZoom,
	showTextSelectionToggle = false,
	isTextSelectionEnabled = false,
	onToggleTextSelection,
}: NavBarProps) {
	const navigationOptions = {
		slideCount: slideData.length,
		getStepCount: (slideIndex: number) => slideData[slideIndex]?.stepCount ?? 0,
	};

	// ISSUE-02: track fullscreen reactively via event listener
	const [isFullscreen, setIsFullscreen] = useState(
		!!document.fullscreenElement,
	);
	useEffect(() => {
		function onFullscreenChange() {
			setIsFullscreen(!!document.fullscreenElement);
		}
		document.addEventListener("fullscreenchange", onFullscreenChange);
		return () =>
			document.removeEventListener("fullscreenchange", onFullscreenChange);
	}, []);

	function goPrev() {
		previousStep(route, navigationOptions);
	}

	function goNext() {
		nextStep(route, navigationOptions);
	}

	function toggleFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			document.documentElement.requestFullscreen();
		}
	}

	const canPrev = getPreviousStepRoute(route, navigationOptions) !== null;
	const canNext = getNextStepRoute(route, navigationOptions) !== null;
	const FullscreenIcon = isFullscreen ? MinimizeIcon : MaximizeIcon;
	const groupClass =
		"flex items-center gap-0.5 rounded-md bg-white/[0.04] px-0.5 py-0.5 sm:bg-transparent sm:p-0";

	return (
		// Hover zone — transparent, occupies the bottom strip
		<div
			className="honeydeck-nav-zone fixed bottom-0 left-0 right-0 h-28 z-50 flex items-end justify-center pointer-events-none sm:h-20 sm:justify-start"
			data-honeydeck-no-swipe="true"
		>
			{/* Actual bar */}
			<div className="honeydeck-nav-bar pointer-events-auto mx-2 mb-2 flex max-w-[calc(100vw-1rem)] flex-wrap items-center justify-center gap-1 rounded-lg border border-white/10 bg-black/70 px-1.5 py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur sm:mx-0 sm:ml-6 sm:mb-6 sm:max-w-none sm:flex-nowrap sm:justify-start sm:gap-1 sm:px-2">
				<div className={groupClass}>
					{/* Prev step */}
					<NavBarButton
						onClick={goPrev}
						label="Previous step (←)"
						disabled={!canPrev}
					>
						<ChevronLeftIcon aria-hidden="true" size={16} />
					</NavBarButton>

					{/* Slide number */}
					<span className="min-w-6 px-1 text-center font-sans text-sm tabular-nums text-white/60">
						{route.slide}
					</span>

					{/* Next step */}
					<NavBarButton
						onClick={goNext}
						label="Next step (→)"
						disabled={!canNext}
					>
						<ChevronRightIcon aria-hidden="true" size={16} />
					</NavBarButton>
				</div>

				<div className="hidden sm:block">
					<NavBarDivider />
				</div>

				<div className={groupClass}>
					{/* Overview */}
					<NavBarButton
						onClick={onToggleOverview}
						label="Overview (o)"
						active={isOverview}
					>
						<LayoutGridIcon aria-hidden="true" size={14} />
					</NavBarButton>

					{/* Layouts reference */}
					<NavBarButton
						onClick={() => openReference(route)}
						label="Layouts reference"
					>
						<BookOpenTextIcon aria-hidden="true" size={16} />
					</NavBarButton>

					{/* Docs website */}
					<NavBarButton onClick={openDocsWebsite} label="Docs website">
						<ExternalLinkIcon aria-hidden="true" size={15} />
					</NavBarButton>

					{/* Presenter mode */}
					{route.view !== "presenter" && (
						<div className="hidden md:block">
							<NavBarButton
								onClick={() => openPresenter(route)}
								label="Presenter mode (p)"
							>
								<PresentationIcon aria-hidden="true" size={16} />
							</NavBarButton>
						</div>
					)}
				</div>

				<div className="hidden sm:block">
					<NavBarDivider />
				</div>

				<div className={groupClass}>
					{/* Fullscreen */}
					<NavBarButton onClick={toggleFullscreen} label="Fullscreen (f)">
						<FullscreenIcon aria-hidden="true" size={16} />
					</NavBarButton>

					{showTextSelectionToggle && onToggleTextSelection && (
						<NavBarButton
							onClick={onToggleTextSelection}
							label={
								isTextSelectionEnabled
									? "Disable slide text selection"
									: "Enable slide text selection"
							}
							active={isTextSelectionEnabled}
						>
							<TextSelectIcon aria-hidden="true" size={16} />
						</NavBarButton>
					)}

					{isZoomed && onResetZoom && (
						<NavBarButton onClick={onResetZoom} label="Reset zoom">
							<RotateCcwIcon aria-hidden="true" size={16} />
						</NavBarButton>
					)}

					{/* Color mode */}
					<ColorModeCycleButton
						colorMode={colorMode}
						onSetColorMode={onSetColorMode}
						className={navBarButtonClass()}
					/>
				</div>
			</div>
		</div>
	);
}
