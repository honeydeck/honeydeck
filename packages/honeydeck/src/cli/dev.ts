/**
 * `honeydeck dev` — start the Vite development server.
 *
 * Architecture summary:
 *
 *   Vite root = <deck dir>
 *     → deck-local files (CSS, images, components) resolve naturally
 *
 *   `honeydeck:app-shell` plugin
 *     → intercepts GET / and serves src/runtime/app-shell/index.html
 *     → replaces the MAIN_ENTRY placeholder with `/@fs/<abs-path>/main.tsx`
 *     → Vite's /@fs/ handler serves files outside the configured root
 *
 *   `honeydeckPlugin()` (virtual modules + MDX + Tailwind)
 *     → splits the selected deck entry, serves virtual:honeydeck/* modules, compiles MDX
 *
 * Why this approach?
 *   Vite root controls where CSS/assets/components resolve. Setting it to
 *   the deck dir lets users `@import './styles.css'` etc. normally.
 *   The app shell (main.tsx, Deck.tsx) lives inside the honeydeck package and
 *   is accessed via /@fs/ — Vite's escape hatch for files outside the root.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type Plugin } from "vite";
import { honeydeckPlugin } from "#vite-plugin/index.ts";
import { hasHelpFlag } from "./args.ts";
import { formatCommandBanner } from "./banner.ts";
import {
	type DeckPathOptions,
	rejectRootOption,
	resolveDeckPath,
	validateDeckPath,
} from "./deck-path.ts";

// ---------------------------------------------------------------------------
// Paths (all resolved at module load time, before any async work)
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Absolute path to src/runtime/app-shell/ */
const APP_SHELL_DIR = resolve(__dirname, "../runtime/app-shell");

/** Absolute path to src/runtime/app-shell/main.tsx */
const MAIN_TSX_PATH = resolve(APP_SHELL_DIR, "main.tsx");

/** Absolute path to src/runtime/app-shell/index.html (the template) */
const INDEX_HTML_PATH = resolve(APP_SHELL_DIR, "index.html");

/**
 * Absolute path to the honeydeck package root (the directory that contains src/).
 * Passed to `server.fs.allow` so that Vite's /@fs/ handler can serve
 * files under src/ even when the Vite root is set to the deck dir.
 */
const PACKAGE_ROOT = resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export type DevOptions = {
	port: number;
	open: boolean;
} & DeckPathOptions;

export function createDevServerConfig(port: number, open: boolean) {
	return {
		port,
		open,
		strictPort: false,
		// Bind to all interfaces so phones/tablets on the same local network can
		// open the printed Network URL.
		host: "0.0.0.0",
	} as const;
}

export function printDevHelp(): void {
	console.log(`
  ✨ honeydeck dev — start the development server

  Usage:
    honeydeck dev [options]

  Options:
    --deck <file.mdx>  Deck entry file          (default: ./deck.mdx)
    -p, --port <n>     Dev server port          (default: 4200)
    -o, --open         Open browser on start
    -h, --help         Show this help page

  Examples:
    honeydeck dev
    honeydeck dev --open
    honeydeck dev --deck talk.mdx --port 8080
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

export function parseDevArgs(args: string[]): DevOptions {
	let port = 4200;
	let open = false;
	let deckPath: string | null = null;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--port" || arg === "-p") {
			const value = readOptionValue(args, i, arg);
			port = parseInt(value, 10);
			i++;
			if (Number.isNaN(port)) {
				console.error(`❌  Invalid --port value: ${value}`);
				process.exit(1);
			}
		} else if (arg === "--open" || arg === "-o") {
			open = true;
		} else if (arg === "--deck") {
			const value = readOptionValue(args, i, arg);
			validateDeckPath(value, arg);
			deckPath = value;
			i++;
		} else if (arg === "--root") {
			rejectRootOption();
		}
	}

	return { port, open, ...resolveDeckPath(deckPath ?? undefined) };
}

// ---------------------------------------------------------------------------
// App shell Vite plugin
// ---------------------------------------------------------------------------

/**
 * `honeydeck:app-shell` — serves the Honeydeck index.html for the root route.
 *
 * Handles two concerns:
 *  1. `config` hook: broadens `server.fs.allow` so /@fs/ can reach the
 *     app shell files which live outside the user's project root.
 *  2. `configureServer` hook: registers a connect middleware that intercepts
 *     GET / (and /index.html), reads the HTML template, injects the correct
 *     /@fs/ script src, and lets Vite's `transformIndexHtml` pipeline apply
 *     any further HTML transforms (e.g. inject the HMR client).
 */
function appShellPlugin(): Plugin {
	return {
		name: "honeydeck:app-shell",

		config() {
			return {
				server: {
					fs: {
						// Allow Vite's /@fs/ handler to serve any file under the honeydeck
						// package root (so src/runtime/app-shell/main.tsx is accessible).
						allow: [PACKAGE_ROOT],
					},
				},
			};
		},

		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = req.url ?? "/";

				// Only handle the root HTML request; let everything else pass through.
				if (url !== "/" && url !== "/index.html") {
					next();
					return;
				}

				try {
					// Read the template and replace the placeholder script src.
					// The /@fs/ prefix tells Vite to serve the file by absolute path,
					// bypassing the root restriction for this single module.
					let html = readFileSync(INDEX_HTML_PATH, "utf-8");
					html = html.replace(
						"__HONEYDECK_MAIN_ENTRY__",
						`/@fs${MAIN_TSX_PATH}`,
					);

					// Let Vite's HTML transform pipeline run (injects HMR client, etc.)
					const transformed = await server.transformIndexHtml(url, html);

					res.setHeader("Content-Type", "text/html; charset=utf-8");
					res.end(transformed);
				} catch (err) {
					next(err);
				}
			});
		},
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runDev(args: string[]): Promise<void> {
	if (hasHelpFlag(args)) {
		printDevHelp();
		return;
	}

	const { port, open, root, entry, deck } = parseDevArgs(args);

	console.log("\n  ✨ Honeydeck dev starting...\n");
	console.log(`  Root   → ${root}`);
	console.log(`  Deck   → ${deck}`);
	console.log(`  Port   → ${port}`);

	const server = await createServer({
		// Set root to the deck dir so local CSS/assets resolve naturally.
		root,

		// `custom` appType: we serve our own index.html; Vite doesn't look for
		// one in the root dir.
		appType: "custom",

		server: createDevServerConfig(port, open),

		plugins: [
			// 1. App shell: serve our index.html + configure fs.allow
			appShellPlugin(),
			// 2. Virtual modules + MDX compilation + Tailwind
			...honeydeckPlugin({ root, entry }),
		],
	});

	await server.listen();

	const resolvedPort = server.config.server.port ?? port;
	// Try to get the network address
	const networkAddresses = server.resolvedUrls?.network ?? [];
	const networkUrl =
		networkAddresses[0] ?? `http://192.168.x.x:${resolvedPort}/`;

	console.log(`\n${formatCommandBanner()}\n`);
	console.log(`  🚀 Local:   http://localhost:${resolvedPort}/`);
	console.log(`  🌐 Network: ${networkUrl}`);
	console.log(`  🎨 Theme:   http://localhost:${resolvedPort}/#/theme`);
	console.log(`\n  👀 Watching for changes...\n`);

	// Keep the process alive (Vite does this, but be explicit).
	process.on("SIGINT", async () => {
		console.log("\n  👋  Shutting down honeydeck dev server…\n");
		await server.close();
		process.exit(0);
	});
}
