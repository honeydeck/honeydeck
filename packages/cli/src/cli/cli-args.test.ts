import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { parseBuildArgs } from "../cli/build.ts";
import { createDevServerConfig, parseDevArgs } from "../cli/dev.ts";
import { parseInitArgs } from "../cli/init.ts";
import { parsePdfArgs } from "../cli/pdf.ts";

function withMockedExit(callback: () => void): void {
	const originalExit = process.exit;
	const originalError = console.error;

	process.exit = ((code?: string | number | null | undefined): never => {
		throw new Error(`process.exit:${code ?? ""}`);
	}) as typeof process.exit;
	console.error = () => {};

	try {
		callback();
	} finally {
		process.exit = originalExit;
		console.error = originalError;
	}
}

describe("CLI argument parsing", () => {
	it("defaults build to deck.mdx in the current directory", () => {
		assert.deepEqual(parseBuildArgs([]), {
			deck: resolve(process.cwd(), "deck.mdx"),
			root: process.cwd(),
			entry: "deck.mdx",
		});
	});

	it("parses build deck", () => {
		assert.deepEqual(parseBuildArgs(["--deck", "slides/talk.mdx"]), {
			deck: resolve(process.cwd(), "slides/talk.mdx"),
			root: resolve(process.cwd(), "slides"),
			entry: "talk.mdx",
		});
	});

	it("rejects build deck with a missing value", () => {
		assert.throws(
			() => withMockedExit(() => parseBuildArgs(["--deck"])),
			/process\.exit:1/,
		);
	});

	it("rejects the unsupported build root option", () => {
		assert.throws(
			() => withMockedExit(() => parseBuildArgs(["--root", "slides"])),
			/process\.exit:1/,
		);
	});

	it("parses dev port, open flag, and deck", () => {
		assert.deepEqual(
			parseDevArgs(["-p", "4300", "--open", "--deck", "demo/custom.mdx"]),
			{
				port: 4300,
				open: true,
				deck: resolve(process.cwd(), "demo/custom.mdx"),
				root: resolve(process.cwd(), "demo"),
				entry: "custom.mdx",
			},
		);
	});

	it("defaults dev to deck.mdx in the current directory", () => {
		assert.deepEqual(parseDevArgs([]), {
			port: 4200,
			open: false,
			deck: resolve(process.cwd(), "deck.mdx"),
			root: process.cwd(),
			entry: "deck.mdx",
		});
	});

	it("configures dev server for local network access", () => {
		assert.deepEqual(createDevServerConfig(4300, true), {
			port: 4300,
			open: true,
			strictPort: false,
			host: "0.0.0.0",
		});
	});

	it("rejects dev options with missing values", () => {
		assert.throws(
			() => withMockedExit(() => parseDevArgs(["--deck", "--open"])),
			/process\.exit:1/,
		);
	});

	it("rejects the unsupported dev root option", () => {
		assert.throws(
			() => withMockedExit(() => parseDevArgs(["--root", "demo"])),
			/process\.exit:1/,
		);
	});

	it("rejects deck paths that are not MDX files", () => {
		assert.throws(
			() => withMockedExit(() => parseDevArgs(["--deck", "demo/slides.md"])),
			/process\.exit:1/,
		);
	});

	it("rejects invalid dev ports", () => {
		assert.throws(
			() => withMockedExit(() => parseDevArgs(["--port", "not-a-port"])),
			/process\.exit:1/,
		);
	});

	it("parses init name, skip-install flag, and skill flags", () => {
		assert.deepEqual(parseInitArgs(["--name", "deck-demo", "--skip-install"]), {
			name: "deck-demo",
			skipInstall: true,
			installSkill: null,
		});
		assert.deepEqual(parseInitArgs(["--install-skill"]), {
			name: null,
			skipInstall: false,
			installSkill: true,
		});
		assert.deepEqual(parseInitArgs(["--skip-skill"]), {
			name: null,
			skipInstall: false,
			installSkill: false,
		});
	});

	it("rejects init name with a missing value", () => {
		assert.throws(
			() => withMockedExit(() => parseInitArgs(["--name", "--skip-install"])),
			/process\.exit:1/,
		);
	});

	it("parses pdf deck, output, steps, and mode", () => {
		assert.deepEqual(
			parsePdfArgs([
				"--deck",
				"slides/talk.mdx",
				"--output",
				"out.pdf",
				"--steps",
				"all",
				"--mode",
				"dark",
				"--parallel",
				"6",
			]),
			{
				deck: resolve(process.cwd(), "slides/talk.mdx"),
				root: resolve(process.cwd(), "slides"),
				entry: "talk.mdx",
				output: "out.pdf",
				steps: "all",
				mode: "dark",
				parallel: 6,
			},
		);
	});

	it("defaults pdf parallelism to a bounded capture pool", () => {
		const args = parsePdfArgs([]);

		assert.equal(args.output, "deck.pdf");
		assert.equal(args.steps, null);
		assert.equal(args.mode, null);
		assert.ok(Number.isInteger(args.parallel));
		assert.ok(args.parallel >= 1);
		assert.ok(args.parallel <= 16);
	});

	it("rejects invalid pdf option values", () => {
		assert.throws(
			() => withMockedExit(() => parsePdfArgs(["--steps", "sometimes"])),
			/process\.exit:1/,
		);
		assert.throws(
			() => withMockedExit(() => parsePdfArgs(["--mode", "system"])),
			/process\.exit:1/,
		);
		assert.throws(
			() => withMockedExit(() => parsePdfArgs(["--parallel", "0"])),
			/process\.exit:1/,
		);
		assert.throws(
			() => withMockedExit(() => parsePdfArgs(["--parallel", "17"])),
			/process\.exit:1/,
		);
		assert.throws(
			() => withMockedExit(() => parsePdfArgs(["--parallel", "fast"])),
			/process\.exit:1/,
		);
	});

	it("rejects pdf options with missing values", () => {
		assert.throws(
			() => withMockedExit(() => parsePdfArgs(["--deck"])),
			/process\.exit:1/,
		);
		assert.throws(
			() => withMockedExit(() => parsePdfArgs(["--output"])),
			/process\.exit:1/,
		);
		assert.throws(
			() => withMockedExit(() => parsePdfArgs(["--parallel"])),
			/process\.exit:1/,
		);
	});

	it("rejects the unsupported pdf root option", () => {
		assert.throws(
			() => withMockedExit(() => parsePdfArgs(["--root", "slides"])),
			/process\.exit:1/,
		);
	});
});
