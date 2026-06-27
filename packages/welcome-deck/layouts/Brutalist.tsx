import type { LayoutDemo, LayoutProps } from "@honeydeck/runtime/types";

export default function Brutalist({ title, children }: LayoutProps) {
	return (
		<div className="relative h-full overflow-hidden bg-accent p-12">
			{/* Thick border frame */}
			<div className="absolute inset-4 border-[6px] border-[#111111]" />

			{/* Rotated background text */}
			<div className="absolute -right-16 top-1/2 -translate-y-1/2 -rotate-90 font-mono text-[8rem] font-black text-[#111111]/10 whitespace-nowrap">
				HONEY
			</div>

			<div className="relative z-10 flex h-full flex-col justify-center p-12">
				{title && (
					<h1 className="mb-8 text-[3.5rem] leading-[1] font-black uppercase text-[#111111]">
						{title}
					</h1>
				)}
				<div className="text-lg font-medium text-[#111111]/80 [&_.honeydeck-code-block]:w-1/2">
					{children}
				</div>
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
