import type { ImgHTMLAttributes } from "react";
import { cn } from "./utils.ts";

export type DarkModeImageFrontmatter = {
	/** Image URL or import used in light mode. */
	image?: string;
	/** Optional image URL or import used in dark mode. */
	darkImage?: string;
};

export type ColorModeImageProps = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	"src"
> & {
	src?: string;
	darkSrc?: string;
};

export function ColorModeImage({
	src,
	darkSrc,
	alt = "",
	className,
	...props
}: ColorModeImageProps) {
	if (!src && !darkSrc) return null;

	return (
		<>
			{src ? (
				<img
					{...props}
					src={src}
					alt={alt}
					className={cn(
						"block",
						darkSrc && "[[data-honeydeck-color-mode=dark]_&]:hidden",
						className,
					)}
				/>
			) : null}
			{darkSrc ? (
				<img
					{...props}
					src={darkSrc}
					alt={alt}
					className={cn(
						"hidden [[data-honeydeck-color-mode=dark]_&]:block",
						className,
					)}
				/>
			) : null}
		</>
	);
}
