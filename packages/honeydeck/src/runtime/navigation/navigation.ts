import { rememberSlideRoute } from "./lastSlideRoute.ts";
import type { Route } from "./router.ts";
import { navigate, serializeRoute } from "./router.ts";

export type NavigationRoute = Route & {
	view: "slide" | "presenter" | "presenterOverview" | "overview";
};

export type StepCountGetter = (slideIndex: number) => number;

export type SlideHiddenGetter = (slideIndex: number) => boolean;

export type NavigationOptions = {
	slideCount?: number;
	getStepCount?: StepCountGetter;
	/**
	 * Returns whether the 0-based slide index is hidden from the normal timeline.
	 * Hidden slides keep their slide number and stay reachable through explicit
	 * navigation, but step/slide navigation skips them.
	 */
	isSlideHidden?: SlideHiddenGetter;
};

function getSlideCount(options?: NavigationOptions): number {
	return options?.slideCount ?? Number.POSITIVE_INFINITY;
}

function getStepCountForSlide(
	slideIndex: number,
	options?: NavigationOptions,
): number {
	return options?.getStepCount?.(slideIndex) ?? 0;
}

function normalizeNavigableRoute(
	route: Route,
	options?: NavigationOptions,
): NavigationRoute | null {
	if (
		route.view !== "slide" &&
		route.view !== "presenter" &&
		route.view !== "presenterOverview" &&
		route.view !== "overview"
	) {
		return null;
	}
	const totalSlides = getSlideCount(options);
	const slide = Math.max(1, Math.min(route.slide, totalSlides));
	return { ...route, slide } as NavigationRoute;
}

/**
 * Find the nearest slide in `direction` that timeline navigation may land on.
 * Returns `null` when only hidden slides or no slides remain in that direction.
 */
function findNavigableSlide(
	fromSlide: number,
	direction: 1 | -1,
	options?: NavigationOptions,
): number | null {
	const totalSlides = getSlideCount(options);
	const firstCandidate = fromSlide + direction;

	if (!Number.isFinite(totalSlides)) {
		return firstCandidate >= 1 ? firstCandidate : null;
	}

	for (
		let slide = firstCandidate;
		slide >= 1 && slide <= totalSlides;
		slide += direction
	) {
		if (options?.isSlideHidden?.(slide - 1) !== true) return slide;
	}

	return null;
}

function withRoutePosition(
	route: NavigationRoute,
	slide: number,
	step: number,
): Route {
	return { ...route, slide, step };
}

export function getRouteUrl(route: Route, baseUrl?: string): string {
	const url = new URL(baseUrl ?? location.href);
	url.hash = serializeRoute(route);
	return url.toString();
}

export function openUrlInNewTab(url: string): void {
	const opened = window.open(url, "_blank", "noopener,noreferrer");
	if (opened) {
		opened.opener = null;
	}
}

export function getPreviousStepRoute(
	route: Route,
	options?: NavigationOptions,
): Route | null {
	const navigable = normalizeNavigableRoute(route, options);
	if (!navigable) return null;

	if (navigable.step > 0) {
		return withRoutePosition(navigable, navigable.slide, navigable.step - 1);
	}

	const prevSlide = findNavigableSlide(navigable.slide, -1, options);
	if (prevSlide !== null) {
		const prevSteps = getStepCountForSlide(prevSlide - 1, options);
		return withRoutePosition(navigable, prevSlide, prevSteps);
	}

	return null;
}

export function getNextStepRoute(
	route: Route,
	options?: NavigationOptions,
): Route | null {
	const navigable = normalizeNavigableRoute(route, options);
	if (!navigable) return null;

	const stepCount = getStepCountForSlide(navigable.slide - 1, options);

	if (navigable.step < stepCount) {
		return withRoutePosition(navigable, navigable.slide, navigable.step + 1);
	}

	const nextSlide = findNavigableSlide(navigable.slide, 1, options);
	if (nextSlide !== null) {
		return withRoutePosition(navigable, nextSlide, 0);
	}

	return null;
}

