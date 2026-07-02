import type { LayoutDemo, LayoutProps } from "@honeydeck/honeydeck/types";
import { useEffect, useState } from "react";
// @ts-expect-error no types for JSX component
import Grainient from "../src/components/Grainient";

export default function WelcomeCover({ title, children }: LayoutProps) {
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
		// Sometimes the canvas scales to not fill the slide - in those cases, we place it centrally.
		<div className="grid h-full place-items-center bg-black [&_.grainient-container]:grid [&_.grainient-container]:place-items-center">
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

			<div className="absolute h-full w-full grid place-items-center">
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
