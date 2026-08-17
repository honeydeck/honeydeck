/**
 * Navigation options for the loaded deck.
 *
 * Every input surface (keyboard, touch, navigation bar, presenter) navigates
 * with the same slide count, step counts, and hidden-slide rules, so they all
 * read those from one place.
 */

import {
	getSlideStepCount,
	isSlideHidden,
	slideData,
} from "../deck/slideData.ts";
import type { NavigationOptions } from "./navigation.ts";

export function getDeckNavigationOptions(): NavigationOptions {
	return {
		slideCount: slideData.length,
		getStepCount: getSlideStepCount,
		isSlideHidden,
	};
}
