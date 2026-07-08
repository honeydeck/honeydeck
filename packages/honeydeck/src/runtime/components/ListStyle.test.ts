import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ListStyle } from "./ListStyle.tsx";

function listWithNestedItem() {
	return createElement(
		"ul",
		null,
		createElement(
			"li",
			null,
			"Parent",
			createElement("ul", null, createElement("li", null, "Child")),
		),
	);
}

describe("<ListStyle>", () => {
	it("keeps nested lists intact when markers are omitted", () => {
		const html = renderToStaticMarkup(
			createElement(ListStyle, null, listWithNestedItem()),
		);

		assert.match(html, /<ul><li>Parent<ul><li>Child<\/li><\/ul><\/li><\/ul>/);
		assert.doesNotMatch(html, /aria-hidden="true"/);
	});

	it("treats falsey bullet settings as plain lists", () => {
		for (const bullets of [false, null, "none", []] as const) {
			const html = renderToStaticMarkup(
				createElement(ListStyle, { bullets }, listWithNestedItem()),
			);

			assert.match(html, /<ul><li>Parent<ul><li>Child<\/li><\/ul><\/li><\/ul>/);
			assert.doesNotMatch(html, /aria-hidden="true"/);
		}
	});

	it("renders custom bullets for each nesting level", () => {
		const html = renderToStaticMarkup(
			createElement(ListStyle, { bullets: ["→", "–"] }, listWithNestedItem()),
		);

		assert.match(html, /→[\s\S]*Parent[\s\S]*–[\s\S]*Child/);
		assert.equal((html.match(/→/g) ?? []).length, 1);
		assert.equal((html.match(/–/g) ?? []).length, 1);
	});

	it("reuses the deepest configured bullet for deeper levels", () => {
		const html = renderToStaticMarkup(
			createElement(
				ListStyle,
				{ bullets: ["•", "◦"] },
				createElement(
					"ul",
					null,
					createElement(
						"li",
						null,
						"One",
						createElement(
							"ul",
							null,
							createElement(
								"li",
								null,
								"Two",
								createElement("ul", null, createElement("li", null, "Three")),
							),
						),
					),
				),
			),
		);

		assert.match(html, /•[\s\S]*One[\s\S]*◦[\s\S]*Two[\s\S]*◦[\s\S]*Three/);
		assert.equal((html.match(/>•<\/span>/g) ?? []).length, 1);
		assert.equal((html.match(/>◦<\/span>/g) ?? []).length, 2);
	});
});
