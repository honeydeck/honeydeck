/**
 * Default layout — title top-left, body flows below.
 *
 * The most versatile layout for content slides. Title is pinned to the
 * upper-left area and body content fills the remaining space.
 */

import type { LayoutDemo, LayoutProps } from "../../runtime/types.ts";
import { SlideFrame } from "../SlideFrame.tsx";
import { hasTitle } from "../utils.ts";

export default function DefaultLayout({ title, children }: LayoutProps) {
	return (
		<SlideFrame>
			{/* Title — always visible, layout-stable */}
			{hasTitle(title) && (
				<header className="mb-8 flex-shrink-0">
					<h1 className="font-heading font-bold text-[length:var(--honeydeck-font-size-h2)] leading-tight text-primary">
						{title}
					</h1>
					<div
						className="mt-4 h-2 w-28 rounded-full bg-accent"
						aria-hidden="true"
					/>
				</header>
			)}

			{/* Body content */}
			<div className="flex-1 min-h-0 overflow-hidden">{children}</div>
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
