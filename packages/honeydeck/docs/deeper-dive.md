# Diving deeper

Use this guide after the quick start when you want to understand the main Honeydeck workflows without jumping straight into every reference page.

## CLI commands

### `honeydeck dev`

Starts the Vite development server.

```bash
honeydeck dev                 # default port 4200
honeydeck dev --port 8080     # custom port
honeydeck dev --open          # auto-open browser
honeydeck dev --deck talk.mdx # custom deck entry file
```

Typical output:

```text
  Honeydeck v0.1.0

  Local:   http://localhost:4200/
  Network: http://192.168.1.42:4200/
  Theme:   http://localhost:4200/#/theme

  Watching for changes...
```

### `honeydeck build`

Builds a deployable static SPA to `dist/`.

```bash
honeydeck build
honeydeck build --deck talk.mdx
```

### `honeydeck pdf`

Exports slides to PDF via headless Chromium.

```bash
honeydeck pdf
honeydeck pdf -o my-talk.pdf
honeydeck pdf --steps all
honeydeck pdf --mode dark
honeydeck pdf --deck talk.mdx
```

### `honeydeck init` and `honeydeck skill`

Creates a new Honeydeck project and optionally installs agent skills.

```bash
honeydeck init
honeydeck init --name my-talk
honeydeck init --skip-skill
honeydeck skill
```

## Slide authoring

The first `---` block is deck-level frontmatter. Later `---` lines separate slides.

```mdx
---
title: My Talk
author: Hendrik
---

# First Slide

Content here.

---

# Second Slide

More content.
```

Specify a layout per slide in frontmatter:

```mdx
---
layout: Cover
author: Your Name
---

# Welcome to My Talk

A modern slide framework.
```

Available layouts: `Blank`, `Default`, `Cover`, `Section`, `TwoCol`, `Image`, `ImageLeft`, and `ImageRight`.

For more detail, see [Slides](slides.md).

## Frontmatter

Deck-level settings live in the first frontmatter block of the deck entry file.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `string` | `""` | Deck title |
| `description` | `string` | `""` | Deck description |
| `aspectRatio` | `"16:9"` | `"16:9"` | Slide canvas ratio |
| `colorMode` | `"system" \| "light" \| "dark"` | `"system"` | Color mode |
| `pdfColorMode` | `"light" \| "dark"` | unset | Optional PDF color mode; falls back to pinned `colorMode`, then `light` |
| `pdfSteps` | `"final" \| "all"` | `"final"` | PDF step handling |
| `transition` | `boolean` | `true` | Crossfade between slides |
| `layouts` | `string` | `""` (built-in) | Custom layout map path |
| `defaultLayout` | `string` | `"Default"` | Fallback layout |
| `showSlideNumbers` | `boolean` | `false` | Show slide numbers |

Slide-level frontmatter chooses the slide layout and passes layout-specific props.

| Property | Type | Description |
|----------|------|-------------|
| `layout` | `string` | Layout name in PascalCase |
| layout props | varies | Layout-specific fields |

For the full reference, see [Configuration](configuration.md).

## Core components

Core runtime components are explicit imports from `honeydeck`.

```mdx
import { Reveal, RevealWith, RevealGroup, TimelineSteps, BrowserFrame, Notes } from '@honeydeck/honeydeck'
```

### Reveal steps

`<Reveal>` reveals content at the next timeline step. Hidden content keeps its layout space so the slide does not jump.

```mdx
<Reveal name="first">Appears at step 1</Reveal>
<Reveal>Appears at step 2</Reveal>
```

`<RevealWith>` syncs extra content to an existing step without adding a step:

```mdx
<RevealWith target="first">Appears with step 1</RevealWith>
<RevealWith at={2}>Appears with step 2</RevealWith>
```

`<RevealGroup>` wraps each direct child in a reveal step. Markdown and HTML lists are special: each top-level list item reveals one after another. Use `listRevealMode="nested"` to reveal nested list items depth-first.

```mdx
<RevealGroup>
  - First point
  - Second point
  - Third point
</RevealGroup>
```

`<TimelineSteps>` reserves steps for a custom component, such as an accordion or tab walkthrough. Inside that component, `useTimelineSteps()` returns local step state and `isPdfFinalRender`, which is true only when PDF export captures one final-state page per slide.

See [Steps and reveals](steps-and-reveals.md) for examples.

### Browser frames

`<BrowserFrame>` shows a live iframe inside a macOS-style browser window frame.

```mdx
<BrowserFrame
  src="https://example.com"
  addressBar="example.com"
  fallbackImage="/example-fallback-light.png"
  fallbackDarkImage="/example-fallback-dark.png"
/>
```

Standard iframe attributes such as `allow`, `sandbox`, `loading`, and `referrerPolicy` are forwarded. See [Components](components.md) for props.

### Speaker notes

`<Notes>` content is hidden from the audience view and PDF export, then shown in presenter mode.

```mdx
<Notes>
  # Demo cue

  - Demo the confetti button.
  - Mention the PDF export path.
</Notes>
```

Markdown inside `<Notes>` renders as formatted speaker notes.

## Code and diagrams

Honeydeck uses Shiki for build-time syntax highlighting. Add step metadata to a code block with `{...}`:

````mdx
```ts {2|4|all}
const a = 1
const b = 2
console.log(a)
console.log(b)
```
````

- `{2}` highlights line 2 immediately and adds no timeline steps.
- `{2-3}` highlights lines 2-3 immediately and adds no timeline steps.
- `{2-3|5|all}` starts with lines 2-3 active, then steps to line 5, then all lines.
- Highlight groups after the first interleave with `<Reveal>` in document order.

Magic Code animates between multiple code states. It builds on Shiki Magic Code / Shiki Magic Move while keeping Honeydeck's build-time highlighting and timeline behavior:

