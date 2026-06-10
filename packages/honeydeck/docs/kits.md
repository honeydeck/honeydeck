# Customization - Kits

Honeydeck works out of the box with sensible defaults. Customize progressively — override a color, swap a layout, or adopt a full kit from npm.

## Zero Config

A plain deck needs no imports or configuration:

```mdx
# Hello world

This just works with built-in styling.
```

Honeydeck automatically loads base CSS with default design tokens and the built-in layout set.

## Customizing Colors & Typography

Import a CSS file to override design tokens. The cascade does the rest:

```mdx
import './my-theme.css'

# Now with my brand colors
```

```css
/* my-theme.css */
:root {
  --honeydeck-primary: oklch(55% 0.25 280);
  --honeydeck-font-heading: 'Playfair Display', serif;
  --honeydeck-border-radius: 1rem;
}
```

You only override what you want — everything else keeps its default. Both light and dark modes can be targeted:

```css
[data-honeydeck-color-mode="light"] {
  --honeydeck-primary: oklch(50% 0.2 250);
}

[data-honeydeck-color-mode="dark"] {
  --honeydeck-primary: oklch(70% 0.2 250);
}
```

### Available Tokens

| Token | Purpose |
|-------|---------|
| `--honeydeck-primary` | Brand color (per mode) |
| `--honeydeck-background` | Slide background |
| `--honeydeck-foreground` | Main text color |
| `--honeydeck-surface` | Cards, code blocks, callouts |
| `--honeydeck-border` | Border/divider color |
| `--honeydeck-accent` | Accent, computed as complementary by default |
| `--honeydeck-font-heading` | Heading font family |
| `--honeydeck-font-body` | Body font family |
| `--honeydeck-font-mono` | Monospace font family |
| `--honeydeck-font-base` | Base font size (default: 16px) |
| `--honeydeck-font-scale` | Heading scale factor (default: 1.25) |
| `--honeydeck-border-radius` | Default border radius |
| `--honeydeck-code-line-dim-opacity` | Dim for non-highlighted code lines |

