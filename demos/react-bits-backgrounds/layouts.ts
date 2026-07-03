import defaultLayouts from '@honeydeck/honeydeck/layouts'
import type { LayoutMap } from "@honeydeck/honeydeck/types";
import BeamsBackground from "./layouts/BeamsBackground";

export default {
	...defaultLayouts,
	BeamsBackground,
} satisfies LayoutMap;
