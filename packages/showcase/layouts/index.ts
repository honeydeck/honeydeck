import defaultLayouts from "@honeydeck/runtime/layouts/bee";
import type { LayoutMap } from "@honeydeck/runtime/types";
import PosterLayout from "./Poster.tsx";
import UnusedShowcaseLayout from "./UnusedShowcase.tsx";

export default {
	...defaultLayouts,
	Poster: PosterLayout,
	UnusedShowcase: UnusedShowcaseLayout,
} satisfies LayoutMap;
