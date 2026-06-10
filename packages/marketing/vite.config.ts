import { remarkShikiCodeBlocks } from "@honeydeck/honeydeck/remark/shiki-code-blocks";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		mdx({
			include: [/\.mdx?$/],
			jsxImportSource: "react",
			remarkPlugins: [remarkFrontmatter, remarkGfm, remarkShikiCodeBlocks],
		}),
		react(),
		tailwindcss(),
	],
});
