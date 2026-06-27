import type { LayoutDemo, LayoutProps } from "../../runtime/types.ts";
import { SlideFrame } from "../SlideFrame.tsx";

export default function CleanBlankLayout(props: LayoutProps) {
	return <SlideFrame>{props.children}</SlideFrame>;
}

export const demo: LayoutDemo = {
	mdx: `---
layout: Blank
---`,
};
