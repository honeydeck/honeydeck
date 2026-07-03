import { useHoneydeck, useSlideScale } from "@honeydeck/honeydeck";
import type { LayoutProps } from "@honeydeck/honeydeck/types";
import Beams from "../components/Beams";

export default function BeamsBackground({ title, children }: LayoutProps) {
	const { slideWidth, slideHeight } = useHoneydeck();
	const slideScale = useSlideScale();

	return (
		<div className="relative h-full w-full overflow-hidden bg-black text-white">
			<div
				className="absolute left-0 top-0"
				style={{
					width: slideWidth / slideScale,
					height: slideHeight / slideScale,
				}}
			>
				<Beams
					beamWidth={3}
					beamHeight={30}
					beamNumber={20}
					lightColor="#ffffff"
					speed={2}
					noiseIntensity={1.75}
					scale={0.2}
					rotation={30}
				/>
			</div>
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.28),transparent_28%),linear-gradient(to_top,rgba(0,0,0,0.76),rgba(0,0,0,0.16)_58%,rgba(0,0,0,0.48))]" />
			<div className="relative z-10 flex h-full w-full items-end p-20">
				<div className="max-w-4xl text-shadow-2xs">
					{title && <h1 className="text-white">{title}</h1>}
					<div className="mt-5 text-3xl font-medium leading-tight text-white/82">
						{children}
					</div>
				</div>
			</div>
		</div>
	);
}
