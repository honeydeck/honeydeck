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
 * 3. Injects `HoneydeckCodeBlock` from '@honeydeck/runtime/components/code-block/normal'
 *    when at least one normal code block was transformed, and `HoneydeckMagicCodeBlock`
 *    from '@honeydeck/runtime/components/code-block/magic' when needed.
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
 * @see HoneydeckCodeBlock in `src/runtime/components/NormalCodeBlock.tsx`
 * @see HoneydeckMagicCodeBlock in `src/runtime/components/MagicCodeBlock.tsx`
 * @see remarkStepNumbering for the counter that provides `honeydeckStartAt`
 */

import type { KeyedTokensInfo } from "@shikijs/magic-move/core";
import { codeToKeyedTokens } from "@shikijs/magic-move/core";
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
import {
	codeFenceGroups,
	isMagicCodeFence,
	type ParsedCodeFence,
	parseInnerCodeFences,
	parseMagicCodeDuration,
	parseStepMeta,
	type StepGroup,
} from "./code-utils.ts";

export type { StepGroup } from "./code-utils.ts";
export { parseStepMeta } from "./code-utils.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RemarkShikiCodeBlocksOptions = {
	/** Deck-level Magic Code default duration from root frontmatter. */
	magicCodeDuration?: unknown;
};

type MagicTimelineState = {
	fence: ParsedCodeFence;
	group: StepGroup;
	tokenStateIndex: number;
};

type MagicTokenPayload = {
	lightTokenStates: KeyedTokensInfo[];
	darkTokenStates: KeyedTokensInfo[];
	tokenStateIndexes: number[];
	sources: string[];
};

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
// Highlight helpers
// ---------------------------------------------------------------------------

async function codeToHighlightedHtml(
	highlighter: Awaited<ReturnType<typeof getSingletonHighlighter>>,
	value: string,
	rawLang: string,
): Promise<string> {
	const lang = await loadLang(highlighter, rawLang);

	try {
		return highlighter.codeToHtml(value, {
			lang,
			themes: { light: "github-light", dark: "github-dark" },
			defaultColor: false,
			transformers: [
				{
					line(lineNode, lineNumber) {
						if (!lineNode.properties) lineNode.properties = {};
						lineNode.properties["data-line"] = lineNumber;
					},
				},
			],
		});
	} catch {
		const escaped = value
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
		return `<pre class="honeydeck-code-plain"><code>${escaped}</code></pre>`;
	}
}

function getMagicTokenStateKey(fence: ParsedCodeFence): string {
	return `${fence.lang}\0${fence.value}`;
}

function flattenMagicTimeline(fences: ParsedCodeFence[]): MagicTimelineState[] {
	const tokenStateIndexes = new Map<string, number>();
	return fences.flatMap((fence) => {
		const key = getMagicTokenStateKey(fence);
		let tokenStateIndex = tokenStateIndexes.get(key);
		if (tokenStateIndex === undefined) {
			tokenStateIndex = tokenStateIndexes.size;
			tokenStateIndexes.set(key, tokenStateIndex);
		}
		return codeFenceGroups(fence.meta).map((group) => ({
			fence,
			group,
			tokenStateIndex,
		}));
	});
}

function getUniqueMagicTokenStates(
	states: MagicTimelineState[],
): ParsedCodeFence[] {
	const uniqueStates: ParsedCodeFence[] = [];
	for (const state of states) {
		if (!uniqueStates[state.tokenStateIndex]) {
			uniqueStates[state.tokenStateIndex] = state.fence;
		}
	}
	return uniqueStates;
}

async function codeToMagicTokens(
	highlighter: Awaited<ReturnType<typeof getSingletonHighlighter>>,
	state: MagicTimelineState,
	theme: "github-light" | "github-dark",
): Promise<KeyedTokensInfo> {
	const lang = await loadLang(highlighter, state.fence.lang);

	try {
		return codeToKeyedTokens(
			highlighter,
			state.fence.value,
			{ lang, theme } as Parameters<typeof highlighter.codeToTokens>[1],
			false,
		);
	} catch {
		return codeToKeyedTokens(
			highlighter,
			state.fence.value,
			{ lang: "text", theme } as Parameters<typeof highlighter.codeToTokens>[1],
			false,
		);
	}
}

async function compileMagicTokens(
	highlighter: Awaited<ReturnType<typeof getSingletonHighlighter>>,
	fences: ParsedCodeFence[],
	theme: "github-light" | "github-dark",
): Promise<KeyedTokensInfo[]> {
	const tokens: KeyedTokensInfo[] = [];
	for (const fence of fences) {
		tokens.push(
			await codeToMagicTokens(
				highlighter,
				{ fence, group: "all", tokenStateIndex: 0 },
				theme,
			),
		);
	}
	return tokens;
}

async function compileMagicTokenPayload(
	highlighter: Awaited<ReturnType<typeof getSingletonHighlighter>>,
	states: MagicTimelineState[],
): Promise<MagicTokenPayload> {
	const tokenFences = getUniqueMagicTokenStates(states);
	return {
		lightTokenStates: await compileMagicTokens(
			highlighter,
			tokenFences,
			"github-light",
		),
		darkTokenStates: await compileMagicTokens(
			highlighter,
			tokenFences,
			"github-dark",
		),
		tokenStateIndexes: states.map((state) => state.tokenStateIndex),
		sources: tokenFences.map((fence) => fence.value),
	};
}

