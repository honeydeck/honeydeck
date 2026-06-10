/**
 * Section layout — big centered heading with primary background.
 *
 * Used as a visual divider between chapters/sections. The title is the
 * only required content; body children appear as a subtitle below.
 */

import type { LayoutDemo, LayoutProps } from "../../runtime/types.ts";
import { SlideFrame } from "../SlideFrame.tsx";
import { hasTitle } from "../utils.ts";

export default function SectionLayout({ title, children }: LayoutProps) {
	return (
		<SlideFrame className="items-center justify-center bg-primary dark:bg-primary/75 text-primary-foreground text-center">
			{/* Big centered section title */}
			{hasTitle(title) && (
				<h1 className="font-heading font-black text-[length:var(--honeydeck-font-size-display)] leading-none mb-6 tracking-tight">
					{title}
				</h1>
			)}

			{/* Optional subtitle / body */}
			{children && (
				<div className="text-[length:var(--honeydeck-font-size-body)] text-primary-foreground/70 max-w-3xl font-light">
					{children}
				</div>
			)}
		</SlideFrame>
	);
}

export const demo: LayoutDemo = {
	mdx: `---
layout: Section
---

# Section Title

An optional section subtitle or brief description.`,
};
