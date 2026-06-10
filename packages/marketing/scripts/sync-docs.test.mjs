import assert from "node:assert/strict";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { after, describe, it } from "node:test";
import { readSidebar, syncDocs } from "./sync-docs.mjs";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const packageRoot = resolve(repoRoot, "packages/marketing");
const honeydeckRoot = resolve(repoRoot, "packages/honeydeck");
const sidebarPath = resolve(packageRoot, "docs-sidebar.json");

function writeSidebar(path, items) {
	writeFileSync(path, `${JSON.stringify(items, null, 2)}\n`);
}

describe("docs sync", () => {
	const outputRoot = mkdtempSync(join(packageRoot, ".tmp-docs-sync-"));
	const generatedDir = join(outputRoot, "generated");
	const markdownPublicDir = join(outputRoot, "public-docs");
	const publicDir = join(outputRoot, "public");

	after(() => {
		rmSync(outputRoot, { recursive: true, force: true });
	});

	it("keeps the curated getting started source valid and first", () => {
		const sources = readSidebar(sidebarPath);

		assert.equal(sources[0]?.slug, "getting-started");
		assert.equal(sources[0]?.source, "docs/getting-started.md");

		for (const source of sources) {
			assert.ok(
				existsSync(resolve(honeydeckRoot, source.source)),
				`expected sidebar source to exist: ${source.source}`,
			);
		}
	});

	it("rejects malicious sidebar sources", () => {
		const maliciousSidebarPath = join(
			outputRoot,
			"malicious-source-sidebar.json",
		);

		for (const source of ["/etc/passwd", "../secret.md"]) {
			writeSidebar(maliciousSidebarPath, [
				{
					label: "Start",
					items: [{ source, slug: "secret" }],
				},
			]);

			assert.throws(() => readSidebar(maliciousSidebarPath), /source/);
		}
	});

	it("rejects unsafe sidebar slugs", () => {
		const maliciousSidebarPath = join(
			outputRoot,
			"malicious-slug-sidebar.json",
		);

		for (const slug of ["../evil", "evil/slug", "Evil"]) {
			writeSidebar(maliciousSidebarPath, [
				{
					label: "Start",
					items: [{ source: "docs/getting-started.md", slug }],
				},
			]);

			assert.throws(() => readSidebar(maliciousSidebarPath), /slug/);
		}
	});

	it("rejects output directories outside the marketing package", () => {
		assert.throws(
			() =>
				syncDocs({
					honeydeckRoot,
					generatedDir: resolve(repoRoot, "../generated"),
					markdownPublicDir,
					publicDir,
					sidebarPath,
				}),
			/Generated docs dir/,
		);
	});

	it("generates route metadata, public Markdown, and rewritten docs links", () => {
		const docs = syncDocs({
			honeydeckRoot,
			generatedDir,
			markdownPublicDir,
			publicDir,
			sidebarPath,
			siteUrl: "https://example.test",
		});

		assert.equal(docs[0]?.slug, "getting-started");
		assert.equal(docs[0]?.route, "/docs/getting-started");
		assert.equal(docs[0]?.canonicalSource, "docs/getting-started.md");

		const index = JSON.parse(
			readFileSync(join(generatedDir, "index.json"), "utf-8"),
		);
		assert.equal(index[0]?.slug, "getting-started");
		assert.equal(index[0]?.route, "/docs/getting-started");
		assert.equal(index[0]?.markdownPath, "/docs/getting-started.md");

		const publicMarkdownPath = join(markdownPublicDir, "getting-started.md");
		assert.ok(existsSync(publicMarkdownPath));

		const publicMarkdown = readFileSync(publicMarkdownPath, "utf-8");
		assert.match(
			publicMarkdown,
			/copiedFrom: "packages\/honeydeck\/docs\/getting-started\.md"/,
		);
		assert.match(publicMarkdown, /\[Next steps\]\(\/docs\/next-steps\)/);
		assert.match(publicMarkdown, /\[Slides\]\(\/docs\/slides\)/);
		assert.doesNotMatch(publicMarkdown, /\]\(next-steps\.md\)/);
	});
});
