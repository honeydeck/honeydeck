# Honeydeck — Development Guide

> Companion to the distributed Honeydeck specs. Root `SPEC.md` is the overview/navigation device; colocated `SPEC.md` files define detailed observable behavior. This document explains how to develop, test, package, and reason about the implementation.

---

## Scope

Use this document for implementation workflow and architecture details:

- local setup
- repository scripts
- repository folder structure
- quality gates
- compiler pipeline
- virtual modules
- Vite/app-shell wiring
- Tailwind integration details
- PDF export internals
- package/publish expectations

Do not use this document to override the distributed specs. If behavior changes, update the owning colocated `SPEC.md` first and keep the root spec map current.

---

## Implementation Stack

| Concern | Implementation |
|---------|----------------|
| Language | TypeScript |
| Runtime | Node.js |
| Build tool | Vite |
| Styling | Tailwind CSS + CSS custom properties |
| Markdown | MDX + remark plugins |
| PDF | Playwright/Chromium screenshots + `pdf-lib` assembly |
| Syntax highlighting | Shiki at MDX transform time |
| Icons | `lucide-react` |
| CLI prompts | clack |

---

## Development Process

Honeydeck uses spec-driven development:

1. Research existing code and docs.
2. Propose the observable behavior change in the owning colocated `SPEC.md`.
3. Agree on the spec change.
4. Implement code and tests.
5. Review implementation against the root spec map and owning colocated spec.
6. Keep this document updated when workflow or architecture changes.

Keep behavior specs focused on observable behavior. Put implementation-only details here.

---

## Prerequisites

Honeydeck is currently developed and tested with:

- Node.js 26+
- npm
- Playwright Chromium for PDF export

Check runtime:

```bash
node --version
npm --version
```

Install dependencies:

```bash
npm install
```

Install Playwright Chromium when PDF export is used locally:

```bash
npx playwright install chromium
```

---

## Repository Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Run source CLI against starter template deck |
| `npm run dev:init` | Run source CLI against starter template deck |
| `npm run format` | Format/lint with Biome and write fixes |
| `npm run lint` | Validate Biome formatting/lint rules without writing fixes |
| `npm run pack:dry-run` | Validate the npm package contents without publishing |
| `npm run release:plan` | Inspect the next Conventional Commit release plan |
| `npm test` | Run Node test suite through `tsx` |
| `npm run typecheck` | Run strict TypeScript checks without emitting files |

The source CLI is run directly with `tsx`, for example:

```bash
node --import tsx ./src/cli/index.ts dev --deck src/cli/templates/starter/deck.mdx
```

---

## Quality Gates

