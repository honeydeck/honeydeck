/**
 * ESM import statement scanning for MDX sources.
 *
 * MDX preambles may format imports across several lines:
 *
 * ```mdx
 * import {
 *   MapIcon,
 *   RouteIcon,
 * } from "@scope/icons";
 * ```
 *
 * A line-based scan would treat only `import {` as the import and misclassify
 * the remaining lines as slide body content. The scanner below walks characters
 * while tracking strings, comments, and brace depth so a complete statement is
 * always captured as a unit, regardless of formatting.
 *
 * Pure functions — no file I/O, no side effects.
 */

import { getOpeningCodeFenceMarker, isClosingFence } from "./code-fences.ts";

/** Matches the first line of a statement that starts with the `import` keyword. */
const IMPORT_START_RE = /^import\b/;

type ScanState = {
	/** Depth of `{` … `}` nesting outside strings and comments. */
	braceDepth: number;
	/** Quote character of the string literal currently being scanned. */
	stringChar: string | null;
	/** Inside a `/* … *\/` comment. */
	inBlockComment: boolean;
	/** A string literal closed at brace depth 0 (the module specifier). */
	specifierClosed: boolean;
	/** A `;` was seen at brace depth 0. */
	terminated: boolean;
};

function createScanState(): ScanState {
	return {
		braceDepth: 0,
		stringChar: null,
		inBlockComment: false,
		specifierClosed: false,
		terminated: false,
	};
}

/** Consume one source line, updating `state` in place. */
function scanLine(line: string, state: ScanState): void {
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const next = line[i + 1];

		if (state.inBlockComment) {
			if (char === "*" && next === "/") {
				state.inBlockComment = false;
				i++;
			}
			continue;
		}

		if (state.stringChar !== null) {
			if (char === "\\") {
				i++;
				continue;
			}
			if (char === state.stringChar) {
				state.stringChar = null;
				if (state.braceDepth === 0) state.specifierClosed = true;
			}
			continue;
		}

		if (char === "/" && next === "/") return; // line comment → rest is ignorable
		if (char === "/" && next === "*") {
			state.inBlockComment = true;
			i++;
			continue;
		}
		if (char === '"' || char === "'" || char === "`") {
			state.stringChar = char;
			continue;
		}
		if (char === "{") {
			state.braceDepth++;
			continue;
		}
		if (char === "}") {
			state.braceDepth = Math.max(0, state.braceDepth - 1);
			continue;
		}
		if (char === ";" && state.braceDepth === 0) {
			state.terminated = true;
			return;
		}
	}
}

/**
 * A statement is complete once no string or comment is open, all braces are
 * balanced, and either an explicit `;` or the module specifier string was seen.
 */
function isStatementComplete(state: ScanState): boolean {
	if (state.stringChar !== null || state.inBlockComment) return false;
	if (state.braceDepth !== 0) return false;
	return state.terminated || state.specifierClosed;
}

/** Return true when `line` starts an `import` statement. */
export function startsImportStatement(line: string): boolean {
	return IMPORT_START_RE.test(line);
}

/** True when nothing is left open that a following line could continue. */
function isStatementClosedOff(state: ScanState): boolean {
	return (
		state.braceDepth === 0 && state.stringChar === null && !state.inBlockComment
	);
}

/**
 * Find the index of the last line of the import statement starting at
 * `startIndex`. Returns `null` when the lines are not a usable import
 * statement (for example prose that happens to begin with the word "import").
 *
 * Continuation onto following lines only happens while a brace group, string,
 * or block comment is still open, and stops at a blank line. That keeps regular
 * prose and malformed fragments from swallowing slide body content.
 */
export function findImportStatementEnd(
	lines: string[],
	startIndex: number,
): number | null {
	const state = createScanState();

	for (let i = startIndex; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) return null;

		if (i > startIndex && line.trim() === "" && isStatementClosedOff(state)) {
			return null;
		}

		scanLine(line, state);
		if (isStatementComplete(state)) return i;
		if (isStatementClosedOff(state)) return null;
	}

	return null;
}

export type PreamblePartition = {
	/** Lines belonging to complete import statements, in source order. */
	importLines: string[];
	/** Every other line, in source order. */
	contentLines: string[];
};

/**
 * Split preamble lines into complete import statements and remaining content.
 *
 * Lines inside fenced code blocks are always content. Lines that start an
 * import statement which never completes stay content too, so malformed or
 * prose text is left for the MDX compiler to report in place.
 */
export function partitionImportStatements(lines: string[]): PreamblePartition {
	const importLines: string[] = [];
	const contentLines: string[] = [];
	let openCodeFence: string | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) continue;

		const marker = getOpeningCodeFenceMarker(line);
		if (openCodeFence) {
			contentLines.push(line);
			if (marker && isClosingFence(line, openCodeFence)) openCodeFence = null;
			continue;
		}
		if (marker) {
			contentLines.push(line);
			openCodeFence = marker;
			continue;
		}

		if (!startsImportStatement(line)) {
			contentLines.push(line);
			continue;
		}

		const endIndex = findImportStatementEnd(lines, i);
		if (endIndex === null) {
			contentLines.push(line);
			continue;
		}

		for (let j = i; j <= endIndex; j++) {
			const statementLine = lines[j];
			if (statementLine !== undefined) importLines.push(statementLine);
		}
		i = endIndex;
	}

	return { importLines, contentLines };
}
