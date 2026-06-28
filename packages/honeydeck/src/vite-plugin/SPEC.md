# Honeydeck Deck Loading Specification

> Observable behavior for deck entry files, slide splitting, imports, assets, Markdown features, and frontmatter.

## Slide Authoring

### Entry Point

The CLI deck entry point defaults to `deck.mdx` in the current working directory. Users may pass `--deck <file.mdx>` to `honeydeck dev`, `honeydeck build`, or `honeydeck pdf` to use any `.mdx` file as the deck entry point.

Honeydeck starts relative to the selected deck file: the file's directory becomes the project root for local CSS, component, layout, and asset resolution, and that file is treated as the root document that defines deck-level settings and the top-level slide order.

### Slide Separation

Slides are separated by a line that is exactly `---`. CRLF line endings are treated the same as LF when detecting separators and frontmatter markers. A `---` line inside a fenced code block is literal code text and must not create a slide boundary. Empty blocks between separators are ignored:

```mdx
---
title: My Deck
---

# First Slide

Content here.

---

# Second Slide

More content.
```

### Multiple MDX Files

Additional MDX files can be imported explicitly as slide groups:

```mdx
import DemoSlides from './slides/demo.mdx'

# Intro

---

<DemoSlides />

---

# Conclusion
```

Rules:

- Default imports from relative `.mdx` files are slide-structural imports
- Rendering an imported MDX component as a standalone usage (`<DemoSlides />`) expands that file's slides at that exact location in the parent deck
- Imported `.mdx` files may contain multiple slides separated by `---`; those separators become Honeydeck slide boundaries in the parent timeline
- Frontmatter in imported `.mdx` files is slide-level only and cannot define deck-level settings
- Components imported from `.tsx`/`.ts`/`.jsx`/`.js` or packages are normal inline components
- Single-line imports at the top of the first content block are extracted as shared imports and prepended to generated slide modules

### Assets

Static files live in the project `public/` directory and are served from the web root:

```mdx
<img src="/cover.jpg" />
```

React components and built-in layouts may also import image assets through Vite (`webp`, `png`, `jpg`, `jpeg`, `svg`, `gif`). The built-in `Image` layout uses this for its bundled placeholder image.

### Timeline-aware MDX Components

Honeydeck's MDX compilation assigns slide-local timeline steps to built-in timeline components. The Honeydeck app shell and deck-authored imports must load runtime code through the same package source graph, so context-backed timeline components such as `<Reveal>` and `<TimelineSteps>` read the active slide timeline instead of a duplicate default runtime context. Internal Honeydeck source files must use relative imports for shared runtime state such as `TimelineContext`; they must not self-import the public `@honeydeck/honeydeck` entry to obtain that state.

Rules:

- `<Reveal>` adds one step to the slide timeline and receives an internal `at` prop during compilation.
- `<Reveal name="...">` exposes that reveal step as a same-slide target for `<RevealWith target="...">`.
- Reveal names must be literal non-empty strings. Dynamic `name` expressions are unsupported.
- Duplicate reveal names within one slide are compile errors. The same name may be reused on different slides.
- `<RevealWith>` does not add a step. It requires exactly one literal prop: `target="name"` or `at={n}`.
- `<RevealWith target="name">` may reference a named `<Reveal>` before or after it on the same slide. Missing targets are compile errors.
- `<RevealWith at={n}>` targets an existing 1-based step on the same slide. Non-literal, non-positive, and out-of-range values are compile errors.
- In development, invalid timeline component usage is surfaced with clear terminal and browser diagnostics without permanently killing the dev server. Production builds fail.

### Markdown Features

Slide MDX supports GitHub-flavored Markdown pipe tables. Pipe tables render as real HTML tables in slides. The base theme styles slide tables with compact, full-width, token-based horizontal rules, bold headers, and light horizontal cell spacing so table Markdown is presentation-ready without custom CSS.

