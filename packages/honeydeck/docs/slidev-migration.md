# Slidev migration

Coming from [Slidev](https://sli.dev)? Honeydeck ships an optional `slidev-migration` agent skill that can help an AI coding agent initialize a Honeydeck project and migrate a Slidev deck.

## Install the skill

During a new project init, choose the agent skills installer:

```bash
npx @honeydeck/honeydeck init --name my-talk --install-skill
```

For an existing project, run:

```bash
honeydeck skill
```

Or install from the Honeydeck repository when the repository URL is finalized:

```bash
npx skills add <honeydeck-repo-url> --copy --skill slidev-migration
```

The same `skills` flow lets you choose project or global installation.

## What it migrates

The skill guides an agent through the common Slidev-to-Honeydeck mapping:

| Slidev | Honeydeck |
| --- | --- |
| `slides.md` | `deck.mdx` |
| `pages/*.md` with `src:` includes | imported `.mdx` slide groups |
| `public/**` | `public/**` |
| `components/*.vue` | React `components/*.tsx` |
| `layouts/*.vue` or Slidev themes | Honeydeck layouts, layout maps, or kits |
| `<v-click>` / `<v-clicks>` | `<Reveal>` / `<RevealGroup>` |
| trailing note comments | `<Notes>` |
| `slidev`, `slidev build`, `slidev export` | `honeydeck dev`, `honeydeck build`, `honeydeck pdf` |

Advanced Slidev features such as Vue directives, `$clicks`, custom theme internals, Monaco/live-code blocks, and complex click positioning may need React-specific follow-up after the first migration pass.
