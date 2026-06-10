/**
 * Clean Honeydeck layout map.
 *
 * Same layout names and slot API as `@honeydeck/honeydeck/layouts`, with an explicit
 * import path for decks that want to name the clean kit directly.
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

const cleanLayouts: LayoutMap = {
	Default: DefaultLayout,
	Blank: BlankLayout,
	Cover: CoverLayout,
	Section: SectionLayout,
	TwoCol: TwoColLayout,
	Image: ImageLayout,
	ImageLeft: ImageLeftLayout,
	ImageRight: ImageRightLayout,
};

export default cleanLayouts;

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
