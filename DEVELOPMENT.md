# Honeydeck Monorepo Development Guide

This repository is a pnpm workspace monorepo.

## Packages

```txt
packages/
  honeydeck/    public scoped Honeydeck CLI/runtime package and shared UI primitives
  docs/         private Fumadocs/Next documentation site package
  showcase/     private feature showcase deck package
  welcome-deck/ private compact welcome deck package

demos/
  latex/                  private LaTeX/KaTeX integration demo package
  mermaid/                private Mermaid integration demo package
  react-bits-backgrounds/ private React Bits/shadcn background demo package
```

Root `SPEC.md` maps product behavior specs. Package-level and colocated `SPEC.md` files own detailed behavior.

## Setup

```bash
corepack enable
corepack prepare pnpm@10.34.4 --activate
pnpm install
```

## Root scripts

| Script | Purpose |
|---|---|
| `pnpm run dev` | Run package dev servers together: showcase deck and Fumadocs docs site |
| `pnpm run lint` | Biome validation for the monorepo |
| `pnpm run typecheck` | Typecheck all workspaces |
| `pnpm test` | Run workspace test suites |
| `pnpm run build` | Run build scripts for workspaces that define one |
| `pnpm run pack:dry-run` | Dry-run package contents for shippable workspaces |

Target a workspace directly with pnpm filters:

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
pnpm --filter @honeydeck/demo-latex run dev
pnpm --filter @honeydeck/demo-mermaid run dev
pnpm --filter @honeydeck/demo-react-bits-backgrounds run dev
```

## Docs flow

Canonical reader-facing Honeydeck docs live in `packages/docs/content/docs` as authored MDX. The docs package generates only derived search data before dev/build:

```bash
pnpm --filter @honeydeck/docs run search:index
```

Edit `packages/docs/content/docs/*` directly for docs prose and playground usage. When changing documented Honeydeck behavior, update the owning colocated `SPEC.md` near the implementation first.

## Release flow

The public npm release is for the `@honeydeck/honeydeck` workspace only. Root CI installs from the root lockfile, runs workspace checks, plans the next version with `packages/honeydeck/scripts/release-plan.mjs`, and publishes with `npm publish --workspace @honeydeck/honeydeck`.

## Quality gates

Before finishing broad changes, run:

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build        # builds only workspaces that define a build script
pnpm run pack:dry-run
```

For UI work, also run browser QA with `agent-browser` against the relevant dev server or built preview.
