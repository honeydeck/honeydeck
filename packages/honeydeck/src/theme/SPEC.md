# Honeydeck Theme Specification

> Observable behavior for design tokens, theme CSS, Tailwind mapping, and color modes.

## Design Token System

Honeydeck defines a CSS custom property contract. In the base theme, colors derive from a primary color using `oklch` relative color syntax. Light and dark modes each have their own primary. Theme layers may override any token directly.

### Color Tokens (per mode)

```css
/* Source color — brand identity for this mode */
--honeydeck-primary

/* Text color on primary backgrounds */
--honeydeck-primary-foreground

/* Main slide background (derived from primary) */
--honeydeck-background

/* Main text color (derived from primary) */
--honeydeck-foreground

/* Secondary surfaces — cards, code blocks, callouts */
--honeydeck-surface

/* Text color on surface backgrounds */
--honeydeck-surface-foreground

/* Border/divider color */
--honeydeck-border

/* Accent — computed as the complementary hue by default */
--honeydeck-accent

/* Text on accent backgrounds */
--honeydeck-accent-foreground

/* Link color */
--honeydeck-link-color                /* default: inherit */

/* Border radius for cards, code blocks, buttons */
--honeydeck-border-radius
```

### Typography Tokens

Typography tokens are **shared across color modes** (not redefined per light/dark).

The base font size seeds `rem` for the entire slide canvas (`font-size` on `:root`). All other sizes are expressed in `rem` so they scale proportionally.

```css
/* Font families */
--honeydeck-font-heading
--honeydeck-font-body
--honeydeck-font-mono

/* Base font size — sets :root font-size, everything scales relative to this */
--honeydeck-font-size-base            /* default: 36px */

/* Scale factor for heading progression (e.g. 1.25 = major third) */
--honeydeck-font-scale                /* default: 1.25 */

/* Body / paragraph text */
--honeydeck-font-size-body            /* 1rem (= base) */

/* Computed heading sizes (1rem × scale^n), individually overridable */
--honeydeck-font-size-display         /* 1rem × scale⁵ */
--honeydeck-font-size-h1              /* 1rem × scale⁴ */
--honeydeck-font-size-h2              /* 1rem × scale³ */
--honeydeck-font-size-h3              /* 1rem × scale² */
--honeydeck-font-size-h4              /* 1rem × scale¹ */
--honeydeck-font-size-small           /* 1rem ÷ scale */

/* Code blocks */
--honeydeck-font-size-code            /* 0.83rem */
```

### Layout Token

```css
/* Internal padding between slide edge and layout content */
--honeydeck-slide-padding             /* default: 2rem */
```

Built-in layouts apply this via the shared `SlideFrame` wrapper. This is content padding inside the slide canvas, not a viewport inset.

### Code Token

```css
/* Opacity for non-highlighted lines during step-through (0–1) */
--honeydeck-code-line-dim-opacity     /* default: 0.4 */
```

> **Note:** Code block syntax highlighting colors come from Honeydeck's built-in syntax themes, not from Honeydeck tokens. Honeydeck does not expose custom syntax theme configuration. Only the dim-opacity token is part of the Honeydeck token contract; plain fallback code blocks use Honeydeck CSS tokens.

### Light/Dark Mode

Each mode defines its own `--honeydeck-primary`. All other color tokens derive from it:

