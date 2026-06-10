import type { LayoutDemo, LayoutProps } from "../../runtime/types.ts";
import type { DarkModeImageFrontmatter } from "../ColorModeImage.tsx";
import { DefaultImageSideLayout } from "./ImageSide.tsx";

type ImageLeftFrontmatter = DarkModeImageFrontmatter & {
	/** Accessible text for the image. */
	alt?: string;
};

export default function ImageLeftLayout(
	props: LayoutProps<ImageLeftFrontmatter>,
) {
	return <DefaultImageSideLayout {...props} side="left" />;
}

export const demo: LayoutDemo<ImageLeftFrontmatter> = {
	mdx: `---
layout: ImageLeft
image: ""
darkImage: ""
alt: Product detail
---

# Product Detail

Use the body area for supporting context, bullets, or a short narrative beside the image.`,
};
