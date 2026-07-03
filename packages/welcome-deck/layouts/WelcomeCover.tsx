import { useHoneydeck, useSlideScale } from "@honeydeck/honeydeck";
import type { LayoutDemo, LayoutProps } from "@honeydeck/honeydeck/types";
import { useEffect, useState } from "react";
// @ts-expect-error no types for JSX component
import Grainient from "../src/components/Grainient";

export default function WelcomeCover({ title, children }: LayoutProps) {
	const { slideWidth, slideHeight } = useHoneydeck();
	const slideScale = useSlideScale();
	const [primary, setPrimary] = useState<string>("");
	const [accent, setAccent] = useState<string>("");
	const [surface, setSurface] = useState<string>("");

	// Use theme colors for animation.
	useEffect(() => {
		const bodyStyles = window.getComputedStyle(document.body);
		const primary = bodyStyles.getPropertyValue("--honeydeck-primary");
		const accent = bodyStyles.getPropertyValue("--honeydeck-accent");
		const surface = bodyStyles.getPropertyValue("--honeydeck-surface");
		setPrimary(primary);
		setAccent(accent);
		setSurface(surface);
	});

	return (
		<div className="relative grid h-full w-full overflow-hidden bg-black">
			{/* Grainient measures with getBoundingClientRect(), which includes
			    Honeydeck's CSS slide scale. The inverse-sized wrapper makes that
			    measurement resolve to the logical slide size and avoids double-scaling
			    the canvas. */}
			<div
				className="absolute left-0 top-0"
				style={{
					width: slideWidth / slideScale,
					height: slideHeight / slideScale,
				}}
			>
				<Grainient
					color1={accent} // accent
					color2={primary} // Primary
					color3={surface} // surface
					timeSpeed={0.1}
					colorBalance={0}
					warpStrength={1}
					warpFrequency={5}
					warpSpeed={2}
					warpAmplitude={50}
					blendAngle={0}
					blendSoftness={0.05}
					rotationAmount={500}
					noiseScale={2}
					grainAmount={0.06}
					grainScale={2}
					grainAnimated={false}
					contrast={1.3}
					gamma={1.5}
					saturation={0.9}
					centerX={0}
					centerY={0}
					zoom={0.9}
				/>
			</div>

			<div className="absolute inset-0 grid place-items-center">
				<div className="text-center text-shadow-2xs">
					{title && <h1>{title}</h1>}
					<div className="text-foreground/80 dark:text-foreground">
						{children}
					</div>
				</div>
			</div>
		</div>
	);
}

export const demo: LayoutDemo = {
	mdx: `---
layout: BeeCover
---

# Honeydeck

Build memorable slide decks with MDX, React, and a little bee magic.`,
};
