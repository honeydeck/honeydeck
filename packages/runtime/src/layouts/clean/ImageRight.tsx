import type { LayoutDemo, LayoutProps } from "../../runtime/types.ts";
import type { DarkModeImageFrontmatter } from "../ColorModeImage.tsx";
import { CleanImageSideLayout } from "./ImageSide.tsx";

type ImageRightFrontmatter = DarkModeImageFrontmatter & {
	/** Accessible text for the image. */
	alt?: string;
};

export default function CleanImageRightLayout(
	props: LayoutProps<ImageRightFrontmatter>,
) {
	return <CleanImageSideLayout {...props} side="right" />;
}

export const demo: LayoutDemo<ImageRightFrontmatter> = {
	mdx: `---
layout: ImageRight
image: ""
darkImage: ""
alt: Launch moment
---

# Launch Moment

Pair a flush image with focused supporting content.`,
};
