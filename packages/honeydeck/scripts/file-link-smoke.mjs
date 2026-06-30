#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const packageRoot = join(repoRoot, "packages", "honeydeck");
const tempRoot = mkdtempSync(join(tmpdir(), "honeydeck-file-link-smoke-"));
const projectRoot = join(tempRoot, "smoke");

class BrowserUnavailableError extends Error {}

try {
	writeFileSync(
		join(tempRoot, "package.json"),
		JSON.stringify({ private: true, type: "module", workspaces: [] }, null, 2),
	);
	run("npm", ["init", "-y"], tempRoot);
	mkdirSync(projectRoot);

	writeFileSync(
		join(projectRoot, "package.json"),
		JSON.stringify(
			{
				private: true,
				type: "module",
				scripts: { build: "honeydeck build" },
				dependencies: {
					"@honeydeck/honeydeck": `file:${packageRoot}`,
					react: "^19.2.0",
					"react-dom": "^19.2.0",
				},
				devDependencies: {
					tailwindcss: "^4.0.0",
					typescript: "^6.0.0",
				},
			},
			null,
			2,
		),
	);
	writeFileSync(
		join(projectRoot, "deck.mdx"),
		`import './styles.css'\nimport { Reveal } from '@honeydeck/honeydeck'\n\n# File-link smoke\n\n<Reveal>Runtime mounted without duplicate React.</Reveal>\n`,
	);
	writeFileSync(
		join(projectRoot, "styles.css"),
		`@import 'tailwindcss';\n@import '@honeydeck/honeydeck/theme.css';\n`,
	);

	run("npm", ["install"], projectRoot);
	run("npm", ["run", "build"], projectRoot);

	const server = await serveStatic(join(projectRoot, "dist"));
	try {
		try {
			await assertBrowserRuntime(server.url);
			console.log("✅ File-linked browser runtime smoke passed");
		} catch (error) {
			if (!(error instanceof BrowserUnavailableError)) throw error;
			console.warn(`⚠️  Browser runtime smoke skipped: ${error.message}`);
		}
	} finally {
		await new Promise((resolveServer) => server.close(resolveServer));
	}

	console.log("✅ File-linked build smoke passed");
} finally {
	if (process.env.HONEYDECK_KEEP_SMOKE_TEMP !== "1") {
		rmSync(tempRoot, { recursive: true, force: true });
	} else {
		console.log(`Kept smoke temp directory: ${tempRoot}`);
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

	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed with exit code ${result.status}`,
		);
	}

	return result;
}

async function serveStatic(root) {
	const server = createServer((req, res) => {
		const rawPath = new URL(req.url ?? "/", "http://localhost").pathname;
		const requestedPath = rawPath === "/" ? "/index.html" : rawPath;
		let filePath = resolve(root, `.${requestedPath}`);
		if (!filePath.startsWith(root)) {
			res.writeHead(403).end("Forbidden");
			return;
		}

		try {
			if (!statSync(filePath).isFile()) filePath = join(root, "index.html");
		} catch {
			filePath = join(root, "index.html");
		}

		res.setHeader("Content-Type", contentType(filePath));
		res.end(readFileSync(filePath));
	});

	await new Promise((resolveListen) =>
		server.listen(0, "127.0.0.1", resolveListen),
	);
	const address = server.address();
	if (!address || typeof address === "string")
		throw new Error("Could not bind smoke server");

	return Object.assign(server, { url: `http://127.0.0.1:${address.port}/` });
}

function contentType(filePath) {
	switch (extname(filePath)) {
		case ".html":
			return "text/html; charset=utf-8";
		case ".js":
			return "text/javascript; charset=utf-8";
		case ".css":
			return "text/css; charset=utf-8";
		default:
			return "application/octet-stream";
	}
}

async function assertBrowserRuntime(url) {
	const browser = await launchChromium();
	try {
		const page = await browser.newPage();
		const failures = [];
		page.on("console", (message) => {
			if (["error", "warning"].includes(message.type())) {
				const text = message.text();
				if (
					/Invalid hook call|Cannot read properties of null|duplicate React/i.test(
						text,
					)
				) {
					failures.push(text);
				}
			}
		});
		page.on("pageerror", (error) => failures.push(error.message));

		await page.goto(url, { waitUntil: "networkidle" });
		await page.getByText("File-link smoke").waitFor({ timeout: 10_000 });
		await page
			.getByText("Runtime mounted without duplicate React.")
			.waitFor({ timeout: 10_000 });

		if (failures.length > 0) {
			throw new Error(`Browser runtime failed:\n${failures.join("\n")}`);
		}
	} finally {
		await browser.close();
	}
}

async function launchChromium() {
	try {
		return await chromium.launch();
	} catch (error) {
		if (!String(error).includes("Executable doesn't exist")) throw error;
		try {
			return await chromium.launch({ channel: "chrome" });
		} catch {
			throw new BrowserUnavailableError(
				"no usable Playwright browser was available in this environment",
			);
		}
	}
}