Before considering a change complete, run:

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run pack:dry-run
```

For UI/runtime changes, also run at least one manual deck session:

```bash
npm run dev
```

For PDF-related changes, run the showcase package PDF smoke tests from the repository root:

```bash
npm -w @honeydeck/showcase run pdf
npm -w @honeydeck/showcase run pdf:steps
```

Test coverage should match the changed layer and live next to the implementation by default:

- parser/splitter changes → colocated unit tests such as `src/vite-plugin/splitter.test.ts`
- remark compiler changes → colocated MDX compile tests beside the changed remark transform
- runtime navigation changes → colocated router/keyboard/preview tests where possible
- CLI changes → colocated CLI argument/help/init tests beside the changed CLI module
- CSS/theme changes → colocated theme CSS tests plus manual visual check
- PDF changes → colocated option/server/path tests plus manual PDF smoke test

Test fixtures should also be colocated with their owning test and implementation, for example under `src/vite-plugin/fixtures/` or `src/remark/fixtures/`. Do not add a top-level `tests/` folder.

### Good test patterns

Tests should protect observable behavior: when the user or caller does X, Honeydeck produces Y. Prefer rendered output, CLI results, parsed routes, generated public virtual module output, or thrown user-facing errors over private helper calls or implementation details.

Use these "instead of / do" patterns to keep tests useful:

- Instead of asserting internal representation, assert public behavior. For example, render MDX output or assert returned metadata instead of matching generated JS details.
- Instead of asserting styling implementation, assert user-visible or accessibility behavior. Only assert CSS classes when the class is itself the public contract.
- Instead of inspecting source text, exercise the public surface. Import public exports, call public functions, or render components instead of scanning files for strings.
- Instead of depending on ambient state, make inputs explicit and isolated. Pass explicit roots, isolate globals, and avoid `process.cwd()`, generated `dist/`, clocks, randomness, or environment-specific paths.
- Instead of snapshot-like broad equality, assert the intent. Check key substitutions, important structure, and compile success rather than exact full-file template output.
- Instead of duplicating coverage, protect each promise once. Keep the clearest test for a rule and remove repeats that fail for the same reason.

Prefer small Arrange/Act/Assert tests with meaningful edge cases: invalid input, empty state, missing files, unavailable browser globals, malformed stored data, encoded route values, and failure paths at integration boundaries.

---

## Package Execution Model

Honeydeck currently ships TypeScript/TSX source files in the npm package. The package entrypoints and subpath exports point directly at files under `src/`.

Important implications:

- CLI bin points at `./src/cli/index.ts`.
- Vite resolves Honeydeck runtime/layout/theme/component exports from source.
- Local development and tests use `tsx` to execute TypeScript directly.
- `package.json#files` must include all runtime, spec, development, and skill files needed by installed users and AI agents.

Published package contents must include:

- `src/` for CLI, runtime, layouts, themes, Vite plugin, and assets
- `Readme.md` as the compact package README with links to the public docs site
- Root `SPEC.md` plus colocated `SPEC.md` files so AI agents and maintainers can inspect expected behavior from an installed package
- `DEVELOPMENT.md` so maintainers can inspect development workflow, internal architecture, testing, and release expectations from an installed package
- `skills/` so `honeydeck skill`, `npx skills add <honeydeck-repo-url> --copy`, and explicit `npx skills add <honeydeck-repo-url> --copy --skill <skill-name>` can install Honeydeck agent skills

Repository release governance lives in the monorepo root `.github/SPEC.md`. It is not shipped in the npm package because it describes repository automation rather than installed Honeydeck behavior.

Development-only folders and files should not be published:

- `agentwork/`
- colocated test files under `src/` such as `*.test.ts` and `*.test.tsx`
- colocated test fixtures under `src/` such as `fixtures/`

### Package Export Map

`package.json#exports` must stay aligned with public import patterns in `src/SPEC.md` and the root spec map.

```txt
honeydeck
├── .                      → src/runtime/index.ts
├── ./app-shell            → src/runtime/app-shell/main.tsx
├── ./types                → src/runtime/types.ts
├── ./theme.css            → src/theme/base.css
├── ./themes/
│   ├── base.css           → src/theme/base.css
│   ├── clean.css          → src/theme/clean.css
│   └── bee.css            → src/theme/bee.css
├── ./layouts/
│   ├── .                  → src/layouts/index.ts
│   ├── Blank              → src/layouts/clean/Blank.tsx
│   ├── Default            → src/layouts/clean/Default.tsx
│   ├── TwoCol             → src/layouts/clean/TwoCol.tsx
│   ├── Cover              → src/layouts/clean/Cover.tsx
│   ├── Section            → src/layouts/clean/Section.tsx
│   ├── Image              → src/layouts/clean/Image/Image.tsx
│   ├── ImageLeft          → src/layouts/clean/ImageLeft.tsx
│   ├── ImageRight         → src/layouts/clean/ImageRight.tsx
│   ├── clean/             → src/layouts/clean/*
│   └── bee/               → src/layouts/bee/*
└── ./components/
    ├── .                  → src/runtime/components/index.ts
    ├── code-block         → src/runtime/components/CodeBlock.tsx
    └── code-block/
        ├── normal         → src/runtime/components/NormalCodeBlock.tsx
        └── magic          → src/runtime/components/MagicCodeBlock.tsx
```

