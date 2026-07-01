import type { LayoutDemo, LayoutProps } from "@honeydeck/honeydeck/types";

export default function DiagonalSplit({ title, children }: LayoutProps) {
	return (
		<div className="h-full overflow-hidden">
			{/* Diagonal accent strip */}
			<div className="absolute inset-0 -skew-x-12 translate-x-[-20%] w-[45%] bg-primary" />

			<div className="grid h-full grid-cols-[2fr_3fr] items-center">
				{/* Left: title on the diagonal */}
				<div className="flex h-full items-center justify-center p-16">
					{title && (
						<h1 className="text-primary-foreground drop-shadow-lg">
							{title}
						</h1>
					)}
				</div>

				{/* Right: content */}
				<div className="p-16">{children}</div>
			</div>
		</div>
	);
}

export const demo: LayoutDemo = {
	mdx: `---
layout: DiagonalSplit
---

# Why Honeydeck?

- MDX-native authoring
- React components where Markdown is not enough
- Git-friendly decks that are easy to review`,
};
