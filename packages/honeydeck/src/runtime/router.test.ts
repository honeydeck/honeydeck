/**
 * Tests for the Honeydeck hash router — pure functions only.
 *
 * `parseHash` and `serializeRoute` have no browser dependencies and can be
 * tested directly in Node.js with `node:test`. The React hooks (`useRoute`,
 * `navigate`) rely on browser globals and are exercised in integration/e2e
 * tests instead.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseHash, serializeRoute } from "../runtime/router.ts";

// ---------------------------------------------------------------------------
// parseHash — slide routes
// ---------------------------------------------------------------------------

describe("parseHash (slide routes)", () => {
	// ── Happy path ─────────────────────────────────────────────────────────────

	it("parses #/1/0 → slide 1, step 0", () => {
		assert.deepEqual(parseHash("#/1/0"), { view: "slide", slide: 1, step: 0 });
	});

	it("parses #/3/2 → slide 3, step 2", () => {
		assert.deepEqual(parseHash("#/3/2"), { view: "slide", slide: 3, step: 2 });
	});

	it("parses #/10/5 → slide 10, step 5", () => {
		assert.deepEqual(parseHash("#/10/5"), {
			view: "slide",
			slide: 10,
			step: 5,
		});
	});

	// ── Missing parts ──────────────────────────────────────────────────────────

	it("empty string → defaults to slide 1, step 0", () => {
		assert.deepEqual(parseHash(""), { view: "slide", slide: 1, step: 0 });
	});

	it('bare "#" → defaults to slide 1, step 0', () => {
		assert.deepEqual(parseHash("#"), { view: "slide", slide: 1, step: 0 });
	});

	it("#/2 (missing step) → slide 2, step 0", () => {
		assert.deepEqual(parseHash("#/2"), { view: "slide", slide: 2, step: 0 });
	});

	// ── Invalid / edge values ──────────────────────────────────────────────────

	it("NaN slide → clamp to slide 1", () => {
		assert.deepEqual(parseHash("#/foo/0"), {
			view: "slide",
			slide: 1,
			step: 0,
		});
	});

	it("NaN step → clamp to step 0", () => {
		assert.deepEqual(parseHash("#/1/bar"), {
			view: "slide",
			slide: 1,
			step: 0,
		});
	});

	it("slide 0 (below minimum) → clamp to slide 1", () => {
		assert.deepEqual(parseHash("#/0/0"), { view: "slide", slide: 1, step: 0 });
	});

	it("negative slide → clamp to slide 1", () => {
		assert.deepEqual(parseHash("#/-5/0"), { view: "slide", slide: 1, step: 0 });
	});

	it("negative step → clamp to step 0", () => {
		assert.deepEqual(parseHash("#/1/-3"), { view: "slide", slide: 1, step: 0 });
	});

	// ── No leading '#' ────────────────────────────────────────────────────────

	it('"/1/0" (no hash prefix) → slide 1, step 0', () => {
		assert.deepEqual(parseHash("/1/0"), { view: "slide", slide: 1, step: 0 });
	});
});

// ---------------------------------------------------------------------------
// parseHash — overview routes
// ---------------------------------------------------------------------------

describe("parseHash (overview routes)", () => {
	it("parses #/overview/1/0 → overview view, slide 1, step 0", () => {
		assert.deepEqual(parseHash("#/overview/1/0"), {
			view: "overview",
			slide: 1,
			step: 0,
		});
	});

	it("parses #/overview/3/2 → overview view, slide 3, step 2", () => {
		assert.deepEqual(parseHash("#/overview/3/2"), {
			view: "overview",
			slide: 3,
			step: 2,
		});
	});

	it("#/overview/2 (missing step) → step 0", () => {
		assert.deepEqual(parseHash("#/overview/2"), {
			view: "overview",
			slide: 2,
			step: 0,
		});
	});

	it("#/overview/0/-1 → clamps slide and step", () => {
		assert.deepEqual(parseHash("#/overview/0/-1"), {
			view: "overview",
			slide: 1,
			step: 0,
		});
	});
});

// ---------------------------------------------------------------------------
// parseHash — presenter routes
// ---------------------------------------------------------------------------

describe("parseHash (presenter routes)", () => {
	it("parses #/presenter/1/0 → presenter view, slide 1, step 0", () => {
		assert.deepEqual(parseHash("#/presenter/1/0"), {
			view: "presenter",
			slide: 1,
			step: 0,
		});
	});

	it("parses #/presenter/3/2 → presenter view, slide 3, step 2", () => {
		assert.deepEqual(parseHash("#/presenter/3/2"), {
			view: "presenter",
			slide: 3,
			step: 2,
		});
	});

	it("#/presenter/2 (missing step) → step 0", () => {
		assert.deepEqual(parseHash("#/presenter/2"), {
			view: "presenter",
			slide: 2,
			step: 0,
		});
	});

	it("#/presenter/0/0 → clamp slide to 1", () => {
		assert.deepEqual(parseHash("#/presenter/0/0"), {
			view: "presenter",
			slide: 1,
			step: 0,
		});
	});

	it("#/presenter/1/-3 → clamp step to 0", () => {
		assert.deepEqual(parseHash("#/presenter/1/-3"), {
			view: "presenter",
			slide: 1,
			step: 0,
		});
	});
});

// ---------------------------------------------------------------------------
// parseHash — reference routes
// ---------------------------------------------------------------------------

describe("parseHash (reference routes)", () => {
	it("parses #/theme → reference view, theme tab", () => {
		assert.deepEqual(parseHash("#/theme"), {
			view: "kit",
			slide: 1,
			step: 0,
			kitTab: "theme",
		});
	});

	it("parses #/layouts → reference view, layouts tab", () => {
		assert.deepEqual(parseHash("#/layouts"), {
			view: "kit",
			slide: 1,
			step: 0,
			kitTab: "layouts",
		});
	});

	it("parses #/components → reference view, components tab", () => {
		assert.deepEqual(parseHash("#/components"), {
			view: "kit",
			slide: 1,
			step: 0,
			kitTab: "components",
		});
	});

	it("unknown #/kit falls back to the default slide route", () => {
		assert.deepEqual(parseHash("#/kit"), { view: "slide", slide: 1, step: 0 });
	});
});

// ---------------------------------------------------------------------------
// serializeRoute
// ---------------------------------------------------------------------------

describe("serializeRoute", () => {
	it("slide view: slide 1, step 0 → #/1/0", () => {
		assert.equal(serializeRoute({ view: "slide", slide: 1, step: 0 }), "#/1/0");
	});

	it("slide view: slide 3, step 2 → #/3/2", () => {
		assert.equal(serializeRoute({ view: "slide", slide: 3, step: 2 }), "#/3/2");
	});

	it("slide view: slide 10, step 5 → #/10/5", () => {
		assert.equal(
			serializeRoute({ view: "slide", slide: 10, step: 5 }),
			"#/10/5",
		);
	});

	it("overview view: slide 3, step 1 → #/overview/3/1", () => {
		assert.equal(
			serializeRoute({ view: "overview", slide: 3, step: 1 }),
			"#/overview/3/1",
		);
	});

	it("presenter view: slide 2, step 1 → #/presenter/2/1", () => {
		assert.equal(
			serializeRoute({ view: "presenter", slide: 2, step: 1 }),
			"#/presenter/2/1",
		);
	});

	it("reference view: theme tab → #/theme", () => {
		assert.equal(
			serializeRoute({ view: "kit", slide: 1, step: 0, kitTab: "theme" }),
			"#/theme",
		);
	});

	it("reference view: layouts tab → #/layouts", () => {
		assert.equal(
			serializeRoute({ view: "kit", slide: 1, step: 0, kitTab: "layouts" }),
			"#/layouts",
		);
	});

	it("reference view: components tab → #/components", () => {
		assert.equal(
			serializeRoute({
				view: "kit",
				slide: 1,
				step: 0,
				kitTab: "components",
			}),
			"#/components",
		);
	});
});

// ---------------------------------------------------------------------------
// Round-trip: parseHash(serializeRoute(route)) === route
// ---------------------------------------------------------------------------

describe("round-trip", () => {
	const cases = [
		{ view: "slide" as const, slide: 2, step: 3 },
		{ view: "overview" as const, slide: 3, step: 1 },
		{ view: "presenter" as const, slide: 4, step: 2 },
		{ view: "kit" as const, slide: 1, step: 0, kitTab: "theme" as const },
	];

	for (const route of cases) {
		const label =
			route.view === "kit"
				? `view: 'kit', tab: '${route.kitTab}'`
				: `view: '${route.view}', slide: ${route.slide}, step: ${route.step}`;

		it(`round-trips { ${label} }`, () => {
			assert.deepEqual(parseHash(serializeRoute(route)), route);
		});
	}
});
