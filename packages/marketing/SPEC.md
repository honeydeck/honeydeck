# Honeydeck Marketing Site Specification

`@honeydeck/marketing` is the private package that builds the public Honeydeck marketing and documentation site.

## Routes

| Route | Behavior |
|---|---|
| `/` | Short landing page focused on developer activation and `npx @honeydeck/honeydeck init` |
| `/for/product` | SEO audience landing page for product owners/managers using AI to draft slide narratives; not linked from desktop top-level navigation, the compact docs menu, or the primary landing page |
| `/docs` | Generated docs experience starting directly with concise Getting started content |
| `/docs/:slug` | Generated public docs page |
| `/docs/:slug.md` | Clean Markdown sibling file served from `public/docs` |
| `/llms.txt` | Short AI/LLM discovery document |
| `/llms-full.txt` | Fuller generated docs corpus for AI tools |

Client-side navigation between marketing pages must reset the document scroll position to the top of the new page instead of preserving the previous page scroll position. Hash-only navigation may keep normal browser anchor behavior.

## Landing page

The primary landing page must stay short and prioritize:

- hero promise: "Build beautiful slide decks with MDX and React."
- AI-friendly subtitle explaining that plain-text MDX is easy for humans and AI agents to edit
- primary command CTA: `npx @honeydeck/honeydeck init`
- docs CTA
- one outbound showcase deck CTA linking to `https://showcase.honeydeck.dev/`
- Dex/bee visual treatment that feels playful rather than sterile enterprise docs
- viewport-height fit on screens where the landing content can fit with the header and footer
- no audience-page cards or `/for/*` promotion on the primary landing page

## Docs generation

Canonical docs live in `packages/honeydeck`:

- `Readme.md` as the package README
- `docs/getting-started.md` as the concise first-run Getting started page
- selected `docs/*.md`
- package specs and package docs referenced by those pages

The marketing package must generate copies before dev/build via `npm -w @honeydeck/marketing run docs:sync`:

- `src/content/docs/generated/*.md` for React/MDX docs rendering from pure Markdown
- `src/content/docs/generated/index.json` for curated navigation metadata
- `public/docs/*.md` for clean Markdown sibling routes and copy actions
- `public/llms.txt` and `public/llms-full.txt`
- `public/robots.txt` and `public/sitemap.xml`

During marketing dev, the Vite dev server must watch the curated docs sidebar plus every canonical `packages/honeydeck` Markdown source listed in that sidebar. When any watched docs source changes, dev must rerun docs sync, update the generated Markdown/public outputs, refresh the watched source list if needed, and trigger a browser reload so editing canonical docs such as `packages/honeydeck/docs/getting-started.md` is reflected without restarting dev.

Generated Markdown copies must include a `copiedFrom` frontmatter field pointing at the canonical source path. They must not include HTML comments about auto-generation and must not carry `generated: true`. Generated files must not be manually edited.

Docs navigation is manual/curated through `docs-sidebar.json` rather than derived from the filesystem or Markdown frontmatter weights. The generated Markdown copies must not carry sidebar ordering metadata; sidebar grouping and ordering belongs to the explicit sidebar config and generated index metadata. The first docs group starts with concise Getting started content and then a follow-up guide for broader CLI, authoring, theme, architecture, and exports. Advanced docs must include a dedicated Skills page for bundled agent skills. Theme, layout, and component customization belongs on a single Customization docs page rather than split kits/kit-authoring pages.

When generated docs are copied, local Markdown cross-links that target sources present in `docs-sidebar.json` must be rewritten to the generated `/docs/:slug` route. Source docs keep package-relative Markdown links; generated marketing docs should route readers through the web docs experience.

Docs sync must reject absolute or traversal sidebar sources, unsafe slugs, and any resolved read/write path that escapes `packages/honeydeck` or the generated/public docs output directories. Docs sync tests must cover the curated Getting started source, generated route metadata, sibling Markdown output, local link rewriting from `docs/getting-started.md` to other sidebar docs, and invalid sidebar source/slug rejection.

Rendered docs pages must use the same Shiki light/dark syntax highlighting as Honeydeck slides for fenced code blocks. Code blocks show an always-visible ghost-style icon-only copy button that copies the original fenced source text.

Rendered docs article links must always be visibly underlined and use the link pointer cursor. Non-link controls in docs surfaces must not set `cursor: pointer`.

## SEO/social/LLM discoverability

Production builds must emit route entrypoint HTML for public routes with route-specific title, description, canonical URL, Open Graph/Twitter image metadata, and static body content sufficient for search indexing and no-JavaScript readers.

The site must emit:

- `og-card.svg`
- `sitemap.xml`
- `robots.txt`
- `llms.txt`
- `llms-full.txt`

## Design and accessibility

- Reuse Honeydeck base and bee CSS tokens where they semantically fit.
- Custom marketing-only tokens/styles may layer on top for landing-page visuals and Dex.
- Component-level marketing layout and controls should prefer Tailwind utilities in React over custom CSS classes; keep custom CSS for global tokens, MDX prose, and bespoke mascot/illustration details.
- The visual style should feel bee-forward and editorially calm: warm primary accents, restrained purple as a supporting color, readable heading scale, and compact 8px-radius cards/tools.
- Marketing raster images should use Dex as the mascot reference, keep text out of the bitmap, prefer WebP when browser-delivered raster assets can be encoded without losing required transparency/detail, and prefer transparent-background cutouts where the page background or dark mode should show through.
- Header navigation must collapse below desktop sizes into an accessible leftmost hamburger menu that exposes Home, grouped docs pages, GitHub, and package links without causing horizontal overflow.
- Documentation pages must show the article content in the first viewport on narrow screens; use the header hamburger as the compact docs navigation below desktop sizes and a sticky sidebar on wide screens. The wide-screen docs sidebar must scroll independently from the article content when its navigation exceeds the viewport, and its grouped sections must be collapsible. Docs sidebar sections start collapsed except for the active document group, and use the quiet uppercase section-title treatment.
- Documentation pages must show a subtle sticky in-page navigation to the right of the article on wide screens. It lists all rendered article headings as anchor links and stays visually quieter than the primary docs sidebar.
- The header color mode switcher must use the shared `@honeydeck/honeydeck/components` color mode cycle button (`system` → `light` → `dark` → `system`). `system` follows `prefers-color-scheme`; `light` and `dark` pin the effective mode.
- The header GitHub link must point to `https://github.com/honeydeck/honeydeck` and use a recognizable GitHub logo icon in a regular text link.
- Marketing buttons, icon controls, compact docs controls, and quiet demo links should use the shared `@honeydeck/honeydeck/components` button class recipes unless a component needs a marketing-only visual treatment.
- Focus states must be visible.
- Reduced motion preferences must be respected.
- Images/mascot visuals must have accessible labels or be decorative.

## Out of scope for launch

- Analytics.
- Automated Playwright/axe tests.
- Hosting demo decks inside this package.
- Claiming Honeydeck is an AI slide generator.
