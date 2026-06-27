import { useEffect, useRef } from "react";
import { isEditableKeyboardTarget } from "./keyboardTarget.ts";
import {
	nextSlide,
	nextStep,
	openPresenter,
	previousSlide,
	previousStep,
	toggleOverview,
} from "./navigation.ts";
import type { Route } from "./router.ts";
import { parseHash } from "./router.ts";

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

		const handler = (e: KeyboardEvent) => {
			if (isEditableKeyboardTarget(e.target)) return;

			const route: Route = parseHash(location.hash);
			if (route.view === "kit") return;

			const total = slideCountRef.current;
			const options = {
				slideCount: total,
				getStepCount: getStepCountRef.current,
			};
			const inOverview = isOverviewRef.current;

			switch (e.key) {
				case "ArrowRight":
				case "d": {
					e.preventDefault();
					if (!inOverview) nextStep(route, options);
					break;
				}

				case "ArrowLeft":
				case "a": {
					e.preventDefault();
					if (!inOverview) previousStep(route, options);
					break;
				}

				case "ArrowDown":
				case "s": {
					e.preventDefault();
					if (!inOverview) nextSlide(route, { slideCount: total });
					break;
				}

				case "ArrowUp":
				case "w": {
					e.preventDefault();
					if (!inOverview) previousSlide(route);
					break;
				}

				case "o": {
					e.preventDefault();
					if (onToggleOverviewRef.current) {
						onToggleOverviewRef.current();
					} else {
						toggleOverview(route);
					}
					break;
				}

				case "p": {
					if (route.view !== "presenter") {
						e.preventDefault();
						openPresenter(route);
					}
					break;
				}

				case "f": {
					e.preventDefault();
					if (document.fullscreenElement) {
						document.exitFullscreen();
					} else {
						document.documentElement.requestFullscreen().catch(() => {
							// Fullscreen may be blocked (e.g. in iframes).
						});
					}
					break;
				}

				case "Escape": {
					if (isOverviewRef.current) {
						e.preventDefault();
						if (onToggleOverviewRef.current) {
							onToggleOverviewRef.current();
						} else {
							toggleOverview(route);
						}
					}
					break;
				}
			}
		};

		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [enabled]);
}
