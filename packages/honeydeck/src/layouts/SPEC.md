# Honeydeck Layouts and Customization Specification

> Observable behavior for theme CSS, layout maps, built-in layouts, layout props, and layout demos.

## Customization — Theme CSS, Layout Maps, Components

Honeydeck customization is explicit composition. Themes are CSS imports, layouts come from a default-exported layout map, and components are normal React/MDX imports:

| Concern | What it is | How it's used |
|---------|-----------|---------------|
| Theme | CSS file with tokens, colors, and typography | explicit CSS import from MDX or another CSS file |
| Layouts | layout component map | `layouts:` in frontmatter |
| Components | reusable React components | explicit `import` in MDX |

These references may point to local project files or normal installed packages. Honeydeck does not provide special publishing or registry behavior.

### Zero Config

A plain `deck.mdx` file with no frontmatter still works with built-in layouts:

```mdx
# Hello world

This renders with the built-in default layout.
```

Styling is provided only by explicit CSS imports. Honeydeck does not auto-inject Tailwind, `@honeydeck/honeydeck/theme.css`, or custom theme CSS. The starter project imports `./styles.css` from `deck.mdx`; `styles.css` imports Tailwind and `@honeydeck/honeydeck/theme.css`. Without that import, slides still render with built-in layouts, but mostly with browser/default styling. User imports override via cascade.

### Theme Layering

Honeydeck ships optional theme layers that are imported after the base theme. Theme layers are token overrides and are not standalone replacements for the base theme:

```css
@import "tailwindcss";
@import "@honeydeck/honeydeck/theme.css";
@import "@honeydeck/honeydeck/themes/clean.css";
```

Honeydeck includes:

| Theme import | Purpose |
|--------------|---------|
| `@honeydeck/honeydeck/theme.css` | Preferred base theme import; clean black/white/grey defaults |
| `@honeydeck/honeydeck/themes/base.css` | Package export alias for the base theme |
| `@honeydeck/honeydeck/themes/clean.css` | Optional clean visual style layer |
| `@honeydeck/honeydeck/themes/bee.css` | Bee theme layer for the original playful palette |

Use `@honeydeck/honeydeck/layouts` for clean default layouts. Use `@honeydeck/honeydeck/layouts/bee` together with `@honeydeck/honeydeck/themes/bee.css` for the Bee visual style.

### CSS Overrides

Use standard CSS cascade and `@import` to layer overrides:

```css
@import "tailwindcss";
@import "@honeydeck/honeydeck/theme.css";

:root {
  --honeydeck-primary: oklch(55% 0.25 145);
}
```

### Layout Maps

Create a layout map in the project and reference it relative to the deck entry file:

```yaml
---
layouts: "./layouts"
---
```

Layout maps may compose entries with JavaScript spread:

```ts
// layouts/index.ts
import defaultLayouts from '@honeydeck/honeydeck/layouts'
import { MyCustomCover } from './Cover'

export default {
  ...defaultLayouts,
  Cover: MyCustomCover,
} satisfies LayoutMap
```

### Progressive Customization

```txt
Level 0: plain `deck.mdx`    → built-in layouts, browser/default styling
Level 1: import CSS          → Tailwind, base styling, and token overrides
Level 2: import components   → reusable React pieces in MDX
Level 3: set layouts:        → custom layout map
```

---

## Layouts

### Default Layouts

Honeydeck provides eight clean default layouts. Honeydeck also ships `@honeydeck/honeydeck/layouts/clean` as a named clean kit import path and `@honeydeck/honeydeck/layouts/bee` for the playful Bee layouts:

| Layout | Purpose |
|--------|---------|
| `Blank` | Empty slide just rendering children |
| `Default` | Title top-left, body flows below in a padded content frame |
| `Section` | Display-sized centered heading for section breaks |
| `Cover` | Opening/closing slide (title, body, author/date) |
| `TwoCol` | Default title area plus two equal body columns |
| `Image` | Default title area plus image stage and optional caption |
| `ImageLeft` | Left image pane, title and body content on the right |
| `ImageRight` | Right image pane, title and body content on the left |

### Layout Selection

Via frontmatter (PascalCase by convention — Honeydeck treats the value as a string key in the layout map):

```mdx
---
layout: Cover
author: Hendrik
---

# Welcome to Honeydeck

A modern slide framework.
```

If no `layout:` is specified, the deck's `defaultLayout` is used (`"Default"` unless overridden). In dev, unknown layouts warn in the browser console and fall back to the configured default, then `Default`, then the first available layout. In production/PDF, unknown layouts throw.

### Layout Props

Layouts receive parsed content:

```ts
type LayoutProps<F extends Record<string, unknown> = Record<string, unknown>> = {
  title: ReactNode | null      // currently plain text from the first h1, or null
  children: ReactNode          // remaining content (first h1 removed; later h1s remain)
  rawChildren: ReactNode       // currently same compiled content as children
  frontmatter: F               // slide frontmatter fields
}
```

The first `h1` is extracted as plain text and provided as `title`. This enables layouts to position titles independently from body content. Titles stay in the same position at all times — revealed body content must not shift the title.

Built-in layouts share a `SlideFrame` wrapper that provides full-canvas sizing, `--honeydeck-slide-padding`, `bg-background`, `text-foreground`, `font-body`, and overflow clipping. `Blank` renders an empty `SlideFrame` without title and display children. `Default` owns the common headline/body structure. `TwoCol` and `Image` compose with `Default`; `ImageLeft` and `ImageRight` use a shared side-image helper with matching title styling.

### Layout-Specific Typed Frontmatter

Layouts type their accepted frontmatter via the generic parameter:

