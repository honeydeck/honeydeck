/**
 * Clean Cover layout — centered title, body copy, and simple metadata.
 */

import type { LayoutDemo, LayoutProps } from "../../runtime/types.ts";
import { SlideFrame } from "../SlideFrame.tsx";
import { hasTitle } from "../utils.ts";

type CoverFrontmatter = {
	/** Speaker or organization shown below the cover body. */
	author?: string;
	/** Date or event label shown below the cover body. */
	date?: string;
};

export default function CleanCoverLayout({
	title,
	children,
	frontmatter,
}: LayoutProps<CoverFrontmatter>) {
	const { author, date } = frontmatter;

	return (
		<SlideFrame className="items-center justify-center text-center">
			{hasTitle(title) && (
				<h1 className="mb-10 font-heading text-[length:var(--honeydeck-font-size-h1)] font-semibold leading-tight text-foreground">
					{title}
				</h1>
			)}

			{children && (
				<div className="mb-12 max-w-4xl text-[length:var(--honeydeck-font-size-body)] leading-snug text-surface-foreground">
					{children}
				</div>
			)}

			{(author || date) && (
				<div className="flex items-center gap-10 border-t border-border pt-5 text-[length:var(--honeydeck-font-size-small)] text-surface-foreground">
					{author && <span>{author}</span>}
					{author && date && <span aria-hidden="true">/</span>}
					{date && <span>{date}</span>}
				</div>
			)}
		</SlideFrame>
	);
}

export const demo: LayoutDemo<CoverFrontmatter> = {
	mdx: `---
layout: Cover
author: The honeydeck team
date: 2026
---

# Welcome to My Talk

A modern slide framework.`,
};
