# Honeydeck monorepo development guide

Honeydeck is an npm-workspace monorepo with four packages:

- `packages/honeydeck` — public scoped `@honeydeck/honeydeck` CLI/runtime package for MDX, React, Vite, Tailwind v4 presentations. It also owns shared UI primitives exported through `@honeydeck/honeydeck/components`.
- `packages/docs` — private `@honeydeck/docs` Fumadocs/Next documentation site with canonical authored MDX docs content.
- `packages/showcase` — private `@honeydeck/showcase` feature showcase deck for demos and smoke tests.
- `packages/welcome-deck` — private `@honeydeck/welcome-deck` compact welcome deck for first-impression demos and layout-reference smoke tests.

## Coding guidelines

- Keep things simple and easy to reason about. Prefer easy-to-understand boilerplate over concise magic.
- React components are the common way to share UI.
- Prefer Tailwind v4 utilities and Honeydeck CSS tokens over custom CSS classes when practical.
- Use `lucide-react` suffixed `...Icon` component exports, never inline SVG path helpers or unsuffixed lucide aliases.
- Public runtime imports must use scoped `@honeydeck/honeydeck/...` paths.

## Spec driven development

Root `SPEC.md` is the monorepo/product overview and navigation map. Detailed observable behavior lives in colocated package specs:

- `packages/honeydeck/SPEC.md` and nested `SPEC.md` files own CLI/runtime/deck behavior and shared UI primitive behavior.
- `packages/docs/SPEC.md` owns Fumadocs docs behavior.
- `packages/showcase/SPEC.md` owns showcase deck behavior.
- `packages/welcome-deck/SPEC.md` owns welcome deck behavior.
- `DEVELOPMENT.md` documents monorepo workflow; package-specific development details live beside each package.

When changing behavior:

1. Research the codebase.
2. Update the owning colocated `SPEC.md` first.
3. Implement code/tests/docs.
4. If the behavior is user-facing, update the canonical reader-facing docs in `packages/docs/content/docs` and the relevant docs `meta.json` navigation when adding a page.
5. Run the relevant workspace quality gates.

## Common commands

Run from the repository root:

```bash
pnpm install
pnpm run dev              # All package dev servers
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
pnpm run pack:dry-run
```

Target a package explicitly when useful:

```bash
pnpm --filter @honeydeck/honeydeck run dev          # starter template smoke-test deck
pnpm --filter @honeydeck/honeydeck run test
pnpm --filter @honeydeck/honeydeck run typecheck
pnpm --filter @honeydeck/showcase run dev
pnpm --filter @honeydeck/showcase run build
pnpm --filter @honeydeck/showcase run pdf
pnpm --filter @honeydeck/showcase run pdf:steps
pnpm --filter @honeydeck/welcome-deck run dev
pnpm --filter @honeydeck/welcome-deck run build
pnpm --filter @honeydeck/welcome-deck run pdf
pnpm --filter @honeydeck/docs run dev
pnpm --filter @honeydeck/docs run search:index
pnpm --filter @honeydeck/docs run build
```

## Package boundaries

- `packages/honeydeck/Readme.md` is the compact package README. Reader-facing docs live in `packages/docs/content/docs` as authored MDX; implementation behavior is specified by colocated `SPEC.md` files near owning code.
- Shared React UI primitives used by runtime and docs live in `packages/honeydeck/src/runtime/components` and are imported via `@honeydeck/honeydeck/components`.
- The showcase and welcome-deck packages may depend on the public `@honeydeck/honeydeck` package for demos; `honeydeck` must not depend on `@honeydeck/showcase` or `@honeydeck/welcome-deck`.
- The docs package may depend on the public `@honeydeck/honeydeck` package, but `honeydeck` must not depend on `@honeydeck/docs`.
- Deployment artifacts (`dist/`, generated PDFs) stay untracked.