```css
[data-honeydeck-color-mode="light"] {
  --honeydeck-primary: oklch(50% 0.2 250);
  --honeydeck-primary-foreground: oklch(from var(--honeydeck-primary) 98% 0.01 h);
  --honeydeck-background: oklch(from var(--honeydeck-primary) 98% 0.01 h);
  --honeydeck-foreground: oklch(from var(--honeydeck-primary) 15% 0.02 h);
  --honeydeck-surface: oklch(from var(--honeydeck-primary) 94% 0.02 h);
  --honeydeck-surface-foreground: oklch(from var(--honeydeck-primary) 20% 0.02 h);
  --honeydeck-border: oklch(from var(--honeydeck-primary) 85% 0.03 h);
  --honeydeck-accent: oklch(from var(--honeydeck-primary) l c calc(h + 180));
  --honeydeck-accent-foreground: oklch(from var(--honeydeck-accent) 15% 0.01 h);
  --honeydeck-link-color: inherit;
  --honeydeck-border-radius: 0.5rem;
}

[data-honeydeck-color-mode="dark"] {
  --honeydeck-primary: oklch(70% 0.2 250);
  --honeydeck-primary-foreground: oklch(from var(--honeydeck-primary) 10% 0.01 h);
  --honeydeck-background: oklch(from var(--honeydeck-primary) 12% 0.02 h);
  --honeydeck-foreground: oklch(from var(--honeydeck-primary) 95% 0.01 h);
  --honeydeck-surface: oklch(from var(--honeydeck-primary) 20% 0.03 h);
  --honeydeck-surface-foreground: oklch(from var(--honeydeck-primary) 90% 0.02 h);
  --honeydeck-border: oklch(from var(--honeydeck-primary) 30% 0.03 h);
  --honeydeck-accent: oklch(from var(--honeydeck-primary) l c calc(h + 180));
  --honeydeck-accent-foreground: oklch(from var(--honeydeck-accent) 95% 0.01 h);
  --honeydeck-link-color: inherit;
  --honeydeck-border-radius: 0.5rem;
}
```

Any derived token can be explicitly overridden.

### Tailwind Mapping

Honeydeck uses Tailwind v4 `@theme` in `base.css` to map tokens to utilities:

```css
@theme {
  --color-primary: var(--honeydeck-primary);
  --color-primary-foreground: var(--honeydeck-primary-foreground);
  --color-background: var(--honeydeck-background);
  --color-foreground: var(--honeydeck-foreground);
  --color-surface: var(--honeydeck-surface);
  --color-surface-foreground: var(--honeydeck-surface-foreground);
  --color-border: var(--honeydeck-border);
  --color-accent: var(--honeydeck-accent);
  --color-accent-foreground: var(--honeydeck-accent-foreground);
  --color-link: var(--honeydeck-link-color);

  --radius-honeydeck: var(--honeydeck-border-radius);
  --font-heading: var(--honeydeck-font-heading);
  --font-body: var(--honeydeck-font-body);
  --font-mono: var(--honeydeck-font-mono);
}
```

`base.css` also defines runtime fallback colors (`bg-error-surface`, `bg-void`, etc.) plus pixel-based spacing/text-size scales so runtime UI is not affected by the slide root font size.

Base theme CSS owns global and generated-content styling that cannot be attached at a React call site: slide Markdown typography, documentation Markdown typography, Shiki-generated code descendants, and generated plain-code fallback markup. Honeydeck-owned React component wrappers use Tailwind utilities for their own layout and visual styling while preserving stable `honeydeck-*` class hooks where runtime code, PDF export, tests, or generated descendant styling need to find them.

The base CSS also applies `--honeydeck-link-color` to slide anchors and underlines links. `cursor: pointer` is reserved for real links only: anchors with `href` (`a[href]`) in slide/doc content and runtime route links. Buttons and other non-link controls must not set `cursor: pointer`; they keep the default cursor. Theme CSS is exported as `@honeydeck/honeydeck/theme.css`, `@honeydeck/honeydeck/themes/base.css`, `@honeydeck/honeydeck/themes/clean.css`, and `@honeydeck/honeydeck/themes/bee.css`.

Usage in MDX:

```mdx
<div className="bg-surface text-surface-foreground border border-border rounded-honeydeck">
  Card content
</div>
```

### Color Mode Behavior

- Browser defaults to system preference
- User can toggle via navigation controls (system / light / dark)
- `colorMode:` frontmatter can pin the deck to one mode
- PDF ignores system preference; if no PDF override or pinned deck mode exists, it uses light
- PDF color mode resolves as CLI `--mode` > `pdfColorMode` > pinned `colorMode` (`light`/`dark`) > `light`
- Renderer applies: `data-honeydeck-color-mode="light"` or `data-honeydeck-color-mode="dark"`
- Base theme CSS sets browser `color-scheme` to match the effective Honeydeck color mode so built-in browser defaults and embedded rendered assets stay visually consistent in static builds and PDF export
