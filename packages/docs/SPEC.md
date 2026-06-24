# Honeydeck Fumadocs Site Specification

`@honeydeck/docs` is the private Fumadocs/Next documentation site for Honeydeck and the monorepo's public docs web surface.

## Routes

| Route | Behavior |
|---|---|
| `/` | Documentation-first start page with Honeydeck/Dex visual styling, install CTA, and docs CTA |
| `/docs` | Redirects to `/docs/getting-started` |
| `/docs/:slug` | Fumadocs-rendered documentation page generated from canonical Honeydeck docs |
| `/docs/:slug.md` | Markdown negotiation/sibling route served through Fumadocs LLM markdown routes |
| `/llms.txt` | Fumadocs-generated LLM index |
| `/llms-full.txt` | Fumadocs-generated full docs corpus |
| `/search-index.json` | Static prebuilt Orama search index loaded by the client-side Cmd+K search dialog |

## Canonical docs sync

Canonical documentation content remains in `packages/honeydeck/docs`. The docs site uses `docs-sidebar.json` to define the curated sidebar groups, item order, slugs, titles, and source files.

Before dev, typecheck, and build, `npm run docs:sync` must generate Fumadocs content into `content/docs` from the canonical sources. Generated Fumadocs content must include:

- one MDX file per sidebar item using the configured slug
- frontmatter title, description, slug, and `copiedFrom`
- a `meta.json` file whose `pages` array uses Fumadocs separators for the configured groups

Generated content is build output and must not be manually edited.

Docs sync must reject absolute or traversal sidebar sources, unsafe slugs, duplicate slugs/sources, and any resolved read/write path that escapes `packages/honeydeck` or the docs package output directories.

Local Markdown links to sidebar-managed docs sources must be rewritten to `/docs/:slug` routes in generated content. Source docs keep package-relative Markdown links.

## Search

Cmd+K search must be frontend-only. The build/dev preparation phase must generate `public/search-index.json` from the generated Fumadocs content using `npm run search:index`. The search dialog must asynchronously fetch that static index in the browser and show loading feedback while it is being downloaded and hydrated. The docs site must not use a server-side search API route.

## Fumadocs layout

Documentation pages must use Fumadocs UI as much as practical:

- `DocsLayout` owns the overall docs shell and left sidebar.
- `DocsPage` owns the article frame and right-side table of contents.
- Fumadocs MDX components render prose, callouts, cards, code, and tables.
- Component docs may render package-local interactive playground components for Honeydeck primitives such as `Keyboard`, `ListStyle`, `BrowserFrame`, and `Notes`.
- Search uses a custom Fumadocs search dialog backed by a static Orama index.
- Markdown copy/view actions use Fumadocs page controls.

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
