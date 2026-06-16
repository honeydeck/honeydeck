# Getting started

Honeydeck helps you create polished, interactive presentations using MDX. Write slides in Markdown, use different Layout, add React components when you need them, present using presenter mode, and export to PDF for easy sharing.

## Quick start

Create a deck:

```bash
npx @honeydeck/honeydeck init --name awesome-talk
cd awesome-talk
npm run dev
```

Open the local URL printed by the dev server, edit `deck.mdx`, and your slides update instantly.

Build or export when you are ready:

```bash
npm run build
npm run pdf
```

`npx @honeydeck/honeydeck` to see cli help.

## Your first deck

Decks are MDX files. The first frontmatter block [configures the deck](configuration.md) and opening slide. Later `---` separators start new slides.

```mdx
---
title: My Talk
layout: Cover
author: Your Name
---

# My Talk

Start with Markdown.

---
layout: TwoCol
---

import { Left, Right } from '@honeydeck/honeydeck/layouts/TwoCol'

<Left>

## Idea

- Plain text
- Easy to edit

</Left>

<Right>

## Demo

Add React when it helps.

</Right>
```

Use `layout:` to choose a slide layout. Built-in layouts include `Blank`, `Default`, `Cover`, `Section`, `TwoCol`, `Image`, `ImageLeft`, and `ImageRight`. See them in the [showacase/#/layouts](https://showcase.honeydeck.dev/#/layouts).

## What Honeydeck gives you

- MDX slides with GitHub-flavored Markdown
- Vite dev/build with hot reload
- Built-in layouts and theme tokens
- Tailwind v4-friendly styling
- Reveal steps, code step-through, and Magic Code transitions
- Presenter mode with speaker notes
- Overview mode, keyboard/touch navigation, and URL state
- PDF export through headless Chromium
- Optional Honeydeck agent skills for writing and migration help

## Navigating your deck

- Next or previous step using `→` `d` / `←` `a`
- Next or previous slide with `↓` `s` / `↑` `w`
- Overview of all slides `o`
- Presenter mode `p`

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

## Where to go next

- [Deeper dive](deeper-dive.md) - CLI options, authoring patterns, imports, themes, architecture, and agent skills in one follow-up guide
- [Slides](slides.md) - separators, multiple files, layouts, and assets
- [Configuration](configuration.md) - deck-level and slide-level frontmatter
- [Steps and reveals](steps-and-reveals.md) - timeline, reveal groups, code steps, and PDF behavior
- [Components](components.md) - core Honeydeck components such as `Reveal`, `TimelineSteps`, `BrowserFrame`, and `Keyboard`
- [Customization](customization.md) - themes, layout sets, Tailwind tokens, custom layouts, and layout demos
- [Navigation](navigation.md) - keyboard, touch, overview mode, and URL state
- [Mobile and touch](mobile.md) - mobile controls, touch gestures, and pinch zoom
- [Presenter mode](presenter-mode.md) - notes, presenter window, sync, and mobile behavior
- [PDF export](pdf-export.md) - options, color modes, and step handling
- [Local development](local-development.md) - running Honeydeck from this repository
- [Skills](skills.md) - optional agent skills for authoring, writing, and migration help
- [Slidev migration](slidev-migration.md) - moving from Slidev with the bundled agent skill

## Learn inside a running deck

During development, open the runtime reference pages to see:

- theme token names and live computed values
- layout previews with copyable usage snippets
- built-in component docs

See those in our [showcase](https://showcase.honeydeck.dev/#/layouts)

Honeydeck is built with MDX, React, Vite, and Tailwind v4.
