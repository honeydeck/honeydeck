/**
 * HTML comment stripping for deck MDX sources.
 *
 * MDX parses `<` as the start of a JSX expression, so `<!-- ... -->` is a syntax
 * error. Authors still expect Markdown-style HTML comments to work in decks, so
 * comments are removed from the raw source before splitting and compiling.
 *
 * Text-level and pure: no file I/O, no side effects.
 */

import { getOpeningCodeFenceMarker, isClosingFence } from "./code-fences.ts";

const COMMENT_START = "<!--";
const COMMENT_END = "-->";

type LineResult = {
	/** Line text with comment content removed */
	text: string;
	/** True when at least one comment character was removed from this line */
	hadComment: boolean;
	/** True when the line ends inside an unterminated comment */
	stillOpen: boolean;
};

/**
 * Remove HTML comments (`<!-- ... -->`) from an MDX source string.
 *
 * - Single-line and multi-line comments are removed.
 * - Lines that contained nothing but comment text are dropped entirely, so a
 *   comment between two paragraph lines does not split the paragraph.
 * - Comments inside fenced code blocks stay literal code text.
 * - An unterminated comment removes everything to the end of the file.
 */
export function stripHtmlComments(source: string): string {
	const lines = source.split("\n");
	const output: string[] = [];
	let openFence: string | null = null;
	let inComment = false;

	for (const line of lines) {
		if (!inComment) {
			if (openFence) {
				output.push(line);
				if (isClosingFence(line, openFence)) openFence = null;
				continue;
			}

			const marker = getOpeningCodeFenceMarker(line);
			if (marker) {
				openFence = marker;
				output.push(line);
				continue;
			}
		}

		const { text, hadComment, stillOpen } = stripLine(line, inComment);
		inComment = stillOpen;

		if (hadComment && text.trim().length === 0) continue;
		output.push(text);
	}

	return output.join("\n");
}

function stripLine(line: string, inComment: boolean): LineResult {
	let rest = line;
	let text = "";
	let hadComment = false;
	let open = inComment;

	while (rest.length > 0) {
		if (open) {
			hadComment = true;
			const endIndex = rest.indexOf(COMMENT_END);
			if (endIndex === -1) {
				rest = "";
				break;
			}
			rest = rest.slice(endIndex + COMMENT_END.length);
			open = false;
			continue;
		}

		const startIndex = rest.indexOf(COMMENT_START);
		if (startIndex === -1) {
			text += rest;
			rest = "";
			break;
		}

		text += rest.slice(0, startIndex);
		rest = rest.slice(startIndex + COMMENT_START.length);
		open = true;
		hadComment = true;
	}

	return { text, hadComment, stillOpen: open };
}
