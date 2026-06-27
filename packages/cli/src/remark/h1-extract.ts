/**
 * Remark plugin: extract the first h1 from each slide and parse YAML frontmatter.
 *
 * ### What it does
 * 1. **Frontmatter extraction** — visits the `yaml` node created by
 *    `remark-frontmatter`, parses the YAML string into a plain object, and
 *    stores it as `vfile.data.frontmatter`. This makes per-slide frontmatter
 *    (e.g. `layout: Cover`) available to the virtual-modules plugin without
 *    an extra YAML parsing library.
 *
 * 2. **H1 extraction** — finds the first `heading[depth=1]` node in the AST,
 *    reads its plain-text content via `mdast-util-to-string`, removes the node
 *    from the tree, and stores the text as `vfile.data.title`. Layouts can
 *    then render the title independently from the body, keeping its position
 *    stable regardless of how many steps have been revealed.
 *
 * ### Plugin ordering
 * This plugin must run AFTER `remark-frontmatter` (which creates the `yaml`
 * node) and BEFORE any plugins that rely on a cleaned-up AST.
 *
 * Recommended order:
 * ```ts
 * remarkPlugins: [remarkFrontmatter, remarkH1Extract, remarkStepNumbering]
 * ```
 */

import type { Heading, Parent, Root } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

// ---------------------------------------------------------------------------
// Simple YAML parser — handles flat key: value pairs.
// Coerces booleans and numbers; everything else stays as a string.
// ---------------------------------------------------------------------------

function parseFlatYaml(yaml: string): Record<string, unknown> {
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

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Remark plugin that:
 * 1. Parses `yaml` nodes (from remark-frontmatter) into `vfile.data.frontmatter`
 * 2. Removes the first `h1` from the tree and stores its text in `vfile.data.title`
 */
export const remarkH1Extract: Plugin<[], Root> = () => (tree, vfile) => {
	// ── Step 1: parse YAML frontmatter ──────────────────────────────────────
	visit(tree, "yaml", (node) => {
		const yamlNode = node as unknown as { value: string };
		vfile.data.frontmatter = parseFlatYaml(yamlNode.value);
	});

	// ── Step 2: find and remove first h1 ────────────────────────────────────
	// We collect the location during the visit and mutate after, to avoid
	// iterator invalidation while unist-util-visit walks the tree.

	type H1Location = {
		index: number;
		parent: Parent;
		text: string;
	};

	let firstH1: H1Location | null = null;

	visit(tree, "heading", (node, index, parent) => {
		if (firstH1) return; // already found one — stop collecting
		const heading = node as unknown as Heading;
		if (
			heading.depth === 1 &&
			parent &&
			index !== null &&
			index !== undefined
		) {
			firstH1 = {
				index: index as number,
				parent: parent as unknown as Parent,
				text: mdastToString(heading),
			};
		}
	});

	if (firstH1) {
		// Remove the h1 node from its parent
		(firstH1 as H1Location).parent.children.splice(
			(firstH1 as H1Location).index,
			1,
		);
		vfile.data.title = (firstH1 as H1Location).text;
	} else {
		// No h1 found — title is empty string
		vfile.data.title = "";
	}
};
