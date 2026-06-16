# Honeydeck Core Components Specification

> Observable behavior for public built-in React components.

## Core Components

All core components are explicit imports from the `'@honeydeck/honeydeck'` package. They are also exported from `@honeydeck/honeydeck/components`:

```mdx
import { Reveal, RevealGroup, TimelineSteps, ListStyle, Keyboard, BrowserFrame, Notes } from '@honeydeck/honeydeck'
```

Injected fenced code blocks render through `HoneydeckCodeBlock` from the direct `@honeydeck/honeydeck/components/code-block/normal` subpath. Injected Magic Code blocks render through `HoneydeckMagicCodeBlock` from the direct `@honeydeck/honeydeck/components/code-block/magic` subpath. Both implementations share the `CodeBlock` parent frame from `@honeydeck/honeydeck/components/code-block` for wrapper styling and copy-button placement, but generated slides import the concrete implementations directly instead of using a code-block barrel. These components are not part of the public component barrel, but transformed slide code blocks must show syntax-highlighted code and reveal an icon-only copy button on hover or keyboard focus. Copying writes the original fenced source text, or for Magic Code, the currently visible source state. Normal stepped code blocks and Magic Code blocks fade specifically highlighted lines from dimmed opacity to full opacity when those lines become active. Magic Code line highlighting must update correctly in both directions, including transitions from a dimmed state to an `all` highlight state. Magic Code token movement, enter/leave transitions, and container size transitions start together and use Shiki Magic Move's duration so resizing stays synchronized with content movement. Entering tokens fade slowly from transparent to their active line-dimming opacity, and leaving tokens fade slowly to transparent instead of popping in or out. Magic Code uses Honeydeck's centralized effective color-mode context so code blocks do not observe document attributes individually. Magic Code lazily parses only the active theme's precompiled token JSON; duplicated timeline states may reference shared unique token states to keep generated output smaller. Magic Code lets Shiki perform its initial render for the starting state, then waits two animation frames before forwarding timeline state changes so the first user-driven transition diffs from a stable baseline. During PDF export, Magic Code skips that baseline delay and disables Magic Move animation so screenshots capture the requested timeline state instead of an in-progress transition. Magic Code passes Honeydeck's current slide transform scale to Shiki Magic Move so measured positions and inline animation sizes stay in the same coordinate system and the container does not pop when the animation releases its inline size.

### Color Mode Controls

`@honeydeck/honeydeck/components` exports the configured color mode type and color mode cycle button for public imports used by Honeydeck chrome surfaces and the marketing site.

```tsx
import { ColorModeCycleButton, type ColorMode } from '@honeydeck/honeydeck/components'
```

Behavior:

- `ColorMode` is `"system" | "light" | "dark"`.
- `getNextColorMode(mode)` cycles `system` → `light` → `dark` → `system`.
- `<ColorModeCycleButton>` renders the matching Lucide icon for the configured mode: monitor for `system`, sun for `light`, moon for `dark`.
- Clicking the button calls `onSetColorMode` with the next configured mode.
- The button accepts `className`, `iconSize`, `title`, and `ariaLabel` so slide chrome, reference pages, and other Honeydeck surfaces can share behavior while styling the control locally.

### Button Controls

`@honeydeck/honeydeck/components` exports generic Honeydeck-token-based button primitives and class recipes for runtime chrome, runtime reference pages, and marketing controls.

```tsx
import { Button, buttonPrimaryClass, iconButtonClass } from '@honeydeck/honeydeck/components'
```

Behavior:

- `<Button>` renders a native `button` with `type="button"` by default.
- `variant` selects one of `primary`, `secondary`, `icon`, `small`, or `quiet`.
- `buttonClass(variant, className)` returns the matching token-based Tailwind class string and appends `className` when provided.
- Exported class recipes use only shipped Honeydeck base-theme tokens for foreground, surface, border, primary, and transition behavior (`--honeydeck-primary`, `--honeydeck-primary-foreground`, `--honeydeck-surface`, `--honeydeck-surface-foreground`, `--honeydeck-border`, `--honeydeck-foreground`, `--honeydeck-background`) so public imports do not depend on marketing-only aliases at publish time.

### Runtime chrome buttons

