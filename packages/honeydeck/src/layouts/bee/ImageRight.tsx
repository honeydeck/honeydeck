import type { LayoutDemo, LayoutProps } from "../../runtime/types.ts";
import type { DarkModeImageFrontmatter } from "../ColorModeImage.tsx";
import { DefaultImageSideLayout } from "./ImageSide.tsx";

type ImageRightFrontmatter = DarkModeImageFrontmatter & {
	/** Accessible text for the image. */
	alt?: string;
};

export default function ImageRightLayout(
	props: LayoutProps<ImageRightFrontmatter>,
) {
	return <DefaultImageSideLayout {...props} side="right" />;
}

export const demo: LayoutDemo<ImageRightFrontmatter> = {
	mdx: `---
layout: ImageRight
image: ""
darkImage: ""
alt: Launch moment
---

# Launch Moment

Pair a prominent image with the same heading treatment used by the default content slides.`,
};
