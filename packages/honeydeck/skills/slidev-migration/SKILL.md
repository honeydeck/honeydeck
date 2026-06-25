---
name: slidev-migration
description: Migrate presentations from Slidev (sli.dev) to Honeydeck. Use when the user has a Slidev project, slides.md, Slidev Markdown, Vue components/layouts, v-click/v-clicks, Slidev themes/addons, or asks to move from sli.dev/Slidev to Honeydeck.
---

# Slidev to Honeydeck Migration

You help users move Slidev presentations to Honeydeck. Slidev is the framework at `sli.dev`; it uses Markdown plus Vue conventions. Honeydeck uses MDX plus React, Vite, Tailwind v4, explicit imports, and Honeydeck layouts/components.

Start by reading all Honeydeck related skills available. Alternatively you can check in the honeydeck node_modules folder and read the docs/skills there.

## Source of truth

Before changing files, read the available project docs and package specs:

- `Readme.md`, public docs content under `packages/docs/content/docs` when in the monorepo, root `SPEC.md`, linked colocated `SPEC.md` files, and the Slides guide for Honeydeck deck structure
- The Configuration guide for Honeydeck frontmatter
- The Steps and reveals guide for Reveal/RevealGroup/code steps
- The Customization guide for layouts, themes, components, layout maps, and design tokens
- Existing Slidev files: `slides.md`, `pages/**/*.md`, `components/**/*.vue`, `layouts/**/*.vue`, `styles/**`, `public/**`, `package.json`, `vite.config.*`, and local theme/addon packages

If Honeydeck docs are not nearby, package specs may be in `node_modules/@honeydeck/honeydeck`, or the user can use the public docs site. A migrated deck's runtime reference pages cover active theme tokens, layouts, and built-in components.

## Migration goal

Create a working Honeydeck presentation that preserves the talk's structure, content, assets, notes, and important reveals. Favor a clear first working migration over a perfect one-to-one port of every Slidev feature.

## First pass workflow

1. Inspect the repository.
   - Detect Slidev by `slides.md`, `slidev` scripts, `@slidev/cli`, `theme:` frontmatter, `components/*.vue`, or `layouts/*.vue`.
   - Detect Honeydeck by `deck.mdx`, `honeydeck` dependency/scripts, and `styles.css` importing Honeydeck CSS.
2. Confirm source and target.
   - Default source: `slides.md`.
   - Default Honeydeck target: current repository if it is already a Honeydeck project; otherwise ask whether to migrate in-place or into a new sibling directory.
3. Initialize Honeydeck if needed.
   - For a new empty/sibling target, run `npx @honeydeck/honeydeck init --name <target-name>` unless the user asked to avoid commands.
   - For an existing Slidev repo migrated in-place, create or merge the Honeydeck starter files manually: `deck.mdx`, `styles.css`, `package.json` scripts/dependencies, `public/`, and `components/`. Do not delete the Slidev source until the user approves.
   - If using a temporary starter (`.honeydeck-migration-starter`), copy only the generated starter patterns you need, then remove the temp directory after asking or when it is clearly safe.
4. Convert Slidev Markdown to Honeydeck MDX.
5. Port or stub components/layouts/theme code.
6. Run validation: `npm install` if needed, then `npm run dev` or at least `npm run build`/`npx honeydeck build` when feasible.
7. Report what was migrated, what was approximated, and what still needs manual React/visual polish.

## File mapping

| Slidev | Honeydeck |
| --- | --- |
| `slides.md` | `deck.mdx` |
| `pages/*.md` with `src:` includes | imported `.mdx` slide groups, rendered as `<ImportedSlides />` |
| `public/**` | `public/**` copied unchanged; root-relative `/assets/...` paths usually keep working |
| `components/*.vue` | `components/*.tsx` React components |
| `layouts/*.vue` | React layouts plus a layout map selected with deck frontmatter `layouts: "./layouts"` |
| Slidev theme package | Honeydeck theme CSS, layout map, or local React layouts + CSS |
| `styles/style.css` or `styles/index.*` | `styles.css` imported from `deck.mdx` |
| `slidev`, `slidev build`, `slidev export` scripts | `honeydeck dev`, `honeydeck build`, `honeydeck pdf` scripts |

