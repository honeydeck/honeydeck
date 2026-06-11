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
const defaultGeneratedDir = resolve(
	defaultPackageRoot,
	"src/content/docs/generated",
);
const defaultMarkdownPublicDir = resolve(defaultPackageRoot, "public/docs");
const defaultPublicDir = resolve(defaultPackageRoot, "public");
const defaultSidebarPath = resolve(defaultPackageRoot, "docs-sidebar.json");
const defaultSiteUrl = "https://honeydeck.dev";

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
				source,
				slug,
				navGroup: group.label,
				order: groupIndex * 100 + itemIndex,
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

export function syncDocs({
	honeydeckRoot = defaultHoneydeckRoot,
	generatedDir = defaultGeneratedDir,
	markdownPublicDir = defaultMarkdownPublicDir,
	publicDir = defaultPublicDir,
	sidebarPath = defaultSidebarPath,
	siteUrl = defaultSiteUrl,
} = {}) {
	const sources = readSidebar(sidebarPath, honeydeckRoot);
	const routeBySource = createRouteBySource(sources);
	const resolvedGeneratedDir = resolvePackageOutputDir(
		generatedDir,
		"Generated docs dir",
	);
	const resolvedMarkdownPublicDir = resolvePackageOutputDir(
		markdownPublicDir,
		"Public docs dir",
	);
	const resolvedPublicDir = resolvePackageOutputDir(publicDir, "Public dir");

	rmSync(resolvedGeneratedDir, { recursive: true, force: true });
	rmSync(resolvedMarkdownPublicDir, { recursive: true, force: true });
	mkdirSync(resolvedGeneratedDir, { recursive: true });
	mkdirSync(resolvedMarkdownPublicDir, { recursive: true });
	mkdirSync(resolvedPublicDir, { recursive: true });

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

		const generatedMarkdownPath = resolve(
			resolvedGeneratedDir,
			`${entry.slug}.md`,
		);
		assertPathInsideDir(
			generatedMarkdownPath,
			resolvedGeneratedDir,
			"Generated docs path",
		);
		writeFileSync(generatedMarkdownPath, markdown);

		const markdownPublicPath = resolve(
			resolvedMarkdownPublicDir,
			`${entry.slug}.md`,
		);
		assertPathInsideDir(
			markdownPublicPath,
			resolvedMarkdownPublicDir,
			"Public docs path",
		);
		writeFileSync(markdownPublicPath, markdown);
		return {
			...frontmatter,
			navGroup: entry.navGroup,
			order: entry.order,
			markdownPath: `/docs/${entry.slug}.md`,
			route: `/docs/${entry.slug}`,
			canonicalSource: entry.source,
			markdown,
		};
	});

	docs.sort((a, b) => a.order - b.order);
	const generatedIndexPath = resolve(resolvedGeneratedDir, "index.json");
	assertPathInsideDir(
		generatedIndexPath,
		resolvedGeneratedDir,
		"Generated docs index path",
	);
	writeFileSync(
		generatedIndexPath,
		`${JSON.stringify(
			docs.map(({ markdown, ...doc }) => doc),
			null,
			2,
		)}\n`,
	);

	const llms = [
		"# Honeydeck",
		"",
		"> Honeydeck builds beautiful slide decks with MDX and React. It is AI-friendly because decks are plain text code.",
		"",
		"## Key resources",
		"",
		"- Package: https://www.npmjs.com/package/@honeydeck/honeydeck",
		"- GitHub: https://github.com/honeydeck/honeydeck",
		"- Starter command: `npx @honeydeck/honeydeck init`",
		"- Starter demo deck: https://demo.honeydeck.dev/starter",
		"- Feature showcase deck: https://demo.honeydeck.dev/features",
		"",
		"## Documentation",
		"",
		...docs.map(
			(doc) => `- [${doc.title}](${siteUrl}${doc.route}): ${doc.description}`,
		),
		"",
	].join("\n");

	const full = [
		llms,
		"## Full documentation corpus",
		...docs.map(
			(doc) =>
				`\n---\n\n# ${doc.title}\n\nSource: packages/honeydeck/${doc.canonicalSource}\nRoute: ${siteUrl}${doc.route}\nMarkdown: ${siteUrl}${doc.markdownPath}\n\n${doc.markdown
					.replace(/^---[\s\S]*?---\s*/, "")
					.trim()}`,
		),
		"",
	].join("\n");

	const llmsPath = resolve(resolvedPublicDir, "llms.txt");
	const llmsFullPath = resolve(resolvedPublicDir, "llms-full.txt");
	const robotsPath = resolve(resolvedPublicDir, "robots.txt");
	const sitemapPath = resolve(resolvedPublicDir, "sitemap.xml");
	for (const [label, outputPath] of [
		["LLM discovery path", llmsPath],
		["Full LLM discovery path", llmsFullPath],
		["Robots path", robotsPath],
		["Sitemap path", sitemapPath],
	]) {
		assertPathInsideDir(outputPath, resolvedPublicDir, label);
	}

	writeFileSync(llmsPath, llms);
	writeFileSync(llmsFullPath, full);
	writeFileSync(
		robotsPath,
		`User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
	);
	writeFileSync(
		sitemapPath,
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
			"/",
			"/for/product",
			"/docs",
			...docs.map((doc) => doc.route),
		]
			.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`)
			.join("\n")}\n</urlset>\n`,
	);

	return docs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const docs = syncDocs();
	console.log(
		`Synced ${docs.length} Honeydeck docs into ${defaultGeneratedDir}`,
	);
}
