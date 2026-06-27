import type { LayoutDemo, LayoutProps } from "@honeydeck/runtime/types";
import { useId } from "react";

export default function HexGrid({ title, children }: LayoutProps) {
	const patternId = `hex-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

	return (
		<div className="relative h-full overflow-hidden bg-background p-16">
			{/* Hex pattern background */}
			<svg
				aria-hidden="true"
				className="absolute inset-0 h-full w-full opacity-[0.04]"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<pattern
						id={patternId}
						width="56"
						height="100"
						patternUnits="userSpaceOnUse"
						patternTransform="scale(2)"
					>
						<path
							d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100"
							fill="none"
							stroke="currentColor"
							strokeWidth="1"
							className="text-foreground"
						/>
						<path
							d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34"
							fill="none"
							stroke="currentColor"
							strokeWidth="1"
							className="text-foreground"
						/>
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill={`url(#${patternId})`} />
			</svg>

			<div className="relative z-10 flex h-full flex-col justify-center">
				{title && (
					<h1 className="mb-8 text-[3rem] font-black tracking-tight text-foreground">
						<span className="border-b-4 border-accent pb-2">{title}</span>
					</h1>
				)}
				<div className="text-lg text-foreground/80">{children}</div>
			</div>
		</div>
	);
}

export const demo: LayoutDemo = {
	mdx: `---
layout: HexGrid
---

# Code Highlighting

Show technical content with plenty of structure and a subtle honeycomb backdrop.

~~~ts
const deck = defineDeck({
  format: "mdx",
  runtime: "react",
});
~~~`,
};
