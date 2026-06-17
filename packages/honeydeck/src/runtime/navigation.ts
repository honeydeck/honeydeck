import { rememberSlideRoute } from "./lastSlideRoute.ts";
import type { Route } from "./router.ts";
import { navigate, serializeRoute } from "./router.ts";

export type NavigationRoute = Route & {
	view: "slide" | "presenter" | "overview";
};

export type StepCountGetter = (slideIndex: number) => number;

export type NavigationOptions = {
	slideCount?: number;
	getStepCount?: StepCountGetter;
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
		route.view !== "overview"
	) {
		return null;
	}
	const totalSlides = getSlideCount(options);
	const slide = Math.max(1, Math.min(route.slide, totalSlides));
	return { ...route, slide } as NavigationRoute;
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

	if (navigable.slide > 1) {
		const prevSlide = navigable.slide - 1;
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

	const totalSlides = getSlideCount(options);
	const stepCount = getStepCountForSlide(navigable.slide - 1, options);

	if (navigable.step < stepCount) {
		return withRoutePosition(navigable, navigable.slide, navigable.step + 1);
	}

	if (navigable.slide < totalSlides) {
		return withRoutePosition(navigable, navigable.slide + 1, 0);
	}

	return null;
}

export function getPreviousSlideRoute(
	route: Route,
	options?: NavigationOptions,
): Route | null {
	const navigable = normalizeNavigableRoute(route, options);
	if (!navigable || navigable.slide <= 1) return null;
	return withRoutePosition(navigable, navigable.slide - 1, 0);
}

export function getNextSlideRoute(
	route: Route,
	options?: NavigationOptions,
): Route | null {
	const navigable = normalizeNavigableRoute(route, options);
	if (!navigable) return null;
	const totalSlides = getSlideCount(options);
	if (navigable.slide >= totalSlides) return null;
	return withRoutePosition(navigable, navigable.slide + 1, 0);
}

export function getOverviewRoute(
	route: Route,
	options?: NavigationOptions,
): Route | null {
	const navigable = normalizeNavigableRoute(route, options);
	if (!navigable) return null;
	if (navigable.view === "overview") return navigable;
	return { view: "overview", slide: navigable.slide, step: navigable.step };
}

export function getSlideRouteFromRoute(
	route: Route,
	options?: NavigationOptions,
): Route | null {
	const navigable = normalizeNavigableRoute(route, options);
	if (!navigable) return null;
	return { view: "slide", slide: navigable.slide, step: navigable.step };
}

export function getToggleOverviewRoute(
	route: Route,
	options?: NavigationOptions,
): Route | null {
	if (route.view === "overview") return getSlideRouteFromRoute(route, options);
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
