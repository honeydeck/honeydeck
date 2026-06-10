/**
 * Cover layout — centered title, body copy, and author.
 *
 * Designed for opening and closing slides. Title is large and centered;
 * body content and optional `author` frontmatter appear below.
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

export default function CoverLayout({
	title,
	children,
	frontmatter,
}: LayoutProps<CoverFrontmatter>) {
	const { author, date } = frontmatter;

	return (
		<SlideFrame className="items-center justify-center text-center">
			{/* Large centered title */}
			{hasTitle(title) && (
				<h1 className="font-heading font-bold text-[length:var(--honeydeck-font-size-h1)] leading-tight text-primary mb-14">
					{title}
				</h1>
			)}

			{/* Slide body (MDX content after title) */}
			{children && (
				<div className="text-[length:var(--honeydeck-font-size-body)] text-surface-foreground font-light mb-18 max-w-4xl">
					{children}
				</div>
			)}

			{/* Author / date metadata */}
			{(author || date) && (
				<div className="flex items-center gap-14 text-[length:var(--honeydeck-font-size-small)] text-surface-foreground mt-9">
					{author && <span>{author}</span>}
					{author && date && <span className="text-border">·</span>}
					{date && <span>{date}</span>}
				</div>
			)}

			{/* Decorative accent bar */}
			<div
				className="absolute bottom-0 left-0 right-0 h-5 bg-accent"
				aria-hidden="true"
			/>
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
