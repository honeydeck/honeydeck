/**
 * Bee Honeydeck layout map.
 *
 * This keeps the original playful Honeydeck layouts available after the default
 * `@honeydeck/runtime/layouts` export moved to the clean layout set.
 */

import type { LayoutMap } from "../../runtime/types.ts";
import BlankLayout from "./Blank.tsx";
import CoverLayout from "./Cover.tsx";
import DefaultLayout from "./Default.tsx";
import ImageLayout from "./Image/Image.tsx";
import ImageLeftLayout from "./ImageLeft.tsx";
import ImageRightLayout from "./ImageRight.tsx";
import SectionLayout from "./Section.tsx";
import TwoColLayout from "./TwoCol.tsx";

const beeLayouts: LayoutMap = {
	Default: DefaultLayout,
	Blank: BlankLayout,
	Cover: CoverLayout,
	Section: SectionLayout,
	TwoCol: TwoColLayout,
	Image: ImageLayout,
	ImageLeft: ImageLeftLayout,
	ImageRight: ImageRightLayout,
};

export default beeLayouts;

export {
	BlankLayout,
	CoverLayout,
	DefaultLayout,
	ImageLayout,
	ImageLeftLayout,
	ImageRightLayout,
	SectionLayout,
	TwoColLayout,
};