→ Full token reference in [Kit Authoring](kit-authoring.md#design-tokens)

### Bundled Themes

Honeydeck defaults to a clean black, white, and grey theme:

```css
@import "tailwindcss";
@import "@honeydeck/honeydeck/theme.css";
```

`@honeydeck/honeydeck/themes/clean.css` is available as an optional clean theme layer when you want to name that layer directly.

Honeydeck also includes a Bee theme that can be layered on top of the base theme:

```css
@import "tailwindcss";
@import "@honeydeck/honeydeck/theme.css";
@import "@honeydeck/honeydeck/themes/bee.css";
```

### Bundled Layout Sets

The default layout set is clean and minimal:

```yaml
---
layouts: "@honeydeck/honeydeck/layouts"
---
```

The same clean set is also available through the named clean kit import path `@honeydeck/honeydeck/layouts/clean`.

Use the Bee layout set with the Bee theme when you want the original playful Bee look:

```yaml
---
layouts: "@honeydeck/honeydeck/layouts/bee"
---
```

For two-column slides, import slots from the matching layout set:

```mdx
// Clean default
import { Left, Right } from '@honeydeck/honeydeck/layouts/TwoCol'
```

```mdx
// Bee layout set
import { Left, Right } from '@honeydeck/honeydeck/layouts/bee/TwoCol'
```

### Using Tailwind

Tokens are mapped to Tailwind utilities, so you can use them inline:

```mdx
<div className="bg-surface text-surface-foreground border border-border rounded-honeydeck">
  Styled with theme tokens
</div>
```

## Using Layouts

in your decks frontmatter, configure which layouts to use:

```yaml
---
layouts: "awsome-kit/layouts"
---
```

Select a layout in slide frontmatter:

```yaml
---
layout: Section
---

# Big Idea
```

If no `layout:` is specified, `Default` is used. Layout names are PascalCase.

### Built-in Layouts

| Layout | Description |
|--------|-------------|
| `Blank` | Empty slide with only children |
| `Default` | Title top-left, body flows below |
| `Section` | Big centered heading for section breaks |
| `Cover` | Opening/closing slide (title, body, author) |
| `TwoCol` | Two equal columns |
| `Image` | Prominent image with optional title and children |
| `ImageLeft` | Prominent left image with title and body on the right |
| `ImageRight` | Prominent right image with title and body on the left |

### Passing Props to Layouts

Layouts receive extra frontmatter fields as props; Cover body copy belongs in the slide content:

```mdx
---
layout: Cover
author: You_Name_Here
---

# Honeydeck

A modern slide framework.
```

### Two-Column Layout

`TwoCol` uses slot components you import:

```mdx
---
layout: TwoCol
---

import { Left, Right } from '@honeydeck/honeydeck/layouts/TwoCol'

<Left>
## Benefits
- Fast iteration
- Live reload
</Left>

<Right>
## Trade-offs
- Requires Node.js
</Right>
```

### Image Layout

Displays a specified image large and prominent:

```yaml
---
layout: Image
image: /diagrams/architecture.png
darkImage: /diagrams/architecture-dark.png
---

# System Architecture

Our distributed system.
```

### Side Image Layouts

`ImageLeft` and `ImageRight` place the image beside the content while using the same `image`, `darkImage`, and `alt` frontmatter as `Image`:

```yaml
---
layout: ImageRight
image: /photos/launch.jpg
darkImage: /photos/launch-dark.jpg
alt: Launch moment
---

# Launch Moment

Supporting context sits beside the image.
```

## Creating Custom Layouts

Custom layouts are React components you import and wrap content with:

```tsx
// components/GradientLayout.tsx
import type { ReactNode } from 'react'

export function GradientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid place-items-center h-full bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-12">
      {children}
    </div>
  )
}
```

Use it in MDX:

```mdx
---

import { GradientLayout } from './components/GradientLayout'

<GradientLayout>
# Special Slide

With a custom gradient background.
</GradientLayout>

---
```

Built-in placeholder images are available as URL exports for custom image layouts:

```ts
import {
  imagePlaceholder,
  imagePlaceholderDark,
  verticalImagePlaceholder,
  verticalImagePlaceholderDark,
} from '@honeydeck/honeydeck/layouts/placeholders'
```

Use `ColorModeImage` when a custom layout accepts separate light and dark image URLs:

```tsx
import { ColorModeImage } from '@honeydeck/honeydeck'

<ColorModeImage src={image} darkSrc={darkImage} alt={alt} />
```

### Creating a Reusable Layout Set

For a set of layouts you want to reuse across slides or decks, create a layout map:

```ts
// layouts/index.ts
import defaultLayouts from '@honeydeck/honeydeck/layouts'
import HeroLayout from './Hero'

export default {
  ...defaultLayouts,
  Hero: HeroLayout,
}
```

Layouts can export a colocated demo for `/#/layouts`:

```tsx
// layouts/Hero.tsx
import type { LayoutDemo, LayoutProps } from '@honeydeck/honeydeck/types'

export default function HeroLayout({ title, children }: LayoutProps) {
  return (/* ... */)
}

export const demo: LayoutDemo = {
  mdx: `---
layout: Hero
---

# Hero Moment

This snippet and preview come from the same demo.`,
}
```

Reference it in deck frontmatter:

```yaml
---
layouts: "./layouts"
---
```

Now you can use `layout: Hero` in any slide. The docs reference lists every layout in the active map, even if no slide currently uses it.

## Using Third-Party Kits

A **kit** is an npm package that bundles theme CSS, layouts, and/or components. You reference each part individually:

```yaml
---
layouts: "@company/honeydeck-kit-brand/layouts"
---
```

```mdx
import '@company/honeydeck-kit-brand/theme.css'
import { Callout } from '@company/honeydeck-kit-brand/components'

# Hello

<Callout>Important!</Callout>
```

### Mix and Match

Since each concern is an explicit reference, mix freely:

```yaml
---
layouts: "@company/honeydeck-kit-brand/layouts"
---
```

```mdx
import '@other/honeydeck-kit-minimal/theme.css'
import { Callout } from '@company/honeydeck-kit-brand/components'
```

Use layouts from one kit, colors from another, components from a third.

### Extending a Kit's Theme

Layer your overrides on top of a kit's CSS:

```css
/* my-overrides.css */
@import '@company/honeydeck-kit-brand/theme.css';

:root {
  --honeydeck-primary: oklch(50% 0.2 300);
  --honeydeck-font-heading: 'My Font', sans-serif;
}
```

```mdx
import './my-overrides.css'
```

→ Building your own kit? See [Kit Authoring](kit-authoring.md)
