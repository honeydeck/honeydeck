---
name: honeydeck
description: Help users create, edit, debug, and export Honeydeck MDX presentations. Use for Honeydeck syntax, deck.mdx structure, layouts, frontmatter, steps/reveals, presenter notes, code blocks, custom React components, themes, CLI commands, dev preview, build, or PDF export.
---

# Honeydeck

You help the user work with Honeydeck presentations. Honeydeck decks are MDX files powered by React, Vite, Tailwind v4, and Honeydeck layouts/components.

## Source of truth

Before giving Honeydeck-specific syntax or changing a deck, prefer repository docs and package specs when available.

Docs discovery order:

1. Monorepo checkout docs: `packages/docs/content/docs/**/*.mdx`, `packages/docs/SPEC.md`, `packages/honeydeck/Readme.md`, `packages/honeydeck/SPEC.md`, and linked colocated `SPEC.md` files.
2. Current project dependency docs: `node_modules/@honeydeck/honeydeck/Readme.md`, `node_modules/@honeydeck/honeydeck/SPEC.md`, and linked colocated `SPEC.md` files.
3. Fresh app or package-root docs: `Readme.md`, `SPEC.md`, and linked colocated `SPEC.md` files.
4. Public docs URL when local docs are unavailable: `/docs` on the Honeydeck docs site.

Important docs:

- `Readme.md` for the compact package overview and documentation index
- `packages/docs/content/docs/(start)/getting-started.mdx` for quick start and first-run orientation
- `packages/docs/content/docs/(start)/deeper-dive.mdx` for CLI details, feature overview, architecture, exports, and agent skills
- root/package `SPEC.md` and linked colocated `SPEC.md` files for expected behavior
- `packages/docs/content/docs/(core)/slides.mdx` for deck structure, slide separators, and multi-file decks
- `packages/docs/content/docs/(core)/steps-and-reveals.mdx` for step-by-step reveals, code steps, and Magic Code
- `packages/docs/content/docs/(core)/customization.mdx` for themes, layouts, custom React components, layout maps, demos, and design tokens
- `packages/docs/content/docs/(core)/configuration.mdx` for frontmatter options
- `packages/docs/content/docs/(core)/navigation.mdx`, `packages/docs/content/docs/(core)/mobile.mdx`, `packages/docs/content/docs/(core)/presenter-mode.mdx`, and `packages/docs/content/docs/(core)/pdf-export.mdx` for presenting/exporting

If the user is inside a generated Honeydeck project and monorepo docs are not nearby, tell them they can use the public docs site for prose docs and run `npx honeydeck dev` to open runtime reference pages for active theme tokens, layouts, and built-in components.

## Honeydeck basics to remember

- The conventional entrypoint is `deck.mdx`.
- The first `---` block is deck-level frontmatter.
- Slides are separated by a line that is exactly `---`.
- A slide can start with frontmatter to choose a layout, title, notes, or other options. Frontmatter is closed with another `---` block, and then content follows.
- If frontmatter is invalid or incomplete, notify the user and provide correct syntax.
- Frontmatter may provide additional properties for the selected layout. Check layout source or docs for available properties.
- Built-in layouts include `Blank`, `Cover`, `Default`, `Section`, `TwoCol`, `Image`, `ImageLeft`, and `ImageRight`.
- Built-in styling is explicit: generated decks import `./styles.css`, and that file imports Honeydeck/Tailwind theme CSS.
- MDX can mix Markdown, JSX, imported React components, Honeydeck components, code blocks, and Magic Code blocks.
- Presenter notes belong in slide frontmatter when useful for narrative, timing, and delivery cues.
- Use reveals/steps for progressive disclosure, not for every bullet by default.
- PDF export is available with `npx honeydeck pdf`; use `--steps all` when revealed states matter.
- Use sections to group related slides and provide visual breaks.

## How to help

1. Read existing deck imports, frontmatter, separators, and local style before editing.
2. Preserve valid MDX and Honeydeck separators exactly.
3. Prefer Honeydeck layouts and components over custom CSS when they fit.
4. Keep examples small unless the user asks for a full deck.
5. Explain Honeydeck-specific syntax briefly.
6. Recommend `npx honeydeck dev` for preview and `npx honeydeck pdf` for export.
7. If unsure about exact syntax, read the docs first instead of guessing.

## Output style

- When generating Honeydeck slides, output valid MDX that can be pasted into `deck.mdx`.
- Include necessary imports and frontmatter.
- Keep non-Honeydeck presentation advice brief unless the user also wants slide-writing guidance.
