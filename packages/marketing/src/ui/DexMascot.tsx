import { marketingImages } from "../marketingContent.js";

export function DexMascot({ small = false }: { small?: boolean }) {
	return (
		<img
			className={small ? "h-8 w-8 object-contain" : "h-36 w-36 object-contain"}
			src={marketingImages.avatar}
			alt="Dex, the Honeydeck bee mascot"
		/>
	);
}
