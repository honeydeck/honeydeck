# Honeydeck monorepo development guide

Honeydeck is an npm-workspace monorepo with four packages:

- `packages/honeydeck` — public scoped `@honeydeck/honeydeck` CLI/runtime package for MDX, React, Vite, Tailwind v4 presentations. It also owns shared UI primitives exported through `@honeydeck/honeydeck/components`.
- `packages/marketing` — private `@honeydeck/marketing` Vite/React site for the landing page, public docs, LLM discovery files, and search.
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
- `packages/marketing/SPEC.md` and nested specs own marketing/docs behavior.
- `packages/showcase/SPEC.md` owns showcase deck behavior.
- `packages/welcome-deck/SPEC.md` owns welcome deck behavior.
- `DEVELOPMENT.md` documents monorepo workflow; package-specific development details live beside each package.

When changing behavior:

1. Research the codebase.
2. Update the owning colocated `SPEC.md` first.
3. Implement code/tests/docs.
4. Run the relevant workspace quality gates.

## Common commands

Run from the repository root:

```bash
npm install
npm run dev              # All package dev servers
npm run lint
npm run typecheck
npm test
npm run build
npm run pack:dry-run
```

Target a package explicitly when useful:

```bash
npm -w @honeydeck/honeydeck run dev          # starter template smoke-test deck
npm -w @honeydeck/honeydeck run test
npm -w @honeydeck/honeydeck run typecheck
npm -w @honeydeck/showcase run dev
npm -w @honeydeck/showcase run build
npm -w @honeydeck/showcase run pdf
npm -w @honeydeck/showcase run pdf:steps
npm -w @honeydeck/welcome-deck run dev
npm -w @honeydeck/welcome-deck run build
npm -w @honeydeck/welcome-deck run pdf
npm -w @honeydeck/marketing run dev
npm -w @honeydeck/marketing run docs:sync
npm -w @honeydeck/marketing run build
```

## Package boundaries

- `packages/honeydeck/Readme.md` is the compact package README. `packages/honeydeck/docs/getting-started.md` is the canonical first-run guide. Other `packages/honeydeck/docs/*.md` files and specs are canonical Honeydeck docs shipped in the public npm package.
- Shared React UI primitives used by runtime and marketing live in `packages/honeydeck/src/runtime/components` and are imported via `@honeydeck/honeydeck/components`.
- `packages/marketing` copies selected canonical docs at build/dev time into generated content. Do not manually edit generated docs.
- The showcase and welcome-deck packages may depend on the public `@honeydeck/honeydeck` package for demos; `honeydeck` must not depend on `@honeydeck/showcase` or `@honeydeck/welcome-deck`.
- The marketing package may depend on the public `@honeydeck/honeydeck` package, but `honeydeck` must not depend on `@honeydeck/marketing`.
- Deployment artifacts (`dist/`, generated PDFs) stay untracked.
