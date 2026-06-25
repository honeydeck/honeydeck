import {
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { structure } from "fumadocs-core/mdx-plugins/remark-structure";
import { createSearchAPI } from "fumadocs-core/search/server";
import matter from "gray-matter";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = resolve(packageRoot, "content/docs");
const publicDir = resolve(packageRoot, "public");
const searchIndexPath = resolve(publicDir, "search-index.json");

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

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf-8"));
}

function stripPlaygrounds(markdown) {
	return markdown
		.replace(/<([A-Z][A-Za-z0-9]*)\b[^>]*\/>/g, "")
		.replace(/<([A-Z][A-Za-z0-9]*)\b[\s\S]*?<\/\1>/g, "");
}

function titleFromHeading(markdown) {
	return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function slugFromFile(contentRoot, filePath) {
	const relativePath = relative(contentRoot, filePath).replaceAll("\\", "/");
	return relativePath
		.split("/")
		.filter((segment) => !segment.startsWith("(") || !segment.endsWith(")"))
		.join("/")
		.replace(/\.mdx$/, "");
}

function readPagesFromMeta(contentRoot, dir, breadcrumbs = []) {
	const metaPath = resolve(dir, "meta.json");
	const meta = readJson(metaPath);
	const pages = [];

	for (const page of meta.pages ?? []) {
		if (typeof page !== "string") continue;

		if (page.startsWith("(") && page.endsWith(")")) {
			const groupDir = resolve(dir, page);
			const groupMeta = readJson(resolve(groupDir, "meta.json"));
			pages.push(
				...readPagesFromMeta(contentRoot, groupDir, [
					...breadcrumbs,
					groupMeta.title ?? page,
				]),
			);
			continue;
		}

		const filePath = resolve(dir, `${page}.mdx`);
		assertPathInsideDir(filePath, contentRoot, "Search source path");
		const raw = readFileSync(filePath, "utf-8");
		const parsed = matter(raw);
		const title = parsed.data.title || titleFromHeading(parsed.content) || page;
		const description =
			parsed.data.description || `${title} documentation for Honeydeck.`;
		const slug = parsed.data.slug || slugFromFile(contentRoot, filePath);

		pages.push({
			id: `/docs/${slug}`,
			title,
			description,
			breadcrumbs: [...breadcrumbs, title],
			url: `/docs/${slug}`,
			structuredData: structure(stripPlaygrounds(parsed.content)),
		});
	}

	return pages;
}

function discoverPages(contentRoot) {
	const metaPath = resolve(contentRoot, "meta.json");
	if (statSync(metaPath, { throwIfNoEntry: false })?.isFile()) {
		return readPagesFromMeta(contentRoot, contentRoot);
	}

	return readdirSync(contentRoot, { recursive: true })
		.map((entry) => resolve(contentRoot, entry))
		.filter((entry) => statSync(entry).isFile() && extname(entry) === ".mdx")
		.sort()
		.map((filePath) => {
			assertPathInsideDir(filePath, contentRoot, "Search source path");
			const parsed = matter(readFileSync(filePath, "utf-8"));
			const slug = parsed.data.slug || slugFromFile(contentRoot, filePath);
			const title =
				parsed.data.title || titleFromHeading(parsed.content) || slug;
			const description =
				parsed.data.description || `${title} documentation for Honeydeck.`;
			return {
				id: `/docs/${slug}`,
				title,
				description,
				breadcrumbs: [title],
				url: `/docs/${slug}`,
				structuredData: structure(stripPlaygrounds(parsed.content)),
			};
		});
}

export async function buildSearchIndex({
	contentRoot = contentDir,
	outputPath = searchIndexPath,
} = {}) {
	const resolvedContentRoot = resolve(contentRoot);
	const resolvedOutputPath = resolve(outputPath);
	assertPathInsideDir(resolvedContentRoot, packageRoot, "Search content dir");
	assertPathInsideDir(resolvedOutputPath, publicDir, "Search index path");

	const indexes = discoverPages(resolvedContentRoot);
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