---

## Vite/App-Shell Architecture

Honeydeck owns Vite config programmatically. Users do not provide `index.html` or `vite.config.ts`.

### Development server

- Vite root is the user project root.
- The dev server binds to `0.0.0.0` so the printed Network URL is reachable from other devices on the same LAN.
- Honeydeck serves its internal app shell from `src/runtime/app-shell/index.html`.
- The app shell entry imports `@honeydeck/honeydeck/app-shell`, so the shell and deck-authored imports share the same Honeydeck package module graph.
- `server.fs.allow` includes the Honeydeck package root so package source can be served even when outside the user root.
- HMR is provided by Vite plus Honeydeck virtual module invalidation.

### Production build

- Vite root is the internal app shell directory.
- Build output goes to the user project `dist/` unless overridden internally by PDF export.
- A Honeydeck HTML plugin rewrites the app-shell script placeholder before Vite bundles.
- The user project `public/` directory is copied to the build root.

### Runtime module graph invariant

Context-backed runtime state must have exactly one module instance in a running deck. Examples include `TimelineContext`, `SlideScaleContext`, and `EffectiveColorModeContext`.

Principles:

- Honeydeck-owned source files import shared runtime state through relative/internal source paths.
- Honeydeck-owned source files must not self-import public package entries such as `@honeydeck/honeydeck` to access shared runtime state.
- Public package imports are for user-authored decks, custom components, layouts, generated MDX, and reserved CLI/app-shell entry points.
- If app shell code and deck-authored imports need to meet at the same runtime state, solve it in Vite/package resolution: alias package subpaths to the same source files and prevent dependency pre-bundling from creating a second Honeydeck runtime graph.
- Packed-package smoke tests should inspect real installed-package behavior, not only workspace behavior. Workspace aliases can hide duplicate-runtime bugs.

Reason: React contexts are module-instance scoped. If Vite serves one `TimelineContext.tsx` from package source and also pre-bundles another copy through `@honeydeck/honeydeck`, providers and consumers can silently use different contexts. Navigation can advance the correct step count while reveal components remain stuck at their default context state.

---

## Vite Plugin Stack

`honeydeckPlugin()` returns an ordered plugin array. Ordering is significant:

1. `honeydeck:aliases`
   - Maps public `honeydeck` imports and subpaths to local source files.
2. `honeydeck:tailwind-user-source`
   - Injects Tailwind `@source` for user project scanning.
3. `honeydeck:token-manifest`
   - Parses `src/theme/base.css` into `virtual:honeydeck/token-manifest`.
4. `honeydeck:virtual-modules`
   - Splits deck MDX, serves virtual modules, watches imported MDX/docs/layout files, and handles HMR invalidation.
5. `@mdx-js/rollup`
   - Compiles real and virtual MDX to React JSX.
6. `@tailwindcss/vite`
   - Runs Tailwind v4 scan/generate plugins.

Virtual module handling must run before MDX compilation so virtual slide modules can provide raw `.mdx` source to `@mdx-js/rollup`.

---

## MDX Compiler Pipeline

Honeydeck MDX compilation uses this remark plugin order:

1. `remarkFrontmatter`
2. `remarkGfm`
3. `remarkH1Extract`
4. `remarkStepNumbering`
5. `remarkShikiCodeBlocks`

Why order matters:

- Frontmatter must be parsed/removed before rendered output.
- GFM tables must exist before final MDX output.
- H1/frontmatter metadata must be extracted before runtime slide metadata is emitted.
- Step numbering must annotate reveals/code before Shiki code block replacement.
- Shiki replacement must run after step metadata exists.

Keep PDF step-count compilation in sync with this pipeline.

---

## Code Highlighting Internals

Honeydeck uses Shiki during MDX compilation.

Implementation contract:

