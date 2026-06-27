/**
 * Main Honeydeck runtime entry point.
 *
 * This is what end-users import in their MDX slides:
 * ```mdx
 * import { Reveal, RevealWith, RevealGroup, Notes } from '@honeydeck/runtime'
 * ```
 */

export type { ColorModeImageProps } from "../layouts/ColorModeImage.tsx";
export { ColorModeImage } from "../layouts/ColorModeImage.tsx";
export type { BrowserFrameProps } from "./components/BrowserFrame.tsx";
export { BrowserFrame } from "./components/BrowserFrame.tsx";
export type { FadeProps } from "./components/Fade.tsx";
export { Fade } from "./components/Fade.tsx";
export type { FadeGroupProps } from "./components/FadeGroup.tsx";
export { FadeGroup } from "./components/FadeGroup.tsx";
export type { FadeWithProps } from "./components/FadeWith.tsx";
export { FadeWith } from "./components/FadeWith.tsx";
export type { KeyboardKey, KeyboardProps } from "./components/Keyboard.tsx";
export { Keyboard } from "./components/Keyboard.tsx";
export type {
	ListBullet,
	ListBullets,
	ListStyleProps,
} from "./components/ListStyle.tsx";
export { ListStyle } from "./components/ListStyle.tsx";
export type { NotesProps } from "./components/Notes.tsx";
export { Notes } from "./components/Notes.tsx";
export type { RevealProps } from "./components/Reveal.tsx";
export { Reveal } from "./components/Reveal.tsx";
export type { RevealGroupProps } from "./components/RevealGroup.tsx";
export { RevealGroup } from "./components/RevealGroup.tsx";
export type { RevealWithProps } from "./components/RevealWith.tsx";
export { RevealWith } from "./components/RevealWith.tsx";
export type {
	TimelineStepsPhase,
	TimelineStepsProps,
	TimelineStepsState,
} from "./components/TimelineSteps.tsx";
export {
	TimelineSteps,
	useTimelineSteps,
} from "./components/TimelineSteps.tsx";
export type {
	TimelineContextValue,
	TimelineProviderProps,
} from "./TimelineContext.tsx";
// TimelineProvider and useTimeline are exported for kit/layout authors.
export { TimelineProvider, useTimeline } from "./TimelineContext.tsx";
