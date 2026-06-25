#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const tempRoot = mkdtempSync(join(tmpdir(), "honeydeck-packed-smoke-"));

try {
	const packOutput = run(
		"npm",
		[
			"pack",
			"--workspace",
			"@honeydeck/honeydeck",
			"--pack-destination",
			tempRoot,
			"--json",
		],
		repoRoot,
	);
	const [packed] = parseNpmPackOutput(packOutput.stdout);
	const tarballPath = join(tempRoot, basename(packed.filename));
	const projectRoot = join(tempRoot, "smoke");

	run("npm", ["init", "-y"], tempRoot);
	run("npm", ["install", tarballPath], tempRoot);
	run("npx", ["honeydeck", "--help"], tempRoot);
	run(
		"npx",
		["honeydeck", "init", "--name", "smoke", "--skip-install", "--skip-skill"],
		tempRoot,
	);
	run("npm", ["install", tarballPath], projectRoot);
	run("npm", ["run", "build"], projectRoot);

	console.log("✅ Packed install smoke passed");
} finally {
	if (process.env.HONEYDECK_KEEP_SMOKE_TEMP !== "1") {
		rmSync(tempRoot, { recursive: true, force: true });
	} else {
		console.log(`Kept smoke temp directory: ${tempRoot}`);
	}
}

function parseNpmPackOutput(stdout) {
	try {
		return JSON.parse(stdout);
	} catch {
		const jsonStart = stdout.indexOf("[");
		const jsonEnd = stdout.lastIndexOf("]");

		if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
			throw new Error("npm pack did not return JSON output");
		}

		return JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
	}
}

function run(command, args, cwd) {
	console.log(`$ ${command} ${args.join(" ")}`);
	const result = spawnSync(command, args, {
		cwd,
		encoding: "utf-8",
		stdio: ["ignore", "pipe", "pipe"],
		env: { ...process.env, npm_config_yes: "true" },
	});

	if (result.stdout) {
		process.stdout.write(result.stdout);
	}
	if (result.stderr) {
		process.stderr.write(result.stderr);
	}
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed with exit code ${result.status}`,
		);
	}

	return result;
}
