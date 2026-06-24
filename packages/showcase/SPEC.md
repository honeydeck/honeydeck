# Honeydeck Showcase Specification

`@honeydeck/showcase` is a private workspace package that owns the feature showcase deck used for local development, smoke testing, and demo links.

## Package role

- The showcase is not published to npm.
- It depends on the local `@honeydeck/honeydeck` workspace through `file:../honeydeck` and imports public runtime APIs through scoped `@honeydeck/honeydeck/...` paths.
- It demonstrates Honeydeck features with a real MDX deck, local React components, local layouts, Tailwind v4 utilities, Honeydeck theme CSS, runtime reference pages, and PDF export.

## Deck behavior

- `deck.mdx` is the showcase entrypoint.
- `styles.css` explicitly imports Tailwind, `@honeydeck/honeydeck/theme.css`, and `@honeydeck/honeydeck/themes/bee.css`.
- `layouts: "./layouts"` loads the package-local layout map.
- The package-local layout map extends `@honeydeck/honeydeck/layouts/bee` and adds `Poster` plus an unused `UnusedShowcase` layout for the layout reference page.
- `imported-slides.mdx` is imported by the root deck and expands a slide group at the import location.
- `TimelineAccordion.tsx` demonstrates custom component-controlled timeline steps through `useTimelineSteps`.
- Timeline slides demonstrate reveal, fade, explicit target, grouped, and ephemeral timeline behavior.
- `deck.mdx` includes a `RevealWith` slide that syncs supporting content with both a named reveal target and an existing numeric timeline step.
- `deck.mdx` includes a Magic Code slide using `md magic-code` with inner TypeScript fences, line-highlight states, and an explicit duration override.
- `deck.mdx` demonstrates `<RevealGroup listRevealMode="nested">` with nested Markdown list items so the opt-in nested-list reveal mode is covered by the showcase deck.

## Scripts

- `npm -w @honeydeck/showcase run dev` serves the showcase deck with the source Honeydeck CLI.
- `npm -w @honeydeck/showcase run build` builds the showcase into `packages/showcase/dist`.
- `npm -w @honeydeck/showcase run pdf` exports the final-state showcase PDF.
- `npm -w @honeydeck/showcase run pdf:steps` exports all timeline steps.
- Root `npm run dev` runs this showcase package together with the docs site.
