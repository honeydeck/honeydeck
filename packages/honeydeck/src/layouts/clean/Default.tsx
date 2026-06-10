/**
 * Clean Default layout — plain title and body.
 */

import type { LayoutDemo, LayoutProps } from "../../runtime/types.ts";
import { SlideFrame } from "../SlideFrame.tsx";
import { hasTitle } from "../utils.ts";

export default function CleanDefaultLayout({ title, children }: LayoutProps) {
	return (
		<SlideFrame>
			{hasTitle(title) && (
				<header className="mb-8 flex-shrink-0">
					<h1 className="font-heading text-[length:var(--honeydeck-font-size-h2)] font-semibold leading-tight text-foreground">
						{title}
					</h1>
				</header>
			)}

			<div className="min-h-0 flex-1 overflow-hidden">{children}</div>
		</SlideFrame>
	);
}

export const demo: LayoutDemo = {
	mdx: `---
layout: Default
---

# Default Layout

Body content flows naturally below the title.`,
};
