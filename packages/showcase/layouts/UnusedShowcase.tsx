import type { LayoutDemo, LayoutProps } from "@honeydeck/honeydeck/types";

export default function UnusedShowcaseLayout({ title, children }: LayoutProps) {
	return (
		<div className="flex h-full w-full flex-col justify-center overflow-hidden bg-surface p-[var(--honeydeck-slide-padding)] font-body text-foreground">
			<div className="rounded-honeydeck border border-border bg-background p-16 shadow-2xl">
				{title && (
					<h1 className="mb-8 font-heading text-[length:var(--honeydeck-font-size-h1)] font-bold">
						{title}
					</h1>
				)}
				<div className="text-[length:var(--honeydeck-font-size-body)] text-surface-foreground">
					{children}
				</div>
			</div>
		</div>
	);
}

export const demo: LayoutDemo = {
	mdx: `---
layout: UnusedShowcase
---

# Unused but Available

This layout is not used by any slide, but it appears in the docs reference.`,
};
