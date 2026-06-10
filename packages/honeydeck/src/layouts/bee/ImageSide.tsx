import type { ReactNode } from "react";
import type { LayoutProps } from "../../runtime/types.ts";
import {
	ColorModeImage,
	type DarkModeImageFrontmatter,
} from "../ColorModeImage.tsx";
import {
	verticalImagePlaceholder,
	verticalImagePlaceholderDark,
} from "../placeholders.ts";
import { SlideFrame } from "../SlideFrame.tsx";
import { hasTitle } from "../utils.ts";

type ImageSideFrontmatter = DarkModeImageFrontmatter & {
	alt?: string;
};

type ImageSide = "left" | "right";

type ImageSideLayoutProps = LayoutProps<ImageSideFrontmatter> & {
	side: ImageSide;
};

function DefaultSideImageFrame({
	image,
	darkImage,
	alt,
}: {
	image?: string;
	darkImage?: string;
	alt: string;
}) {
	const hasImage = Boolean(image || darkImage);

	return (
		<div className="h-full min-h-0 rounded-honeydeck bg-surface p-3 shadow-2xl ring-1 ring-border">
			<ColorModeImage
				src={image || verticalImagePlaceholder}
				darkSrc={
					darkImage || (hasImage ? undefined : verticalImagePlaceholderDark)
				}
				alt={hasImage ? alt : ""}
				className="size-full rounded-honeydeck object-cover"
				aria-hidden={hasImage ? undefined : "true"}
			/>
		</div>
	);
}

function DefaultSideContent({
	title,
	children,
}: {
	title: ReactNode | null;
	children: ReactNode;
}) {
	return (
		<div className="flex min-h-0 flex-col overflow-hidden">
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

			<div className="min-h-0 flex-1 overflow-hidden">{children}</div>
		</div>
	);
}

export function DefaultImageSideLayout({
	title,
	children,
	frontmatter,
	side,
}: ImageSideLayoutProps) {
	const { image, darkImage, alt = "" } = frontmatter;
	const imagePane = (
		<DefaultSideImageFrame image={image} darkImage={darkImage} alt={alt} />
	);
	const contentPane = (
		<DefaultSideContent title={title}>{children}</DefaultSideContent>
	);

	return (
		<SlideFrame>
			<div className="grid h-full min-h-0 grid-cols-2 gap-12">
				{side === "left" ? (
					<>
						{imagePane}
						{contentPane}
					</>
				) : (
					<>
						{contentPane}
						{imagePane}
					</>
				)}
			</div>
		</SlideFrame>
	);
}
