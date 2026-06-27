/**
 * Core type definitions for Honeydeck layouts and reference documentation.
 *
 * These types are exported from `@honeydeck/runtime/types` for use by kit and layout authors.
 *
 * @example
 * ```ts
 * import type { LayoutProps, LayoutMap, LayoutDemo } from '@honeydeck/runtime/types'
 *
 * type CoverFrontmatter = { author?: string }
 *
 * export default function CoverLayout({
 *   title, children, frontmatter
 * }: LayoutProps<CoverFrontmatter>) { ... }
 *
 * export const demo: LayoutDemo<CoverFrontmatter> = {
 *   mdx: '---\nlayout: Cover\nauthor: Hendrik\n---\n\n# My Talk',
 * }
 * ```
 */

import type { ComponentType, ReactNode } from "react";

// ---------------------------------------------------------------------------
// LayoutProps
// ---------------------------------------------------------------------------

/**
 * Props passed to every layout component.
 *
 * The generic parameter `F` types the layout-specific frontmatter fields
 * (e.g. `author`, `date` for a Cover layout). This enables a future
 * language server to provide autocomplete for layout-specific frontmatter.
 *
 * @example
 * ```tsx
 * type CoverFrontmatter = { author?: string }
 *
 * export default function CoverLayout({
 *   title, children, frontmatter,
 * }: LayoutProps<CoverFrontmatter>) {
 *   return (
 *     <div>
 *       <h1>{title}</h1>
 *       {children}
 *     </div>
 *   )
 * }
 * ```
 */
export type LayoutProps<
	F extends Record<string, unknown> = Record<string, unknown>,
> = {
	/**
	 * Text content of the first `h1` in the slide, extracted at build time.
	 * `null` when the slide has no h1.
	 */
	title: ReactNode | null;

	/**
	 * Slide body — everything after the h1 has been removed.
	 * This is what most layouts render as the main content area.
	 */
	children: ReactNode;

	/**
	 * Full, unmodified slide content including the original h1.
	 * Useful for layouts that want to render the slide in one piece.
	 * Phase 3: same as `children` (improvement planned for Phase 8).
	 */
	rawChildren: ReactNode;

	/**
	 * Parsed slide-level frontmatter fields (YAML block at top of the slide).
	 */
	frontmatter: F;
};

// ---------------------------------------------------------------------------
// LayoutMap
// ---------------------------------------------------------------------------

/**
 * A map of layout names to layout components.
 *
 * Used as the value of the `layouts:` frontmatter property.
 *
 * @example
 * ```ts
 * // layouts/index.ts
 * import companyLayouts from '@company/honeydeck-kit-brand/layouts'
 * import { MyCustomCover } from './Cover'
 *
 * export default {
 *   ...companyLayouts,
 *   Cover: MyCustomCover,
 * } satisfies LayoutMap
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: Layout maps intentionally hold heterogeneous layout components with layout-specific frontmatter.
export type LayoutMap = Record<string, ComponentType<LayoutProps<any>>>;

// ---------------------------------------------------------------------------
// LayoutDemo
// ---------------------------------------------------------------------------

/**
 * Optional demo data exported from a layout component for the docs reference page.
 *
 * When exported as `demo` from a layout module, Honeydeck renders a live preview
 * of the layout on `/#/layouts` using this data.
 *
 * @example
 * ```ts
 * export const demo: LayoutDemo<CoverFrontmatter> = {
 *   mdx: '---\nlayout: Cover\nauthor: Hendrik\n---\n\n# Welcome to My Talk',
 * }
 * ```
 */
export type LayoutDemo<
	F extends Record<string, unknown> = Record<string, unknown>,
> = {
	/** MDX source used for both the live preview and copyable snippet. */
	mdx: string;
} & (F extends Record<string, unknown> ? unknown : never);

export type CompiledLayoutDemo = LayoutDemo & {
	/** Compiled MDX component for the demo slide body. */
	Component: ComponentType;
	/** Number of timeline steps discovered in the demo MDX. */
	stepCount: number;
	/** Plain-text content of the first h1 in the demo MDX. */
	title: string;
	/** Parsed YAML frontmatter from the demo MDX. */
	frontmatter: Record<string, unknown>;
	/** Layout selected by demo frontmatter, or an empty string for the card layout. */
	layoutName: string;
};

export type LayoutPropDoc = {
	/** Frontmatter property name as written in MDX. */
	name: string;
	/** TypeScript-style type label. */
	type: string;
	/** Whether the frontmatter property is required. */
	required: boolean;
	/** Human-readable description from the layout's type comments. */
	description: string;
};

// ---------------------------------------------------------------------------
// ComponentDoc
// ---------------------------------------------------------------------------

/**
 * Documentation for one public component prop, extracted from the component's
 * exported props type.
 */
export type ComponentPropDoc = {
	/** Prop name */
	name: string;
	/** TypeScript type text */
	type: string;
	/** Whether the prop is required */
	required: boolean;
	/** JSDoc description from the prop field */
	description: string;
	/** Default value inferred from the component parameter destructuring */
	defaultValue?: string;
};

/**
 * Generated docs entry for one public built-in component.
 */
export type ComponentDoc = {
	/** Compiled Markdown/MDX from the component's exported JSDoc comment */
	Component: ComponentType;
	/** Raw Markdown source, useful for tooling and tests */
	markdown: string;
	/** Props extracted from the component's exported props type */
	props: ComponentPropDoc[];
};
