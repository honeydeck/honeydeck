import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { structure } from "fumadocs-core/mdx-plugins/remark-structure";
import { createSearchAPI } from "fumadocs-core/search/server";
import matter from "gray-matter";
import { readSidebar } from "./sync-docs.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");
const honeydeckRoot = resolve(repoRoot, "packages/honeydeck");
const contentDir = resolve(packageRoot, "content/docs");
const publicDir = resolve(packageRoot, "public");
const searchIndexPath = resolve(publicDir, "search-index.json");
const sidebarPath = resolve(packageRoot, "docs-sidebar.json");

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

function stripPlaygrounds(markdown) {
	return markdown
		.replace(/<([A-Z][A-Za-z0-9]*)\b[^>]*\/>/g, "")
		.replace(/<([A-Z][A-Za-z0-9]*)\b[\s\S]*?<\/\1>/g, "");
}

export async function buildSearchIndex({
	contentRoot = contentDir,
	outputPath = searchIndexPath,
} = {}) {
	const resolvedContentRoot = resolve(contentRoot);
	const resolvedOutputPath = resolve(outputPath);
	assertPathInsideDir(resolvedContentRoot, packageRoot, "Search content dir");
	assertPathInsideDir(resolvedOutputPath, publicDir, "Search index path");

	const sidebar = readSidebar(sidebarPath, honeydeckRoot);
	const indexes = sidebar.map((entry) => {
		const markdownPath = resolve(
			resolvedContentRoot,
			groupFolderName(entry.navGroup),
			`${entry.slug}.mdx`,
		);
		assertPathInsideDir(
			markdownPath,
			resolvedContentRoot,
			"Search source path",
		);
		const parsed = matter(readFileSync(markdownPath, "utf-8"));
		const title = parsed.data.title || entry.title || entry.slug;
		const description =
			parsed.data.description || `${title} documentation for Honeydeck.`;

		const content = stripPlaygrounds(parsed.content);

		return {
			id: `/docs/${entry.slug}`,
			title,
			description,
			breadcrumbs: [entry.navGroup, title],
			url: `/docs/${entry.slug}`,
			structuredData: structure(content),
		};
	});

	const search = createSearchAPI("advanced", {
		indexes,
		language: "english",
	});
	const exported = await search.export();
	mkdirSync(dirname(resolvedOutputPath), { recursive: true });
	writeFileSync(resolvedOutputPath, `${JSON.stringify(exported)}\n`);
	return { count: indexes.length, outputPath: resolvedOutputPath };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const result = await buildSearchIndex();
	console.log(
		`Built search index for ${result.count} docs at ${result.outputPath}`,
	);
}
