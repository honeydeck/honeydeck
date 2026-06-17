/**
 * Remark plugin: assign `at` props to timeline-aware MDX elements and count
 * total timeline steps per slide.
 *
 * ### What it does
 * Walks the MDAST (including MDX JSX nodes) in document order and:
 *  1. Assigns `at={n}` to each `<Reveal>` element (starting at 1) and
 *     injects `as="div"`/`as="span"` from the MDX flow/text context.
 *  2. Assigns `at={n}` to each `<RevealGroup>` element using the starting
 *     index of the group and adds internal per-target step numbers for group
 *     children/list items.
 *  3. Collects literal `<Reveal name="...">` targets and resolves
 *     `<RevealWith target="...">`/`<RevealWith at={n}>` without adding steps.
 *  4. Assigns `at={n}` to each `<TimelineSteps steps={n}>` element and
 *     advances the timeline by its literal static step count.
 *  5. Counts timeline steps from code fence `|`-separated groups after the
 *     first baseline group (counted here so `stepCount` is already accurate).
 *  6. Writes the total step count to `vfile.data.stepCount`.
 *
 * ### `at` prop injection
 * Numeric JSX props require an ESTree expression node. We construct a minimal
 * `Program` → `ExpressionStatement` → `Literal` subtree so that `@mdx-js/mdx`
 * generates `at={<number>}` (not `at="<string>"`).
 *
 * ### Internal `at` props
 * Honeydeck injects `at` props during compilation to connect timeline-driven
 * components to their assigned slide-local steps. `at` is internal compiler
 * plumbing for `<Reveal>` and `<RevealGroup>`, and a validated sync target for
 * `<RevealWith>`. `<Reveal>` and `<RevealWith>` still receive compiler `as`
 * props when missing, so inline usages remain valid HTML.
 *
 * ### Recursion
 * Nested step producers are flattened into the same slide-local timeline.
 * Parent reveal targets consume their step first, then nested reveals, groups,
 * RevealWith children, and code walkthrough steps after the first baseline
 * highlight consume later steps before the next sibling target.
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
import {
	countCodeFenceGroups,
	countCodeFenceSteps,
	countMagicCodeStates,
	isMagicCodeFence,
} from "./code-utils.ts";

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

function hasAttribute(el: MdxJsxElement, name: string): boolean {
	return el.attributes.some(
		(a) => a.type === "mdxJsxAttribute" && a.name === name,
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

function removeAttribute(el: MdxJsxElement, name: string): void {
	el.attributes = el.attributes.filter(
		(a) => !(a.type === "mdxJsxAttribute" && a.name === name),
	);
}

function setAtAttribute(el: MdxJsxElement, at: number): void {
	removeAttribute(el, "at");
	el.attributes.push(makeAtAttribute(at));
}

function setStringAttribute(
	el: MdxJsxElement,
	name: string,
	value: string,
): void {
	removeAttribute(el, name);
	el.attributes.push(makeStringAttribute(name, value));
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

function stringLiteralValue(attr: MdxJsxAttribute): string | null {
	if (typeof attr.value === "string") return attr.value;

	const value = expressionValue(attr);
	return typeof value === "string" ? value : null;
}

function readNonEmptyStringLiteral(
	attr: MdxJsxAttribute,
	description: string,
): string {
	const value = stringLiteralValue(attr);
	if (value === null) {
		throw new Error(
			`Honeydeck ${description} must be a literal string. Dynamic expressions are not supported because RevealWith targets are resolved at build time.`,
		);
	}
	if (value.length === 0) {
		throw new Error(`Honeydeck ${description} must not be empty.`);
	}
	return value;
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
		if (isMagicCodeFence(codeNode)) {
			return countMagicCodeStates(codeNode.value) > 1
				? "Magic Code block"
				: null;
		}
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
 * Remark plugin that numbers timeline-aware MDX elements with sequential `at`
 * props and stores the total step count in `vfile.data`.
 *
 * Usage (in Vite plugin config):
 * ```ts
 * mdx({ remarkPlugins: [remarkFrontmatter, remarkStepNumbering] })
 * ```
 */
