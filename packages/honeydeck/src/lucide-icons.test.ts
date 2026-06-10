import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		if (entry === "dist") return [];

		const path = join(dir, entry);
		const stat = statSync(path);
		if (stat.isDirectory()) return sourceFiles(path);
		if (/\.(tsx?|jsx?)$/.test(entry)) return [path];
		return [];
	});
}

describe("lucide icon imports", () => {
	it("uses only suffixed ...Icon value imports in source files", () => {
		const failures: string[] = [];

		for (const file of sourceFiles("src")) {
			const source = readFileSync(file, "utf8");
			const imports = source.matchAll(
				/import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g,
			);

			for (const match of imports) {
				const names = match[1]
					.split(",")
					.map((name) => name.trim())
					.filter(Boolean);

				for (const name of names) {
					if (name.startsWith("type ")) continue;
					const importedName = name.split(/\s+as\s+/)[0]?.trim();
					if (!importedName?.endsWith("Icon")) {
						failures.push(`${file}: ${name}`);
					}
				}
			}
		}

		assert.deepEqual(failures, []);
	});
});
