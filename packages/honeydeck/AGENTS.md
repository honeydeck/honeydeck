# Honeydeck package guide

This package publishes the scoped public `@honeydeck/honeydeck` npm package. It owns the CLI, runtime, Vite plugin, layouts, themes, bundled skills, and runtime reference pages.

## Rules

- Keep public import paths as `@honeydeck/honeydeck/...`.
- `Readme.md` is the compact package README and links to the public docs site. Reader-facing docs live in `packages/docs/content/docs`; update those canonical docs for user-facing behavior changes.
- Built-in runtime reference pages cover project-specific theme tokens, active layouts, and built-in component docs. They do not render public docs in-deck.
- Specs, `DEVELOPMENT.md`, and skills must remain included in npm package contents.
- Use suffixed `lucide-react` icon exports.

## Commands

From repo root:

```bash
npm -w @honeydeck/honeydeck run dev
npm -w @honeydeck/honeydeck run test
npm -w @honeydeck/honeydeck run typecheck
npm -w @honeydeck/honeydeck run pack:dry-run
```

For full monorepo gates use root workspace scripts: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run pack:dry-run`. Root `npm run build` runs only workspaces that define a build script.
