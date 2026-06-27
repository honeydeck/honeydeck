/**
 * Template generator for the tutorial-style starter deck.mdx.
 * Demonstrates core Honeydeck features so users can learn by reading and running.
 */

import { readFileSync } from "node:fs";

const STARTER_DECK_TEMPLATE = readFileSync(
	new URL("./starter/deck.mdx", import.meta.url),
	"utf-8",
);

export function generateDeckMdx(projectName: string): string {
	return STARTER_DECK_TEMPLATE.replaceAll("Honeydeck Starter", projectName);
}
