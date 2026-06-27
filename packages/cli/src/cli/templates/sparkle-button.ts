/**
 * Template generator for the SparkleButton component.
 * A dependency-free confetti button demonstrating interactive React in slides.
 */

import { readFileSync } from "node:fs";

const SPARKLE_BUTTON_TEMPLATE = readFileSync(
	new URL("./starter/components/SparkleButton.tsx", import.meta.url),
	"utf-8",
);

export function generateSparkleButton(): string {
	return SPARKLE_BUTTON_TEMPLATE;
}
