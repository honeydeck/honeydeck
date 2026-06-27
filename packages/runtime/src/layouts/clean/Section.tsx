/**
 * Clean Section layout — simple centered section divider.
 */

import type { LayoutDemo, LayoutProps } from "../../runtime/types.ts";
import { SlideFrame } from "../SlideFrame.tsx";
import { hasTitle } from "../utils.ts";

export default function CleanSectionLayout({ title, children }: LayoutProps) {
	return (
		<SlideFrame className="items-center justify-center text-center">
			{hasTitle(title) && (
				<h1 className="mb-7 max-w-5xl font-heading text-[length:var(--honeydeck-font-size-display)] font-semibold leading-none text-foreground">
					{title}
				</h1>
			)}

			{children && (
				<div className="max-w-3xl text-[length:var(--honeydeck-font-size-body)] leading-snug text-surface-foreground">
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