Slide Markdown lists render with visible markers in the base theme: unordered lists show bullet markers and ordered lists show decimal markers, even when Tailwind preflight resets browser list styles.

Honeydeck does not include Mermaid as a built-in Markdown feature. Fenced `mermaid` blocks are treated like normal code blocks unless the deck imports and renders its own user-space component.

---

---

## Frontmatter

All settings use **camelCase**. No separate config file exists. Frontmatter parsing is a limited flat YAML subset: `key: value` pairs with strings, booleans, numbers, and quoted strings. Nested objects, arrays, and multiline YAML are not supported.

### Deck-Level (deck entry file, first block only)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `string` | `""` | Deck title stored in deck config |
| `description` | `string` | `""` | Deck description stored in deck config |
| `aspectRatio` | `"n:n"` | `"16:9"` | Slide canvas aspect ratio |
| `colorMode` | `"system" \| "light" \| "dark"` | `"system"` | Browser color mode |
| `pdfColorMode` | `"light" \| "dark"` | unset | Optional explicit PDF color mode; when unset, PDF falls back to pinned deck `colorMode`, then `light` |
| `pdfSteps` | `"final" \| "all"` | `"final"` | Whether PDF includes all steps or final state |
| `transition` | `string \| boolean` | `fade` | Default named slide transition (`fade`, `none`, `slide-left`, `magic`, or a custom CSS name); legacy `true` maps to `fade` and `false` maps to `none` |
| `transitionDuration` | `number` | `200` | Default slide transition duration in milliseconds |
| `transitionEasing` | `string` | `ease` | Default slide transition timing function |
| `magicCodeDuration` | `number` | `800` | Default Magic Code animation duration in milliseconds |
| `layouts` | `string` | built-in `@honeydeck/honeydeck/layouts` | Layout map module path |
| `defaultLayout` | `string` | `"Default"` | Layout used when slide has no `layout:` |
| `showSlideNumbers` | `boolean` | `false` | Show the current slide number in the bottom-right corner of slides |

### Slide-Level (per-slide, after `---`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `layout` | `string` | (uses `defaultLayout`) | Layout map key to use (PascalCase by convention, not validated) |
| `transition` | `string \| boolean` | deck default | Named transition into this slide; legacy booleans map to `fade`/`none` |
| `transitionDuration` | `number` | deck default | Transition duration into this slide in milliseconds |
| `transitionEasing` | `string` | deck default | Transition easing into this slide |
| ...layout-specific props | varies | — | Any additional props the layout accepts |

### Root frontmatter semantics

The first frontmatter block in the deck entry file is parsed as deck config. Deck-level keys are not copied into slide frontmatter. If that block also contains `layout:` plus layout-specific keys, those non-deck keys are emitted as first-slide frontmatter.

Slide-level frontmatter is a frontmatter-only block after a slide separator and applies to the following slide. Imported MDX files are normal MDX modules and cannot set deck-level properties. `magicCodeDuration` is deck-level only; the same key in slide-level frontmatter is treated as a normal layout prop and does not configure Magic Code.

Invalid `aspectRatio`, `colorMode`, and `pdfSteps` values fall back to defaults. Invalid `pdfColorMode` is ignored as unset, allowing the pinned `colorMode` fallback. `showSlideNumbers` is enabled only by literal `true`; slide transition values normalize at runtime, with non-empty strings treated as named built-ins or custom CSS hooks. `transition: magic` uses only runtime `data-magic-id` matching and does not add build-time DOM diffing. Invalid explicit Magic Code block `duration` values are compile errors; invalid deck-level `magicCodeDuration` falls back to the default Magic Code duration.

During development, changes to deck-level frontmatter invalidate the virtual config and every compiled virtual slide module, because slide compilation can depend on deck settings such as `magicCodeDuration`. Layout-related virtual modules are invalidated as before so layout map and demo previews stay current.
