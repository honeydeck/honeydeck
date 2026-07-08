import { type RefObject, useEffect, useRef } from "react";
import { slideData } from "../deck/slideData.ts";
import { shouldDeckOwnTouchGesture } from "./inputOwnership.ts";
import {
	nextSlide,
	nextStep,
	previousSlide,
	previousStep,
} from "./navigation.ts";
import type { Route } from "./router.ts";
import { parseHash } from "./router.ts";

export type PanDelta = { dx: number; dy: number };

export type UseSwipeNavOptions = {
	/** Whether touch navigation should be active. */
	enabled?: boolean;
	/** Minimum swipe distance in px before the gesture fires. @default 50 */
	threshold?: number;
	/** Current Honeydeck slide zoom. */
	zoom?: number;
	/** Gesture boundary. Scrollable ancestors are detected before this element. */
	boundaryRef?: RefObject<Element | null>;
	/** Called when the center tap zone is tapped. */
	onToggleNavBar?: () => void;
	/** Called when pinch/drag changes slide zoom. */
	onZoomChange?: (zoom: number) => void;
	/** Called when zoom should reset to 1. */
	onResetZoom?: () => void;
	/** Called when one-finger drag pans a zoomed slide. */
	onPanBy?: (delta: PanDelta) => void;
};

type TouchGestureState =
	| null
	| {
			kind: "single";
			x: number;
			y: number;
			lastX: number;
			lastY: number;
			owned: boolean;
	  }
	| {
			kind: "pinch";
			distance: number;
			initialZoom: number;
			lastFactor: number;
			lastZoom: number;
			owned: boolean;
	  };

const TAP_MAX_DISTANCE = 10;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_RESET_THRESHOLD = 1.05;

export function useSwipeNav({
	enabled = true,
	threshold = 50,
	zoom = 1,
	boundaryRef,
	onToggleNavBar,
	onZoomChange,
	onResetZoom,
	onPanBy,
}: UseSwipeNavOptions = {}): void {
	const gestureRef = useRef<TouchGestureState>(null);
	const zoomRef = useRef(zoom);
	zoomRef.current = zoom;

	const callbacksRef = useRef({
		onToggleNavBar,
		onZoomChange,
		onResetZoom,
		onPanBy,
	});
	callbacksRef.current = {
		onToggleNavBar,
		onZoomChange,
		onResetZoom,
		onPanBy,
	};

	useEffect(() => {
		if (!enabled) return;

		function getBoundary() {
			return boundaryRef?.current ?? null;
		}

		function onTouchStart(e: TouchEvent) {
			const owned = shouldDeckOwnTouchGesture(e.target, getBoundary());

			if (e.touches.length >= 2) {
				const distance = getTouchDistance(e.touches[0], e.touches[1]);
				gestureRef.current = {
					kind: "pinch",
					distance,
					initialZoom: zoomRef.current,
					lastFactor: 1,
					lastZoom: zoomRef.current,
					owned,
				};
				return;
			}

			const t = e.touches[0];
			if (!t) return;
			gestureRef.current = {
				kind: "single",
				x: t.clientX,
				y: t.clientY,
				lastX: t.clientX,
				lastY: t.clientY,
				owned,
			};
		}

		function onTouchMove(e: TouchEvent) {
			const state = gestureRef.current;
			if (!state?.owned) return;

			if (state.kind === "pinch" && e.touches.length >= 2) {
				const distance = getTouchDistance(e.touches[0], e.touches[1]);
				const factor = distance / state.distance;
				state.lastFactor = factor;

				const nextZoom = clampZoom(state.initialZoom * factor);
				state.lastZoom = nextZoom;
				if (nextZoom >= MIN_ZOOM) {
					callbacksRef.current.onZoomChange?.(nextZoom);
				}
				e.preventDefault();
				return;
			}

			if (state.kind === "single" && zoomRef.current > 1) {
				const t = e.touches[0];
				if (!t) return;
				callbacksRef.current.onPanBy?.({
					dx: t.clientX - state.lastX,
					dy: t.clientY - state.lastY,
				});
				state.lastX = t.clientX;
				state.lastY = t.clientY;
				e.preventDefault();
			}
		}

		function onTouchEnd(e: TouchEvent) {
			const state = gestureRef.current;
			if (!state) return;
			gestureRef.current = null;

			if (!state.owned) return;

			if (state.kind === "pinch") {
				const route = parseCurrentRoute();
				if (route.view !== "slide") return;

				if (state.lastZoom < ZOOM_RESET_THRESHOLD) {
					callbacksRef.current.onResetZoom?.();
				}
				return;
			}

			const t = e.changedTouches[0];
			if (!t) return;

			const dx = t.clientX - state.x;
			const dy = t.clientY - state.y;
			const adx = Math.abs(dx);
			const ady = Math.abs(dy);

			if (adx <= TAP_MAX_DISTANCE && ady <= TAP_MAX_DISTANCE) {
				handleTapZone(t.clientX, t.clientY, zoomRef.current > 1);
				return;
			}

			if (zoomRef.current > 1) return;
			if (adx < threshold && ady < threshold) return;

			const route = parseCurrentRoute();
			if (route.view !== "slide" && route.view !== "presenter") return;

			const options = {
				slideCount: slideData.length,
				getStepCount: (slideIndex: number) =>
					slideData[slideIndex]?.stepCount ?? 0,
			};

			if (adx >= ady) {
				if (dx < 0) nextStep(route, options);
				else previousStep(route, options);
			} else if (dy < 0) {
				nextSlide(route, options);
			} else {
				previousSlide(route, options);
			}
		}

		function handleTapZone(x: number, y: number, isZoomed: boolean) {
			const width = window.innerWidth || 1;
			const height = window.innerHeight || 1;
			const xRatio = x / width;
			const yRatio = y / height;

			const isCenter =
				yRatio >= 0.25 && yRatio <= 0.75 && xRatio >= 0.35 && xRatio <= 0.65;
			if (isCenter) {
				callbacksRef.current.onToggleNavBar?.();
				return;
			}

			if (isZoomed) return;

			const route = parseCurrentRoute();
			if (route.view !== "slide" && route.view !== "presenter") return;
			const options = {
				slideCount: slideData.length,
				getStepCount: (slideIndex: number) =>
					slideData[slideIndex]?.stepCount ?? 0,
			};

			if (yRatio < 0.25) previousSlide(route, options);
			else if (yRatio > 0.75) nextSlide(route, options);
			else if (xRatio < 0.35) previousStep(route, options);
			else if (xRatio > 0.65) nextStep(route, options);
			else callbacksRef.current.onToggleNavBar?.();
		}

		window.addEventListener("touchstart", onTouchStart, { passive: true });
		window.addEventListener("touchmove", onTouchMove, { passive: false });
		window.addEventListener("touchend", onTouchEnd, { passive: true });
		window.addEventListener("touchcancel", onTouchEnd, { passive: true });

		return () => {
			window.removeEventListener("touchstart", onTouchStart);
			window.removeEventListener("touchmove", onTouchMove);
			window.removeEventListener("touchend", onTouchEnd);
			window.removeEventListener("touchcancel", onTouchEnd);
		};
	}, [enabled, threshold, boundaryRef]);
}

function getTouchDistance(a: Touch, b: Touch): number {
	return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function clampZoom(value: number): number {
	return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function parseCurrentRoute(): Route {
	return parseHash(location.hash);
}
