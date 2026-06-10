import type { Route } from "./router.ts";

const STORAGE_KEY = "honeydeck:last-slide-route";
const FALLBACK_SLIDE_ROUTE: Route = { view: "slide", slide: 1, step: 0 };

function isStorageAvailable(): boolean {
	return typeof sessionStorage !== "undefined";
}

function toStoredSlideRoute(route: Route): Route | null {
	if (route.view !== "slide") return null;

	const slide =
		Number.isFinite(route.slide) && route.slide >= 1 ? route.slide : 1;
	const step = Number.isFinite(route.step) && route.step >= 0 ? route.step : 0;

	return { view: "slide", slide, step };
}

export function rememberSlideRoute(route: Route): void {
	const slideRoute = toStoredSlideRoute(route);
	if (!slideRoute || !isStorageAvailable()) return;

	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slideRoute));
	} catch {
		// Session storage can be unavailable in restrictive browser contexts.
	}
}

export function getRememberedSlideRoute(): Route {
	if (!isStorageAvailable()) return FALLBACK_SLIDE_ROUTE;

	try {
		const value = sessionStorage.getItem(STORAGE_KEY);
		if (!value) return FALLBACK_SLIDE_ROUTE;

		const parsed = JSON.parse(value) as Partial<Route>;
		const slide =
			typeof parsed.slide === "number" &&
			Number.isFinite(parsed.slide) &&
			parsed.slide >= 1
				? parsed.slide
				: 1;
		const step =
			typeof parsed.step === "number" &&
			Number.isFinite(parsed.step) &&
			parsed.step >= 0
				? parsed.step
				: 0;

		return { view: "slide", slide, step };
	} catch {
		return FALLBACK_SLIDE_ROUTE;
	}
}
