import { useEffect, useRef } from "react";
import { type HotkeyDefinition, registerHotkeys } from "./hotkeys.ts";
import {
	nextSlide,
	nextStep,
	openPresenter,
	previousSlide,
	previousStep,
	toggleOverview,
} from "./navigation.ts";
import type { Route } from "./router.ts";
import { navigate, parseHash } from "./router.ts";

export type UseKeyboardNavOptions = {
	/** Whether this hook should register keyboard navigation. */
	enabled?: boolean;
	/** Total number of slides in the deck. */
	slideCount: number;
	/** Returns the total step count for a given 0-based slide index. */
	getStepCount: (slideIndex: number) => number;
	/** Called when the user presses `o` or `Escape` while in overview. */
	onToggleOverview?: () => void;
	/** Whether overview mode is currently active. */
	isOverview?: boolean;
};

export function useKeyboardNav({
	enabled = true,
	slideCount,
	getStepCount,
	onToggleOverview,
	isOverview,
}: UseKeyboardNavOptions): void {
	const slideCountRef = useRef(slideCount);
	slideCountRef.current = slideCount;

	const getStepCountRef = useRef(getStepCount);
	getStepCountRef.current = getStepCount;

	const onToggleOverviewRef = useRef(onToggleOverview);
	onToggleOverviewRef.current = onToggleOverview;

	const isOverviewRef = useRef(isOverview ?? false);
	isOverviewRef.current = isOverview ?? false;

	useEffect(() => {
		if (!enabled) return;

		function currentNavigationState() {
			const route: Route = parseHash(location.hash);
			const slideCount = slideCountRef.current;
			return {
				inOverview: isOverviewRef.current,
				options: {
					slideCount,
					getStepCount: getStepCountRef.current,
				},
				route,
				slideCount,
			};
		}

		function toggleOverviewFrom(route: Route) {
			if (onToggleOverviewRef.current) {
				onToggleOverviewRef.current();
			} else {
				toggleOverview(route);
			}
		}

		const hotkeys: HotkeyDefinition[] = [
			{
				id: "timeline.next-step",
				name: "Next step",
				description: "Advance to the next timeline step.",
				keys: ["ArrowRight", "d"],
				handler: () => {
					const { inOverview, options, route } = currentNavigationState();
					if (route.view === "kit" || inOverview) return false;
					nextStep(route, options);
				},
			},
			{
				id: "timeline.previous-step",
				name: "Previous step",
				description: "Move to the previous timeline step.",
				keys: ["ArrowLeft", "a"],
				handler: () => {
					const { inOverview, options, route } = currentNavigationState();
					if (route.view === "kit" || inOverview) return false;
					previousStep(route, options);
				},
			},
			{
				id: "timeline.next-slide",
				name: "Next slide",
				description: "Jump to the next slide.",
				keys: ["ArrowDown", "s"],
				handler: () => {
					const { inOverview, route, slideCount } = currentNavigationState();
					if (route.view === "kit" || inOverview) return false;
					nextSlide(route, { slideCount });
				},
			},
			{
				id: "timeline.previous-slide",
				name: "Previous slide",
				description: "Jump to the previous slide.",
				keys: ["ArrowUp", "w"],
				handler: () => {
					const { inOverview, route } = currentNavigationState();
					if (route.view === "kit" || inOverview) return false;
					previousSlide(route);
				},
			},
			{
				id: "overview.toggle",
				name: "Toggle overview",
				description: "Open or close the slide overview.",
				keys: ["o"],
				handler: () => {
					const { route } = currentNavigationState();
					if (route.view === "kit") return false;
					toggleOverviewFrom(route);
				},
			},
			{
				id: "presenter.open",
				name: "Open presenter mode",
				description: "Open presenter mode in the current tab.",
				keys: ["p"],
				handler: () => {
					const { route } = currentNavigationState();
					if (route.view === "kit") return false;
					if (
						route.view === "presenter" ||
						route.view === "presenterOverview"
					) {
						// Pressing p while already in presenter mode exits it entirely,
						// even when the presenter overview is open.
						navigate({
							view: "slide",
							slide: route.slide,
							step: route.step,
						});
						return;
					}
					openPresenter(route);
				},
			},
			{
				id: "fullscreen.toggle",
				name: "Toggle fullscreen",
				description: "Enter or exit browser fullscreen.",
				keys: ["f"],
				handler: () => {
					const { route } = currentNavigationState();
					if (route.view === "kit") return false;
					if (document.fullscreenElement) {
						document.exitFullscreen();
					} else {
						document.documentElement.requestFullscreen().catch(() => {
							// Fullscreen may be blocked (e.g. in iframes).
						});
					}
				},
			},
			{
				id: "overview.close",
				name: "Close overview",
				description: "Exit overview mode.",
				keys: ["Escape"],
				handler: () => {
					const { inOverview, route } = currentNavigationState();
					if (route.view === "kit") return false;
					if (inOverview) {
						// First Escape closes the overview and keeps the current slide/step.
						toggleOverviewFrom(route);
						return;
					}
					if (
						route.view === "presenter" ||
						route.view === "presenterOverview"
					) {
						// In plain presenter view, Escape exits presenter mode entirely.
						navigate({
							view: "slide",
							slide: route.slide,
							step: route.step,
						});
						return;
					}
					return false;
				},
			},
		];

		return registerHotkeys(window, hotkeys);
	}, [enabled]);
}
