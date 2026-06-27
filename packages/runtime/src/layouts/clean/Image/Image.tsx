/**
 * Clean Image layout — image stage with minimal framing.
 */

import type { ReactNode } from "react";
import type { LayoutDemo, LayoutProps } from "../../../runtime/types.ts";
import {
	ColorModeImage,
	type DarkModeImageFrontmatter,
} from "../../ColorModeImage.tsx";
import { imagePlaceholder, imagePlaceholderDark } from "../../placeholders.ts";
import CleanDefaultLayout from "../Default.tsx";

type ImageFrontmatter = DarkModeImageFrontmatter & {
	/** Accessible text for the image. */
	alt?: string;
};

function ImageFrame({ children }: { children: ReactNode }) {
	return (
		<div className="max-h-full overflow-hidden rounded-honeydeck border border-border bg-surface">
			{children}
		</div>
	);
}

function PlaceholderBox() {
	return (
		<div className="flex max-h-full min-h-0 flex-col items-center gap-8">
			<ImageFrame>
				<ColorModeImage
					src={imagePlaceholder}
					darkSrc={imagePlaceholderDark}
					alt=""
					className="max-h-full max-w-full object-contain"
					aria-hidden="true"
				/>
			</ImageFrame>
			<p className="text-center text-[length:var(--honeydeck-font-size-small)] leading-snug text-surface-foreground opacity-60">
				Add{" "}
				<code className="rounded-honeydeck bg-background px-4 py-1 font-mono">
					image: /path/to/image.png
				</code>{" "}
				to frontmatter
			</p>
		</div>
	);
}

export default function CleanImageLayout({
	title,
	children,
	frontmatter,
	rawChildren,
}: LayoutProps<ImageFrontmatter>) {
	const { image, darkImage, alt = "" } = frontmatter;
	const hasImage = Boolean(image || darkImage);
	const hasCaption = Boolean(children);

	return (
		<CleanDefaultLayout
			title={title}
			frontmatter={frontmatter}
			rawChildren={rawChildren}
		>
			<figure className="m-0 flex h-full flex-col gap-8 p-0">
				<div className="flex min-h-0 flex-1 flex-col items-center justify-center">
					{hasImage ? (
						<ImageFrame>
							<ColorModeImage
								src={image || imagePlaceholder}
								darkSrc={darkImage}
								alt={alt}
								className="max-h-full max-w-full object-contain"
							/>
						</ImageFrame>
					) : (
						<PlaceholderBox />
					)}
				</div>

				{hasCaption && (
					<figcaption className="flex-shrink-0 pt-5 text-[length:var(--honeydeck-font-size-small)] leading-snug text-surface-foreground">
						{children}
					</figcaption>
				)}
			</figure>
		</CleanDefaultLayout>
	);
}

export const demo: LayoutDemo<ImageFrontmatter> = {
	mdx: `---
layout: Image
image: ""
darkImage: ""
alt: Architecture diagram
---

# System Architecture

Our distributed system in production.`,
};