```tsx
type CoverFrontmatter = {
  author?: string
  date?: string
}

export default function CoverLayout({ title, children, frontmatter }: LayoutProps<CoverFrontmatter>) {
  const { author, date } = frontmatter
  return (/* ... */)
}
```

This enables editor tooling to extract props and provide autocomplete.

### Layout Demos

Layouts optionally export a `demo` for the docs reference page:

```tsx
export const demo: LayoutDemo<CoverFrontmatter> = {
  mdx: `---
layout: Cover
author: Hendrik
---

# Welcome to My Talk

Building the future of presentations.`,
}
```

`mdx` is required on `LayoutDemo` and is the single source for both the live visual preview and the copyable snippet shown in the layouts docs tab. Honeydeck compiles this MDX with the same slide MDX compiler family, extracts frontmatter/title/steps from it, and renders the resulting slide through the active layout map. Honeydeck statically crawls analyzable active layout maps at build time and discovers colocated `demo` exports from layout modules. Dynamic maps, computed entries, non-static imports, and demos whose `mdx` value is not a static string may be skipped with warnings. If no static MDX demo is discovered, the layout still appears in the reference pages with a "No demo MDX provided" hint.

### TwoCol Slot Components

The `TwoCol` layout composes with `Default` for the shared title area, then renders its body as a Tailwind-styled two-column grid (`grid h-full grid-cols-2 gap-12`). It exports `<Left>` and `<Right>` slot components. These are thin wrappers that render `<div data-honeydeck-slot="left|right">` with Tailwind column utilities (`col-start-1` / `col-start-2`) and `overflow-hidden`.

This works because MDX components return fragments: the slot divs become direct DOM children of the grid container without any intermediate wrapper. No JavaScript slot-detection logic is needed.

```mdx
---
layout: TwoCol
---

import { Left, Right } from '@honeydeck/honeydeck/layouts/TwoCol'

<Left>
## Pros
- Fast
- Simple
</Left>

<Right>
## Cons
- Limited
</Right>
```

Implementation uses Tailwind utility classes:

```tsx
<div className="grid h-full grid-cols-2 gap-12">
  {children}
</div>

export function Left({ children }) {
  return <div data-honeydeck-slot="left" className="col-start-1 overflow-hidden">{children}</div>
}

export function Right({ children }) {
  return <div data-honeydeck-slot="right" className="col-start-2 overflow-hidden">{children}</div>
}
```

### Image Layout

The `Image` layout composes with `Default` for the shared title area, then renders a large centered image stage in the remaining space.

Frontmatter:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `image` | `string` | none | Image URL/path (`/foo.png` for `public/foo.png`, relative import output, or external URL) |
| `darkImage` | `string` | falls back to `image` | Optional image URL/path used when Honeydeck's effective color mode is dark |
| `alt` | `string` | `""` | Alt text forwarded to the `<img>` |

Behavior:

- The image is wrapped in a surface-colored frame with shadow and border ring.
- The frame clings to the intrinsic image size (`object-contain`) instead of filling the full stage.
- If `darkImage` is provided, Honeydeck renders both variants and uses Tailwind utility classes keyed by Honeydeck's effective color mode to display the dark variant in dark mode, including pinned dark mode, system dark mode, and PDF `--mode dark`.
- MDX body content after the title becomes a `<figcaption>` below the image with an accent left border.
- If `image` is omitted, Honeydeck shows a bundled placeholder image plus a hint to add `image: /path/to/image.png`; the placeholder also uses its bundled dark variant in dark mode.

```yaml
---
layout: Image
image: /diagrams/architecture.png
darkImage: /diagrams/architecture-dark.png
alt: High-level architecture diagram
---

# System Architecture

Our distributed system in production.
```

### Side Image Layouts

`ImageLeft` and `ImageRight` place an image beside the slide content. They use the same `image`, `darkImage`, and `alt` frontmatter as `Image`.

Frontmatter:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `image` | `string` | none | Image URL/path (`/foo.png` for `public/foo.png`, relative import output, or external URL) |
| `darkImage` | `string` | falls back to `image` | Optional image URL/path used when Honeydeck's effective color mode is dark |
| `alt` | `string` | `""` | Alt text forwarded to the `<img>` |

Behavior:
- `ImageLeft` renders the image on the left and title/body content on the right.
- `ImageRight` renders title/body content on the left and the image on the right.
- The image pane fills half of the slide and uses `object-cover`.
- If `darkImage` is provided, Honeydeck renders both variants and uses Tailwind utility classes keyed by Honeydeck's effective color mode to display the dark variant in dark mode, including pinned dark mode, system dark mode, and PDF `--mode dark`.
- If `image` is omitted, Honeydeck shows a bundled vertical placeholder image; the placeholder also uses its bundled dark variant in dark mode.

```yaml
---
layout: ImageLeft
image: /photos/product.jpg
darkImage: /photos/product-dark.jpg
alt: Product detail
---

# Product Detail

Supporting copy beside the image.
```

### Custom Layouts (Project-Local)

Project-local custom layouts are usually exposed through a layout map and selected with `layouts: "./layouts"` plus per-slide `layout:`. You can also use ad-hoc React components via explicit import and wrapping:

```mdx
---

import { CustomLayout } from './components/CustomLayout'

<CustomLayout>
# Special Slide

With custom styling.
</CustomLayout>

---
```

### Layout Resolution

```txt
layouts: not specified     → built-in default layout map
layouts: "@pkg/layouts"    → layout map from npm package
layouts: "./layouts"       → local layout map default export, relative to entry MDX
```

Within a layout map, per-slide:

```txt
layout: "Cover"    → layoutMap["Cover"]
layout: not set    → layoutMap[defaultLayout]
```