- Syntax highlighting happens at build/dev transform time.
- Runtime JavaScript does not run a syntax highlighter.
- Runtime JavaScript only applies timeline dimming for step-through code blocks.
- Shiki is an internal Honeydeck dependency.
- Code highlighting colors come from Honeydeck's selected built-in Shiki themes (`github-light` and `github-dark`).
- Honeydeck does not expose Shiki theme configuration.

---

## Slide Loading and MDX Imports

Deck loading starts from the selected deck entry path.

Implementation contracts:

- Default imports from relative `.mdx` files are structural slide imports.
- Imported MDX files are recursively expanded before final deck splitting.
- Circular MDX imports throw a clear error.
- Imported MDX frontmatter is slide-level only.
- Only standalone usage of an imported MDX component expands slides, e.g. `<DemoSlides />`.
- Relative non-MDX imports inside imported MDX files are rewritten to `/@fs/<absolute-path>` so Vite resolves them from their original file location.
- Code fences protect `---` from becoming slide separators.

Extensionless relative import resolution supports:

- `.tsx`
- `.ts`
- `.jsx`
- `.js`
- `.mdx`
- `.md`
- `.css`
- `index` files with those extensions

---

## Virtual Modules

Honeydeck runtime consumes virtual modules generated by the Vite plugin:

| Module | Purpose |
|--------|---------|
| `virtual:honeydeck/slide/N.mdx` | 0-based standalone compiled slide source |
| `virtual:honeydeck/slides` | Barrel of all slides plus slide count |
| `virtual:honeydeck/config` | Parsed deck-level frontmatter/config |
| `virtual:honeydeck/layouts` | Active layout map, layout names, discovered demos |
| `virtual:honeydeck/token-manifest` | Theme token manifest parsed from base CSS |

Virtual IDs use Vite's `\0` internal prefix after resolution so other plugins do not treat them as filesystem paths.

HMR strategy:

- Honeydeck caches split slide segments.
- On watched MDX changes, it re-splits the deck.
- Only changed virtual slide modules are invalidated when possible.
- Structural changes may force broader invalidation/full reload.
- Imported MDX, active layout files, and docs files are added to Vite's watcher.

---

## Tailwind Integration

Honeydeck uses Tailwind v4 through `@tailwindcss/vite`.

User styling is explicit:

- Honeydeck does not auto-import Tailwind or theme CSS.
- Starter decks import `./styles.css` from `deck.mdx`.
- `styles.css` imports Tailwind and Honeydeck theme CSS.

Source scanning detail:

- During build/PDF, Vite root differs from the user project root.
- Tailwind could miss project-local MDX/TSX classes.
- Honeydeck injects `@source "<userRoot>";` into CSS files that import Tailwind.
- Injection is idempotent via a `honeydeck:tailwind-user-source` marker.
- Paths are normalized to forward slashes for cross-platform behavior.

---

## Theme Token Manifest

The reference pages' theme tab is backed by a token manifest generated from `src/theme/base.css`.

Implementation contract:

- Honeydeck parses `--honeydeck-*` declarations.
- Token descriptions come from preceding CSS comments when available.
- If duplicate token declarations exist, the first parsed declaration wins.
- The manifest is exposed through `virtual:honeydeck/token-manifest`.

---

## Layout Demo Discovery

Reference pages show layout demos discovered at build/dev time.

Discovery rules:

- Honeydeck statically crawls analyzable active layout maps.
- It discovers colocated `demo` exports from layout modules.
- Dynamic maps, computed entries, or non-static imports may be skipped with warnings.
- Missing demos do not break layouts; reference pages show fallback hints.

---

## PDF Export Internals

`honeydeck pdf` follows this internal workflow:

