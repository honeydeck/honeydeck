# Honeydeck Monorepo Specification

Honeydeck is an npm workspace for an MDX + React presentation framework and its public marketing/docs site.

This root spec is the monorepo overview and navigation map. Detailed observable behavior lives in colocated `SPEC.md` files near the package/folder that owns it.

## Product model

- **Honeydeck runtime/CLI**: public scoped npm package `@honeydeck/honeydeck`, optimized for `npx @honeydeck/honeydeck init` and `@honeydeck/honeydeck/...` imports. It owns runtime components plus token-based UI primitives shared with private monorepo surfaces through public `@honeydeck/honeydeck/components` imports.
- **Marketing/docs site**: private package `@honeydeck/marketing`, optimized for developer activation, public docs, search, SEO/social basics, and AI/LLM discoverability.
- **Showcase deck**: private package `@honeydeck/showcase`, optimized for local demoing and smoke-testing Honeydeck features with a real MDX deck.
- **Welcome deck**: private package `@honeydeck/welcome-deck`, optimized for a compact first-impression demo deck and layout-reference smoke testing.
- **Canonical docs**: source-of-truth docs live with `packages/honeydeck` and are synced into the marketing site at build/dev time.

## Workspace packages

| Package | Path | Public? | Owns |
|---|---|---:|---|
| `@honeydeck/honeydeck` | `packages/honeydeck` | Yes | CLI, runtime, layouts, themes, Vite plugin, bundled skills, canonical docs, runtime reference pages, shared UI primitives exposed through `@honeydeck/honeydeck/components` |
| `@honeydeck/marketing` | `packages/marketing` | No | Landing page, audience pages, generated docs site, markdown siblings, search, SEO/social/LLM files |
| `@honeydeck/showcase` | `packages/showcase` | No | Feature showcase deck, package-local demo layouts/components, build/PDF smoke tests |
| `@honeydeck/welcome-deck` | `packages/welcome-deck` | No | Compact welcome deck, package-local demo layouts, build/PDF smoke tests |

## Public promises

- `@honeydeck/honeydeck` is the public npm package; the installed CLI binary remains `honeydeck`.
- First-run installation uses `npx @honeydeck/honeydeck init`; generated projects use `@honeydeck/honeydeck/...` imports.
- The marketing site uses custom Vite/React/Tailwind routing and docs rendering, not Starlight.
- The primary marketing CTA is `npx @honeydeck/honeydeck init`.
- Honeydeck is positioned as **AI-friendly**, not as an AI slide generator.
- No analytics are required for launch.
- Accessibility matters: keyboard navigation, visible focus states, reduced motion, color contrast, semantic route entrypoint HTML, and useful alt/labels are required.

## Spec map

| Area | Spec | Owns |
|---|---|---|
| Honeydeck package overview | [`packages/honeydeck/SPEC.md`](packages/honeydeck/SPEC.md) | Public `honeydeck` behavior and nested package spec map |
| Shared UI primitives | [`packages/honeydeck/src/runtime/components/SPEC.md`](packages/honeydeck/src/runtime/components/SPEC.md) | Shared React controls and reusable Honeydeck token-based style recipes exported through `@honeydeck/honeydeck/components` |
| Honeydeck CLI/runtime implementation | [`packages/honeydeck/src/cli/SPEC.md`](packages/honeydeck/src/cli/SPEC.md), [`packages/honeydeck/src/runtime/SPEC.md`](packages/honeydeck/src/runtime/SPEC.md), [`packages/honeydeck/src/vite-plugin/SPEC.md`](packages/honeydeck/src/vite-plugin/SPEC.md) | Deck building, serving, PDF export, runtime routes, virtual modules |
| Honeydeck runtime reference behavior | [`packages/honeydeck/src/runtime/views/SPEC.md`](packages/honeydeck/src/runtime/views/SPEC.md) | Theme, layout, and component reference pages |
| Honeydeck package skills | [`packages/honeydeck/skills/SPEC.md`](packages/honeydeck/skills/SPEC.md) | Bundled installable skills |
| Marketing/docs site | [`packages/marketing/SPEC.md`](packages/marketing/SPEC.md) | Landing, audience pages, docs generation, search, SEO/social/LLM files |
| Showcase deck | [`packages/showcase/SPEC.md`](packages/showcase/SPEC.md) | Feature showcase deck behavior and package-local demo layouts/components |
| Welcome deck | [`packages/welcome-deck/SPEC.md`](packages/welcome-deck/SPEC.md) | Compact welcome deck behavior and package-local demo layouts |
| Release governance | [`.github/SPEC.md`](.github/SPEC.md) | CI checks, PR title contract, npm publishing for `honeydeck` |
| Development workflow | [`DEVELOPMENT.md`](DEVELOPMENT.md) | Monorepo commands and package boundaries |

## Reading rules

- Treat every colocated `SPEC.md` as part of the application specification.
- More-specific package/folder specs own details when specs overlap.
- Behavior changes must update the owning spec and this map if ownership changes.
- Implementation-only details belong in `DEVELOPMENT.md` or package development docs, not behavior specs.
