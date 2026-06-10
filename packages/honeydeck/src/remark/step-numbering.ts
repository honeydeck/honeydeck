/**
 * Remark plugin: assign `at` props to `<Reveal>` and `<RevealGroup>` elements
 * and count total timeline steps per slide.
 *
 * ### What it does
 * Walks the MDAST (including MDX JSX nodes) in document order and:
 *  1. Assigns `at={n}` to each `<Reveal>` element (starting at 1) and
 *     injects `as="div"`/`as="span"` from the MDX flow/text context.
 *  2. Assigns `at={n}` to each `<RevealGroup>` element using the starting
 *     index of the group and adds internal per-target step numbers for group
 *     children/list items.
 *  3. Assigns `at={n}` to each `<TimelineSteps steps={n}>` element and
 *     advances the timeline by its literal static step count.
 *  4. Counts timeline steps from code fence `|`-separated groups after the
 *     first baseline group (counted here so `stepCount` is already accurate).
 *  5. Writes the total step count to `vfile.data.stepCount`.
 *
 * ### `at` prop injection
 * Numeric JSX props require an ESTree expression node. We construct a minimal
 * `Program` → `ExpressionStatement` → `Literal` subtree so that `@mdx-js/mdx`
 * generates `at={<number>}` (not `at="<string>"`).
 *
 * ### Existing `at` props
 * If a `<Reveal>` or `<RevealGroup>` already has an explicit `at` prop, this
 * plugin leaves it untouched. Future V2 may expose `<Reveal at={2}>` as a
 * public API for out-of-order reveals. `<Reveal>` still receives a compiler
 * `as` prop when missing, so manually numbered inline reveals remain valid HTML.
 *
 * ### Recursion
 * Nested step producers are flattened into the same slide-local timeline.
 * Parent reveal targets consume their step first, then nested reveals, groups,
 * and code walkthrough steps after the first baseline highlight consume later
 * steps before the next sibling target.
 */

import type { Program } from "estree";
import type { Code, Root } from "mdast";
import type {
	MdxJsxAttribute,
	MdxJsxAttributeValueExpression,
	MdxJsxFlowElement,
	MdxJsxTextElement,
} from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";

// ---------------------------------------------------------------------------
// Helper: build an `at={n}` attribute node
// ---------------------------------------------------------------------------

function makeAtAttribute(n: number): MdxJsxAttribute {
	// The ESTree program for the numeric literal `n`.
	const estree: Program = {
		type: "Program",
		sourceType: "module",
		comments: [],
		body: [
			{
				type: "ExpressionStatement",
				expression: {
					type: "Literal",
					value: n,
					raw: String(n),
				},
			},
		],
	};

	const valueExpr: MdxJsxAttributeValueExpression = {
		type: "mdxJsxAttributeValueExpression",
		value: String(n),
		data: { estree },
	};

	return {
		type: "mdxJsxAttribute",
		name: "at",
		value: valueExpr,
	};
}

function makeStringAttribute(name: string, value: string): MdxJsxAttribute {
	return {
		type: "mdxJsxAttribute",
		name,
		value,
	};
}

// ---------------------------------------------------------------------------
// Helper: check if a node is a JSX element with a given name
// ---------------------------------------------------------------------------

type MdxJsxElement = MdxJsxFlowElement | MdxJsxTextElement;

function isJsxElement(node: unknown): node is MdxJsxElement {
	const n = node as { type?: string };
	return n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement";
}

function hasAtProp(el: MdxJsxElement): boolean {
	return el.attributes.some(
		(a) => a.type === "mdxJsxAttribute" && a.name === "at",
	);
}

function getAttribute(
	el: MdxJsxElement,
	name: string,
): MdxJsxAttribute | undefined {
	return el.attributes.find(
		(a): a is MdxJsxAttribute =>
			a.type === "mdxJsxAttribute" && a.name === name,
	);
}

