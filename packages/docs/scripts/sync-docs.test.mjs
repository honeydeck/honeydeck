import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSearchIndex } from "./build-search-index.mjs";
import { readSidebar, rewriteDocLinks, syncDocs } from "./sync-docs.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");
const honeydeckRoot = resolve(repoRoot, "packages/honeydeck");
const sidebarPath = resolve(packageRoot, "docs-sidebar.json");

function tempDir() {
	const testRoot = resolve(packageRoot, ".tmp-tests");
	mkdirSync(testRoot, { recursive: true });
	return mkdtempSync(resolve(testRoot, "sync-"));
}

test("reads curated sidebar in configured order", () => {
	const sources = readSidebar(sidebarPath, honeydeckRoot);

	assert.equal(sources[0].slug, "getting-started");
	assert.equal(sources[0].navGroup, "Start");
	assert.equal(sources.at(-1).slug, "mermaid");
});

test("generates fumadocs content and meta from canonical docs", () => {
	const dir = tempDir();
	try {
		const contentDir = resolve(dir, "content/docs");
		const docs = syncDocs({ contentDir, honeydeckRoot, sidebarPath });

		assert.equal(docs[0].route, "/docs/getting-started");
		const generated = readFileSync(
			resolve(contentDir, "(start)/getting-started.mdx"),
			"utf-8",
		);
		assert.match(
			generated,
			/copiedFrom: "packages\/honeydeck\/docs\/getting-started\.md"/,
		);
		assert.match(generated, /# Getting started/);

		const meta = JSON.parse(
			readFileSync(resolve(contentDir, "meta.json"), "utf-8"),
		);
		assert.deepEqual(meta.pages.slice(0, 3), [
			"(start)",
			"(core)",
			"(components)",
		]);
		const startMeta = JSON.parse(
			readFileSync(resolve(contentDir, "(start)/meta.json"), "utf-8"),
		);
		assert.deepEqual(startMeta.pages, ["getting-started", "deeper-dive"]);
		assert.equal(startMeta.collapsible, true);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("rewrites local markdown links to docs routes", () => {
	const sources = readSidebar(sidebarPath, honeydeckRoot);
	const routeBySource = new Map(
		sources.map((entry) => [entry.source, `/docs/${entry.slug}`]),
	);

	assert.equal(
		rewriteDocLinks(
			"Read [configuration](configuration.md#deck) and [npm](https://npmjs.com).",
			"docs/getting-started.md",
			routeBySource,
		),
		"Read [configuration](/docs/configuration#deck) and [npm](https://npmjs.com).",
	);
});

test("rejects unsafe sidebar source and slug", () => {
	const dir = tempDir();
	try {
		const maliciousSource = resolve(dir, "bad-source.json");
		writeFileSync(
			maliciousSource,
			JSON.stringify([
				{ label: "Bad", items: [{ source: "../x.md", slug: "x" }] },
			]),
		);
		assert.throws(() => readSidebar(maliciousSource, honeydeckRoot), /source/);

		const maliciousSlug = resolve(dir, "bad-slug.json");
		writeFileSync(
			maliciousSlug,
			JSON.stringify([
				{
					label: "Bad",
					items: [{ source: "docs/getting-started.md", slug: "Bad" }],
				},
			]),
		);
		assert.throws(() => readSidebar(maliciousSlug, honeydeckRoot), /slug/);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("builds a static frontend search index", async () => {
	const dir = tempDir();
	try {
		const contentDir = resolve(dir, "content/docs");
		const publicDir = resolve(packageRoot, "public");
		const outputPath = resolve(publicDir, "search-index.test.json");
		syncDocs({ contentDir, honeydeckRoot, sidebarPath });
		const result = await buildSearchIndex({
			contentRoot: contentDir,
			outputPath,
		});
		const searchIndex = JSON.parse(readFileSync(outputPath, "utf-8"));

		assert.equal(result.count, 23);
		assert.equal(searchIndex.type, "advanced");
		assert.ok(searchIndex.docs);
		rmSync(outputPath, { force: true });
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("rejects output dirs outside the docs package", () => {
	assert.throws(
		() =>
			syncDocs({
				contentDir: resolve(repoRoot, "content"),
				honeydeckRoot,
				sidebarPath,
			}),
		/Fumadocs content dir/,
	);
});
