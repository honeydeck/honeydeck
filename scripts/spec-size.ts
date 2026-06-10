#!/usr/bin/env deno run --allow-read

// Collect spec files and estimate their size in words and tokens.
//
// Usage:
//   deno run --allow-read scripts/spec-size.ts
//   deno run --allow-read scripts/spec-size.ts '**/SPEC.md' '**/*.spec.md'
//   deno run --allow-read scripts/spec-size.ts --root packages/honeydeck '**/SPEC.md'

type FileStats = {
	path: string;
	chars: number;
	words: number;
	tokens: number;
};

const DEFAULT_PATTERNS = ["**/SPEC.md"];
const DEFAULT_EXCLUDED_DIRS = new Set([
	".git",
	"node_modules",
	"dist",
	"build",
	"coverage",
	".vite",
	".turbo",
]);

function printUsage(): void {
	console.log(
		`Usage: deno run --allow-read scripts/spec-size.ts [--root <dir>] [patterns...]

Patterns use simple glob syntax: *, **, and ?
Default pattern: **/SPEC.md

Examples:
  deno run --allow-read scripts/spec-size.ts
  deno run --allow-read scripts/spec-size.ts '**/SPEC.md' '**/*.spec.md'
  deno run --allow-read scripts/spec-size.ts --root packages/honeydeck '**/SPEC.md'`,
	);
}

function parseArgs(args: string[]): { root: string; patterns: string[] } {
	let root = ".";
	const patterns: string[] = [];

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === "--help" || arg === "-h") {
			printUsage();
			Deno.exit(0);
		}

		if (arg === "--root") {
			const next = args[index + 1];
			if (!next) {
				throw new Error("Missing value for --root");
			}
			root = next;
			index += 1;
			continue;
		}

		patterns.push(arg);
	}

	return { root, patterns: patterns.length > 0 ? patterns : DEFAULT_PATTERNS };
}

function escapeRegex(value: string): string {
	return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegex(pattern: string): RegExp {
	let regex = "^";

	for (let index = 0; index < pattern.length; index += 1) {
		const char = pattern[index];
		const next = pattern[index + 1];

		if (char === "*" && next === "*") {
			const afterNext = pattern[index + 2];
			if (afterNext === "/") {
				regex += "(?:.*/)?";
				index += 2;
			} else {
				regex += ".*";
				index += 1;
			}
			continue;
		}

		if (char === "*") {
			regex += "[^/]*";
			continue;
		}

		if (char === "?") {
			regex += "[^/]";
			continue;
		}

		regex += escapeRegex(char);
	}

	regex += "$";
	return new RegExp(regex);
}

function normalizePath(path: string): string {
	return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

async function* walkFiles(root: string, base = root): AsyncGenerator<string> {
	for await (const entry of Deno.readDir(root)) {
		if (entry.isDirectory && DEFAULT_EXCLUDED_DIRS.has(entry.name)) {
			continue;
		}

		const path = `${root}/${entry.name}`;

		if (entry.isDirectory) {
			yield* walkFiles(path, base);
			continue;
		}

		if (entry.isFile) {
			const relativePath = normalizePath(
				path.slice(base.length).replace(/^\//, ""),
			);
			yield relativePath;
		}
	}
}

function countWords(text: string): number {
	const words = text.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu);
	return words?.length ?? 0;
}

function estimateTokens(text: string): number {
	// Practical rough estimate for English/Markdown: ~4 chars per token.
	return Math.ceil(text.length / 4);
}

function formatNumber(value: number): string {
	return new Intl.NumberFormat("en-US").format(value);
}

function printTable(stats: FileStats[]): void {
	const pathWidth = Math.max(
		"file".length,
		...stats.map((stat) => stat.path.length),
	);
	const wordsWidth = Math.max(
		"words".length,
		...stats.map((stat) => `${stat.words}`.length),
	);
	const tokensWidth = Math.max(
		"tokens".length,
		...stats.map((stat) => `${stat.tokens}`.length),
	);
	const charsWidth = Math.max(
		"chars".length,
		...stats.map((stat) => `${stat.chars}`.length),
	);

	console.log(
		`${"file".padEnd(pathWidth)}  ${"words".padStart(wordsWidth)}  ${"tokens".padStart(
			tokensWidth,
		)}  ${"chars".padStart(charsWidth)}`,
	);
	console.log(
		`${"-".repeat(pathWidth)}  ${"-".repeat(wordsWidth)}  ${"-".repeat(
			tokensWidth,
		)}  ${"-".repeat(charsWidth)}`,
	);

	for (const stat of stats) {
		console.log(
			`${stat.path.padEnd(pathWidth)}  ${`${stat.words}`.padStart(
				wordsWidth,
			)}  ${`${stat.tokens}`.padStart(tokensWidth)}  ${`${stat.chars}`.padStart(
				charsWidth,
			)}`,
		);
	}
}

async function main(): Promise<void> {
	const { root, patterns } = parseArgs(Deno.args);
	const matchers = patterns.map(globToRegex);
	const stats: FileStats[] = [];

	for await (const relativePath of walkFiles(root)) {
		if (!matchers.some((matcher) => matcher.test(relativePath))) {
			continue;
		}

		const fullPath = `${root}/${relativePath}`;
		const text = await Deno.readTextFile(fullPath);

		stats.push({
			path: normalizePath(relativePath),
			chars: text.length,
			words: countWords(text),
			tokens: estimateTokens(text),
		});
	}

	stats.sort((left, right) => left.path.localeCompare(right.path));

	if (stats.length === 0) {
		console.log(`No files matched: ${patterns.join(", ")}`);
		return;
	}

	printTable(stats);

	const total = stats.reduce(
		(acc, stat) => ({
			chars: acc.chars + stat.chars,
			words: acc.words + stat.words,
			tokens: acc.tokens + stat.tokens,
		}),
		{ chars: 0, words: 0, tokens: 0 },
	);

	console.log("\nTotal");
	console.log(`  files:  ${formatNumber(stats.length)}`);
	console.log(`  words:  ${formatNumber(total.words)}`);
	console.log(
		`  tokens: ${formatNumber(total.tokens)} (estimated as chars / 4)`,
	);
	console.log(`  chars:  ${formatNumber(total.chars)}`);
}

if (import.meta.main) {
	try {
		await main();
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		Deno.exit(1);
	}
}