export const remarkStepNumbering: Plugin<[], Root> = () => (tree, vfile) => {
	let counter = 1; // next `at` value to assign; 1-based
	const namedReveals = new Map<string, number>();
	const revealWithTargets: MdxJsxElement[] = [];
	const revealWithNumericTargets: Array<{ el: MdxJsxElement; at: number }> = [];

	function visitChildren(node: unknown): void {
		const n = node as { children?: unknown[] };
		if (!Array.isArray(n.children)) return;

		for (const child of n.children) {
			visitNode(child);
		}
	}

	function recordRevealName(el: MdxJsxElement, at: number): void {
		const nameAttr = getAttribute(el, "name");
		if (!nameAttr) return;

		const name = readNonEmptyStringLiteral(nameAttr, "<Reveal> `name`");
		if (namedReveals.has(name)) {
			throw new Error(
				`Honeydeck <Reveal> name "${name}" is duplicated on this slide. Reveal names must be unique per slide for <RevealWith target="..."> resolution.`,
			);
		}
		namedReveals.set(name, at);
	}

	function visitNode(node: unknown): void {
		const n = node as { type?: string };

		// ── Code blocks with step-through meta ─────────────────────────────
		if (n.type === "code") {
			const codeNode = node as Code;

			if (isMagicCodeFence(codeNode)) {
				const stateCount = countMagicCodeStates(codeNode.value);
				const steps = Math.max(0, stateCount - 1);
				if (stateCount > 0) {
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

				setAtAttribute(el, counter);
				counter += steps;
				visitChildren(el);
				return;
			}

			if (el.name === "Reveal") {
				if (hasAtProp(el)) {
					throw new Error(
						"Honeydeck <Reveal> `at` is internal compiler plumbing and cannot be authored. Use <RevealWith at={n}> to sync content with an existing step.",
					);
				}

				const revealAt = counter;
				injectRevealWrapperElement(el);
				setAtAttribute(el, revealAt);
				recordRevealName(el, revealAt);
				counter++;
				visitChildren(el);
				return;
			}

			if (el.name === "RevealWith") {
				injectRevealWrapperElement(el);

				const hasTarget = hasAttribute(el, "target");
				const hasAt = hasAtProp(el);
				if (hasTarget === hasAt) {
					throw new Error(
						"Honeydeck <RevealWith> requires exactly one of `target` or `at`.",
					);
				}

				if (hasTarget) {
					const targetAttr = getAttribute(el, "target");
					if (!targetAttr) return;
					readNonEmptyStringLiteral(targetAttr, "<RevealWith> `target`");
					revealWithTargets.push(el);
				} else {
					const atAttr = getAttribute(el, "at");
					const at = atAttr ? parsePositiveIntegerLiteral(atAttr) : null;
					if (at === null) {
						throw new Error(
							"Honeydeck <RevealWith> `at` must be a literal positive integer, for example at={2}. Dynamic expressions are not supported because RevealWith steps are resolved at build time.",
						);
					}
					setAtAttribute(el, at);
					revealWithNumericTargets.push({ el, at });
				}

				visitChildren(el);
				return;
			}

			if (el.name === "RevealGroup") {
				if (hasAtProp(el)) {
					throw new Error(
						"Honeydeck <RevealGroup> `at` is internal compiler plumbing and cannot be authored. Use <RevealWith at={n}> to sync content with an existing group step.",
					);
				}

				const targets = getRevealGroupTargets(el);
				const targetSteps: number[] = [];

				setAtAttribute(el, counter);
				if (targets.length === 0) {
					removeAttribute(el, "targetStepsJson");
					counter++;
					return;
				}

				for (const target of targets) {
					targetSteps.push(counter);
					counter++;
					visitNode(target);
				}

				setStringAttribute(el, "targetStepsJson", JSON.stringify(targetSteps));
				return;
			}
		}

		visitChildren(node);
	}

	visitChildren(tree);

	const stepCount = counter - 1; // counter started at 1

	for (const el of revealWithTargets) {
		const targetAttr = getAttribute(el, "target");
		if (!targetAttr) continue;
		const target = readNonEmptyStringLiteral(
			targetAttr,
			"<RevealWith> `target`",
		);
		const at = namedReveals.get(target);
		if (at === undefined) {
			throw new Error(
				`Honeydeck <RevealWith target="${target}"> could not find a same-slide <Reveal name="${target}"> target.`,
			);
		}
		setAtAttribute(el, at);
	}

	for (const { at } of revealWithNumericTargets) {
		if (at > stepCount) {
			throw new Error(
				`Honeydeck <RevealWith at={${at}}> targets step ${at}, but this slide only has ${stepCount} timeline step${stepCount === 1 ? "" : "s"}.`,
			);
		}
	}

	// Store total step count on the vfile for the virtual modules plugin to read.
	vfile.data.stepCount = stepCount;
};