export function getPreviousSlideRoute(
	route: Route,
	options?: NavigationOptions,
): Route | null {
	const navigable = normalizeNavigableRoute(route, options);
	if (!navigable) return null;
	const prevSlide = findNavigableSlide(navigable.slide, -1, options);
	if (prevSlide === null) return null;
	return withRoutePosition(navigable, prevSlide, 0);
}

export function getNextSlideRoute(
	route: Route,
	options?: NavigationOptions,
): Route | null {
	const navigable = normalizeNavigableRoute(route, options);
	if (!navigable) return null;
	const nextSlide = findNavigableSlide(navigable.slide, 1, options);
	if (nextSlide === null) return null;
	return withRoutePosition(navigable, nextSlide, 0);
}

export function getOverviewRoute(
	route: Route,
	options?: NavigationOptions,
): Route | null {
	const navigable = normalizeNavigableRoute(route, options);
	if (!navigable) return null;
	if (navigable.view === "overview" || navigable.view === "presenterOverview") {
		return navigable;
	}
	if (navigable.view === "presenter") {
		return {
			view: "presenterOverview",
			slide: navigable.slide,
			step: navigable.step,
		};
	}
	return { view: "overview", slide: navigable.slide, step: navigable.step };
}

export function getSlideRouteFromRoute(
	route: Route,
	options?: NavigationOptions,
): Route | null {
	const navigable = normalizeNavigableRoute(route, options);
	if (!navigable) return null;
	if (
		navigable.view === "presenter" ||
		navigable.view === "presenterOverview"
	) {
		return { view: "presenter", slide: navigable.slide, step: navigable.step };
	}
	return { view: "slide", slide: navigable.slide, step: navigable.step };
}

export function getToggleOverviewRoute(
	route: Route,
	options?: NavigationOptions,
): Route | null {
	if (route.view === "overview" || route.view === "presenterOverview") {
		return getSlideRouteFromRoute(route, options);
	}
	return getOverviewRoute(route, options);
}

export function getReferenceRoute(): Route {
	return { view: "kit", slide: 1, step: 0, kitTab: "layouts" };
}

export function getDocsWebsiteUrl(): string {
	return "https://honeydeck.dev";
}

export function navigateTo(route: Route | null): void {
	if (route) navigate(route);
}

export function previousStep(route: Route, options?: NavigationOptions): void {
	navigateTo(getPreviousStepRoute(route, options));
}

export function nextStep(route: Route, options?: NavigationOptions): void {
	navigateTo(getNextStepRoute(route, options));
}

export function previousSlide(route: Route, options?: NavigationOptions): void {
	navigateTo(getPreviousSlideRoute(route, options));
}

export function nextSlide(route: Route, options?: NavigationOptions): void {
	navigateTo(getNextSlideRoute(route, options));
}

export function openOverview(route: Route, options?: NavigationOptions): void {
	navigateTo(getOverviewRoute(route, options));
}

export function closeOverview(route: Route, options?: NavigationOptions): void {
	navigateTo(getSlideRouteFromRoute(route, options));
}

export function toggleOverview(
	route: Route,
	options?: NavigationOptions,
): void {
	navigateTo(getToggleOverviewRoute(route, options));
}

export function openReference(route: Route): void {
	if (route.view === "slide" || route.view === "overview") {
		rememberSlideRoute({ view: "slide", slide: route.slide, step: route.step });
	}
	navigate(getReferenceRoute());
}

export function openDocsWebsite(): void {
	openUrlInNewTab(getDocsWebsiteUrl());
}

export function getPresenterRoute(route: Route): Route | null {
	if (route.view === "kit") return null;
	return { view: "presenter", slide: route.slide, step: route.step };
}

export function openPresenter(route: Route): void {
	navigateTo(getPresenterRoute(route));
}