1. Parse CLI args.
2. Resolve deck entry path.
3. Load/split deck and parse deck frontmatter.
4. Resolve effective PDF options.
5. Build the presentation into a temporary directory.
6. Start a temporary local static server for that build.
7. Launch headless Chromium via Playwright.
8. Build an ordered slide/step capture plan.
9. Capture PNG screenshots with a bounded pool of Playwright pages.
10. Wait for React rendering before each screenshot.
11. Assemble pages into a PDF using `pdf-lib` in capture-plan order.
12. Close browser, stop server, and remove temp directory.

Implementation notes:

- PDF export must not pollute normal `dist/`.
- Static file serving must reject path traversal.
- Hash-only navigation is used after each worker page's first load where possible.
- Parallel screenshot capture must not change the final PDF page order.
- Browser page errors should fail the export with useful context.
- `--steps all` must use the same step-count semantics as runtime compilation.

---

## Local Package Testing

Link local CLI globally:

```bash
npm link
```

Then run from another folder:

```bash
honeydeck --help
honeydeck init --name demo-deck --skip-install
```

Before Honeydeck is published, generated projects may need a local file dependency:

```bash
cd /path/to/generated-project
npm pkg set dependencies.honeydeck="file:/absolute/path/to/honeydeck"
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## Release and Publish Checklist

Honeydeck releases are published from GitHub Actions after changes land on `main`.
Every merge to `main` must publish a new npm version. The release workflow
uses Conventional Commit subjects to derive the semantic version bump:

- breaking changes (`feat!:`, `fix!:`, or a `BREAKING CHANGE:` footer) bump major
- `feat:` bumps minor
- all other accepted Conventional Commit types bump patch

The release workflow does not use a long-lived npm token. It uses npm trusted
publishing through GitHub Actions OIDC:

The release workflow sets `package.json#repository` to the current
`github.repository` before publishing so npm trusted publishing can match the
package metadata to the authorized GitHub repository.

GitHub branch protection or rulesets must require the `Pull request title`,
`Lint`, `Typecheck`, `Test`, `Build`, and `Package` checks before merging to
`main`.

Before publishing or enabling automation:

1. Confirm the root spec map and colocated behavior specs match observable behavior.
2. Confirm `DEVELOPMENT.md` matches development workflow/architecture.
3. Run quality gates.
4. Confirm generated starter project works.
5. Confirm PDF export works if PDF-related code changed.
6. Check `package.json#files` includes required public docs/skills/spec/development files.
7. Check `package.json#exports` matches supported public imports.
8. Ensure no secrets, generated PDFs, tests, or local-only files are published.

---

## Repository Folder Structure

```txt
honeydeck/
  src/
    cli/                    CLI commands, starter templates, and colocated CLI tests
    runtime/                React app shell, router, slide runtime, views, components, and colocated runtime tests
    vite-plugin/            Deck loading, virtual modules, layout demo crawl, token manifest, and colocated plugin tests
    remark/                 MDX/remark transforms for metadata, steps, code blocks, and colocated remark tests
    layouts/                Built-in clean and bee layout maps/components and colocated layout tests
    theme/                  Base, clean, and bee CSS theme layers and colocated theme tests
    defaults.ts             Shared defaults such as default deck entry
    assets.d.ts             Static asset type declarations
  skills/                   Bundled installable agent skills
  Readme.md                 Compact package README and documentation index
  SPEC.md                   Overview and navigation map for behavior specs
  DEVELOPMENT.md            Maintainer workflow and implementation architecture
  package.json              Package metadata, exports, scripts, dependencies
  biome.json                Formatter/linter config
  tsconfig.json             TypeScript config
```

Key source areas:

| Area | Files |
|------|-------|
| CLI | `src/cli/` |
| Vite plugin | `src/vite-plugin/` |
| Remark transforms | `src/remark/` |
| Runtime app | `src/runtime/` |
| Built-in layouts | `src/layouts/` |
| Theme CSS | `src/theme/` |
| Starter templates | `src/cli/templates/starter/` |
| Agent skills | `skills/` |
| Tests | Colocated `*.test.ts` / `*.test.tsx` and fixtures beside implementations |
