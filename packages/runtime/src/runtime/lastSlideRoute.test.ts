import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
	getRememberedSlideRoute,
	rememberSlideRoute,
} from "../runtime/lastSlideRoute.ts";

function installSessionStorage(
	overrides: Partial<{
		getItem: (key: string) => string | null;
		setItem: (key: string, value: string) => void;
		removeItem: (key: string) => void;
		clear: () => void;
	}> = {},
) {
	const store = new Map<string, string>();
	Object.defineProperty(globalThis, "sessionStorage", {
		configurable: true,
		value: {
			getItem(key: string) {
				return overrides.getItem?.(key) ?? store.get(key) ?? null;
			},
			setItem(key: string, value: string) {
				if (overrides.setItem) {
					overrides.setItem(key, value);
					return;
				}
				store.set(key, value);
			},
			removeItem(key: string) {
				if (overrides.removeItem) {
					overrides.removeItem(key);
					return;
				}
				store.delete(key);
			},
			clear() {
				if (overrides.clear) {
					overrides.clear();
					return;
				}
				store.clear();
			},
		},
	});
}

describe("last slide route memory", () => {
	beforeEach(() => {
		installSessionStorage();
	});

	it("remembers the latest slide and step", () => {
		rememberSlideRoute({ view: "slide", slide: 4, step: 2 });

		assert.deepEqual(getRememberedSlideRoute(), {
			view: "slide",
			slide: 4,
			step: 2,
		});
	});

	it("does not replace the remembered slide when given a reference route", () => {
		rememberSlideRoute({ view: "slide", slide: 3, step: 1 });
		rememberSlideRoute({
			view: "kit",
			slide: 1,
			step: 0,
			kitTab: "theme",
		});

		assert.deepEqual(getRememberedSlideRoute(), {
			view: "slide",
			slide: 3,
			step: 1,
		});
	});

	it("falls back to slide 1 step 0 when no slide is known", () => {
		assert.deepEqual(getRememberedSlideRoute(), {
			view: "slide",
			slide: 1,
			step: 0,
		});
	});

	it("falls back to slide 1 step 0 when stored data is invalid", () => {
		installSessionStorage({
			getItem: () => "not json",
		});

		assert.deepEqual(getRememberedSlideRoute(), {
			view: "slide",
			slide: 1,
			step: 0,
		});
	});

	it("normalizes invalid stored slide and step values", () => {
		installSessionStorage({
			getItem: () => JSON.stringify({ view: "slide", slide: 0, step: -1 }),
		});

		assert.deepEqual(getRememberedSlideRoute(), {
			view: "slide",
			slide: 1,
			step: 0,
		});
	});

	it("falls back safely when sessionStorage is unavailable", () => {
		Object.defineProperty(globalThis, "sessionStorage", {
			configurable: true,
			value: undefined,
		});

		rememberSlideRoute({ view: "slide", slide: 4, step: 2 });

		assert.deepEqual(getRememberedSlideRoute(), {
			view: "slide",
			slide: 1,
			step: 0,
		});
	});
});
