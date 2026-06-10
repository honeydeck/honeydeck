import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import { ColorModeImage } from "@honeydeck/honeydeck/layouts/ColorModeImage";
import type { ComponentType } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LayoutProps } from "../runtime/types.ts";

const assetExtensions = /\.(?:avif|gif|jpe?g|png|webp)$/i;

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (assetExtensions.test(specifier)) {
			return {
				url: new URL(specifier, context.parentURL ?? import.meta.url).href,
				shortCircuit: true,
			};
		}

		return nextResolve(specifier, context);
	},
	load(url, context, nextLoad) {
		if (assetExtensions.test(new URL(url).pathname)) {
			return {
				format: "module",
				source: `export default ${JSON.stringify(url)};`,
				shortCircuit: true,
			};
		}

		return nextLoad(url, context);
	},
});

const [
	{ default: CleanImageLayout },
	{ default: CleanImageLeftLayout },
	{ default: CleanImageRightLayout },
	{ default: BeeImageLayout },
	{ default: BeeImageLeftLayout },
	{ default: BeeImageRightLayout },
	placeholders,
	layoutsBarrel,
	runtimeBarrel,
] = await Promise.all([
	import("@honeydeck/honeydeck/layouts/Image"),
	import("@honeydeck/honeydeck/layouts/ImageLeft"),
	import("@honeydeck/honeydeck/layouts/ImageRight"),
	import("@honeydeck/honeydeck/layouts/bee/Image"),
	import("@honeydeck/honeydeck/layouts/bee/ImageLeft"),
	import("@honeydeck/honeydeck/layouts/bee/ImageRight"),
	import("@honeydeck/honeydeck/layouts/placeholders"),
	import("@honeydeck/honeydeck/layouts"),
	import("@honeydeck/honeydeck"),
]);

const imageFrontmatter = {
	image: "/images/light.png",
	darkImage: "/images/dark.png",
	alt: "Demo image",
};

function renderLayout<F extends Record<string, unknown>>(
	Component: ComponentType<LayoutProps<F>>,
	props: LayoutProps<F>,
) {
	return renderToStaticMarkup(createElement(Component, props));
}

function renderImageLayout<F extends Record<string, unknown>>(
	Component: ComponentType<LayoutProps<F>>,
	frontmatter: F,
) {
	return renderLayout(Component, {
		title: "Demo title",
		children: createElement("p", null, "Supporting copy"),
		frontmatter,
		rawChildren: "Supporting copy",
	});
}

describe("layout dark images", () => {
	it("ColorModeImage renders light and dark sources when both are provided", () => {
		const html = renderToStaticMarkup(
			createElement(ColorModeImage, {
				src: "/images/light.png",
				darkSrc: "/images/dark.png",
				alt: "Demo image",
				className: "object-contain",
			}),
		);

		assert.match(html, /<img /g);
		assert.match(html, /src="\/images\/light\.png"/);
		assert.match(html, /src="\/images\/dark\.png"/);
		assert.match(html, /alt="Demo image"/);
		assert.match(html, /class="[^"]*block/);
		assert.match(html, /class="[^"]*hidden/);
	});

	it("ColorModeImage renders nothing when no source is provided", () => {
		const html = renderToStaticMarkup(
			createElement(ColorModeImage, { alt: "Demo image" }),
		);

		assert.equal(html, "");
	});

	for (const [name, Layout] of [
		["clean Image", CleanImageLayout],
		["clean ImageLeft", CleanImageLeftLayout],
		["clean ImageRight", CleanImageRightLayout],
		["bee Image", BeeImageLayout],
		["bee ImageLeft", BeeImageLeftLayout],
		["bee ImageRight", BeeImageRightLayout],
	] as const) {
		it(`${name} forwards image and darkImage to the rendered markup`, () => {
			const html = renderImageLayout(Layout, imageFrontmatter);

			assert.match(html, /src="\/images\/light\.png"/);
			assert.match(html, /src="\/images\/dark\.png"/);
			assert.match(html, /alt="Demo image"/);
			assert.match(html, /Demo title/);
			assert.match(html, /Supporting copy/);
		});
	}

	for (const [name, Layout] of [
		["clean Image", CleanImageLayout],
		["bee Image", BeeImageLayout],
	] as const) {
		it(`${name} shows the bundled placeholder and hint when image is omitted`, () => {
			const html = renderLayout(Layout, {
				title: null,
				children: null,
				frontmatter: {},
				rawChildren: "",
			});

			assert.match(html, /aria-hidden="true"/);
			assert.match(html, /image: \/path\/to\/image\.png/);
			assert.match(html, /to frontmatter/);
			assert.match(
				html,
				new RegExp(
					placeholders.imagePlaceholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
				),
			);
			assert.match(
				html,
				new RegExp(
					placeholders.imagePlaceholderDark.replace(
						/[.*+?^${}()|[\]\\]/g,
						"\\$&",
					),
				),
			);
		});
	}

	for (const [name, Layout] of [
		["clean ImageLeft", CleanImageLeftLayout],
		["clean ImageRight", CleanImageRightLayout],
		["bee ImageLeft", BeeImageLeftLayout],
		["bee ImageRight", BeeImageRightLayout],
	] as const) {
		it(`${name} shows a decorative placeholder when image is omitted`, () => {
			const html = renderLayout(Layout, {
				title: null,
				children: null,
				frontmatter: {},
				rawChildren: "",
			});

			assert.match(html, /alt=""/);
			assert.match(html, /aria-hidden="true"/);
			assert.match(
				html,
				new RegExp(
					placeholders.verticalImagePlaceholder.replace(
						/[.*+?^${}()|[\]\\]/g,
						"\\$&",
					),
				),
			);
			assert.match(
				html,
				new RegExp(
					placeholders.verticalImagePlaceholderDark.replace(
						/[.*+?^${}()|[\]\\]/g,
						"\\$&",
					),
				),
			);
		});
	}

	it("exposes placeholders and ColorModeImage through the public barrels", () => {
		assert.equal(layoutsBarrel.ColorModeImage, ColorModeImage);
		assert.equal(runtimeBarrel.ColorModeImage, ColorModeImage);
		assert.equal(layoutsBarrel.default.Image, CleanImageLayout);
		assert.equal(layoutsBarrel.default.ImageLeft, CleanImageLeftLayout);
		assert.equal(layoutsBarrel.default.ImageRight, CleanImageRightLayout);
		assert.equal(layoutsBarrel.ImageLayout, CleanImageLayout);
		assert.equal(layoutsBarrel.ImageLeftLayout, CleanImageLeftLayout);
		assert.equal(layoutsBarrel.ImageRightLayout, CleanImageRightLayout);
		assert.equal(typeof placeholders.imagePlaceholder, "string");
		assert.equal(typeof placeholders.imagePlaceholderDark, "string");
		assert.equal(typeof placeholders.verticalImagePlaceholder, "string");
		assert.equal(typeof placeholders.verticalImagePlaceholderDark, "string");
		assert.notEqual(
			placeholders.imagePlaceholder,
			placeholders.imagePlaceholderDark,
		);
		assert.notEqual(
			placeholders.verticalImagePlaceholder,
			placeholders.verticalImagePlaceholderDark,
		);
	});
});
