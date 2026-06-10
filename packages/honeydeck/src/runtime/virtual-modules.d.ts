/**
 * TypeScript ambient declarations for Honeydeck virtual modules.
 *
 * These modules don't exist on disk — they're synthesised at build/dev time
 * by `src/vite-plugin/virtual-modules.ts`. Without these declarations,
 * TypeScript would reject any `import` statement targeting them.
 */

/** Barrel re-export of all slides in the deck. */
declare module "virtual:honeydeck/slides" {
	/** Total number of slides in the deck. */
	export const slideCount: number;

	// Individual slide components are exported as Slide0, Slide1, Slide2, …
	// Per-slide metadata is exported as stepCount0, slideTitle0, slideFrontmatter0, slideLayout0, …
	// They cannot be statically typed here because the count is dynamic.
	// Access them via a cast:
	//   import * as slideModules from 'virtual:honeydeck/slides';
	//   const C = (slideModules as Record<string, unknown>)[`Slide${i}`] as ComponentType;
	//   const title = (slideModules as Record<string, unknown>)[`slideTitle${i}`] as string;
}

/**
 * CSS token manifest — all --honeydeck-* tokens with descriptions and default values.
 * Generated at build time from src/theme/base.css.
 */
declare module "virtual:honeydeck/token-manifest" {
	export type TokenManifestEntry = {
		name: string;
		description: string;
		defaultValue: string;
	};
	export const tokens: TokenManifestEntry[];
	export default tokens;
}

/** Active layout map and docs reference demo metadata. */
declare module "virtual:honeydeck/layouts" {
	import type {
		CompiledLayoutDemo,
		LayoutMap,
		LayoutPropDoc,
	} from "./types.ts";

	export const layoutMap: LayoutMap;
	export const layoutNames: string[];
	export const layoutDemos: Record<string, CompiledLayoutDemo>;
	export const layoutPropDocs: Record<string, LayoutPropDoc[]>;
	export const layoutDemoWarnings: string[];
	export default layoutMap;
}

/** Built-in component reference documentation metadata. */
declare module "virtual:honeydeck/components" {
	import type { ComponentType } from "react";
	import type { ComponentDoc } from "./types.ts";

	export const componentMap: Record<
		string,
		ComponentType<Record<string, unknown>>
	>;
	export const componentNames: string[];
	export const componentDocs: Record<string, ComponentDoc>;
	export const componentDocWarnings: string[];
	export default componentMap;
}

/** Parsed deck-level frontmatter (the YAML block at the top of deck.mdx). */
declare module "virtual:honeydeck/config" {
	const config: Record<string, unknown>;

	export { config };
	export default config;
}

/**
 * Individual compiled slide modules.
 * Each slide exports its component as default, plus metadata named exports.
 */
declare module "virtual:honeydeck/slide/*.mdx" {
	import type { ComponentType } from "react";

	/** Compiled slide React component */
	const Component: ComponentType;
	export default Component;

	/** Number of timeline steps on this slide (from remarkStepNumbering) */
	export const stepCount: number;

	/** Plain-text content of the first h1 (from remarkH1Extract) */
	export const slideTitle: string;

	/** Parsed YAML frontmatter for this slide (from remarkH1Extract) */
	export const slideFrontmatter: Record<string, unknown>;

	/** Layout name from frontmatter.layout, or '' for default */
	export const slideLayout: string;
}
