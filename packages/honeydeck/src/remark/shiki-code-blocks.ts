/**
 * Remark plugin: replace fenced code blocks with `<HoneydeckCodeBlock>` JSX elements.
 *
 * ### Pipeline position
 * Must run AFTER `remarkStepNumbering` so it can read the `honeydeckStartAt` value
 * that step-numbering annotates onto code MDAST nodes.
 *
 * ### What it does
 * 1. Collects all `code` MDAST nodes.
 * 2. For each code node:
 *    a. Loads the language grammar lazily into the shared shiki singleton.
 *    b. Highlights the code with dual themes (github-light + github-dark) using
 *       CSS custom properties (`defaultColor: false`). Each `.line` span gets a
 *       `data-line` attribute for runtime dimming.
 *    c. Parses the fence meta string (`{2|4-5|all}`) into step groups.
 *    d. Replaces the code node with a `mdxJsxFlowElement` for `<HoneydeckCodeBlock>`
 *       carrying three props: `html` (highlighted HTML string), `stepsJson`
 *       (JSON-encoded step groups), and `startAt` (1-based timeline step where
 *       the second group activates, from `node.data.honeydeckStartAt`), plus
 *       `source` (the original fenced code text for clipboard copying).
 * 3. Injects a single `import { HoneydeckCodeBlock } from '@honeydeck/honeydeck/components/code-block'`
 *    declaration into the MDAST root when at least one code block was transformed.
 *
 * ### CSS variable activation
 * The highlighted HTML uses shiki's dual-theme variable names
 * (`--shiki-light`, `--shiki-dark`, `--shiki-light-bg`, `--shiki-dark-bg`).
 * `src/theme/base.css` activates the correct variable set based on the
 * `[data-honeydeck-color-mode]` attribute set by the Deck component.
 *
 * ### Step meta syntax
 * - `{2}` — highlight line 2 immediately; consumes no timeline steps
 * - `{2|4-5|all}` — three step groups; first group is baseline, then later groups activate at `startAt`, `startAt+1`
 *
 * @see HoneydeckCodeBlock in `src/runtime/components/CodeBlock.tsx`
 * @see remarkStepNumbering for the counter that provides `honeydeckStartAt`
 */

import type { Program } from "estree";
import type { Code, Root } from "mdast";
import type {
	MdxJsxAttribute,
	MdxJsxAttributeValueExpression,
	MdxJsxFlowElement,
} from "mdast-util-mdx-jsx";
import type { MdxjsEsm } from "mdast-util-mdxjs-esm";
import { getSingletonHighlighter } from "shiki";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single step-through group: either an array of 1-based line numbers or 'all'. */
export type StepGroup = number[] | "all";

// ---------------------------------------------------------------------------
// Singleton shiki highlighter
// ---------------------------------------------------------------------------

let highlighterPromise: Promise<
	Awaited<ReturnType<typeof getSingletonHighlighter>>
> | null = null;

function getHighlighter() {
	if (!highlighterPromise) {
		highlighterPromise = getSingletonHighlighter({
			themes: ["github-light", "github-dark"],
			langs: [], // languages loaded lazily per code block
		});
	}
	return highlighterPromise;
}

async function loadLang(
	highlighter: Awaited<ReturnType<typeof getSingletonHighlighter>>,
	lang: string,
): Promise<string> {
	if (!lang || lang === "text" || lang === "plaintext") return "text";
	try {
		await highlighter.loadLanguage(
			lang as Parameters<typeof highlighter.loadLanguage>[0],
		);
		return lang;
	} catch {
		// Language not in shiki's bundle — fall back to plain text
		return "text";
	}
}

// ---------------------------------------------------------------------------
// Step meta parsing
// ---------------------------------------------------------------------------

/**
 * Parse a code fence meta string like `{2|4-5|all}` into an array of step groups.
 *
 * Returns `[]` when there is no `{…}` block in the meta string.
 * Even a single group like `{2}` produces `[[2]]` — a baseline highlight that
 * consumes no timeline steps.
 *
 * @example
 * parseStepMeta('{2|4-5|all}')  // → [[2], [4,5], 'all']
 * parseStepMeta('{2}')          // → [[2]]  (baseline highlight, no timeline step)
 * parseStepMeta(null)           // → []
 */
export function parseStepMeta(meta: string | null | undefined): StepGroup[] {
	if (!meta) return [];

	const match = meta.match(/\{([^}]+)\}/);
	if (!match?.[1]) return [];

	const groupStrings = match[1].split("|").filter(Boolean);
	if (groupStrings.length === 0) return [];
	// Note: single groups are valid — they represent a baseline highlight and
	// consume no timeline steps.

	return groupStrings.map((group): StepGroup => {
		const trimmed = group.trim();
		if (trimmed === "all") return "all";

		const lines: number[] = [];
		for (const part of trimmed.split(",")) {
			const dashIdx = part.indexOf("-");
			if (dashIdx !== -1) {
				const start = parseInt(part.slice(0, dashIdx).trim(), 10);
				const end = parseInt(part.slice(dashIdx + 1).trim(), 10);
				if (!Number.isNaN(start) && !Number.isNaN(end)) {
					for (let i = start; i <= end; i++) lines.push(i);
				}
			} else {
				const n = parseInt(part.trim(), 10);
				if (!Number.isNaN(n)) lines.push(n);
			}
		}
		return lines;
	});
}

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

