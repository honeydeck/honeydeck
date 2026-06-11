/**
 * `honeydeck init` — scaffold a new Honeydeck presentation project.
 *
 * ### Flow
 *
 *  1. Parse CLI flags (`--name`, `--skip-install`, skill options).
 *  2. intro() — greeting banner.
 *  3. Prompt for project name (skipped with --name flag).
 *  4. Create project directory + subdirectories.
 *  5. Write all template files.
 *  6. Install dependencies with npm (skipped with --skip-install flag).
 *  7. Optionally install Honeydeck agent skills.
 *  8. outro() — success message with next steps.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import * as p from "@clack/prompts";
import { DEFAULT_DECK_ENTRY } from "../defaults.ts";
import { hasHelpFlag } from "./args.ts";
import { openHoneydeckAgentSkillsInstaller } from "./skill.ts";
import { generateDeckMdx } from "./templates/deck-mdx.ts";
import { generatePackageJson } from "./templates/package-json.ts";
import { generateSparkleButton } from "./templates/sparkle-button.ts";
import { generateStylesCss } from "./templates/styles-css.ts";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export type InitOptions = {
	/** Explicit project name — skips the interactive prompt. */
	name: string | null;
	/** Skip running npm install. */
	skipInstall: boolean;
	/** Open the Honeydeck agent skills installer; null means ask first. */
	installSkill: boolean | null;
};

export function printInitHelp(): void {
	console.log(`
  ✨ honeydeck init — scaffold a new presentation project

  Usage:
    honeydeck init [options]

  Options:
    --name <name>      Project name (skips interactive prompt)
    --skip-install     Skip running npm install
    --skip-skill       Skip the Honeydeck agent skills installer
    --install-skill    Open the Honeydeck agent skills installer via npx skills add
    -h, --help         Show this help page

  Examples:
    honeydeck init
    honeydeck init --name my-talk
    honeydeck init --name my-talk --skip-install --install-skill
`);
}

function readOptionValue(
	args: string[],
	index: number,
	option: string,
): string {
	const value = args[index + 1];
	if (!value || value.startsWith("-")) {
		console.error(`❌  Missing value for ${option}`);
		process.exit(1);
	}
	return value;
}

export function parseInitArgs(args: string[]): InitOptions {
	let name: string | null = null;
	let skipInstall = false;
	let installSkill: boolean | null = null;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--name") {
			const value = readOptionValue(args, i, arg);
			name = value;
			i++;
		} else if (arg === "--skip-install") {
			skipInstall = true;
		} else if (arg === "--install-skill") {
			installSkill = true;
		} else if (arg === "--skip-skill") {
			installSkill = false;
		}
	}

	return { name, skipInstall, installSkill };
}

// ---------------------------------------------------------------------------
// Package manager commands
// ---------------------------------------------------------------------------

const INSTALL_COMMAND = "npm install";

