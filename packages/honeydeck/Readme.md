# Honeydeck

> MDX and React-based presentation framework. Start with plain Markdown, grow to interactive React components.

Honeydeck helps you create polished, interactive presentations from plain-text MDX. Write slides in Markdown, add React components when you need them, and present with built-in layouts, speaker notes, presenter mode, and PDF export.

## Quick start

```bash
npx @honeydeck/honeydeck init --name awesome-talk
cd awesome-talk
pnpm run dev
```

Open the local URL printed by the dev server, edit `deck.mdx`, and your slides update instantly.

Decks are plain MDX files separated into slides with `---`; see the first deck example in [Getting started](https://honeydeck.dev/docs/getting-started).

## Documentation

- [Getting started](https://honeydeck.dev/docs/getting-started) - first deck, first commands, and the shortest path to presenting
- [Deeper dive](https://honeydeck.dev/docs/deeper-dive) - CLI options, authoring patterns, imports, themes, architecture, and agent skills
- [Slides](https://honeydeck.dev/docs/slides) - separators, multiple files, layouts, and assets
- [Configuration](https://honeydeck.dev/docs/configuration) - deck-level and slide-level frontmatter
- [Steps and reveals](https://honeydeck.dev/docs/steps-and-reveals) - timeline, reveal groups, code steps, Magic Code, and PDF behavior
- [Components](https://honeydeck.dev/docs/components) - core Honeydeck components such as `Reveal`, `RevealWith`, `BrowserFrame`, and `Keyboard`
- [Customization](https://honeydeck.dev/docs/customization) - themes, layout sets, Tailwind tokens, custom layouts, and layout demos
- [Navigation](https://honeydeck.dev/docs/navigation) - keyboard, touch, overview mode, and URL state
- [Mobile and touch](https://honeydeck.dev/docs/mobile) - mobile controls, touch gestures, and pinch zoom
- [Presenter mode](https://honeydeck.dev/docs/presenter-mode) - notes, presenter window, sync, and mobile behavior
- [PDF export](https://honeydeck.dev/docs/pdf-export) - options, color modes, and step handling
- [Local development](https://honeydeck.dev/docs/local-development) - running Honeydeck from this repository
- [Skills](https://honeydeck.dev/docs/skills) - optional agent skills for authoring, writing, and migration help
- [Slidev migration](https://honeydeck.dev/docs/slidev-migration) - moving from Slidev with the bundled agent skill

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