function injectRevealWrapperElement(el: MdxJsxElement): void {
	if (getAttribute(el, "as")) return;

	el.attributes.push(
		makeStringAttribute("as", el.type === "mdxJsxTextElement" ? "span" : "div"),
	);
}

// ---------------------------------------------------------------------------
// Helper: count reveal steps produced by a RevealGroup child
// ---------------------------------------------------------------------------

function countListItems(node: unknown): number | null {
	const n = node as { type?: string; children?: unknown[] };

	if (n.type === "list") {
		return (n.children ?? []).filter((child) => {
			const c = child as { type?: string };
			return c.type === "listItem";
		}).length;
	}

	if (isJsxElement(node) && (node.name === "ul" || node.name === "ol")) {
		return node.children.filter((child) => {
			const c = child as { type?: string; value?: string };
			if (c.type === "text") {
				return (c.value ?? "").trim().length > 0;
			}
			return true;
		}).length;
	}

	return null;
}

function getMeaningfulChildren(children: unknown[]): unknown[] {
	return children.filter((child) => {
		const c = child as { type?: string; value?: string };
		if (c.type === "text") {
			return (c.value ?? "").trim().length > 0;
		}
		return true;
	});
}

function getRevealGroupTargets(el: MdxJsxElement): unknown[] {
	const targets: unknown[] = [];

	for (const child of getMeaningfulChildren(el.children)) {
		const listItemCount = countListItems(child);
		const c = child as { type?: string; children?: unknown[] };

		if (listItemCount !== null && Array.isArray(c.children)) {
			if (c.type === "list") {
				targets.push(
					...c.children.filter((item) => {
						const i = item as { type?: string };
						return i.type === "listItem";
					}),
				);
			} else {
				targets.push(...getMeaningfulChildren(c.children));
			}
			continue;
		}

		targets.push(child);
	}

	return targets;
}

// ---------------------------------------------------------------------------
// Helper: count groups/steps encoded in a code fence meta string
//
// Pattern: `{2|4-5|all}` → 3 groups, 2 timeline steps.
// The first group is the baseline active highlight. Each later group consumes
// one timeline step.
// ---------------------------------------------------------------------------

function countCodeFenceGroups(meta: string | null | undefined): number {
	if (!meta) return 0;
	const match = meta.match(/\{([^}]+)\}/);
	if (!match?.[1]) return 0;
	return match[1].split("|").filter(Boolean).length;
}

function countCodeFenceSteps(meta: string | null | undefined): number {
	return Math.max(0, countCodeFenceGroups(meta) - 1);
}

function expressionValue(attr: MdxJsxAttribute): unknown {
	const value = attr.value;
	if (
		!value ||
		typeof value === "string" ||
		value.type !== "mdxJsxAttributeValueExpression"
	) {
		return undefined;
	}

	const body = value.data?.estree?.body;
	const statement = body?.[0];
	if (statement?.type !== "ExpressionStatement") return undefined;

	const expression = statement.expression;
	if (expression.type !== "Literal") return undefined;
	return expression.value;
}

function parsePositiveIntegerLiteral(attr: MdxJsxAttribute): number | null {
	if (typeof attr.value === "string") {
		if (!/^[1-9]\d*$/.test(attr.value)) return null;
		return Number(attr.value);
	}

	const value = expressionValue(attr);
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}

	if (typeof value === "string" && /^[1-9]\d*$/.test(value)) {
		return Number(value);
	}

	return null;
}

function readTimelineSteps(el: MdxJsxElement): number {
	const attr = getAttribute(el, "steps");
	if (!attr || attr.value === null) {
		throw new Error(
			"Honeydeck <TimelineSteps> requires a literal positive integer `steps` prop.",
		);
	}

	const steps = parsePositiveIntegerLiteral(attr);
	if (steps === null) {
		throw new Error(
			"Honeydeck <TimelineSteps> `steps` must be a literal positive integer, for example steps={3}. Dynamic expressions are not supported because timeline steps are counted at build time.",
		);
	}

	return steps;
}

