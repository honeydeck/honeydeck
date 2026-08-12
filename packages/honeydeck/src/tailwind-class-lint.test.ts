import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..", "..");

const SKIP_DIRS = new Set([
	"node_modules",
	"dist",
	".next",
	".git",
	"out",
	"coverage",
]);

const EXTENSIONS = new Set([".tsx", ".mdx", ".jsx", ".ts", ".js", ".css"]);

const ARBITRARY_HONEYDECK_REGEX = /.*\[.*var\(--honeydeck.*\]/;

function* walk(dir: string): Generator<string> {
	const entries = readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if (SKIP_DIRS.has(entry.name)) continue;
		if (entry.name.startsWith(".")) continue;
		yield* walk(join(dir, entry.name));
	}
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const ext = entry.name.slice(entry.name.lastIndexOf("."));
		if (!EXTENSIONS.has(ext)) continue;
		yield join(dir, entry.name);
	}
}

describe("Tailwind class lint", () => {
	it("does not use arbitrary Tailwind values that reference --honeydeck-* tokens", () => {
		const offenders: { file: string; line: number; text: string }[] = [];

		for (const file of walk(REPO_ROOT)) {
			const relativePath = relative(REPO_ROOT, file);
			if (relativePath.startsWith("packages/docs/next-env.d.ts")) continue;

			const content = readFileSync(file, "utf-8");
			const lines = content.split("\n");
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (ARBITRARY_HONEYDECK_REGEX.test(line)) {
					offenders.push({
						file: relativePath,
						line: i + 1,
						text: line.trim(),
					});
				}
			}
		}

		assert.deepStrictEqual(
			offenders,
			[],
			`Found Tailwind arbitrary values that reference --honeydeck-* tokens. ` +
				`These should usually be replaced by a Honeydeck theme utility.`,
		);
	});
});
