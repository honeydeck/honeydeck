import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import {
	basename,
	dirname,
	extname,
	isAbsolute,
	posix,
	relative,
	resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const defaultPackageRoot = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"..",
);
const defaultRepoRoot = resolve(defaultPackageRoot, "../..");
const defaultHoneydeckRoot = resolve(defaultRepoRoot, "packages/honeydeck");
const defaultContentDir = resolve(defaultPackageRoot, "content/docs");
const defaultSidebarPath = resolve(defaultPackageRoot, "docs-sidebar.json");

function isInsideDir(candidate, dir) {
	const relativePath = relative(dir, candidate);
	return (
		relativePath !== "" &&
		!relativePath.startsWith("..") &&
		!isAbsolute(relativePath)
	);
}

function assertPathInsideDir(candidate, dir, label) {
	if (!isInsideDir(candidate, dir)) {
		throw new Error(`${label} must stay inside ${dir}.`);
	}
}

function resolvePackageOutputDir(outputDir, label) {
	const resolvedOutputDir = resolve(outputDir);
	assertPathInsideDir(resolvedOutputDir, defaultPackageRoot, label);
	return resolvedOutputDir;
}

function validateSidebarSource(source, honeydeckRoot) {
	if (typeof source !== "string" || source === "" || source.includes("\\")) {
		throw new Error(
			"Docs sidebar source must be a relative path inside packages/honeydeck.",
		);
	}

	const sourceParts = source.split("/");
	if (sourceParts.includes("..")) {
		throw new Error(
			"Docs sidebar source must be a relative path inside packages/honeydeck.",
		);
	}

	const normalized = posix.normalize(source);
	if (normalized === "." || normalized.startsWith("/")) {
		throw new Error(
			"Docs sidebar source must be a relative path inside packages/honeydeck.",
		);
	}

	const resolvedSource = resolve(honeydeckRoot, normalized);
	assertPathInsideDir(resolvedSource, honeydeckRoot, "Docs sidebar source");
	return normalized;
}

function validateSidebarSlug(slug) {
	if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		throw new Error(
			"Docs sidebar slug must be a lowercase kebab-case path segment.",
		);
	}

	return slug;
}

export function readSidebar(
	sidebarPath = defaultSidebarPath,
	honeydeckRoot = defaultHoneydeckRoot,
) {
	const sidebar = JSON.parse(readFileSync(sidebarPath, "utf-8"));
	const seenSlugs = new Set();
	const seenSources = new Set();

	return sidebar.flatMap((group, groupIndex) => {
		if (!group.label || !Array.isArray(group.items)) {
			throw new Error("Each docs sidebar group needs a label and items array.");
		}

		return group.items.map((item, itemIndex) => {
			if (!item.source || !item.slug) {
				throw new Error(
					`Docs sidebar item in ${group.label} needs source and slug.`,
				);
			}

			const source = validateSidebarSource(item.source, honeydeckRoot);
			const slug = validateSidebarSlug(item.slug);

			if (seenSlugs.has(slug)) {
				throw new Error(`Duplicate docs sidebar slug: ${slug}`);
			}
			if (seenSources.has(source)) {
				throw new Error(`Duplicate docs sidebar source: ${source}`);
			}
			seenSlugs.add(slug);
			seenSources.add(source);

			return {
				...item,
				navGroup: group.label,
				order: groupIndex * 100 + itemIndex,
				slug,
				source,
			};
		});
	});
}

export function createRouteBySource(sources) {
	return new Map(
		sources.map((entry) => [
			posix.normalize(entry.source),
			`/docs/${entry.slug}`,
		]),
	);
}

function headingTitle(source, fallback) {
	return source.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallback;
}

function toFrontmatter(data) {
	const lines = ["---"];
	for (const [key, value] of Object.entries(data)) {
		lines.push(`${key}: ${JSON.stringify(value)}`);
	}
	lines.push("---");
	return lines.join("\n");
}

function groupFolderName(groupLabel) {
	const slug = groupLabel
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

	if (!slug) {
		throw new Error(
			"Docs sidebar group label must contain letters or numbers.",
		);
	}

	return `(${slug})`;
}

