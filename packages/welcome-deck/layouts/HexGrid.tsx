import type { LayoutDemo, LayoutProps } from "@honeydeck/honeydeck/types";
import { HexGridBackground } from "../src/components/HexGridBackground";

export default function HexGrid({ title, children }: LayoutProps) {
	return (
		<div>
			<HexGridBackground />

			<div className="absolute z-10 flex h-full w-full flex-col justify-center p-16">
				{title && (
					<h1>
						<span className="border-b-4 border-accent pb-2">{title}</span>
					</h1>
				)}
				<div>{children}</div>
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
