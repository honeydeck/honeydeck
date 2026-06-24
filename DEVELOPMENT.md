# Honeydeck Monorepo Development Guide

This repository is an npm workspace monorepo.

## Packages

```txt
packages/
  honeydeck/    public scoped Honeydeck CLI/runtime package and shared UI primitives
  docs/         private Fumadocs/Next documentation site package
  showcase/     private feature showcase deck package
  welcome-deck/ private compact welcome deck package
```

Root `SPEC.md` maps product behavior specs. Package-level and colocated `SPEC.md` files own detailed behavior.

## Setup

```bash
npm install
```

## Root scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Run package dev servers together: showcase deck and Fumadocs docs site |
| `npm run lint` | Biome validation for the monorepo |
| `npm run typecheck` | Typecheck all workspaces |
| `npm test` | Run workspace test suites |
| `npm run build` | Run build scripts for workspaces that define one |
| `npm run pack:dry-run` | Dry-run package contents for shippable workspaces |

Target a workspace directly with npm workspaces:

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
npm -w @honeydeck/docs run dev
npm -w @honeydeck/docs run docs:sync
npm -w @honeydeck/docs run build
```

## Docs flow

Canonical Honeydeck docs live in `packages/honeydeck` and are shipped with the public npm package. The Fumadocs docs package syncs selected canonical docs before dev/build:

```bash
npm -w @honeydeck/docs run docs:sync
```

Do not manually edit `packages/docs/content/docs/*`.

## Release flow

The public npm release is for the `@honeydeck/honeydeck` workspace only. Root CI installs from the root lockfile, runs workspace checks, plans the next version with `packages/honeydeck/scripts/release-plan.mjs`, and publishes with `npm publish --workspace @honeydeck/honeydeck`.

## Quality gates

Before finishing broad changes, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build        # builds only workspaces that define a build script
npm run pack:dry-run
```

For UI work, also run browser QA with `agent-browser` against the relevant dev server or built preview.
