import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("<NavBar>", () => {
	it("renders icon-only actions with explicit accessible labels", () => {
		const source = readFileSync(
			new URL("./NavBar.tsx", import.meta.url),
			"utf8",
		);
		const buttonSource = readFileSync(
			new URL("./NavBarButton.tsx", import.meta.url),
			"utf8",
		);

		assert.match(buttonSource, /aria-label=\{accessibleLabel\}/);

		for (const label of [
			"Previous step (←)",
			"Next step (→)",
			"Overview (o)",
			"Layouts reference",
			"Docs website",
			"Presenter mode (p)",
			"Fullscreen (f)",
			"Disable slide text selection",
			"Enable slide text selection",
			"Reset zoom",
		]) {
			assert.ok(
				source.includes(`label="${label}"`) || source.includes(`"${label}"`),
				`missing label: ${label}`,
			);
		}
	});

	it("hides presenter mode on mobile", () => {
		const source = readFileSync(
			new URL("./NavBar.tsx", import.meta.url),
			"utf8",
		);

		assert.match(source, /label="Presenter mode \(p\)"/);
		assert.match(source, /hidden md:block/);
	});

	it("keeps the floating controls bounded and wrappable on narrow screens", () => {
		const source = readFileSync(
			new URL("./NavBar.tsx", import.meta.url),
			"utf8",
		);

		assert.match(source, /max-w-\[calc\(100vw-1rem\)\]/);
		assert.match(source, /flex-wrap/);
		assert.match(source, /justify-center/);
		assert.match(source, /sm:flex-nowrap/);
	});
});
