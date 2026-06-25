/**
 * Text-level slide splitter.
 *
 * Splits a raw `deck.mdx` source string into individual slide segments.
 * Pure function — no file I/O, no side effects.
 *
 * ### Slide-level frontmatter
 * Supports Slidev-style per-slide frontmatter:
 * ```mdx
 * # Slide 1
 * ---
 * layout: Cover
 * author: My Name
 * ---
 * # Cover Slide
 * Opening slide body copy.
 * ---
 * # Normal Slide
 * ```
 * A block consisting entirely of `key: value` pairs (no markdown content)
 * is treated as frontmatter for the NEXT content block, and merged into it
 * as a proper `---\n...\n---` YAML block. This keeps the remark-frontmatter
 * pipeline uniform for all slides.
 */

export type SlideSegment = {
	/** 0-based position in the deck */
	index: number;
	/** Complete MDX source for this slide, with shared imports prepended */
	rawMdx: string;
};

export type SplitResult = {
	slides: SlideSegment[];
	/** Parsed deck-level frontmatter (first block only) */
	deckFrontmatter: Record<string, unknown>;
	/** Import lines found in the preamble, prepended to every slide */
	sharedImports: string;
};

export type SplitSlidesOptions = {
	/**
	 * Root decks treat the first leading frontmatter block as deck config.
	 * Imported MDX files treat every frontmatter block as slide-level metadata.
	 */
	frontmatterMode?: "deck" | "slide";

	/**
	 * Drop empty blocks before import extraction. Disable this for already-expanded
	 * root decks so imports from a leading imported slide do not become deck-wide
	 * shared imports and get duplicated on later slides.
	 */
	trimLeadingEmptyBlocks?: boolean;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DECK_FRONTMATTER_KEYS = new Set([
	"title",
	"description",
	"aspectRatio",
	"colorMode",
	"pdfColorMode",
	"pdfSteps",
	"transition",
	"transitionDuration",
	"transitionEasing",
	"magicCodeDuration",
	"layouts",
	"defaultLayout",
	"showSlideNumbers",
]);

/**
 * Parse simple "key: value" YAML (no nesting, no arrays).
 * Coerces booleans and numbers; everything else stays a string.
 *
 * Exported so other parts of the pipeline (e.g. remark/h1-extract.ts) can
 * reuse the same parsing logic without adding an external YAML dep.
 */
export function parseFrontmatter(yaml: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const line of yaml.split("\n")) {
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;

		const key = line.slice(0, colonIdx).trim();
		const raw = line.slice(colonIdx + 1).trim();

		if (!key) continue;

		if (raw === "true") {
			result[key] = true;
		} else if (raw === "false") {
			result[key] = false;
		} else if (raw !== "" && !Number.isNaN(Number(raw))) {
			result[key] = Number(raw);
		} else if (
			(raw.startsWith('"') && raw.endsWith('"')) ||
			(raw.startsWith("'") && raw.endsWith("'"))
		) {
			result[key] = raw.slice(1, -1);
		} else {
			result[key] = raw;
		}
	}

	return result;
}

/**
 * The first YAML block is deck config, but authors naturally expect slide-level
 * fields such as `layout: Cover` there to affect the opening slide too.
 * Keep deck-only keys out of the slide frontmatter and pass everything else
 * through as first-slide metadata.
 */
function firstSlideFrontmatterFromDeckYaml(yamlLines: string[]): string[] {
	const slideLines = yamlLines.filter((line) => {
		const match = line.match(/^\s*([\w-]+)\s*:/);
		const key = match?.[1];
		if (!key) return false;
		return !DECK_FRONTMATTER_KEYS.has(key);
	});
	return slideLines.some((line) => /^\s*layout\s*:/.test(line))
		? slideLines
		: [];
}

// ---------------------------------------------------------------------------
// Fence tracking
// ---------------------------------------------------------------------------

