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

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(packageRoot, "public");

function tempDir() {
	const testRoot = resolve(packageRoot, ".tmp-tests");
	mkdirSync(testRoot, { recursive: true });
	return mkdtempSync(resolve(testRoot, "search-"));
}

function writeFixtureDocs(contentDir) {
	mkdirSync(resolve(contentDir, "(start)"), { recursive: true });
	writeFileSync(
		resolve(contentDir, "meta.json"),
		`${JSON.stringify({ title: "Honeydeck", pages: ["(start)"] })}\n`,
	);
	writeFileSync(
		resolve(contentDir, "(start)/meta.json"),
		`${JSON.stringify({ title: "Start", pages: ["getting-started"] })}\n`,
	);
	writeFileSync(
		resolve(contentDir, "(start)/getting-started.mdx"),
		`---\ntitle: "Getting started"\ndescription: "First Honeydeck deck."\nslug: "getting-started"\n---\n\n# Getting started\n\nPlain searchable prose.\n\n<KeyboardPlayground />\n`,
	);
}

test("builds a static frontend search index from authored docs content", async () => {
	const dir = tempDir();
	const outputPath = resolve(publicDir, "search-index.test.json");
	try {
		const contentDir = resolve(dir, "content/docs");
		writeFixtureDocs(contentDir);
		const result = await buildSearchIndex({
			contentRoot: contentDir,
			outputPath,
		});
		const searchIndex = JSON.parse(readFileSync(outputPath, "utf-8"));

		assert.equal(result.count, 1);
		assert.equal(searchIndex.type, "advanced");
		assert.ok(searchIndex.docs);
	} finally {
		rmSync(outputPath, { force: true });
		rmSync(dir, { recursive: true, force: true });
	}
});

test("rejects content dirs outside the docs package", async () => {
	await assert.rejects(
		() =>
			buildSearchIndex({
				contentRoot: resolve(packageRoot, "../honeydeck"),
				outputPath: resolve(publicDir, "search-index.test.json"),
			}),
		/Search content dir/,
	);
});
