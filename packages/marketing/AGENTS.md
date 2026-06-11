# Honeydeck marketing package guide

`@honeydeck/marketing` is the private Vite/React/Tailwind v4 marketing and docs site.

## Responsibilities

- Landing page at `/` optimized for developer activation and `npx @honeydeck/honeydeck init`.
- Product audience page at `/for/product`.
- Custom docs experience under `/docs` generated from canonical `packages/honeydeck` docs.
- Markdown sibling routes in `public/docs/*.md` for AI-friendly viewing/copying.
- `llms.txt`, `llms-full.txt`, `robots.txt`, `sitemap.xml`, and Open Graph/Twitter basics.
- Color mode toggle, visible focus states, reduced-motion support, and semantic route entrypoint HTML generated during build.

## Rules

- Do not manually edit `src/content/docs/generated/*`; run `npm -w @honeydeck/marketing run docs:sync`.
- Reuse Honeydeck base and bee CSS tokens where they semantically fit.
- Keep the site playful with Dex/bee visuals but avoid claiming Honeydeck is an AI slide generator.
- External demo deck links are outbound; demo hosting is not part of this package.
- No analytics for launch.

## Commands

From repo root:

```bash
npm -w @honeydeck/marketing run docs:sync
npm -w @honeydeck/marketing run dev
npm -w @honeydeck/marketing run build
npm -w @honeydeck/marketing run typecheck
```

Use browser QA for landing, docs, color mode, and Markdown/LLM files before considering marketing changes done.
