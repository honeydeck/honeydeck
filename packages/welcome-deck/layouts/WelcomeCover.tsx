import type { LayoutDemo, LayoutProps } from "@honeydeck/honeydeck/types";
// @ts-expect-error no types for JSX component
import Grainient from "../src/components/Grainient";

export default function WelcomeCover({ title, children }: LayoutProps) {
  return (

    <div className="grid h-full">
      <div className="w-full h-full">
        <Grainient
          color1="#ffd93d"
          color2="#6d4aff"
          color3="#f3efff"
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
      <div className="absolute h-full w-full grid place-items-center">
  			<div className="text-center ">
  				{title && (
  					<h1>
  						{title}
  					</h1>
  				)}
  				<div className="text-foreground/70">{children}</div>
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
