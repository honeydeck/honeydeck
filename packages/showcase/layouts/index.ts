import defaultLayouts from "@honeydeck/honeydeck/layouts/bee";
import type { LayoutMap } from "@honeydeck/honeydeck/types";
import PosterLayout from "./Poster.tsx";
import UnusedShowcaseLayout from "./UnusedShowcase.tsx";

export default {
	...defaultLayouts,
	Poster: PosterLayout,
	UnusedShowcase: UnusedShowcaseLayout,
} satisfies LayoutMap;