/**
 * Return the opening fence marker for Markdown fenced code blocks.
 * Supports backtick and tilde fences indented by up to three spaces.
 */
function getOpeningCodeFenceMarker(line: string): string | null {
	const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
	return match?.[1] ?? null;
}

function isClosingFence(line: string, openingFence: string): boolean {
	const openingChar = openingFence[0];
	if (!openingChar) return false;

	const escapedChar = openingChar === "`" ? "`" : "~";
	const pattern = new RegExp(
		`^ {0,3}(${escapedChar}{${openingFence.length},})\\s*$`,
	);
	return pattern.test(line);
}

// ---------------------------------------------------------------------------
// Frontmatter-only block detection
// ---------------------------------------------------------------------------

/**
 * Returns true if every non-empty line in `lines` looks like a YAML key-value
 * pair (`key: value`). Used to identify slide-level frontmatter blocks that
 * appear between `---` separators and should be merged with the next slide.
 */
function isFrontmatterOnlyBlock(lines: string[]): boolean {
	const meaningful = lines.filter((l) => l.trim().length > 0);
	if (meaningful.length === 0) return false; // empty block → not frontmatter
	// Every meaningful line must look like `word: ...` (YAML key-value)
	return meaningful.every((line) => /^\s*[\w-]+\s*:/.test(line));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Split a raw MDX deck source into individual slide segments.
 *
 * ### Logic
 * 1. If the file starts with `---\n`, extract YAML frontmatter (between the
 *    first and second `---` lines) as `deckFrontmatter`.
 * 2. The remaining content is split on separator lines (lines that are
 *    exactly `---`), except inside fenced code blocks.
 * 3. The **first block** (before the first separator) is the preamble:
 *    - Lines matching `/^import\s/` become `sharedImports`.
 *    - All other non-empty lines become the first slide's body.
 * 4. `sharedImports` is prepended to every slide's `rawMdx` so that
 *    components imported in the preamble are available everywhere.
 * 5. Empty blocks (only whitespace) are skipped and produce no slide.
 */
function normalizeLineEndings(source: string): string {
	return source.replace(/\r\n?/g, "\n");
}

export function splitSlides(
	source: string,
	options: SplitSlidesOptions = {},
): SplitResult {
	const frontmatterMode = options.frontmatterMode ?? "deck";
	const trimLeadingEmptyBlocks = options.trimLeadingEmptyBlocks ?? true;
	const lines = normalizeLineEndings(source).split("\n");
	let deckFrontmatter: Record<string, unknown> = {};
	let firstSlideFrontmatterLines: string[] = [];
	let startLine = 0;

	// ── Step 1: extract frontmatter if present ──────────────────────────────
	if (frontmatterMode === "deck" && lines[0] === "---") {
		// Find the closing '---' line (first occurrence after line 0)
		const fmEnd = lines.indexOf("---", 1);
		if (fmEnd !== -1) {
			const yamlLines = lines.slice(1, fmEnd);
			deckFrontmatter = parseFrontmatter(yamlLines.join("\n"));
			firstSlideFrontmatterLines = firstSlideFrontmatterFromDeckYaml(yamlLines);
			startLine = fmEnd + 1;
		}
	}

	// ── Step 2: split remaining lines into blocks on '---' separators ───────
	const rawBlocks: string[][] = [[]];
	let openCodeFence: string | null = null;

	for (let i = startLine; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) continue;

		if (!openCodeFence && line === "---") {
			rawBlocks.push([]);
			continue;
		}

		rawBlocks[rawBlocks.length - 1]?.push(line);

		const marker = getOpeningCodeFenceMarker(line);
		if (!marker) continue;

		if (openCodeFence) {
			if (isClosingFence(line, openCodeFence)) {
				openCodeFence = null;
			}
		} else {
			openCodeFence = marker;
		}
	}

	// ── Step 2b: merge frontmatter-only blocks with the following content ────
	//
	// A block consisting entirely of `key: value` pairs (no real markdown
	// content) is treated as slide-level frontmatter for the NEXT block. It is
	// re-emitted as a YAML frontmatter header (`---\n...\n---`) prepended to
	// the next block's MDX source. This lets remark-frontmatter parse it.
	const blocks: string[][] = [];
	{
		let bi = 0;
		while (bi < rawBlocks.length) {
			const block = rawBlocks[bi];
			if (!block) break;
			const nextBlock = rawBlocks[bi + 1];

			if (nextBlock !== undefined && isFrontmatterOnlyBlock(block)) {
				// Merge: prepend `---\n<yaml>\n---\n` to the next block
				const yamlLines = block.filter((l) => l.trim().length > 0);
				const merged = ["---", ...yamlLines, "---", "", ...nextBlock];
				blocks.push(merged);
				bi += 2; // skip the consumed next block
			} else {
				blocks.push(block);
				bi++;
			}
		}
	}

	if (trimLeadingEmptyBlocks) {
		while (blocks[0]?.every((line) => line.trim().length === 0)) {
			blocks.shift();
		}
	}

	// ── Step 3: extract shared imports from the first block ─────────────────
	const firstBlock = blocks[0] ?? [];
	const importLines: string[] = [];
	const slideContentLines: string[] = [];

	for (const line of firstBlock) {
		if (/^import\s/.test(line)) {
			importLines.push(line);
		} else {
			slideContentLines.push(line);
		}
	}

	const sharedImports = importLines.join("\n").trim();
	const firstSlideContentBody = slideContentLines.join("\n").trim();

	// ── Step 4: build slide segments ────────────────────────────────────────
	const slides: SlideSegment[] = [];
	let pendingFirstSlideFrontmatterLines = firstSlideFrontmatterLines;

	function applyPendingFirstSlideFrontmatter(content: string): string {
		if (pendingFirstSlideFrontmatterLines.length === 0) return content;

		const linesToApply = pendingFirstSlideFrontmatterLines;
		pendingFirstSlideFrontmatterLines = [];

		if (content.startsWith("---")) {
			const lines = content.split("\n");
			const closingIdx = lines.indexOf("---", 1);
			if (closingIdx !== -1) {
				return ["---", ...linesToApply, ...lines.slice(1)].join("\n");
			}
		}

		return ["---", ...linesToApply, "---", "", content].join("\n");
	}

	function addSlide(content: string): void {
		let trimmed = content.trim();
		if (!trimmed) return; // skip empty / whitespace-only blocks

		trimmed = applyPendingFirstSlideFrontmatter(trimmed);

		// If the slide content begins with a YAML frontmatter block (`---`), the
		// shared imports must be placed AFTER the closing `---` so that
		// remark-frontmatter sees the `---` at the very start of the document.
		let rawMdx: string;
		if (sharedImports && trimmed.startsWith("---")) {
			// Find the end of the frontmatter block (second `---` line)
			const fmLines = trimmed.split("\n");
			const closingIdx = fmLines.indexOf("---", 1);
			if (closingIdx !== -1) {
				const fmBlock = fmLines.slice(0, closingIdx + 1).join("\n"); // includes both `---`
				const body = fmLines
					.slice(closingIdx + 1)
					.join("\n")
					.trimStart();
				rawMdx = body
					? `${fmBlock}\n\n${sharedImports}\n\n${body}`
					: `${fmBlock}\n\n${sharedImports}`;
			} else {
				// Malformed frontmatter — fall back to prepending
				rawMdx = `${sharedImports}\n\n${trimmed}`;
			}
		} else {
			rawMdx = sharedImports ? `${sharedImports}\n\n${trimmed}` : trimmed;
		}

		slides.push({ index: slides.length, rawMdx });
	}

	addSlide(firstSlideContentBody);

	for (let i = 1; i < blocks.length; i++) {
		addSlide((blocks[i] ?? []).join("\n"));
	}

	return { slides, deckFrontmatter, sharedImports };
}
