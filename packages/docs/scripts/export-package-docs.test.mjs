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
import { exportPackageDocs } from "./export-package-docs.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const honeydeckRoot = resolve(packageRoot, "../honeydeck");

function tempContentDir() {
	const testRoot = resolve(packageRoot, ".tmp-tests/package-docs");
	mkdirSync(testRoot, { recursive: true });
	return mkdtempSync(resolve(testRoot, "content-"));
}

function tempOutputDir() {
	const testRoot = resolve(honeydeckRoot, ".tmp-docs-tests");
	mkdirSync(testRoot, { recursive: true });
	return mkdtempSync(resolve(testRoot, "export-"));
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
		`---\ntitle: "Getting started"\ndescription: "First Honeydeck deck."\nslug: "getting-started"\n---\n\n# Getting started\n\nSee [configuration](/docs/configuration).\n`,
	);
}

test("exports authored docs as package-local markdown files", () => {
	const contentParent = tempContentDir();
	const outputDir = tempOutputDir();
	try {
		const contentDir = resolve(contentParent, "content/docs");
		writeFixtureDocs(contentDir);

		const result = exportPackageDocs({
			contentRoot: contentDir,
			outputRoot: outputDir,
		});
		const exported = readFileSync(
			resolve(outputDir, "getting-started.md"),
			"utf-8",
		);
		const index = JSON.parse(
			readFileSync(resolve(outputDir, "index.json"), "utf-8"),
		);

		assert.equal(result.count, 1);
		assert.match(exported, /^<!-- Generated from /);
		assert.match(exported, /# Getting started/);
		assert.match(exported, /\[configuration\]\(configuration\.md\)/);
		assert.equal(index.pages[0].file, "getting-started.md");
	} finally {
		rmSync(contentParent, { recursive: true, force: true });
		rmSync(outputDir, { recursive: true, force: true });
	}
});

test("rejects output dirs outside the honeydeck package", () => {
	const contentParent = tempContentDir();
	try {
		const contentDir = resolve(contentParent, "content/docs");
		writeFixtureDocs(contentDir);

		assert.throws(
			() =>
				exportPackageDocs({
					contentRoot: contentDir,
					outputRoot: resolve(packageRoot, "public/docs"),
				}),
			/Package docs output dir/,
		);
	} finally {
		rmSync(contentParent, { recursive: true, force: true });
	}
});