function runCommand(command: string, cwd: string): Promise<void> {
	return new Promise((resolveCommand, rejectCommand) => {
		const child = spawn(command, {
			cwd,
			shell: true,
			stdio: "ignore",
		});

		child.once("error", rejectCommand);
		child.once("exit", (code, signal) => {
			if (code === 0) {
				resolveCommand();
				return;
			}

			const reason = signal ? `signal ${signal}` : `exit code ${code ?? "unknown"}`;
			rejectCommand(new Error(`${command} failed with ${reason}`));
		});
	});
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a project name.
 * Returns an error message string if invalid, undefined if valid.
 */
function validateProjectName(value: string | undefined): string | undefined {
	const name = (value ?? "").trim();
	if (name.length === 0) {
		return "Project name cannot be empty.";
	}
	if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
		return "Use lowercase letters, numbers, hyphens, underscores, or dots. Must start with a letter or digit.";
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// File writing helpers
// ---------------------------------------------------------------------------

/**
 * Write a file to disk, creating parent directories as needed.
 * Logs the relative path for visibility.
 */
export function resolveParentDir(
	abs: string,
	dirnameFn: (path: string) => string = dirname,
): string {
	return dirnameFn(abs);
}

function writeFile(
	projectDir: string,
	relativePath: string,
	content: string,
): void {
	const abs = join(projectDir, relativePath);
	// Ensure parent directory exists.
	const parentDir = resolveParentDir(abs);
	mkdirSync(parentDir, { recursive: true });
	writeFileSync(abs, content, "utf-8");
}

function cleanupGeneratedProject(
	projectDir: string,
	canRemoveProjectDir: boolean,
): void {
	if (!canRemoveProjectDir) {
		return;
	}

	try {
		rmSync(projectDir, { recursive: true, force: true });
		p.log.info("Cleaned up generated project files.");
	} catch (err) {
		p.log.warn(
			`Could not clean up generated project files: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

function isInterruptError(err: unknown): boolean {
	if (!err || typeof err !== "object") {
		return false;
	}

	const processError = err as { signal?: unknown; status?: unknown };
	return processError.signal === "SIGINT" || processError.status === 130;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runInit(args: string[]): Promise<void> {
	if (hasHelpFlag(args)) {
		printInitHelp();
		return;
	}

	const opts = parseInitArgs(args);

	p.intro("  ✨ honeydeck init — Create a new presentation");

	// ── Step 1: Determine project name ─────────────────────────────────────────
	let projectName: string;

	if (opts.name) {
		const err = validateProjectName(opts.name ?? undefined);
		if (err) {
			p.cancel(`❌  Invalid project name: ${err}`);
			process.exit(1);
		}
		projectName = opts.name.trim();
		p.log.info(`Project name: ${projectName}`);
	} else {
		const answer = await p.text({
			message: "What is your project name?",
			placeholder: "my-awesome-talk",
			validate: validateProjectName,
		});

		if (p.isCancel(answer)) {
			p.cancel("Setup cancelled.");
			process.exit(0);
		}

		projectName = answer.trim();
	}

	// ── Step 2: Check target directory ─────────────────────────────────────────
	const projectDir = resolve(process.cwd(), projectName);
	const targetExistedBeforeInit = existsSync(projectDir);

	if (targetExistedBeforeInit) {
		const overwrite = await p.confirm({
			message: `Directory "${projectName}" already exists. Continue anyway?`,
			initialValue: false,
		});

		if (p.isCancel(overwrite) || !overwrite) {
			p.cancel("Setup cancelled.");
			process.exit(0);
		}
	}

	const cleanupProjectOnCancel = () =>
		cleanupGeneratedProject(projectDir, !targetExistedBeforeInit);
	const abortInit = (exitCode: number) => {
		cleanupProjectOnCancel();
		p.cancel("Setup cancelled.");
		process.exit(exitCode);
	};
	const handleInterrupt = () => abortInit(130);
	process.once("SIGINT", handleInterrupt);

	// ── Step 3: Package manager ────────────────────────────────────────────────
	p.log.step("Using npm");

	// ── Step 4: Create project files ───────────────────────────────────────────
	const spinner = p.spinner();
	spinner.start("Creating project files…");

	try {
		// Root directories
		mkdirSync(join(projectDir, "components"), { recursive: true });
		mkdirSync(join(projectDir, "public"), { recursive: true });

		// package.json
		writeFile(projectDir, "package.json", generatePackageJson(projectName));

		// deck.mdx
		writeFile(projectDir, DEFAULT_DECK_ENTRY, generateDeckMdx(projectName));

		// styles.css
		writeFile(projectDir, "styles.css", generateStylesCss());

		// components/SparkleButton.tsx
		writeFile(
			projectDir,
			"components/SparkleButton.tsx",
			generateSparkleButton(),
		);

		// .gitignore
		writeFile(projectDir, ".gitignore", GITIGNORE_CONTENT);

		spinner.stop("Project files created ✅");
	} catch (err) {
		spinner.stop("Failed to create files ❌");
		cleanupProjectOnCancel();
		p.cancel(`Error: ${err instanceof Error ? err.message : String(err)}`);
		process.exit(1);
	}

	// ── Step 5: Install dependencies ───────────────────────────────────────────
	if (!opts.skipInstall) {
		const installSpinner = p.spinner();
		installSpinner.start("Installing dependencies with npm…");

		try {
			await runCommand(INSTALL_COMMAND, projectDir);
			installSpinner.stop("Dependencies installed ✅");
		} catch (_err) {
			installSpinner.stop("Dependency installation failed ⚠️");
			p.log.warn(
				"Could not install dependencies automatically. Run the install command manually.",
			);
			p.log.info(`  cd ${projectName} && ${INSTALL_COMMAND}`);
		}
	} else {
		p.log.info(
			`Skipping install. Run \`${INSTALL_COMMAND}\` in the project directory.`,
		);
	}

	// ── Step 6: Optional agent skills ──────────────────────────────────────────
	let shouldOpenSkillsInstaller = opts.installSkill;

	if (shouldOpenSkillsInstaller === null) {
		const answer = await p.confirm({
			message:
				"Open the Honeydeck agent skills installer? This runs `npx skills add`.",
			initialValue: true,
		});

		if (p.isCancel(answer)) {
			abortInit(0);
		}

		shouldOpenSkillsInstaller = !!answer;
	}

	if (shouldOpenSkillsInstaller) {
		p.log.info(
			"Opening `npx skills add` so you can choose skill, scope, and agents.",
		);

		try {
			openHoneydeckAgentSkillsInstaller(projectDir);
		} catch (err) {
			if (isInterruptError(err)) {
				abortInit(130);
			}

			p.log.warn("Could not install skills automatically.");
			p.log.info("Install them later with: honeydeck skill");
		}
	} else {
		p.log.info("Skipping agent skills. Install later with: honeydeck skill");
	}

	process.off("SIGINT", handleInterrupt);

	// ── Step 7: Outro ──────────────────────────────────────────────────────────
	p.outro(
		[
			"",
			`  🎉  Project "${projectName}" is ready!`,
			"",
			"  Next steps:",
			"",
			`    cd ${projectName}`,
			"    npm run dev",
			"",
			"  Happy presenting! 🐝",
			"",
		].join("\n"),
	);
}

// ---------------------------------------------------------------------------
// Static template content
// ---------------------------------------------------------------------------

const GITIGNORE_CONTENT = `node_modules/
dist/
.DS_Store
*.pdf
`;
