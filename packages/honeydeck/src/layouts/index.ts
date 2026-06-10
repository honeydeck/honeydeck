/**
 * Default Honeydeck layout map.
 *
 * Exported when no custom `layouts:` path is specified in deck frontmatter.
 * Defaults are intentionally clean and minimal. Use
 * `@honeydeck/honeydeck/layouts/bee` for the original playful Bee layouts.
 *
 * @example
 * ```ts
 * // layouts/index.ts — extend the default map
 * import defaultLayouts from '@honeydeck/honeydeck/layouts'
 * import { MyBrandCover } from './BrandCover'
 *
 * export default {
 *   ...defaultLayouts,
 *   Cover: MyBrandCover,
 * } satisfies LayoutMap
 * ```
 */

import type { LayoutMap } from "../runtime/types.ts";
import { ColorModeImage } from "./ColorModeImage.tsx";
import BlankLayout from "./clean/Blank.tsx";
import CoverLayout from "./clean/Cover.tsx";
import DefaultLayout from "./clean/Default.tsx";
import ImageLayout from "./clean/Image/Image.tsx";
import ImageLeftLayout from "./clean/ImageLeft.tsx";
import ImageRightLayout from "./clean/ImageRight.tsx";
import SectionLayout from "./clean/Section.tsx";
import TwoColLayout from "./clean/TwoCol.tsx";

const defaultLayouts: LayoutMap = {
	Default: DefaultLayout,
	Blank: BlankLayout,
	Cover: CoverLayout,
	Section: SectionLayout,
	TwoCol: TwoColLayout,
	Image: ImageLayout,
	ImageLeft: ImageLeftLayout,
	ImageRight: ImageRightLayout,
};

export default defaultLayouts;

export type {
	ColorModeImageProps,
	DarkModeImageFrontmatter,
} from "./ColorModeImage.tsx";
// Re-export individual layouts for named imports
export {
	BlankLayout,
	ColorModeImage,
	CoverLayout,
	DefaultLayout,
	ImageLayout,
	ImageLeftLayout,
	ImageRightLayout,
	SectionLayout,
	TwoColLayout,
};
