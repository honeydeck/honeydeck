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
 * 3. **Rich title preservation** — the h1's full inline content (Markdown
 *    emphasis, links, code, and custom React components) is serialized back to
 *    MDX source and stored as `vfile.data.titleMdx`. The virtual-modules
 *    plugin uses this to generate a companion title module so layouts receive
 *    the title as a React node rather than plain text.
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
import { gfmToMarkdown } from "mdast-util-gfm";
import { mdxToMarkdown } from "mdast-util-mdx";
import { toMarkdown } from "mdast-util-to-markdown";
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
 * 3. Stores the h1's rich MDX source in `vfile.data.titleMdx` and the slide's
 *    ESM imports/exports in `vfile.data.titleImports` for the title module.
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
		heading: Heading;
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
				heading,
			};
		}
	});

	if (firstH1) {
		// TypeScript cannot prove the synchronous visit callback assigned
		// firstH1, so narrow with an explicit cast for the mutation block.
		const h1 = firstH1 as H1Location;

		// Remove the h1 node from its parent
		h1.parent.children.splice(h1.index, 1);
		vfile.data.title = h1.text;

		// Serialize the h1's inline children back to MDX so the virtual-modules
		// plugin can compile a companion title module. Wrapping in <span> keeps
		// the content inline and avoids MDX wrapping it in a top-level <p>.
		const titleMdx = toMarkdown(
			{ type: "paragraph", children: h1.heading.children },
			{ extensions: [mdxToMarkdown(), gfmToMarkdown()] },
		).trim();
		if (titleMdx) {
			vfile.data.titleMdx = `<span>${titleMdx}</span>`;
		}

		// Collect the slide's ESM import declarations so the generated title
		// module can resolve the same components as the slide body. Exports are
		// skipped because they may define MDX layouts or body-local values that
		// do not belong in the title module.
		const titleImports: string[] = [];
		visit(tree, "mdxjsEsm", (node) => {
			const estree = (node as { data?: { estree?: { body: unknown[] } } }).data
				?.estree;
			const body = Array.isArray(estree?.body) ? estree.body : [];
			if (
				body.length > 0 &&
				body.every(
					(statement) =>
						statement &&
						typeof statement === "object" &&
						(statement as { type?: string }).type === "ImportDeclaration",
				)
			) {
				titleImports.push((node as { value: string }).value);
			}
		});
		if (titleImports.length > 0) {
			vfile.data.titleImports = titleImports;
		}
	} else {
		// No h1 found — title is empty string
		vfile.data.title = "";
	}
};
