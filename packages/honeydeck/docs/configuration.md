# Configuration

All settings live in YAML frontmatter — no separate config file.

## Deck-Level Settings

Defined in the first frontmatter block of the deck entry file (before any slide content):

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `string` | `""` | Deck title (HTML `<title>`, metadata) |
| `description` | `string` | `""` | Deck description (metadata) |
| `aspectRatio` | `"n:n"` | `"16:9"` | Slide canvas aspect ratio |
| `colorMode` | `"system" \| "light" \| "dark"` | `"system"` | Browser color mode |
| `pdfColorMode` | `"light" \| "dark"` | unset | Optional PDF color mode; when unset, falls back to pinned `colorMode`, then `light` |
| `pdfSteps` | `"final" \| "all"` | `"final"` | PDF includes all steps or final state |
| `transition` | `boolean` | `true` | Enable crossfade between slides |
| `layouts` | `string` | `""` (built-in) | Layout map module path |
| `defaultLayout` | `string` | `"Default"` | Layout used when slide has no `layout:` |
| `showSlideNumbers` | `boolean` | `false` | Show the current slide number in the bottom-right corner of slides |

### Aspect Ratio

Slides are fixed-ratio canvases, not scrolling pages. Accepted values are `"number:number"` strings:

```yaml
aspectRatio: "16:9"
aspectRatio: "4:3"
aspectRatio: "1:1"
```

Named presets, CSS syntax, and numeric values are not supported.

### Color Mode

```yaml
colorMode: system   # follow OS preference (default)
colorMode: light    # pin to light
colorMode: dark     # pin to dark
```

When pinned, the viewer cannot switch mode from navigation controls.

### Transitions

A subtle crossfade (~200ms) is applied between slides by default:

```yaml
transition: true    # default
transition: false   # disable
```

## Slide-Level Settings

Per-slide frontmatter (after `---`):

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `layout` | `string` | (uses `defaultLayout`) | Layout to use (PascalCase) |
| ...layout props | varies | — | Additional props the layout accepts |

Example:

```mdx
---
layout: Cover
author: Hendrik
---

# Welcome

A modern slide framework.
```

For the opening slide, `layout:` and its layout-specific fields may also live
in the first frontmatter block alongside deck-level settings.

## Minimal Generated Deck

`honeydeck init` generates frontmatter that keeps the clean defaults explicit and easy to swap:

```yaml
---
title: "My First Deck"
colorMode: system
layouts: "@honeydeck/honeydeck/layouts"
layout: Cover
---
```

Use `layouts: "./layouts"` for custom layouts or `layouts: "@honeydeck/honeydeck/layouts/bee"` for the playful Bee layouts.
