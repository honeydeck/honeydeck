# Honeydeck Fumadocs Site Specification

`@honeydeck/docs` is the private Fumadocs/Next documentation site for Honeydeck and the monorepo's public docs web surface.

## Routes

| Route | Behavior |
|---|---|
| `/` | Documentation-first start page with Fumadocs `HomeLayout`, Honeydeck/Dex visual styling, install CTA, and docs CTA |
| `/docs` | Redirects to `/docs/getting-started` |
| `/docs/:slug` | Fumadocs-rendered documentation page generated from canonical Honeydeck docs |
| `/docs/:slug.md` | Markdown negotiation/sibling route served through Fumadocs LLM markdown routes |
| `/llms.txt` | Fumadocs-generated LLM index |
| `/llms-full.txt` | Fumadocs-generated full docs corpus |
| `/search-index.json` | Static prebuilt Orama search index loaded by the client-side Cmd+K search dialog |

## Canonical docs content

Canonical documentation content lives in `packages/docs/content/docs` as authored MDX. The docs package is the source of truth for public prose docs and interactive docs-only examples.

Authored docs content must include:

- one MDX file per docs page
- frontmatter title, description, and slug
- Fumadocs `meta.json` files that define curated sidebar groups, item order, and group labels

Docs content is tracked source and may use docs-package MDX components such as interactive playgrounds. Do not hand-author public docs pages in the published `@honeydeck/honeydeck` package.

When a docs page explains behavior owned by `packages/honeydeck`, update the owning Honeydeck colocated `SPEC.md` first, then update the docs page. Specs remain the closest source for observable implementation behavior; `packages/docs/content/docs` owns reader-facing guides, examples, and playgrounds.

The docs package must provide `npm run export:package-docs` to export the authored docs into package-local Markdown files under `packages/honeydeck/docs` for the published Honeydeck package. The export must be generated from `packages/docs/content/docs`, preserve the curated `meta.json` order, write one Markdown file per docs page plus `index.json`, and be safe against path traversal. Generated package docs are build artifacts and must not be manually edited.

## Search

Cmd+K search must be frontend-only. The build/dev preparation phase must generate `public/search-index.json` from authored Fumadocs content using `npm run search:index`. The search dialog must asynchronously fetch that static index in the browser and show loading feedback while it is being downloaded and hydrated. The docs site must not use a server-side search API route.

## Fumadocs layout

Documentation pages must use Fumadocs UI as much as practical:

- `DocsLayout` owns the overall docs shell and left sidebar.
- `DocsPage` owns the article frame and right-side table of contents.
- Fumadocs `RootProvider` owns theme state through `next-themes`, defaults to `system`, and reacts to system color-scheme changes while system mode is selected.
- The Fumadocs theme-switch slot is replaced with Honeydeck's single color-mode cycle button, cycling `system` → `light` → `dark` → `system` instead of rendering separate light/dark controls.
- Fumadocs MDX components render prose, callouts, cards, code, and tables.
- The docs start page uses Fumadocs `HomeLayout` so it gets the shared lightweight home navbar instead of the heavier docs shell.
- Component docs may render package-local interactive playground components for Honeydeck primitives such as `Keyboard`, `ListStyle`, `BrowserFrame`, and `Notes`.
- Search uses a custom Fumadocs search dialog backed by a static Orama index.
- Markdown copy uses the Fumadocs copy page control.
- The docs page Open popover is a package-local page control that only links to the page source on GitHub and the generated Markdown view; it must not include third-party AI provider shortcuts.

Wide docs pages must show the Fumadocs sidebar on the left and the in-page table of contents on the right. Narrow layouts may collapse navigation according to Fumadocs defaults.

## Visual design

The start page should use the warm Honeydeck docs mood:

- bee/Dex visual treatment using local static assets
- primary command CTA: `npx @honeydeck/honeydeck init`
- docs CTA to `/docs/getting-started`
- package/GitHub links
- Honeydeck base and bee tokens where useful, layered with Fumadocs CSS variables

## Out of scope

- Analytics.
- Custom MDX renderer outside Fumadocs unless needed for compatibility.