Icon-only runtime chrome buttons, including the floating navigation bar actions, expose an explicit accessible name with `aria-label` and keep matching hover titles for the same action text.

### `<Reveal>`

Reveals content at the next timeline step.

```mdx
<Reveal>This appears at step 1</Reveal>
<Reveal>This appears at step 2</Reveal>
```

Behavior:

- Hidden content **reserves layout space** (`visibility: hidden` + `opacity: 0`, not `display: none`)
- Runtime wrapper matches MDX context: flow/block reveals render a block-level `div`, text/inline reveals render an inline `span`
- Nested reveals are supported; inline nested reveals inside paragraphs must not create invalid `div`-inside-`p` HTML
- Default effect: fade in
- Reveals are **cumulative** (once visible, stays visible)
- Supports `className` for custom transitions
- Supports `at?: number`; Honeydeck injects this during compilation and manual use works as an escape hatch
- Supports `as?: "div" | "span"`; Honeydeck injects this during compilation and manual use works as an escape hatch
- No `effect` prop

### `<RevealGroup>`

Convenience: reveals each meaningful direct child one by one. Whitespace-only text children are ignored. As a special case, when a direct child is a Markdown/HTML/JSX list, each item in that list is revealed one after another while preserving the list container. Empty groups currently consume one timeline step.

```mdx
<RevealGroup>
  - First point
  - Second point
  - Third point
</RevealGroup>
```

Each list item becomes its own timeline step.

Nested timeline entries inside a group target are flattened after that target
and before the following group target:

```mdx
<RevealGroup>
  <div>
    Parent item
    <Reveal>Nested detail</Reveal>
  </div>
  <div>Sibling item</div>
</RevealGroup>
```

Timeline:

1. Parent item appears
2. Nested detail appears
3. Sibling item appears

### `<ListStyle>`

Styles Markdown/HTML/JSX lists inside a wrapper. By default, it removes bullets from every list inside it. With the `bullets` prop, it renders custom bullet markers and supports one marker per nesting level. Deeper levels reuse the last configured marker.

```mdx
import { ListStyle } from '@honeydeck/honeydeck'
import { CheckIcon, CircleIcon } from 'lucide-react'

<ListStyle>
  - No marker
  - Still aligned
</ListStyle>

<ListStyle bullets={[<CheckIcon />, <CircleIcon />]}>
  - Level one uses a check icon
    - Level two uses a circle icon
</ListStyle>

<ListStyle bullets={["→", "–", "·"]}>
  - Level one
    - Level two
      - Level three
</ListStyle>
```

Behavior:

- Native list markers are removed for all nested lists in the wrapper.
- `bullets` accepts a single React node/string marker or an array of markers by nesting level.
- `bullets={false}`, `bullets="none"`, `bullets={null}`, or omitting `bullets` renders markerless lists.
- Custom marker injection applies to authored list elements passed as children; native markers remain hidden for any deeper rendered lists because styling is scoped to the wrapper.

### `<Keyboard>`

Displays one keyboard key or a keyboard shortcut using semantic `<kbd>` markup.

```mdx
import { Keyboard } from '@honeydeck/honeydeck'

Press <Keyboard>Esc</Keyboard> to close overview.

Open command palette with <Keyboard keys={["Ctrl", "Shift", "P"]} />.

Advance with <Keyboard keys="Space" />.
```

Props:

- `keys?: ReactNode | ReactNode[]` — key label or ordered shortcut key labels.
- `children?: ReactNode` — single key label when `keys` is omitted.
- `separator?: ReactNode` — separator rendered between array entries; defaults to `+`.
- `className?: string` — applied to the outer wrapper.

Behavior:

- A single `children` value or single `keys` value renders one `<kbd>`.
- An array `keys` value renders one `<kbd>` per item, in order, separated by `separator`.
- The component is inline by default so it works inside prose.
- It uses Honeydeck default styling and can be customized with `className`.
- It does not participate in the Honeydeck timeline.

### `<BrowserFrame>`

Displays an iframe inside a macOS-style browser window frame.

```mdx
import { BrowserFrame } from '@honeydeck/honeydeck'

<BrowserFrame
  src="https://example.com"
  addressBar="example.com"
  fallbackImage="/example-fallback-light.png"
  fallbackDarkImage="/example-fallback-dark.png"
/>
```

