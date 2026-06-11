# Honeydeck

> MDX and React-based presentation framework. Start with plain Markdown, grow to interactive React components.

Honeydeck helps you create polished, interactive presentations from plain-text MDX. Write slides in Markdown, add React components when you need them, and present with built-in layouts, speaker notes, presenter mode, and PDF export.

## Quick start

```bash
npx @honeydeck/honeydeck init --name awesome-talk
cd awesome-talk
npm run dev
```

Open the local URL printed by the dev server, edit `deck.mdx`, and your slides update instantly.

Decks are plain MDX files separated into slides with `---`; see the first deck example in [Getting started](docs/getting-started.md).

## Documentation

- [Getting started](docs/getting-started.md) - first deck, first commands, and the shortest path to presenting
- [Deeper dive](docs/deeper-dive.md) - CLI options, authoring patterns, imports, themes, architecture, and agent skills
- [Slides](docs/slides.md) - separators, multiple files, layouts, and assets
- [Configuration](docs/configuration.md) - deck-level and slide-level frontmatter
- [Steps and reveals](docs/steps-and-reveals.md) - timeline, reveal groups, code steps, and PDF behavior
- [Components](docs/components.md) - core Honeydeck components such as `BrowserFrame` and `Keyboard`
- [Customization](docs/customization.md) - themes, layout sets, Tailwind tokens, custom layouts, and layout demos
- [Navigation](docs/navigation.md) - keyboard, touch, overview mode, and URL state
- [Mobile and touch](docs/mobile.md) - mobile controls, touch gestures, and pinch zoom
- [Presenter mode](docs/presenter-mode.md) - notes, presenter window, sync, and mobile behavior
- [PDF export](docs/pdf-export.md) - options, color modes, and step handling
- [Local development](docs/local-development.md) - running Honeydeck from this repository
- [Skills](docs/skills.md) - optional agent skills for authoring, writing, and migration help
- [Slidev migration](docs/slidev-migration.md) - moving from Slidev with the bundled agent skill

## Common commands

```bash
honeydeck dev                 # start dev server on port 4200
honeydeck dev --open          # start and open the browser
honeydeck dev --deck talk.mdx # use a custom deck entry file

honeydeck build               # build a static SPA into dist/
honeydeck pdf                 # export deck.pdf
honeydeck pdf --steps all     # export every timeline step
honeydeck skill               # install optional Honeydeck agent skills
```

Honeydeck is built with MDX, React, Vite, and Tailwind v4.
