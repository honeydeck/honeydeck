/**
 * `honeydeck skill` — install Honeydeck agent skills.
 */

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import { hasHelpFlag } from "./args.ts";

export function printSkillHelp(): void {
	console.log(`
  ✨ honeydeck skill — install Honeydeck agent skills

  Usage:
    honeydeck skill [options]

  Options:
    -h, --help  Show this help page

  Behavior:
    Opens the skills installer via npx skills add for bundled Honeydeck skills.

  Examples:
    honeydeck skill
`);
}

function packageRoot(): string {
	return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
}

export type InstallHoneydeckAgentSkillsOptions = {
	/** Show the normal `skills` CLI prompts for scope and agent selection. */
	interactive?: boolean;
};

function runSkillsAdd(
	projectDir: string,
	args: string[],
	options: InstallHoneydeckAgentSkillsOptions,
): void {
	execFileSync("npx", ["skills", "add", packageRoot(), "--copy", ...args], {
		cwd: projectDir,
		stdio: options.interactive ? "inherit" : "pipe",
	});
}

export function openHoneydeckAgentSkillsInstaller(projectDir: string): void {
	// Let the skills CLI offer the bundled Honeydeck skills interactively.
	runSkillsAdd(projectDir, [], { interactive: true });
}

export async function runSkill(args: string[]): Promise<void> {
	if (hasHelpFlag(args)) {
		printSkillHelp();
		return;
	}

	p.intro("  ✨ honeydeck skill — Install Honeydeck agent skills");
	p.log.info(
		"Opening `npx skills add` so you can choose skill, scope, and agents.",
	);

	try {
		openHoneydeckAgentSkillsInstaller(process.cwd());
		p.outro("  🤖 Ready! Ask your agent to help with Honeydeck presentations.");
	} catch (_err) {
		p.log.warn("Could not install skills automatically.");
		p.log.info(
			"Install manually with: npx skills add <honeydeck-repo-url> --copy",
		);
		process.exit(1);
	}
}
