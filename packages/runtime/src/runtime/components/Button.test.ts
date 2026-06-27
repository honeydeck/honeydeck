import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
	buttonPrimaryClass,
	buttonSecondaryClass,
	hoverBorderClass,
	iconButtonClass,
	quietLinkClass,
	smallButtonClass,
	surfaceControlClass,
} from "./Button.tsx";

function extractTokenNames(css: string): string[] {
	return [...css.matchAll(/(--honeydeck-[\w-]+)\s*:/g)].map(
		(match) => match[1] ?? "",
	);
}

const availableTokens = new Set(
	extractTokenNames(
		readFileSync(new URL("../../theme/base.css", import.meta.url), "utf-8"),
	),
);

const buttonRecipes = {
	hoverBorderClass,
	surfaceControlClass,
	buttonPrimaryClass,
	buttonSecondaryClass,
	iconButtonClass,
	smallButtonClass,
	quietLinkClass,
};

function referencedTokens(recipe: string): string[] {
	return [...recipe.matchAll(/var\((--honeydeck-[\w-]+)\)/g)].map(
		(match) => match[1] ?? "",
	);
}

describe("Button class recipes", () => {
	it("only reference shipped Honeydeck tokens", () => {
		for (const [name, recipe] of Object.entries(buttonRecipes)) {
			assert.doesNotMatch(recipe, /--honeydeck-color-/);

			for (const token of referencedTokens(recipe)) {
				assert.ok(
					availableTokens.has(token),
					`${name} references unavailable token ${token}`,
				);
			}
		}
	});
});
