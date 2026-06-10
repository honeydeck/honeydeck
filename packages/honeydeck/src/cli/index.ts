#!/usr/bin/env node
/**
 * honeydeck CLI — entry point.
 *
 * Dispatches to sub-commands based on process.argv.
 * Uses dynamic `import()` for each sub-command so that only the required
 * code is loaded (avoids pulling in Vite at startup just to print --help).
 *
 * Usage:
 *   honeydeck                           — show help
 *   honeydeck help <command>            — show sub-command help
 *   honeydeck init [--name <n>] [--skip-skill|--install-skill]
 *                                   — scaffold a new project
 *   honeydeck skill                    — install Honeydeck agent skills
 *   honeydeck dev  [--deck <file.mdx>] [--port <n>] [--open]
 *   honeydeck build [--deck <file.mdx>]
 *   honeydeck pdf  [--deck <file.mdx>] [-o <file>] [--steps all|final] [--mode light|dark]
 */

import { formatTopLevelBanner } from "./banner.ts";

const [, , command, ...args] = process.argv;

async function main(): Promise<void> {
	if (!command || isHelpFlag(command)) {
		printHelp();
		process.exit(0);
	}

	if (command === "help") {
		const target = args[0];
		if (!target || isHelpFlag(target)) {
			printHelp();
			process.exit(0);
		}

		const handled = await runCommand(target, ["--help"]);
		if (!handled) {
			console.error(`  ❌ Unknown command "${target}".`);
			printHelp();
			process.exit(1);
		}
		return;
	}

	const handled = await runCommand(command, args);
	if (!handled) {
		printHelp();
		process.exit(1);
	}
}

async function runCommand(command: string, args: string[]): Promise<boolean> {
	switch (command) {
		case "dev": {
			const { runDev } = await import("./dev.ts");
			await runDev(args);
			return true;
		}

		case "build": {
			const { runBuild } = await import("./build.ts");
			await runBuild(args);
			return true;
		}

		case "pdf": {
			const { runPdf } = await import("./pdf.ts");
			await runPdf(args);
			return true;
		}

		case "init": {
			const { runInit } = await import("./init.ts");
			await runInit(args);
			return true;
		}

		case "skill": {
			const { runSkill } = await import("./skill.ts");
			await runSkill(args);
			return true;
		}

		default:
			return false;
	}
}

function isHelpFlag(value: string): boolean {
	return value === "--help" || value === "-h";
}

function printHelp(): void {
	console.log(`
${formatTopLevelBanner()}

  Usage:
    honeydeck <command> [options]
    honeydeck help <command>

  Commands:
    init    Scaffold a new presentation project
    skill   Install Honeydeck agent skills
    dev     Start the development server
    build   Build for production (static SPA)
    pdf     Export slides to a PDF file
    help    Show top-level or command-specific help

  Options:
    -h, --help  Show help

  Examples:
    honeydeck init --name my-talk
    honeydeck help dev
    honeydeck dev --open
    honeydeck pdf --steps all --mode dark -o slides.pdf

  🎞  Happy presenting!
`);
}

main().catch((err: unknown) => {
	console.error("❌  honeydeck error:", err);
	process.exit(1);
});
