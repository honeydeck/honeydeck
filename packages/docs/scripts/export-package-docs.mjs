import {
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const monorepoRoot = resolve(packageRoot, "../..");
const contentDir = resolve(packageRoot, "content/docs");
const honeydeckPackageRoot = resolve(monorepoRoot, "packages/honeydeck");
const packageDocsDir = resolve(honeydeckPackageRoot, "docs");

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
			assertPathInsideDir(groupDir, contentRoot, "Package docs source group");
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
		assertPathInsideDir(filePath, contentRoot, "Package docs source path");
		const raw = readFileSync(filePath, "utf-8");
		const parsed = matter(raw);
		const slug = parsed.data.slug || slugFromFile(contentRoot, filePath);
		const title = parsed.data.title || titleFromHeading(parsed.content) || page;
		const description =
			parsed.data.description || `${title} documentation for Honeydeck.`;

		pages.push({
			slug,
			title,
			description,
			breadcrumbs: [...breadcrumbs, title],
			sourcePath: relative(monorepoRoot, filePath).replaceAll("\\", "/"),
			content: parsed.content.trim(),
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
			assertPathInsideDir(filePath, contentRoot, "Package docs source path");
			const parsed = matter(readFileSync(filePath, "utf-8"));
			const slug = parsed.data.slug || slugFromFile(contentRoot, filePath);
			const title =
				parsed.data.title || titleFromHeading(parsed.content) || slug;
			const description =
				parsed.data.description || `${title} documentation for Honeydeck.`;
			return {
				slug,
				title,
				description,
				breadcrumbs: [title],
				sourcePath: relative(monorepoRoot, filePath).replaceAll("\\", "/"),
				content: parsed.content.trim(),
			};
		});
}

function toPackageMarkdown(page) {
	const body = page.content.replace(
		/\]\(\/docs\/([^)#]+)(#[^)]+)?\)/g,
		(_match, slug, hash = "") => `](${slug}.md${hash})`,
	);

	return `<!-- Generated from ${page.sourcePath}. Do not edit by hand. -->\n\n${body}\n`;
}

export function exportPackageDocs({
	contentRoot = contentDir,
	outputRoot = packageDocsDir,
} = {}) {
	const resolvedContentRoot = resolve(contentRoot);
	const resolvedOutputRoot = resolve(outputRoot);
	assertPathInsideDir(
		resolvedContentRoot,
		packageRoot,
		"Package docs content dir",
	);
	assertPathInsideDir(
		resolvedOutputRoot,
		honeydeckPackageRoot,
		"Package docs output dir",
	);

	const pages = discoverPages(resolvedContentRoot);
	rmSync(resolvedOutputRoot, { recursive: true, force: true });
	mkdirSync(resolvedOutputRoot, { recursive: true });

	const index = pages.map((page) => {
		const file = `${page.slug}.md`;
		const outputPath = resolve(resolvedOutputRoot, file);
		assertPathInsideDir(
			outputPath,
			resolvedOutputRoot,
			"Package docs output file",
		);
		writeFileSync(outputPath, toPackageMarkdown(page));

		return {
			slug: page.slug,
			title: page.title,
			description: page.description,
			breadcrumbs: page.breadcrumbs,
			file,
			sourcePath: page.sourcePath,
		};
	});

	writeFileSync(
		resolve(resolvedOutputRoot, "index.json"),
		`${JSON.stringify({ generatedFrom: "packages/docs/content/docs", pages: index }, null, 2)}\n`,
	);

	return { count: pages.length, outputRoot: resolvedOutputRoot };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const result = exportPackageDocs();
	console.log(`Exported ${result.count} package docs to ${result.outputRoot}`);
}
