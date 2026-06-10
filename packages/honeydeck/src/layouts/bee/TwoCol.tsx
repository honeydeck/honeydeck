/**
 * TwoCol layout — two equal columns side by side.
 *
 * Exports `Left` and `Right` slot components that users place in their
 * MDX to control which content appears in which column.
 *
 * @example
 * ```mdx
 * ---
 * layout: TwoCol
 * ---
 *
 * import { Left, Right } from '@honeydeck/honeydeck/layouts/bee/TwoCol'
 *
 * # My Two-Column Slide
 *
 * <Left>
 * ## Pros
 * - Fast
 * - Simple
 * </Left>
 *
 * <Right>
 * ## Cons
 * - Limited
 * </Right>
 * ```
 */

import type { ReactNode } from "react";
import type { LayoutDemo, LayoutProps } from "../../runtime/types.ts";
import DefaultLayout from "./Default.tsx";

// ---------------------------------------------------------------------------
// Slot components — thin wrappers that emit data-honeydeck-slot attributes.
// Tailwind utility classes position them into the correct grid column.
// ---------------------------------------------------------------------------

/** Slot for the left column */
export function Left({ children }: { children?: ReactNode }) {
	return (
		<div data-honeydeck-slot="left" className="col-start-1 overflow-hidden">
			{children}
		</div>
	);
}

/** Slot for the right column */
export function Right({ children }: { children?: ReactNode }) {
	return (
		<div data-honeydeck-slot="right" className="col-start-2 overflow-hidden">
			{children}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Layout component
// ---------------------------------------------------------------------------

/**
 * TwoCol layout — renders children in a two-column CSS grid.
 *
 * The `<Left>` and `<Right>` slot components render divs with
 * `data-honeydeck-slot="left|right"` attributes and Tailwind column utilities.
 * This works because MDX components return fragments — the slot divs become
 * direct DOM children of the grid container without any intermediate wrapper.
 */
export default function TwoColLayout({
	title,
	children,
	frontmatter,
	rawChildren,
}: LayoutProps) {
	return (
		<DefaultLayout
			title={title}
			frontmatter={frontmatter}
			rawChildren={rawChildren}
		>
			{/* Two columns — slot positioning handled by Tailwind utilities */}
			<div className="grid h-full grid-cols-2 gap-12">{children}</div>
		</DefaultLayout>
	);
}

export const demo: LayoutDemo = {
	mdx: `---
layout: TwoCol
---

import { Left, Right } from '@honeydeck/honeydeck/layouts/bee/TwoCol'

# Pros vs Cons

<Left>
## Pros

- Fast
- Simple
</Left>

<Right>
## Cons

- Limited
</Right>`,
};