function findNestedStepProducer(node: unknown): string | null {
	const n = node as { type?: string; children?: unknown[] };

	if (n.type === "code") {
		const codeNode = node as Code;
		return countCodeFenceSteps(codeNode.meta) > 0 ? "stepped code fence" : null;
	}

	if (isJsxElement(node)) {
		if (
			node.name === "Reveal" ||
			node.name === "RevealGroup" ||
			node.name === "TimelineSteps"
		) {
			return `<${node.name}>`;
		}
	}

	if (!Array.isArray(n.children)) return null;

	for (const child of n.children) {
		const producer = findNestedStepProducer(child);
		if (producer) return producer;
	}

	return null;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Remark plugin that numbers `<Reveal>` and `<RevealGroup>` elements with
 * sequential `at` props and stores the total step count in `vfile.data`.
 *
 * Usage (in Vite plugin config):
 * ```ts
 * mdx({ remarkPlugins: [remarkFrontmatter, remarkStepNumbering] })
 * ```
 */
export const remarkStepNumbering: Plugin<[], Root> = () => (tree, vfile) => {
	let counter = 1; // next `at` value to assign; 1-based

	function visitChildren(node: unknown): void {
		const n = node as { children?: unknown[] };
		if (!Array.isArray(n.children)) return;

		for (const child of n.children) {
			visitNode(child);
		}
	}

	function visitNode(node: unknown): void {
		const n = node as { type?: string };

		// ── Code blocks with step-through meta ─────────────────────────────
		if (n.type === "code") {
			const codeNode = node as Code;
			const groupCount = countCodeFenceGroups(codeNode.meta);
			const steps = Math.max(0, groupCount - 1);
			if (groupCount > 0) {
				// Annotate the code node with the first timeline step that advances
				// beyond the baseline group so that remarkShikiCodeBlocks (which runs
				// after us) can embed it in the <HoneydeckCodeBlock startAt={N}> prop
				// without needing its own counter.
				if (!(codeNode as unknown as Record<string, unknown>).data) {
					(codeNode as unknown as Record<string, unknown>).data = {};
				}
				(
					(codeNode as unknown as Record<string, unknown>).data as Record<
						string,
						unknown
					>
				).honeydeckStartAt = counter;
			}
			counter += steps;
			return;
		}

		// ── MDX JSX elements ─────────────────────────────────────────────────
		if (isJsxElement(node)) {
			const el = node as unknown as MdxJsxElement;

			if (el.name === "TimelineSteps") {
				const steps = readTimelineSteps(el);
				const nestedProducer = findNestedStepProducer({
					type: "honeydeckTimelineStepsChildren",
					children: el.children,
				});

				if (nestedProducer) {
					throw new Error(
						`Honeydeck <TimelineSteps> cannot contain nested timeline producers (${nestedProducer}). Register custom component steps with the outer <TimelineSteps> and use useTimelineSteps() inside the custom component instead.`,
					);
				}

				if (!hasAtProp(el)) {
					el.attributes.push(makeAtAttribute(counter));
				}

				counter += steps;
				return;
			}

			if (el.name === "Reveal") {
				injectRevealWrapperElement(el);

				if (!hasAtProp(el)) {
					el.attributes.push(makeAtAttribute(counter));
					counter++;
					visitChildren(el);
				}
				return;
			}

			if (el.name === "RevealGroup") {
				if (hasAtProp(el)) {
					return;
				}

				const targets = getRevealGroupTargets(el);
				const targetSteps: number[] = [];

				el.attributes.push(makeAtAttribute(counter));
				if (targets.length === 0) {
					counter++;
					return;
				}

				for (const target of targets) {
					targetSteps.push(counter);
					counter++;
					visitNode(target);
				}

				el.attributes.push(
					makeStringAttribute("targetStepsJson", JSON.stringify(targetSteps)),
				);
				return;
			}
		}

		visitChildren(node);
	}

	visitChildren(tree);

	// Store total step count on the vfile for the virtual modules plugin to read.
	vfile.data.stepCount = counter - 1; // counter started at 1
};
