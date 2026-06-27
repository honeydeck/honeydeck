# Honeydeck Welcome Specification

`@honeydeck/welcome-deck` is a private workspace package that owns the compact welcome deck used for local demos and first-impression smoke testing.

## Package role

- The welcome-deck package is not published to npm.
- It depends on the local `@honeydeck/runtime` workspace through `file:../honeydeck` and imports public runtime APIs through scoped `@honeydeck/runtime/...` paths.
- It provides a short, polished deck that highlights Honeydeck authoring, code highlighting, theme tokens, and getting started.

## Deck behavior

- `deck.mdx` is the welcome deck entrypoint.
- `styles.css` explicitly imports Tailwind and the Honeydeck Bee theme CSS.
- `layouts: "./layouts"` loads the package-local `layouts.ts` layout map.
- The package-local layout map exposes only layouts used by the deck plus the built-in `Default` layout for the runtime layouts reference page.
- Every package-local custom layout exported by the layout map provides a static `demo` export so it appears with a live preview on the layouts reference page.
- Custom layouts that render inline SVG definitions use per-instance IDs so repeated layout instances on different slides do not collide in the shared document.

## Scripts

- `npm -w @honeydeck/welcome-deck run dev` serves the welcome deck with the source Honeydeck CLI.
- `npm -w @honeydeck/welcome-deck run build` builds the welcome deck into `packages/welcome-deck/dist`.
- `npm -w @honeydeck/welcome-deck run pdf` exports the final-state welcome PDF.
- `npm -w @honeydeck/welcome-deck run typecheck` typechecks the welcome deck and local layouts.
