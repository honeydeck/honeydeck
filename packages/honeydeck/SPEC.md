# Honeydeck — Application Specification

> MDX and React-based presentation framework. Start with plain Markdown, grow to interactive React components.

This root spec is the overview and navigation device. Detailed observable behavior lives in colocated `SPEC.md` files near the implementation that owns it.

---

## Overview

Honeydeck is the public CLI-first TypeScript package inside the Honeydeck monorepo. It builds slide presentations from MDX files and targets developers who want Markdown simplicity with React power when needed.

The Honeydeck specification is distributed:

- `SPEC.md` gives package overview, principles, public model, and links.
- Colocated `SPEC.md` files define detailed observable behavior for each implementation area.
- `DEVELOPMENT.md` covers implementation workflow, local development, architecture, testing, and release mechanics.

### Guiding Principles

- **Ease of use** — quick to write slides
- **Fun to use** — not boilerplate-heavy, playful DX
- **No magic** — explicit imports, no user-content auto-discovery
- **Progressive complexity** — `deck.mdx` works with built-in layouts; built-in styling requires an explicit CSS import (scaffolded by `honeydeck init`)
- **Tooling-ready architecture** — explicit metadata supports editor tooling without impacting runtime

### Public Technical Model

| Concern | Public contract | Detailed spec |
|---------|-----------------|---------------|
| Runtime | Node.js CLI binary from the scoped `@honeydeck/honeydeck` package | [`src/cli/SPEC.md`](src/cli/SPEC.md) |
| Build setup | Honeydeck-managed dev/build setup; no user `vite.config.ts` required | [`src/runtime/SPEC.md`](src/runtime/SPEC.md), [`src/vite-plugin/SPEC.md`](src/vite-plugin/SPEC.md) |
| Styling | Explicit CSS imports, Tailwind-compatible utilities, and CSS custom properties | [`src/theme/SPEC.md`](src/theme/SPEC.md) |
| Markdown | MDX with GitHub-flavored Markdown tables; canonical docs use `docs/*.md` | [`src/vite-plugin/SPEC.md`](src/vite-plugin/SPEC.md), [`src/remark/SPEC.md`](src/remark/SPEC.md) |
| PDF | Rasterized slide pages matching browser rendering | [`src/cli/SPEC.md`](src/cli/SPEC.md) |
| Syntax highlighting | Built-in code highlighting, runtime step dimming, and Magic Code transitions | [`src/remark/SPEC.md`](src/remark/SPEC.md) |
| Icons | `lucide-react` suffixed `...Icon` component imports | [`src/SPEC.md`](src/SPEC.md) |
| Public imports | Explicit import subpaths for components, layouts, themes, and types | [`src/SPEC.md`](src/SPEC.md) |

### Dependency Policy

- `react`, `react-dom`, and Tailwind are peer dependencies of `honeydeck`.
- Honeydeck wires the Tailwind Vite plugin internally, but Tailwind/theme CSS is only loaded when user-authored CSS imports it; generated projects install `tailwindcss` and import `./styles.css` from `deck.mdx`.
- Generated projects use compatible semver ranges for React, Tailwind, TypeScript, and types.
- Custom themes, layouts, and components are plain CSS/TypeScript modules; installed-package usage is handled by standard package metadata rather than by a Honeydeck-specific mechanism.
- Icons come from `lucide-react` and must use suffixed `...Icon` component exports (for example `ChevronLeftIcon`), not inline SVG path helpers, emoji glyphs, or unsuffixed aliases.

---

## Spec Map

| Area | Spec | Owns |
|------|------|------|
| CLI | [`src/cli/SPEC.md`](src/cli/SPEC.md) | `honeydeck`, `init`, `skill`, `dev`, `build`, `pdf`, CLI output, PDF export |
| Starter templates | [`src/cli/templates/SPEC.md`](src/cli/templates/SPEC.md) | generated project tree, starter `deck.mdx`, `styles.css`, demo component |
| Agent skills | [`skills/SPEC.md`](skills/SPEC.md) | bundled installable skills and installer expectations |
| Deck loading / frontmatter | [`src/vite-plugin/SPEC.md`](src/vite-plugin/SPEC.md) | deck entry, slide separators, MDX imports, assets, Markdown features, frontmatter |
| Remark transforms | [`src/remark/SPEC.md`](src/remark/SPEC.md) | timeline annotation, code highlighting, step-through code metadata, and Magic Code syntax |
| Runtime | [`src/runtime/SPEC.md`](src/runtime/SPEC.md) | timeline semantics, keyboard/touch navigation, SPA/build behavior, runtime errors |
| Runtime components | [`src/runtime/components/SPEC.md`](src/runtime/components/SPEC.md) | `Reveal`, `RevealWith`, `RevealGroup`, `TimelineSteps`, `ListStyle`, `Keyboard`, `BrowserFrame`, `Notes` |
| Runtime views | [`src/runtime/views/SPEC.md`](src/runtime/views/SPEC.md) | presenter mode, overview mode, theme/layout/component reference pages |
| Layouts and customization | [`src/layouts/SPEC.md`](src/layouts/SPEC.md) | custom theme/layout/component model, built-in layouts, layout props, demos, layout resolution |
| Theme | [`src/theme/SPEC.md`](src/theme/SPEC.md) | design tokens, base theme CSS, Tailwind mapping, color mode behavior |
| Public exports | [`src/SPEC.md`](src/SPEC.md) | import paths and public TypeScript types |
| Public release governance | Repository root `.github/SPEC.md` | protected branch, CI checks, PR title contract, publishing automation; repository-only, not shipped in the npm package |

---

## Reading Rules

- Treat every colocated `SPEC.md` as part of the application specification.
- If specs disagree, the more specific colocated spec owns behavior for its area; update both the owner spec and this map if ownership changes.
- Behavior changes must update the owning spec before implementation changes.
- Implementation-only details belong in `DEVELOPMENT.md`, not in behavior specs.

---

## Summary

Honeydeck prioritizes:

1. **Zero to presenting** — a plain `deck.mdx` works with built-in layouts, even before CSS is imported.
2. **Progressive power** — add explicit CSS imports, React components, and custom layout maps as needed.
3. **Explicit composition** — see imports and configuration; no user-content auto-discovery and no automatic theme CSS injection.
4. **Presentation-native** — timeline, steps, presenter mode, runtime reference pages, and PDF export built in.
5. **Fun** — starter sparkle button, tasteful CLI output, playful defaults.

Architecture keeps editor tooling (language server, schema generation) possible without impacting runtime.
