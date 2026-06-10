import { marketingImages } from "../marketingContent.js";

export function HeroVisual() {
	return (
		<figure className="aspect-[4/3] overflow-visible">
			<img
				src={marketingImages.hero}
				alt="Dex, the Honeydeck mascot, presenting a slide deck workflow beside a laptop."
				className="block h-full w-full object-contain drop-shadow-[0_28px_55px_var(--marketing-shadow)]"
			/>
		</figure>
	);
}