export function rewriteDocLinks(markdown, sourcePath, routeBySource) {
	const sourceDir = posix.dirname(sourcePath);

	return markdown.replace(
		/(^|[^!])\[([^\]\n]+)\]\(([^)\s]+)\)/g,
		(match, prefix, label, target) => {
			if (
				target.startsWith("#") ||
				target.startsWith("/") ||
				target.includes("://") ||
				target.startsWith("mailto:")
			) {
				return match;
			}

			const hashIndex = target.indexOf("#");
			const targetPath = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
			const hash = hashIndex >= 0 ? target.slice(hashIndex) : "";
			if (![".md", ".mdx"].includes(extname(targetPath))) {
				return match;
			}

			const normalized = posix.normalize(posix.join(sourceDir, targetPath));
			const route = routeBySource.get(normalized);
			return route ? `${prefix}[${label}](${route}${hash})` : match;
		},
	);
}

export function createFumadocsMeta(sources) {
	const pages = [];
	const seenGroups = new Set();

	for (const source of sources) {
		if (!seenGroups.has(source.navGroup)) {
			seenGroups.add(source.navGroup);
			pages.push(groupFolderName(source.navGroup));
		}
	}

	return {
		title: "Honeydeck",
		pages,
	};
}

function createGroupMetas(sources) {
	const metas = new Map();

	for (const source of sources) {
		const folder = groupFolderName(source.navGroup);
		const meta = metas.get(folder) ?? {
			title: source.navGroup,
			defaultOpen: false,
			collapsible: true,
			pages: [],
		};
		meta.pages.push(source.slug);
		metas.set(folder, meta);
	}

	return metas;
}

export function syncDocs({
	honeydeckRoot = defaultHoneydeckRoot,
	contentDir = defaultContentDir,
	sidebarPath = defaultSidebarPath,
} = {}) {
	const sources = readSidebar(sidebarPath, honeydeckRoot);
	const routeBySource = createRouteBySource(sources);
	const resolvedContentDir = resolvePackageOutputDir(
		contentDir,
		"Fumadocs content dir",
	);

	rmSync(resolvedContentDir, { recursive: true, force: true });
	mkdirSync(resolvedContentDir, { recursive: true });

	const groupMetas = createGroupMetas(sources);
	for (const [folder, meta] of groupMetas) {
		const groupDir = resolve(resolvedContentDir, folder);
		assertPathInsideDir(groupDir, resolvedContentDir, "Generated group dir");
		mkdirSync(groupDir, { recursive: true });
		const groupMetaPath = resolve(groupDir, "meta.json");
		assertPathInsideDir(groupMetaPath, groupDir, "Generated group meta path");
		writeFileSync(groupMetaPath, `${JSON.stringify(meta, null, "\t")}\n`);
	}

	const docs = sources.map((entry) => {
		const absolute = resolve(honeydeckRoot, entry.source);
		assertPathInsideDir(absolute, honeydeckRoot, "Docs source");
		const raw = readFileSync(absolute, "utf-8");
		const parsed = matter(raw);
		const title =
			entry.title ||
			parsed.data.title ||
			headingTitle(
				parsed.content,
				basename(entry.source, extname(entry.source)),
			);
		const frontmatter = {
			title,
			description:
				parsed.data.description || `${title} documentation for Honeydeck.`,
			slug: entry.slug,
			copiedFrom: `packages/honeydeck/${entry.source}`,
		};
		const content = rewriteDocLinks(
			parsed.content.trim(),
			entry.source,
			routeBySource,
		);
		const markdown = `${toFrontmatter(frontmatter)}\n\n${content}\n`;

		const groupDir = resolve(
			resolvedContentDir,
			groupFolderName(entry.navGroup),
		);
		assertPathInsideDir(groupDir, resolvedContentDir, "Generated group dir");
		const generatedPath = resolve(groupDir, `${entry.slug}.mdx`);
		assertPathInsideDir(generatedPath, groupDir, "Generated docs path");
		writeFileSync(generatedPath, markdown);

		return {
			...frontmatter,
			navGroup: entry.navGroup,
			order: entry.order,
			route: `/docs/${entry.slug}`,
			canonicalSource: entry.source,
			markdown,
		};
	});

	const metaPath = resolve(resolvedContentDir, "meta.json");
	assertPathInsideDir(metaPath, resolvedContentDir, "Generated meta path");
	writeFileSync(
		metaPath,
		`${JSON.stringify(createFumadocsMeta(sources), null, "\t")}\n`,
	);

	return docs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const docs = syncDocs();
	console.log(`Synced ${docs.length} Honeydeck docs into ${defaultContentDir}`);
}
