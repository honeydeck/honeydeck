/**
 * Public runtime component exports for Honeydeck.
 *
 * These are the components that end users import in their MDX slides:
 *
 * ```mdx
 * import { Reveal, RevealWith, RevealGroup, Notes } from '@honeydeck/honeydeck'
 * ```
 */

export type { BrowserFrameProps } from "./BrowserFrame.tsx";
export { BrowserFrame } from "./BrowserFrame.tsx";
export type { ButtonProps, ButtonVariant } from "./Button.tsx";
export {
	Button,
	buttonClass,
	buttonPrimaryClass,
	buttonSecondaryClass,
	hoverBorderClass,
	iconButtonClass,
	quietLinkClass,
	smallButtonClass,
	surfaceControlClass,
	transitionClass,
} from "./Button.tsx";
export type {
	ColorMode,
	ColorModeCycleButtonProps,
} from "./ColorModeCycleButton.tsx";
export {
	COLOR_MODES,
	ColorModeCycleButton,
	getNextColorMode,
} from "./ColorModeCycleButton.tsx";
export type { KeyboardKey, KeyboardProps } from "./Keyboard.tsx";
export { Keyboard } from "./Keyboard.tsx";
export type { ListBullet, ListBullets, ListStyleProps } from "./ListStyle.tsx";
export { ListStyle } from "./ListStyle.tsx";
export type { NotesProps } from "./Notes.tsx";
export { Notes } from "./Notes.tsx";
export type { RevealProps } from "./Reveal.tsx";
export { Reveal } from "./Reveal.tsx";
export type { RevealGroupProps } from "./RevealGroup.tsx";
export { RevealGroup } from "./RevealGroup.tsx";
export type { RevealWithProps } from "./RevealWith.tsx";
export { RevealWith } from "./RevealWith.tsx";
export type {
	TimelineStepsPhase,
	TimelineStepsProps,
	TimelineStepsState,
} from "./TimelineSteps.tsx";
export { TimelineSteps, useTimelineSteps } from "./TimelineSteps.tsx";

// HoneydeckCodeBlock and HoneydeckMagicCodeBlock are intentionally NOT exported
// from the public component barrel. They are internal components injected by
// remarkShikiCodeBlocks via direct code-block implementation subpaths.
// Do not import them from '@honeydeck/honeydeck' or '@honeydeck/honeydeck/components'.