Props:

- `src: string` — iframe URL.
- `addressBar?: ReactNode` — optional content shown in the address-bar field. When omitted, no address-bar field is rendered.
- `fallbackImage?: string` — light/default screenshot shown when the iframe cannot be loaded or fallback mode is toggled on.
- `fallbackDarkImage?: string` — dark-mode screenshot shown in dark color mode; falls back to `fallbackImage` when omitted.
- `fallbackAlt?: string` — accessible alt text for fallback images; defaults to `Fallback preview`.
- `defaultFallback?: boolean` — initially render the fallback image instead of the iframe, useful for demos and final-state screenshots.
- `aspectRatio?: CSSProperties["aspectRatio"]` — aspect ratio for the full browser window; defaults to `16 / 9`.
- `className?: string` — applied to the outer wrapper.
- `iframeClassName?: string` — applied to the iframe.
- Standard iframe attributes such as `allow`, `sandbox`, `loading`, and `referrerPolicy` are forwarded.

Behavior:

- Renders a single `<iframe>` with a surrounding browser chrome.
- The frame stretches to the largest size that fits its available parent space while preserving the configured aspect ratio, using CSS sizing (Tailwind utilities and container query units) rather than JavaScript measurement.
- The chrome uses macOS traffic-light controls and an optional address-bar field.
- When a fallback image is configured, iframe load errors switch the frame to fallback mode.
- The fallback uses `fallbackDarkImage` in dark mode and `fallbackImage` otherwise.
- While fallback mode is active, the top browser chrome shows a badge aligned with the address-bar field so presenters can see that the iframe is not live.
- When a fallback image is configured, a fourth round control sits next to the macOS traffic-light controls. It is visible only when the control itself is hovered or keyboard-focused, and it toggles fallback mode on and off.
- Styling uses Honeydeck theme tokens for surface, foreground, border, radius, font, and shadow colors.
- The component does not participate in the Honeydeck timeline.

### `<TimelineSteps>`

Reserves a static block of timeline steps for an imported custom component.
The custom component reads its local state with `useTimelineSteps()`.

```mdx
import { Reveal, TimelineSteps } from '@honeydeck/honeydeck'
import { AccordionDemo } from './AccordionDemo'

<Reveal>Intro appears first</Reveal>

<TimelineSteps steps={3}>
  <AccordionDemo />
</TimelineSteps>

<Reveal>Outro appears after the accordion</Reveal>
```

Inside `AccordionDemo`:

```tsx
import { useTimelineSteps } from '@honeydeck/honeydeck'

export function AccordionDemo() {
  const { phase, stepIndex, stepCount, isPdfFinalRender } = useTimelineSteps()
  // phase: "before" | "active" | "after"
  // stepIndex: 0 before start, 1..stepCount while active, stepCount after end
  // isPdfFinalRender: true only for one-page final-state PDF export
}
```

Behavior:

- `steps` must be a literal positive integer in slide MDX, for example
  `steps={3}`. Dynamic values are not supported because the timeline is counted
  at build time.
- `<TimelineSteps>` must appear at the usage site in slide MDX. Imported TSX
  components cannot register steps by rendering `<TimelineSteps>` internally,
  because their internals are not visible to the MDX compiler.
- Nested Honeydeck timeline producers inside `<TimelineSteps>` are not supported.
  Use the wrapper to reserve the block, then use `useTimelineSteps()` inside
  the custom component.
- Hook state includes `{ phase, stepIndex, stepCount, startAt, endAt, isPdfFinalRender }`.
- In `isPdfFinalRender`, custom step components may render a PDF-specific final
  composition, such as opening all accordion sections. Step-by-step PDF export
  (`pdfSteps: all`) uses the normal timeline states and does not set this flag.

### `<Notes>`

Presenter notes. Hidden from audience view and normal PDF. Notes are collected in presenter mode through runtime context and are not emitted into the audience DOM. Markdown authored inside `<Notes>` renders as formatted speaker notes in presenter mode, including headings, paragraphs, lists, links, inline code, code blocks, and block quotes.

```mdx
<Notes>
  # Demo cue

  - Remember to demo the sparkle button here.
  - Mention PDF export.
</Notes>
```
