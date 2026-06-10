# Kit Authoring

Guide for building reusable Honeydeck kits (themes, layouts, components).

## Type Exports

All types for kit authors come from the `'honeydeck'` package:

```ts
import type { LayoutProps, LayoutMap, LayoutDemo } from '@honeydeck/honeydeck'
```

| Type | Purpose |
|------|---------|
| `LayoutProps<F>` | Props passed to layout components (generic for frontmatter) |
| `LayoutMap` | `Record<string, ComponentType<LayoutProps<any>>>` |
| `LayoutDemo<F>` | Demo data for the docs reference page |

## Layout Map

The `layouts:` frontmatter resolves to a module that default-exports a `LayoutMap`:

```ts
import type { LayoutMap } from '@honeydeck/honeydeck'
import { BlankLayout } from './Blank'
import { DefaultLayout } from './Default'
import { CoverLayout } from './Cover'
import { SectionLayout } from './Section'
import { TwoColLayout } from './TwoCol'
import { ImageLayout } from './Image'
import { ImageLeftLayout } from './ImageLeft'
import { ImageRightLayout } from './ImageRight'

export default {
  Blank: BlankLayout,
  Default: DefaultLayout,
  Cover: CoverLayout,
  Section: SectionLayout,
  TwoCol: TwoColLayout,
  Image: ImageLayout,
  ImageLeft: ImageLeftLayout,
  ImageRight: ImageRightLayout,
} satisfies LayoutMap
```

## Layout Props

`LayoutProps` is generic so layouts can type their accepted frontmatter:

```ts
type LayoutProps<F extends Record<string, unknown> = Record<string, unknown>> = {
  title: ReactNode | null       // extracted first h1 content
  children: ReactNode           // remaining content (h1 removed)
  rawChildren: ReactNode        // full unmodified content (h1 included)
  frontmatter: F
}
```

Example typed layout:

```tsx
import type { LayoutProps } from '@honeydeck/honeydeck'

type CoverFrontmatter = {
  author?: string
  date?: string
}

export function CoverLayout({ title, children, frontmatter }: LayoutProps<CoverFrontmatter>) {
  const { author, date } = frontmatter
  return (/* ... */)
}
```

This enables a future language server to extract frontmatter types for autocomplete.

## Image Helpers

Custom layouts can import `ColorModeImage` from `honeydeck` to render optional light/dark image variants with Honeydeck's Tailwind color-mode utilities:

```tsx
import { ColorModeImage } from '@honeydeck/honeydeck'

<ColorModeImage src={image} darkSrc={darkImage} alt={alt} />
```

## Layout Demos

Layouts optionally export a `demo` constant for the docs reference page:

```tsx
import type { LayoutProps, LayoutDemo } from '@honeydeck/honeydeck'

type CoverFrontmatter = {
  /** Speaker or organization shown below the title. */
  author?: string
}

export function CoverLayout({ title, children, frontmatter }: LayoutProps<CoverFrontmatter>) {
	const { author } = frontmatter
	return (/* ... */)
}

export const demo: LayoutDemo<CoverFrontmatter> = {
  mdx: `---
layout: Cover
author: Hendrik
---

# Welcome to My Talk

Building the future of presentations.`,
}
```

`mdx` is the single source for both the live visual preview and the copyable usage snippet. Honeydeck compiles it with the slide MDX pipeline, extracts frontmatter/title/steps, and renders it through the active layout map.

If no static `demo.mdx` is exported, the layout still appears in `/#/layouts` with a “No demo MDX provided” hint.

## Slot Components

Layouts that need content slots (like `TwoCol`) export slot components alongside the layout:

```tsx
// layouts/TwoCol.tsx
import type { LayoutProps } from '@honeydeck/honeydeck'
import type { ReactNode } from 'react'

export function Left({ children }: { children: ReactNode }) { /* ... */ }
export function Right({ children }: { children: ReactNode }) { /* ... */ }

export default function TwoColLayout({ title, children }: LayoutProps) {
  return (/* ... */)
}
```

Users import slots from the layout path:

```mdx
import { Left, Right } from '@honeydeck/honeydeck/layouts/TwoCol'
import { Left, Right } from '@company/honeydeck-kit-brand/layouts/TwoCol'
```

## Runtime Reference

Honeydeck includes built-in runtime reference pages in dev and production builds:

- **Theme tab (`/#/theme`):** All `--honeydeck-*` CSS tokens with computed values and descriptions.
- **Layouts tab (`/#/layouts`):** All layouts currently available in the active deck layout map, live visual previews rendered from `demo.mdx`, copyable usage snippets from the same MDX source, and prop docs extracted from `LayoutProps<Frontmatter>` field comments.
- **Components tab (`/#/components`):** Public built-in components exported from `@honeydeck/honeydeck/components`, generated documentation from exported component JSDoc comments interpreted as Markdown/MDX, side navigation, and params tables extracted from exported props types.

Package Markdown guides are published through the Honeydeck docs site rather than rendered as in-deck pages.

Token descriptions are extracted from CSS comments preceding `--honeydeck-*` declarations at build time.

## Dependency Policy

- `honeydeck` and kits declare `react` and `react-dom` as `peerDependencies`.
- Kits may declare compatible `honeydeck` versions via `peerDependencies`.
- Kits using Tailwind declare compatible Tailwind versions as peer dependencies.
- Generated slide projects install concrete dependency versions.

## Design Tokens

Themes provide CSS custom properties. Colors derive from a primary using `oklch` relative color syntax, with separate values for light and dark modes:

```css
[data-honeydeck-color-mode="light"] {
  --honeydeck-primary: oklch(50% 0.2 250);
  --honeydeck-background: oklch(from var(--honeydeck-primary) 98% 0.01 h);
  --honeydeck-foreground: oklch(from var(--honeydeck-primary) 15% 0.02 h);
  --honeydeck-surface: oklch(from var(--honeydeck-primary) 94% 0.02 h);
  /* ... */
}
```

Full token list:

| Token | Purpose |
|-------|---------|
| `--honeydeck-primary` | Brand color for this mode |
| `--honeydeck-primary-foreground` | Text on primary backgrounds |
| `--honeydeck-background` | Main slide background |
| `--honeydeck-foreground` | Main text color |
| `--honeydeck-surface` | Cards, code blocks, callouts |
| `--honeydeck-surface-foreground` | Text on surfaces |
| `--honeydeck-border` | Border/divider color |
| `--honeydeck-accent` | Accent, computed as complementary by default |
| `--honeydeck-accent-foreground` | Text on accent backgrounds |
| `--honeydeck-link-color` | Link color (default: inherit) |
| `--honeydeck-border-radius` | Default border radius |
| `--honeydeck-font-heading` | Heading font family |
| `--honeydeck-font-body` | Body font family |
| `--honeydeck-font-mono` | Monospace font family |
| `--honeydeck-font-base` | Base font size (default: 16px) |
| `--honeydeck-font-scale` | Heading scale factor (default: 1.25) |
| `--honeydeck-code-line-dim-opacity` | Dim opacity for non-highlighted code lines |

## Tailwind Mapping

All tokens are mapped to Tailwind utilities:

```mdx
<div className="bg-surface text-surface-foreground border border-border rounded-honeydeck">
  Card content
</div>
```