`````mdx
````md magic-code {duration:500}
```ts
const count = 1
```

```ts
const count = 2
```
````
`````

Each inner code fence is a state. Inner code fence line metadata still works, so Honeydeck advances through a state's highlight groups before morphing to the next code state. Content inside a Magic Code block that is not a fenced code block is ignored. `md magic-move` is accepted as a Slidev compatibility alias, but Honeydeck docs and examples use `md magic-code`.

## Navigation, presenting, and PDF

Keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| `->` / `d` | Next step, wrapping to the next slide |
| `<-` / `a` | Previous step, wrapping to the previous slide |
| `down` / `s` | Next slide |
| `up` / `w` | Previous slide |
| `o` | Toggle overview mode |
| `p` | Open presenter mode |
| `f` | Toggle fullscreen |
| `Escape` | Exit overview or fullscreen |

URL state preserves slide and step position:

```text
/#/1/0           slide 1, step 0
/#/2/3           slide 2, step 3
/#/presenter/2/1 presenter view
/#/theme         theme tokens tab
/#/layouts       layouts tab
/#/components    components tab
```

On touch devices, swipe left/right for next/previous step and swipe up/down for next/previous slide. The navigation bar is always visible on touch devices.

Presenter mode opens with `p` and includes:

- current slide and next slide preview
- speaker notes from `<Notes>`
- slide/step counter and wall clock
- an "Open audience view" button
- audience sync through `BroadcastChannel`

See [Navigation](navigation.md), [Mobile and touch](mobile.md), [Presenter mode](presenter-mode.md), and [PDF export](pdf-export.md).

## Theme system

Honeydeck uses CSS custom properties with relative `oklch` color derivations. All colors derive from `--honeydeck-primary`.

`@honeydeck/honeydeck/theme.css` is the clean black/white/grey default. Override tokens in your CSS:

```css
@import "tailwindcss";
@import "@honeydeck/honeydeck/theme.css";

[data-honeydeck-color-mode="light"] {
  --honeydeck-primary: oklch(55% 0.25 145);
}

[data-honeydeck-color-mode="dark"] {
  --honeydeck-primary: oklch(70% 0.2 145);
}
```

Use the bundled Bee theme by layering it after the base theme:

```css
@import "tailwindcss";
@import "@honeydeck/honeydeck/theme.css";
@import "@honeydeck/honeydeck/themes/bee.css";
```

Pair it with the Bee layout set:

```yaml
---
layouts: "@honeydeck/honeydeck/layouts/bee"
---
```

All tokens are mapped to Tailwind utilities:

```mdx
<div className="bg-surface text-surface-foreground border border-border rounded-honeydeck">
  Card content
</div>
```

Available color utilities: `primary`, `primary-foreground`, `accent`, `accent-foreground`, `background`, `foreground`, `surface`, `surface-foreground`, and `border`.

See [Customization](customization.md) for theme and layout customization.

## Customization

Customize Honeydeck with explicit CSS imports, React component imports, and layout maps.

```mdx
---
layouts: "./layouts"
---

import './styles.css'
import { Callout } from './components/Callout'

# Slide with custom pieces

<Callout>Important!</Callout>
```

Zero config still works: built-in defaults apply without imports. See [Customization](customization.md).

## Runtime reference

Navigate to the runtime reference pages during development to see:

- `/#/theme` for theme tokens with descriptions and live computed values
- `/#/layouts` for layout previews with copyable usage snippets
- `/#/components` for built-in component docs

Package Markdown guides live on the Honeydeck docs site and in the package `docs/` directory.

## Architecture overview

| Concern | Approach |
|---------|----------|
| Slide splitting | Text-level pre-split to virtual modules and independent MDX compilation |
| HMR | Per-slide invalidation for changed virtual modules |
| Timeline | Build-time `at={n}` numbering plus React context |
| DOM strategy | All slides rendered; off-screen slides use `content-visibility: hidden` |
| Router | Custom hash router with the URL as the single source of truth |
| Layouts | Runtime dynamic import of the layout map |
| Tailwind | v4 CSS-first; Honeydeck adds the Vite plugin internally |
| Shiki | Dual-theme CSS variables with build-time highlighting |
| Presenter sync | `BroadcastChannel`, unidirectional, no server needed |
| Scaling | `transform: scale()` from the configured aspect ratio |
| Build | `tsc` only, ESM, no bundler |
| Testing | `node:test` plus fixture files |

## Types and exports

```ts
import { Reveal, RevealWith, RevealGroup, Notes } from '@honeydeck/honeydeck'
import type { LayoutProps, LayoutMap, LayoutDemo } from '@honeydeck/honeydeck/types'

import defaultLayouts from '@honeydeck/honeydeck/layouts'
import beeLayouts from '@honeydeck/honeydeck/layouts/bee'

import { Left, Right } from '@honeydeck/honeydeck/layouts/TwoCol'
import { Left as BeeLeft, Right as BeeRight } from '@honeydeck/honeydeck/layouts/bee/TwoCol'

import '@honeydeck/honeydeck/theme.css'
import '@honeydeck/honeydeck/themes/bee.css'
```

`LayoutProps<F>` describes the props passed to layout components:

```ts
type LayoutProps<F = Record<string, unknown>> = {
  title: ReactNode | null
  children: ReactNode
  rawChildren: ReactNode
  frontmatter: F
}
```

## Agent skills

Honeydeck ships optional agent skills for Honeydeck authoring, presentation writing, and Slidev migration. `honeydeck init` can open the same interactive skills installer as `honeydeck skill`.

```bash
honeydeck skill
```

See [Skills](skills.md) for installation options and bundled skill details.
Coming from Slidev? See the [Slidev migration guide](slidev-migration.md).
