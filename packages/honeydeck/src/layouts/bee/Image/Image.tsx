/**
 * Image layout — prominent framed image with optional title and caption.
 *
 * The image is presented as a gallery-quality piece: a surface-coloured mat
 * behind it, a deep shadow for lift, and a subtle ring border. A thin primary
 * accent border at the caption ties the slide to the deck theme.
 *
 * - Use `image` frontmatter to supply the URL / path.
 * - Use `darkImage` frontmatter to override the URL / path in dark mode.
 * - The `alt` frontmatter field is forwarded to the <img> for accessibility.
 * - Any MDX body text (after the h1) becomes the figure caption, separated
 *   by a primary left-border accent — italic, subordinate to the image.
 *
 * @example
 * ```mdx
 * ---
 * layout: Image
 * image: /diagrams/architecture.png
 * darkImage: /diagrams/architecture-dark.png
 * alt: High-level architecture diagram showing three service tiers
 * ---
 *
 * # System Architecture
 *
 * Our distributed system in production.
 * ```
 */

import type { ReactNode } from "react";
import type { LayoutDemo, LayoutProps } from "../../../runtime/types.ts";
import {
	ColorModeImage,
	type DarkModeImageFrontmatter,
} from "../../ColorModeImage.tsx";
import { imagePlaceholder, imagePlaceholderDark } from "../../placeholders.ts";
import DefaultLayout from "../Default.tsx";

type ImageFrontmatter = DarkModeImageFrontmatter & {
	/** URL or path to the image (supports /public/, relative, or external URLs) */
	image?: string;
	/** URL or path used when Honeydeck's effective color mode is dark */
	darkImage?: string;
	/** Alt text for the image */
	alt?: string;
};

// ---------------------------------------------------------------------------
// ImageFrame — shared framed container for the image stage
// ---------------------------------------------------------------------------

function ImageFrame({ children }: { children: ReactNode }) {
	return (
		<div className="max-h-full rounded-honeydeck overflow-hidden bg-surface shadow-2xl ring-1 ring-border">
			{children}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Placeholder — shown when no `image` frontmatter key is set
// ---------------------------------------------------------------------------

function PlaceholderBox() {
	return (
		<div className="flex flex-col items-center gap-11 max-h-full min-h-0">
			<ImageFrame>
				<ColorModeImage
					src={imagePlaceholder}
					darkSrc={imagePlaceholderDark}
					alt=""
					className="max-h-full max-w-full object-contain"
					aria-hidden="true"
				/>
			</ImageFrame>
			{/* Hint text below the frame */}
			<p className="text-[length:var(--honeydeck-font-size-small)] text-surface-foreground text-center opacity-50 leading-snug">
				Add{" "}
				<code className="font-mono bg-background px-5 py-1 rounded-honeydeck">
					image: /path/to/image.png
				</code>{" "}
				to frontmatter
			</p>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function ImageLayout({
	title,
	children,
	frontmatter,
	rawChildren,
}: LayoutProps<ImageFrontmatter>) {
	const { image, darkImage, alt = "" } = frontmatter;
	const hasImage = Boolean(image || darkImage);
	const hasCaption = Boolean(children);

	return (
		<DefaultLayout
			title={title}
			frontmatter={frontmatter}
			rawChildren={rawChildren}
		>
			{/*
        Semantic <figure> groups the image and its optional caption.
        h-full makes it consume all remaining vertical space so the
        image stage is as large as possible.
      */}
			<figure className="h-full flex flex-col gap-11 m-0 p-0">
				{/* ── Image stage ─────────────────────────────────────────────── */}
				<div className="flex-1 min-h-0 flex flex-col items-center justify-center">
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

				{/* ── Caption ─────────────────────────────────────────────────── */}
				{hasCaption && (
					<figcaption className="flex-shrink-0 border-l-4 border-accent pl-11 text-[length:var(--honeydeck-font-size-small)] text-surface-foreground italic leading-snug">
						{children}
					</figcaption>
				)}
			</figure>
		</DefaultLayout>
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
