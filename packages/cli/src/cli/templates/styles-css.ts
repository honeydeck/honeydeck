/**
 * Template generator for styles.css in a new honeydeck project.
 */

import { readFileSync } from "node:fs";

const STARTER_STYLES_TEMPLATE = readFileSync(
	new URL("./starter/styles.css", import.meta.url),
	"utf-8",
);

export function generateStylesCss(): string {
	return STARTER_STYLES_TEMPLATE;
}
