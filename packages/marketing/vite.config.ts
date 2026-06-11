import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { remarkShikiCodeBlocks } from "@honeydeck/honeydeck/remark/shiki-code-blocks";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { defineConfig, type Plugin } from "vite";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));
const honeydeckRoot = resolve(packageRoot, "../honeydeck");
const sidebarPath = resolve(packageRoot, "docs-sidebar.json");
const syncDocsScript = resolve(packageRoot, "scripts/sync-docs.mjs");

type SidebarGroup = {
	items?: Array<{ source?: unknown }>;
};

function docsSourceFiles() {
	const sidebar = JSON.parse(
		readFileSync(sidebarPath, "utf-8"),
	) as SidebarGroup[];
	const sourceFiles = sidebar.flatMap((group) =>
		(group.items ?? [])
			.map((item) => item.source)
			.filter((source): source is string => typeof source === "string")
			.map((source) => resolve(honeydeckRoot, source)),
	);
	return [sidebarPath, ...sourceFiles];
}

function syncDocs() {
	execFileSync(process.execPath, [syncDocsScript], {
		cwd: packageRoot,
		stdio: "inherit",
	});
}

function docsSyncDevPlugin(): Plugin {
	let watchedFiles = new Set<string>();

	function refreshWatchedFiles() {
		watchedFiles = new Set(docsSourceFiles());
		return [...watchedFiles];
	}

	return {
		name: "honeydeck-marketing-docs-sync",
		apply: "serve",
		configureServer(server) {
			syncDocs();
			server.watcher.add(refreshWatchedFiles());

			server.watcher.on("all", (event, file) => {
				if (!["add", "change", "unlink"].includes(event)) return;
				if (!watchedFiles.has(resolve(file))) return;

				try {
					syncDocs();
					server.watcher.add(refreshWatchedFiles());
					server.moduleGraph.invalidateAll();
					server.ws.send({ type: "full-reload", path: "*" });
				} catch (error) {
					server.config.logger.error(
						`Docs sync failed: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			});
		},
	};
}

export default defineConfig({
	plugins: [
		docsSyncDevPlugin(),
		mdx({
			include: [/\.mdx?$/],
			jsxImportSource: "react",
			remarkPlugins: [remarkFrontmatter, remarkGfm, remarkShikiCodeBlocks],
		}),
		react(),
		tailwindcss(),
	],
});
