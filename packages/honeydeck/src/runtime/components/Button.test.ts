import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { extractTokens } from "../../vite-plugin/token-manifest.ts";
import {
	buttonPrimaryClass,
	buttonSecondaryClass,
	hoverBorderClass,
	iconButtonClass,
	quietLinkClass,
	smallButtonClass,
	surfaceControlClass,
} from "./Button.tsx";

const availableTokens = new Set(
	extractTokens(
		readFileSync(new URL("../../theme/base.css", import.meta.url), "utf-8"),
	).map((token) => token.name),
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
