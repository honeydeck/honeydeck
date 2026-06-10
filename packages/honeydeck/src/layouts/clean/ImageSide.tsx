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

type CleanImageSideFrontmatter = DarkModeImageFrontmatter & {
	alt?: string;
};

type ImageSide = "left" | "right";

type CleanImageSideLayoutProps = LayoutProps<CleanImageSideFrontmatter> & {
	side: ImageSide;
};

function CleanSideImage({
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
		<div className="h-full min-h-0 overflow-hidden">
			<ColorModeImage
				src={image || verticalImagePlaceholder}
				darkSrc={
					darkImage || (hasImage ? undefined : verticalImagePlaceholderDark)
				}
				alt={hasImage ? alt : ""}
				className="size-full object-cover"
				aria-hidden={hasImage ? undefined : "true"}
			/>
		</div>
	);
}

function CleanSideContent({
	title,
	children,
	side,
}: {
	title: ReactNode | null;
	children: ReactNode;
	side: ImageSide;
}) {
	return (
		<div
			className={`flex min-h-0 flex-col overflow-hidden ${
				side === "left"
					? "py-[var(--honeydeck-slide-padding)] pr-[var(--honeydeck-slide-padding)]"
					: "py-[var(--honeydeck-slide-padding)] pl-[var(--honeydeck-slide-padding)]"
			}`}
		>
			{hasTitle(title) && (
				<header className="mb-8 flex-shrink-0">
					<h1 className="font-heading text-[length:var(--honeydeck-font-size-h2)] font-semibold leading-tight text-foreground">
						{title}
					</h1>
				</header>
			)}

			<div className="min-h-0 flex-1 overflow-hidden">{children}</div>
		</div>
	);
}

export function CleanImageSideLayout({
	title,
	children,
	frontmatter,
	side,
}: CleanImageSideLayoutProps) {
	const { image, darkImage, alt = "" } = frontmatter;
	const imagePane = (
		<CleanSideImage image={image} darkImage={darkImage} alt={alt} />
	);
	const contentPane = (
		<CleanSideContent title={title} side={side}>
			{children}
		</CleanSideContent>
	);

	return (
		<SlideFrame padded={false}>
			<div className="grid size-full grid-cols-2 gap-10">
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
