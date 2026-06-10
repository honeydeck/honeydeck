import type { LayoutDemo, LayoutProps } from "@honeydeck/honeydeck/types";

type PosterFrontmatter = {
	/** Small uppercase label shown above the poster title. */
	kicker?: string;
};

export default function PosterLayout({
	title,
	children,
	frontmatter,
}: LayoutProps<PosterFrontmatter>) {
	return (
		<div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-primary p-[var(--honeydeck-slide-padding)] text-center font-body text-primary-foreground">
			<div
				className="absolute inset-x-0 top-0 h-8 bg-primary-foreground/20"
				aria-hidden="true"
			/>
			{frontmatter.kicker && (
				<p className="mb-8 text-[length:var(--honeydeck-font-size-small)] font-semibold uppercase tracking-[0.35em] text-primary-foreground/70">
					{frontmatter.kicker}
				</p>
			)}
			{title && (
				<h1 className="max-w-5xl font-heading text-[length:var(--honeydeck-font-size-display)] font-black leading-none tracking-tight">
					{title}
				</h1>
			)}
			{children && (
				<div className="mt-10 max-w-3xl text-[length:var(--honeydeck-font-size-body)] text-primary-foreground/75">
					{children}
				</div>
			)}
		</div>
	);
}

export const demo: LayoutDemo<PosterFrontmatter> = {
	mdx: `---
layout: Poster
kicker: Showcase layout
---

# Custom Poster

A project-local layout discovered from \`layouts: "./layouts"\`.`,
};
