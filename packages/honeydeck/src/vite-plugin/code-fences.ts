/**
 * Markdown fenced code block helpers.
 *
 * Shared by the slide splitter and the import-statement scanner so both use the
 * same notion of "this line is inside a fenced code block".
 */

/**
 * Return the opening fence marker for Markdown fenced code blocks.
 * Supports backtick and tilde fences indented by up to three spaces.
 */
export function getOpeningCodeFenceMarker(line: string): string | null {
	const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
	return match?.[1] ?? null;
}

/** Return true when `line` closes a fence opened with `openingFence`. */
export function isClosingFence(line: string, openingFence: string): boolean {
	const openingChar = openingFence[0];
	if (!openingChar) return false;

	const escapedChar = openingChar === "`" ? "`" : "~";
	const pattern = new RegExp(
		`^ {0,3}(${escapedChar}{${openingFence.length},})\\s*$`,
	);
	return pattern.test(line);
}
