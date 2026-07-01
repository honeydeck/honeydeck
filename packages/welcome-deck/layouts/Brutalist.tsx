import type { LayoutDemo, LayoutProps } from "@honeydeck/honeydeck/types";

export default function Brutalist({ title, children }: LayoutProps) {
	return (
		<div className="h-full overflow-hidden bg-accent p-16">
			{/* Thick border frame */}
			<div className="absolute inset-4 border-[6px] border-[#111111]" />

			{/* Rotated background text */}
			<div className="absolute -right-16 top-1/2 -translate-y-1/2 -rotate-90 font-mono text-[8rem] font-black text-[#111111]/10 whitespace-nowrap">
				HONEY
			</div>

			<div className="flex h-full flex-col justify-center w-3/4">
				{title && <h1 className="uppercase">{title}</h1>}
				<div className="[&_.honeydeck-code-block]:w-3/4">{children}</div>
			</div>
		</div>
	);
}

export const demo: LayoutDemo = {
	mdx: `---
layout: Brutalist
---

# Theme Tokens

Use CSS variables to turn Honeydeck into a branded presentation system.

- Primary, accent, background
- Typography and spacing
- Rounded corners and borders`,
};