function makeCodeBlockNode(
	html: string,
	steps: StepGroup[],
	startAt: number,
	source: string,
): MdxJsxFlowElement {
	return {
		type: "mdxJsxFlowElement",
		name: CODE_BLOCK_COMPONENT_NAME,
		attributes: [
			makeStringAttr("html", html),
			makeStringAttr("stepsJson", JSON.stringify(steps)),
			makeNumericAttr("startAt", startAt),
			makeStringAttr("source", source),
		],
		children: [],
	};
}

function makeMagicCodeNode(
	payload: MagicTokenPayload,
	stateGroups: StepGroup[],
	startAt: number,
	duration: number,
): MdxJsxFlowElement {
	return {
		type: "mdxJsxFlowElement",
		name: MAGIC_CODE_COMPONENT_NAME,
		attributes: [
			makeStringAttr(
				"lightTokenStatesJson",
				JSON.stringify(payload.lightTokenStates),
			),
			makeStringAttr(
				"darkTokenStatesJson",
				JSON.stringify(payload.darkTokenStates),
			),
			makeStringAttr(
				"tokenStateIndexesJson",
				JSON.stringify(payload.tokenStateIndexes),
			),
			makeStringAttr("stepGroupsJson", JSON.stringify(stateGroups)),
			makeStringAttr("sourcesJson", JSON.stringify(payload.sources)),
			makeNumericAttr("startAt", startAt),
			makeNumericAttr("duration", duration),
		],
		children: [],
	};
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const CODE_BLOCK_COMPONENT_NAME = "HoneydeckCodeBlock";
const MAGIC_CODE_COMPONENT_NAME = "HoneydeckMagicCodeBlock";
const CODE_BLOCK_IMPORT_SOURCE =
	"@honeydeck/runtime/components/code-block/normal";
const MAGIC_CODE_IMPORT_SOURCE =
	"@honeydeck/runtime/components/code-block/magic";

/**
 * Async remark plugin that transforms fenced code blocks to `<HoneydeckCodeBlock>`
 * JSX elements with pre-highlighted HTML (via shiki dual themes).
 *
 * Plugin ordering: `[remarkFrontmatter, remarkH1Extract, remarkStepNumbering, remarkShikiCodeBlocks]`
 */
export const remarkShikiCodeBlocks: Plugin<
	[RemarkShikiCodeBlocksOptions?],
	Root
> =
	(options = {}) =>
	async (tree) => {
		// Collect code nodes before mutating the tree.
		type CodeEntry = {
			node: Code;
			parent: { children: unknown[] };
		};
		const codeEntries: CodeEntry[] = [];

		visit(tree, "code", (node, index, parent) => {
			if (index !== null && index !== undefined && parent) {
				codeEntries.push({
					node: node as unknown as Code,
					parent: parent as unknown as { children: unknown[] },
				});
			}
		});

		if (codeEntries.length === 0) return;

		const highlighter = await getHighlighter();
		let didTransformCodeBlock = false;
		let didTransformMagicCode = false;

		for (const { node, parent } of codeEntries) {
			const currentIndex = parent.children.indexOf(node);
			if (currentIndex === -1) continue;

			const startAt: number =
				((node.data as Record<string, unknown> | undefined)
					?.honeydeckStartAt as number) ?? 0;

			if (isMagicCodeFence(node)) {
				const fences = parseInnerCodeFences(node.value);
				const duration = parseMagicCodeDuration(
					node.meta,
					options.magicCodeDuration,
				);
				if (!duration.ok) throw new Error(duration.message);

				if (fences.length === 0) {
					parent.children.splice(currentIndex, 1);
					continue;
				}

				if (fences.length === 1) {
					const [fence] = fences;
					if (!fence) continue;
					const html = await codeToHighlightedHtml(
						highlighter,
						fence.value,
						fence.lang,
					);
					parent.children.splice(
						currentIndex,
						1,
						makeCodeBlockNode(
							html,
							parseStepMeta(fence.meta),
							startAt,
							fence.value,
						),
					);
					didTransformCodeBlock = true;
					continue;
				}

				const states = flattenMagicTimeline(fences);
				const tokenPayload = await compileMagicTokenPayload(
					highlighter,
					states,
				);
				parent.children.splice(
					currentIndex,
					1,
					makeMagicCodeNode(
						tokenPayload,
						states.map((state) => state.group),
						startAt,
						duration.duration,
					),
				);
				didTransformMagicCode = true;
				continue;
			}

			const rawLang = node.lang ?? "text";
			const html = await codeToHighlightedHtml(
				highlighter,
				node.value,
				rawLang,
			);
			parent.children.splice(
				currentIndex,
				1,
				makeCodeBlockNode(html, parseStepMeta(node.meta), startAt, node.value),
			);
			didTransformCodeBlock = true;
		}

		if (didTransformCodeBlock) {
			injectImport(tree, CODE_BLOCK_COMPONENT_NAME, CODE_BLOCK_IMPORT_SOURCE);
		}
		if (didTransformMagicCode) {
			injectImport(tree, MAGIC_CODE_COMPONENT_NAME, MAGIC_CODE_IMPORT_SOURCE);
		}
	};
