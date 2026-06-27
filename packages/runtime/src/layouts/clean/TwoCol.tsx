/**
 * Clean TwoCol layout — two equal plain columns.
 */

import type { ReactNode } from "react";
import type { LayoutDemo, LayoutProps } from "../../runtime/types.ts";
import CleanDefaultLayout from "./Default.tsx";

export function Left({ children }: { children?: ReactNode }) {
	return (
		<div data-honeydeck-slot="left" className="col-start-1 overflow-hidden">
			{children}
		</div>
	);
}

export function Right({ children }: { children?: ReactNode }) {
	return (
		<div data-honeydeck-slot="right" className="col-start-2 overflow-hidden">
			{children}
		</div>
	);
}

export default function CleanTwoColLayout({
	title,
	children,
	frontmatter,
	rawChildren,
}: LayoutProps) {
	return (
		<CleanDefaultLayout
			title={title}
			frontmatter={frontmatter}
			rawChildren={rawChildren}
		>
			<div className="grid h-full grid-cols-2 gap-10">{children}</div>
		</CleanDefaultLayout>
	);
}

export const demo: LayoutDemo = {
	mdx: `---
layout: TwoCol
---

import { Left, Right } from '@honeydeck/runtime/layouts/TwoCol'

# Pros vs Cons

<Left>
## Pros

- Fast
- Simple
</Left>

<Right>
## Cons

- Limited
</Right>`,
};
