import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(
	readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: string };

function runCli(args: string[]) {
	return spawnSync(
		process.execPath,
		["--import", "tsx", "./src/cli/index.ts", ...args],
		{
			cwd: ROOT,
			encoding: "utf-8",
		},
	);
}

describe("CLI help", () => {
	it("shows top-level help for empty, flag, and help command requests", () => {
		for (const args of [[], ["--help"], ["-h"], ["help"], ["help", "--help"]]) {
			const result = runCli(args);

			assert.equal(result.status, 0);
			assert.match(result.stdout, /honeydeck <command> \[options\]/);
			assert.match(result.stdout, /honeydeck help <command>/);
			assert.ok(result.stdout.includes(`honeydeck v${packageJson.version}`));
		}
	});

	it("routes help command requests to the owning subcommand", () => {
		const result = runCli(["help", "dev"]);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /honeydeck dev — start the development server/);
		assert.match(result.stdout, /--deck <file\.mdx>/);
		assert.match(result.stdout, /-p, --port <n>/);
	});

	it("lets subcommands handle their own help flags", () => {
		const result = runCli(["pdf", "-h"]);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /honeydeck pdf — export slides to a PDF file/);
		assert.match(result.stdout, /--steps <mode>/);
		assert.match(result.stdout, /-o, --output <file>/);
	});

	it("returns an error for unknown help targets", () => {
		const result = runCli(["help", "missing"]);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Unknown command "missing"/);
		assert.match(result.stdout, /honeydeck help <command>/);
	});

	it("documents every subcommand help page", () => {
		const commands = ["init", "skill", "dev", "build", "pdf"];

		for (const command of commands) {
			const result = runCli([command, "--help"]);

			assert.equal(result.status, 0);
			assert.match(result.stdout, new RegExp(`honeydeck ${command}`));
			assert.match(result.stdout, /-h, --help/);
		}
	});
});
