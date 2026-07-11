/**
 * Hash-based router for Honeydeck.
 *
 * URL format:
 *   Audience:           /#/slideNumber/stepIndex
 *   Overview:           /#/overview/slideNumber/stepIndex
 *   Presenter:          /#/presenter/slideNumber/stepIndex
 *   Presenter overview: /#/presenter/overview/slideNumber/stepIndex
 *   Reference:          /#/theme, /#/layouts, /#/components
 *
 *   - slideNumber is 1-based
 *   - stepIndex is 0-based
 *
 * Examples:
 *   /#/1/0              → slide 1, initial state
 *   /#/1/2              → slide 1, step 2 active
 *   /#/3/0              → slide 3, initial state
 *   /#/presenter/2/1              → presenter view, slide 2, step 1
 *   /#/presenter/overview/2/1     → presenter overview, slide 2, step 1
 *   /#/theme        → runtime reference (theme tab)
 *   /#/layouts      → runtime reference (layouts tab)
 *   /#/components   → runtime reference (components tab)
 */

import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KitTab = "theme" | "layouts" | "components";

export type Route = {
	/** Which view is active. */
	view: "slide" | "overview" | "presenter" | "presenterOverview" | "kit";
	/** 1-based slide number (unused / defaults to 1 for reference routes) */
	slide: number;
	/** 0-based step index (unused / defaults to 0 for reference routes) */
	step: number;
	/** Active tab when view === 'kit' */
	kitTab?: KitTab;
};

// ---------------------------------------------------------------------------
// Pure helpers — no side effects, no browser globals
// ---------------------------------------------------------------------------

/**
 * Parse a `location.hash` string into a `Route`.
 *
 * Handles:
 *  - `""` or `"#"`              → default slide route
 *  - `"#/1/0"`                  → { view: 'slide', slide: 1, step: 0 }
 *  - `"#/overview/2/1"`              → { view: 'overview', slide: 2, step: 1 }
 *  - `"#/presenter/2/1"`             → { view: 'presenter', slide: 2, step: 1 }
 *  - `"#/presenter/overview/2/1"`    → { view: 'presenterOverview', slide: 2, step: 1 }
 *  - `"#/theme"`                → { view: 'kit', kitTab: 'theme', slide: 1, step: 0 }
 *  - `"#/layouts"`              → { view: 'kit', kitTab: 'layouts', slide: 1, step: 0 }
 *  - `"#/components"`           → { view: 'kit', kitTab: 'components', slide: 1, step: 0 }
 *  - `"#/2"`                    → { view: 'slide', slide: 2, step: 0 }
 *  - NaN / negative values      → clamp to valid range
 */
export function parseHash(hash: string): Route {
	// Strip leading '#' then split on '/'
	const raw = hash.startsWith("#") ? hash.slice(1) : hash;
	const parts = raw.split("/").filter(Boolean);

	if (
		parts[0] === "theme" ||
		parts[0] === "layouts" ||
		parts[0] === "components"
	) {
		return { view: "kit", slide: 1, step: 0, kitTab: parts[0] };
	}

	// Overview route: /overview/slide/step
	if (parts[0] === "overview") {
		const rawSlide = parseInt(parts[1] ?? "1", 10);
		const rawStep = parseInt(parts[2] ?? "0", 10);
		return {
			view: "overview",
			slide: Number.isNaN(rawSlide) || rawSlide < 1 ? 1 : rawSlide,
			step: Number.isNaN(rawStep) || rawStep < 0 ? 0 : rawStep,
		};
	}

	// Presenter overview route: /presenter/overview/slide/step
	if (parts[0] === "presenter" && parts[1] === "overview") {
		const rawSlide = parseInt(parts[2] ?? "1", 10);
		const rawStep = parseInt(parts[3] ?? "0", 10);
		return {
			view: "presenterOverview",
			slide: Number.isNaN(rawSlide) || rawSlide < 1 ? 1 : rawSlide,
			step: Number.isNaN(rawStep) || rawStep < 0 ? 0 : rawStep,
		};
	}

	// Presenter route: /presenter/slide/step
	if (parts[0] === "presenter") {
		const rawSlide = parseInt(parts[1] ?? "1", 10);
		const rawStep = parseInt(parts[2] ?? "0", 10);
		return {
			view: "presenter",
			slide: Number.isNaN(rawSlide) || rawSlide < 1 ? 1 : rawSlide,
			step: Number.isNaN(rawStep) || rawStep < 0 ? 0 : rawStep,
		};
	}

	// Regular slide route: /slide/step
	const rawSlide = parseInt(parts[0] ?? "1", 10);
	const rawStep = parseInt(parts[1] ?? "0", 10);
	return {
		view: "slide",
		slide: Number.isNaN(rawSlide) || rawSlide < 1 ? 1 : rawSlide,
		step: Number.isNaN(rawStep) || rawStep < 0 ? 0 : rawStep,
	};
}

/**
 * Convert a `Route` into a hash string suitable for `location.hash`.
 *
 * @example serializeRoute({ view: 'slide', slide: 2, step: 3 })       → '#/2/3'
 * @example serializeRoute({ view: 'presenter', slide: 2, step: 3 })  → '#/presenter/2/3'
 */
export function serializeRoute(route: Route): string {
	if (route.view === "kit") {
		if (route.kitTab === "theme") return "#/theme";
		if (route.kitTab === "layouts") return "#/layouts";
		if (route.kitTab === "components") return "#/components";
		return "#/theme";
	}
	if (route.view === "overview") {
		return `#/overview/${route.slide}/${route.step}`;
	}
	if (route.view === "presenterOverview") {
		return `#/presenter/overview/${route.slide}/${route.step}`;
	}
	if (route.view === "presenter") {
		return `#/presenter/${route.slide}/${route.step}`;
	}
	return `#/${route.slide}/${route.step}`;
}

// ---------------------------------------------------------------------------
// Browser-side API
// ---------------------------------------------------------------------------

/**
 * Navigate to a route by updating `location.hash`.
 * Triggers a `hashchange` event picked up by `useRoute()`.
 */
export function navigate(route: Route): void {
	location.hash = serializeRoute(route);
}

/**
 * React hook that returns the current route and re-renders on navigation.
 *
 * Uses the `hashchange` window event as the reactive signal.
 * Initial value is parsed from `location.hash` synchronously, so
 * server-side rendering or test environments without `location` will need
 * the pure helpers instead.
 */
export function useRoute(): Route {
	const [route, setRoute] = useState<Route>(() => parseHash(location.hash));

	useEffect(() => {
		const handler = () => setRoute(parseHash(location.hash));
		window.addEventListener("hashchange", handler);
		return () => window.removeEventListener("hashchange", handler);
	}, []);

	return route;
}
