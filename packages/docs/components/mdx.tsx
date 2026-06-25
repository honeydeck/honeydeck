import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import {
	BrowserFramePlayground,
	KeyboardPlayground,
	ListStylePlayground,
	NotesPlayground,
} from "./component-playgrounds";

export function getMDXComponents(components?: MDXComponents) {
	return {
		...defaultMdxComponents,
		BrowserFramePlayground,
		KeyboardPlayground,
		ListStylePlayground,
		NotesPlayground,
		...components,
	} satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
