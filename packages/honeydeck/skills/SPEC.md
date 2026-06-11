# Honeydeck Agent Skills Specification

> Observable behavior for bundled installable agent skills.

## Agent Skills

Honeydeck ships installable agent skills:

- `skills/honeydeck/SKILL.md` (`honeydeck`) helps AI agents use Honeydeck correctly: MDX entrypoint, deck frontmatter, exact `---` slide separators, slide frontmatter, built-in layouts, explicit theme/CSS imports, presenter notes, steps/reveals, code blocks, PDF export, custom React components, customization, canonical package docs, and runtime reference pages.
- `skills/presentation-writing/SKILL.md` (`presentation-writing`) gives opinionated guidance for writing great slides and delivering good presentations: audience/goal/duration discovery, storyline, one idea per slide, strong headlines, sparse visuals, speaker notes, timing, narrative flow, progressive disclosure, and review heuristics.
- `skills/slidev-migration/SKILL.md` (`slidev-migration`) helps AI agents migrate presentations from Slidev/sli.dev to Honeydeck: initialize a Honeydeck project when needed, convert `slides.md` to `deck.mdx`, map Slidev frontmatter/layouts/assets/notes/reveals/scripts to Honeydeck equivalents, and flag Vue/theme features that need manual React follow-up.

Expected behavior:

- All skills are discoverable by the `skills` CLI when users run `npx skills add <honeydeck-repo-url> --copy` or explicit `npx skills add <honeydeck-repo-url> --copy --skill honeydeck` / `--skill presentation-writing` / `--skill slidev-migration`.
- The `honeydeck` skill instructs agents to use Honeydeck documentation (`Readme.md` for package overview, `docs/getting-started.md` for first-run guidance, package/root `SPEC.md`, linked colocated `SPEC.md` files, `docs/deeper-dive.md`, `docs/slides.md`, `docs/steps-and-reveals.md`, `docs/customization.md`, `docs/configuration.md`, and related docs) as the source of truth when available.
- The `honeydeck` skill documents a local docs discovery order: current project's `node_modules/@honeydeck/honeydeck`, monorepo checkout `packages/honeydeck`, package-root checkout docs, then the public docs URL.
- The `presentation-writing` skill is framework-agnostic enough to help with presentation quality, while still working well alongside the Honeydeck skill.
- The `slidev-migration` skill instructs agents to inspect existing Slidev projects, preserve source files until the user approves cleanup, initialize or merge Honeydeck starter files, migrate common Slidev syntax to Honeydeck MDX/React, and document unsupported or approximated features.
- `honeydeck init` should offer to open the interactive skills installer for the generated project and make clear that accepting runs `npx skills add`.
- `honeydeck init` and `honeydeck skill` should delegate bundled skill selection, scope selection, and agent selection to the same `npx skills add <honeydeck-package-source> --copy` flow.
