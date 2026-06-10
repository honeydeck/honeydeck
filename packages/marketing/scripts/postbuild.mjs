import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const packageRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
const dist = resolve(packageRoot, "dist");
const generatedIndex = resolve(
	packageRoot,
	"src/content/docs/generated/index.json",
);
const indexPath = resolve(dist, "index.html");
const siteUrl = "https://honeydeck.dev";

if (!existsSync(indexPath)) process.exit(0);
const baseHtml = readFileSync(indexPath, "utf-8");
const docs = existsSync(generatedIndex)
	? JSON.parse(readFileSync(generatedIndex, "utf-8"))
	: [];

const pages = [
	{
		path: "/",
		title: "Honeydeck — MDX and React slide decks",
		description:
			"Build beautiful slide decks with MDX and React. AI-friendly plain-text decks for humans and agents.",
	},
	{
		path: "/for/developers",
		title: "Honeydeck for developers",
		description:
			"Use React components, MDX, Vite, Tailwind, and a friendly CLI to ship decks fast.",
	},
	{
		path: "/for/ai",
		title: "Honeydeck for AI-assisted decks",
		description:
			"Plain-text MDX makes Honeydeck decks easy for AI agents and humans to review and edit.",
	},
	{
		path: "/for/product",
		title: "Honeydeck for product teams",
		description:
			"Create crisp product narratives with AI-assisted MDX decks and developer-ready source control.",
	},
	{
		path: "/docs",
		title: "Getting started — Honeydeck docs",
		description:
			"Start building Honeydeck slides with MDX, React, Vite, and the Honeydeck CLI.",
	},
	...docs.map((doc) => ({
		path: doc.route,
		title: `${doc.title} — Honeydeck docs`,
		description: doc.description,
	})),
];

function markdownSummary(doc) {
	if (!doc) return "";
	const file = resolve(
		packageRoot,
		"public",
		doc.markdownPath.replace(/^\//, ""),
	);
	if (!existsSync(file)) return "";
	return readFileSync(file, "utf-8")
		.replace(/^---[\s\S]*?---\s*/, "")
		.replace(/^> Generated from .*\n\n?/m, "")
		.replace(/```[\s\S]*?```/g, "")
		.replace(/[#*_`>\-[\]()]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 5000);
}

function staticBody(page) {
	const doc = docs.find((entry) => entry.route === page.path);
	const text = doc ? markdownSummary(doc) : page.description;
	return `<main><h1>${page.title}</h1><p>${text}</p></main>`;
}

function htmlFor(page) {
	const url = `${siteUrl}${page.path}`;
	return baseHtml
		.replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
		.replace(
			/<meta name="description" content="[^"]*"\s*\/>/,
			`<meta name="description" content="${page.description}" />`,
		)
		.replace(
			/<meta property="og:title" content="[^"]*"\s*\/>/,
			`<meta property="og:title" content="${page.title}" />`,
		)
		.replace(
			/<meta property="og:description" content="[^"]*"\s*\/>/,
			`<meta property="og:description" content="${page.description}" />`,
		)
		.replace(
			/<link rel="canonical" href="[^"]*"\s*\/>/,
			`<link rel="canonical" href="${url}" />`,
		)
		.replace(
			'<div id="root"></div>',
			`<div id="root">${staticBody(page)}</div>`,
		);
}

for (const page of pages) {
	if (page.path === "/") {
		writeFileSync(indexPath, htmlFor(page));
		continue;
	}
	const target = resolve(dist, page.path.replace(/^\//, ""), "index.html");
	const flatTarget = resolve(dist, `${page.path.replace(/^\//, "")}.html`);
	mkdirSync(dirname(target), { recursive: true });
	mkdirSync(dirname(flatTarget), { recursive: true });
	writeFileSync(target, htmlFor(page));
	writeFileSync(flatTarget, htmlFor(page));
}

const og = resolve(dist, "og-card.svg");
if (!existsSync(og)) {
	copyFileSync(resolve(packageRoot, "public/og-card.svg"), og);
}

console.log(`Prepared ${pages.length} static route entrypoints.`);
