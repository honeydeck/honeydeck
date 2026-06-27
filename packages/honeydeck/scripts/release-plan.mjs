#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../..");
const publishablePackages = [
	"packages/runtime",
	"packages/cli",
	"packages/honeydeck",
];
const packageJsonPath = resolve(repoRoot, "packages/honeydeck/package.json");
const packageLockPath = resolve(repoRoot, "package-lock.json");
const releaseNotesPath = resolve(repoRoot, "RELEASE_NOTES.md");

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");
const githubOutputPath = getFlagValue("--github-output");

const packageJson = readJson(packageJsonPath);
const latestTag = git(
	["describe", "--tags", "--match", "v[0-9]*", "--abbrev=0"],
	{
		allowFailure: true,
	},
);
const currentVersion = latestTag
	? latestTag.replace(/^v/, "")
	: packageJson.version;
const commits = readCommits(latestTag ? `${latestTag}..HEAD` : "HEAD");
const conventionalCommits = commits.map(toConventionalCommit).filter(Boolean);

if (conventionalCommits.length === 0) {
	const reason =
		"No Conventional Commit subjects found since the latest release tag.";
	writeOutputs({
		release: "false",
		reason,
	});
	console.log(`${reason} No release planned.`);
	process.exit(0);
}

const bump = getVersionBump(conventionalCommits);
const nextVersion = incrementVersion(currentVersion, bump);
const tag = `v${nextVersion}`;
const notes = createReleaseNotes(nextVersion, latestTag, conventionalCommits);

if (shouldWrite) {
	for (const packageDir of publishablePackages) {
		writePackageVersion(
			resolve(repoRoot, packageDir, "package.json"),
			nextVersion,
		);
	}
	writePackageLockVersion(packageLockPath, nextVersion);
	writeFileSync(releaseNotesPath, notes);
}

writeOutputs({
	release: "true",
	version: nextVersion,
	tag,
	bump,
	notes_path: releaseNotesPath,
});

console.log(`Planned ${bump} release ${tag}.`);

function getFlagValue(flag) {
	const index = process.argv.indexOf(flag);
	if (index === -1) return undefined;
	return process.argv[index + 1];
}

function git(commandArgs, options = {}) {
	try {
		return execFileSync("git", commandArgs, {
			cwd: repoRoot,
			encoding: "utf8",
			stdio: ["ignore", "pipe", options.allowFailure ? "ignore" : "pipe"],
		}).trim();
	} catch (error) {
		if (options.allowFailure) return "";
		throw error;
	}
}

function readCommits(range) {
	const raw = git(["log", range, "--format=%H%x1f%s%x1f%b%x1e"], {
		allowFailure: true,
	});

	return raw
		.split("\x1e")
		.map((record) => record.trim())
		.filter(Boolean)
		.map((record) => {
			const [sha = "", subject = "", body = ""] = record.split("\x1f");
			return { sha, subject, body };
		});
}

function toConventionalCommit(commit) {
	const candidateSubjects = [
		commit.subject,
		...commit.body
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean),
	];

	for (const subject of candidateSubjects) {
		const match =
			/^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9._/-]+)\))?(?<breaking>!)?: (?<summary>.+)$/.exec(
				subject,
			);
		if (!match?.groups) continue;

		return {
			sha: commit.sha,
			subject,
			type: match.groups.type,
			scope: match.groups.scope,
			summary: match.groups.summary,
			breaking:
				Boolean(match.groups.breaking) ||
				/^BREAKING[ -]CHANGE:/m.test(commit.body),
		};
	}

	return null;
}

function getVersionBump(commits) {
	if (commits.some((commit) => commit.breaking)) return "major";
	if (commits.some((commit) => commit.type === "feat")) return "minor";
	return "patch";
}

function incrementVersion(version, bump) {
	const [major, minor, patch] = version.split(".").map((part) => Number(part));
	if (![major, minor, patch].every(Number.isInteger)) {
		throw new Error(`Cannot increment non-semver version "${version}".`);
	}

	if (bump === "major") return `${major + 1}.0.0`;
	if (bump === "minor") return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

function createReleaseNotes(version, latestTag, commits) {
	const lines = [
		`# Honeydeck ${version}`,
		"",
		latestTag ? `Changes since ${latestTag}.` : "Initial automated release.",
		"",
		"## Changes",
		"",
	];

	for (const commit of commits) {
		const scope = commit.scope
			? `**${commit.type}(${commit.scope})**`
			: `**${commit.type}**`;
		const breaking = commit.breaking ? " **BREAKING**" : "";
		lines.push(
			`- ${scope}:${breaking} ${commit.summary} (${commit.sha.slice(0, 7)})`,
		);
	}

	lines.push("");
	return `${lines.join("\n")}\n`;
}

function writePackageVersion(path, version) {
	const data = readJson(path);
	data.version = version;
	writeJson(path, data);
}

function writePackageLockVersion(path, version) {
	const data = readJson(path);
	for (const packageDir of publishablePackages) {
		if (data.packages?.[packageDir]) {
			data.packages[packageDir].version = version;
		}
	}
	const packageNames = [
		"@honeydeck/runtime",
		"@honeydeck/cli",
		"@honeydeck/honeydeck",
	];
	for (const packageName of packageNames) {
		const lockPath = `node_modules/${packageName}`;
		if (data.packages?.[lockPath]) {
			data.packages[lockPath].version = version;
		}
	}
	writeJson(path, data);
}

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
	writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`);
}

function writeOutputs(outputs) {
	if (githubOutputPath) {
		const outputText = Object.entries(outputs)
			.map(([key, value]) => `${key}=${value}`)
			.join("\n");
		writeFileSync(githubOutputPath, `${outputText}\n`, { flag: "a" });
	}
}