## Syntax conversion checklist

### Deck/head frontmatter

- Keep useful shared metadata: `title`, `description`, `author`, `info` content if relevant.
- Remove or comment Slidev-only keys unless you map them: `theme`, `addons`, `highlighter`, `lineNumbers`, `drawings`, `download`, `record`, `monaco`, `routerMode`, `selectable`, etc.
- Add Honeydeck settings when useful: `defaultLayout`, `layouts`, `colorMode`, `pdfSteps`, `showSlideNumbers`.
- If the first Slidev headmatter also configures the first slide layout/background, preserve slide-specific values in the first slide's frontmatter where Honeydeck supports them.

### Slide separators and frontmatter

- Both frameworks use `---` slide separators. Preserve exact standalone separators.
- Convert Slidev layout names to Honeydeck names where possible.

### Notes

Slidev uses trailing HTML comments as presenter notes. Honeydeck uses `<Notes>`:

```mdx
import { Notes } from '@honeydeck/honeydeck'

<Notes>
This is a presenter note.
</Notes>
```

Move only trailing note comments into `<Notes>`. Keep non-note comments as comments or remove if they are implementation noise.

### Clicks and reveals

- `<v-click>...</v-click>` -> `<Reveal>...</Reveal>`
- `<v-clicks>...</v-clicks>` -> `<RevealGroup>...</RevealGroup>`
- `v-click` directives on HTML elements -> wrap the element with `<Reveal>`
- Slidev click positioning (`at`, `v-after`, `.hide`, `v-switch`, `$clicks`) may need custom React state, `TimelineSteps`, or simplified sequential reveals. Do not pretend these are exact if they are not.
- Add imports as needed:

```mdx
import { Reveal, RevealGroup, TimelineSteps, Notes, BrowserFrame } from '@honeydeck/honeydeck'
```

### Code blocks

- Keep normal fenced code blocks.
- Convert common Slidev stepped highlights like `{1|2|3}` to Honeydeck-supported code step metadata when possible. If unsure, preserve the fence and leave a TODO comment near the block.
- Convert Slidev Magic Move code blocks (`md magic-move`) to Honeydeck's canonical Magic Code syntax (`md magic-code`). Preserve inner fenced code blocks and their line-highlight metadata. Honeydeck accepts `md magic-move` as a compatibility alias, but migrated decks should use `md magic-code`.
- Slidev Monaco/live-code features need manual React components or simplified static code.

### Vue to React conversion

- Convert `.vue` single-file components to `.tsx` only when they are actually used.
- Use React props and children instead of Vue props/slots.
- Use Tailwind v4 utilities or CSS variables instead of Slidev/UnoCSS-specific shortcuts where practical.
- Use `lucide-react` suffixed `...Icon` imports for icons; do not use inline SVG helpers or unsuffixed lucide aliases.
- If conversion is large, create a simple placeholder React component first and list it in the migration report.

### Layouts and themes

- Prefer built-in Honeydeck layouts for the first migration.
- If the Slidev deck depends heavily on a custom theme, create local Honeydeck layouts and a layout map instead of trying to emulate Slidev internals.
- Put global theme imports in `styles.css`, and import `./styles.css` at the top of `deck.mdx`.
- Avoid leaking broad CSS into runtime UI. Scope deck-specific CSS to slide content/classes where possible.

## Package migration

For migrated projects, package scripts should look like:

```json
{
  "scripts": {
    "dev": "honeydeck dev",
    "build": "honeydeck build",
    "pdf": "honeydeck pdf"
  }
}
```

Keep unrelated project scripts. Remove Slidev dependencies only after the Honeydeck migration builds or after asking the user.

## Quality bar

A good migration result:

- Starts with `npm run dev`.
- Has `deck.mdx` with valid MDX and explicit imports.
- Preserves slide order and visible text.
- Preserves assets and root-relative asset paths.
- Converts basic notes and reveals.
- Clearly marks advanced Slidev features that need manual React/Honeydeck follow-up.

## Final response

Summarize:

- Files created/changed.
- Commands run and whether they passed.
- Slidev features migrated exactly vs approximated.
- Manual follow-ups, especially Vue component/layout/theme ports.