/** Build a string-valued JSX attribute (prop="value"). */
function makeStringAttr(name: string, value: string): MdxJsxAttribute {
	return { type: "mdxJsxAttribute", name, value };
}

/** Build a numeric JSX attribute (prop={N}). */
function makeNumericAttr(name: string, value: number): MdxJsxAttribute {
	const estree: Program = {
		type: "Program",
		sourceType: "module",
		comments: [],
		body: [
			{
				type: "ExpressionStatement",
				expression: { type: "Literal", value, raw: String(value) },
			},
		],
	};
	const valueExpr: MdxJsxAttributeValueExpression = {
		type: "mdxJsxAttributeValueExpression",
		value: String(value),
		data: { estree },
	};
	return { type: "mdxJsxAttribute", name, value: valueExpr };
}

/**
 * Prepend an `import { specifier } from 'source'` declaration to the MDAST
 * root, placed after any leading `yaml` / `mdxjsEsm` nodes so it sits with
 * the other imports.
 *
 * Skips injection if an import for `specifier` already exists.
 */
function injectImport(tree: Root, specifier: string, source: string): void {
	// Avoid duplicate imports
	const alreadyImported = tree.children.some(
		(n) =>
			n.type === "mdxjsEsm" &&
			(n as unknown as { value: string }).value?.includes(specifier),
	);
	if (alreadyImported) return;

	// Find insertion point: after any leading yaml + mdxjsEsm nodes
	let insertAt = 0;
	for (let i = 0; i < tree.children.length; i++) {
		const t = tree.children[i]?.type;
		if (t === "yaml" || t === "mdxjsEsm") {
			insertAt = i + 1;
		} else {
			break;
		}
	}

	const importNode: MdxjsEsm = {
		type: "mdxjsEsm",
		value: `import { ${specifier} } from '${source}'`,
		data: {
			estree: {
				type: "Program",
				sourceType: "module",
				comments: [],
				body: [
					{
						type: "ImportDeclaration",
						specifiers: [
							{
								type: "ImportSpecifier",
								imported: { type: "Identifier", name: specifier },
								local: { type: "Identifier", name: specifier },
							},
						],
						source: { type: "Literal", value: source, raw: `'${source}'` },
					},
				],
			} as unknown as Program,
		},
	};

	tree.children.splice(
		insertAt,
		0,
		importNode as unknown as (typeof tree.children)[number],
	);
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const COMPONENT_NAME = "HoneydeckCodeBlock";
const IMPORT_SOURCE = "@honeydeck/honeydeck/components/code-block";

/**
 * Async remark plugin that transforms fenced code blocks to `<HoneydeckCodeBlock>`
 * JSX elements with pre-highlighted HTML (via shiki dual themes).
 *
 * Plugin ordering: `[remarkFrontmatter, remarkH1Extract, remarkStepNumbering, remarkShikiCodeBlocks]`
 */
export const remarkShikiCodeBlocks: Plugin<[], Root> = () => async (tree) => {
	// Collect code nodes before mutating the tree (avoids iterator invalidation).
	type CodeEntry = {
		node: Code;
		index: number;
		parent: { children: unknown[] };
	};
	const codeEntries: CodeEntry[] = [];

	visit(tree, "code", (node, index, parent) => {
		if (index !== null && index !== undefined && parent) {
			codeEntries.push({
				node: node as unknown as Code,
				index: index as number,
				parent: parent as unknown as { children: unknown[] },
			});
		}
	});

	if (codeEntries.length === 0) return;

	const highlighter = await getHighlighter();
	let didTransform = false;

	for (const { node, index, parent } of codeEntries) {
		const rawLang = node.lang ?? "text";
		const meta = node.meta;
		const steps = parseStepMeta(meta);
		const startAt: number =
			((node.data as Record<string, unknown> | undefined)
				?.honeydeckStartAt as number) ?? 0;

		// Load language grammar (no-op if already cached)
		const lang = await loadLang(highlighter, rawLang);

		// Highlight with dual themes (CSS variable approach)
		let html: string;
		try {
			html = highlighter.codeToHtml(node.value, {
				lang,
				themes: { light: "github-light", dark: "github-dark" },
				defaultColor: false,
				transformers: [
					{
						line(lineNode, lineNumber) {
							// Ensure properties bag exists, then stamp data-line
							if (!lineNode.properties) lineNode.properties = {};
							lineNode.properties["data-line"] = lineNumber;
						},
					},
				],
			});
		} catch {
			// Fallback: plain pre/code block without syntax colours
			const escaped = node.value
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;");
			html = `<pre class="honeydeck-code-plain"><code>${escaped}</code></pre>`;
		}

		// Build <HoneydeckCodeBlock html="..." stepsJson="..." startAt={N} source="..." />
		const jsxNode: MdxJsxFlowElement = {
			type: "mdxJsxFlowElement",
			name: COMPONENT_NAME,
			attributes: [
				makeStringAttr("html", html),
				makeStringAttr("stepsJson", JSON.stringify(steps)),
				makeNumericAttr("startAt", startAt),
				makeStringAttr("source", node.value),
			],
			children: [],
		};

		// Replace code node in-place (1 → 1, so sibling indices stay valid)
		parent.children.splice(index, 1, jsxNode);
		didTransform = true;
	}

	// Inject the import once for the whole slide
	if (didTransform) {
		injectImport(tree, COMPONENT_NAME, IMPORT_SOURCE);
	}
};
