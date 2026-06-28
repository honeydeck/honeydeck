# Honeydeck 🐝

> Build beautiful slide decks with MDX and React.

Honeydeck is an MDX + React presentation framework for creating polished, interactive slide decks from plain text. Start with Markdown, add React components when you need them, and present with built-in layouts, speaker notes, presenter mode, and PDF export.

## Quick start

Create a new Honeydeck deck with the published package:

```bash
npx @honeydeck/honeydeck init --name awesome-talk
cd awesome-talk
pnpm run dev
```

Open the local URL printed by the dev server, edit `deck.mdx`, and your slides update instantly.

## Your first deck

Decks are MDX files. Use `---` to separate slides and frontmatter to configure the deck or a slide.

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

Built-in layouts include `Blank`, `Default`, `Cover`, `Section`, `TwoCol`, `Image`, `ImageLeft`, and `ImageRight`.

## Common commands

```bash
pnpm run dev       # present locally with hot reload
pnpm run build     # build a static deck into dist/
pnpm run pdf       # export deck.pdf
```

## Use the Bee 🐝 theme

New decks use the clean default theme. To switch to the playful Bee theme:

1. In `styles.css`, import the Bee theme after the base theme:

```css
@import "tailwindcss";
@import "@honeydeck/honeydeck/theme.css";
@import "@honeydeck/honeydeck/themes/bee.css";
```

2. In the first frontmatter block of `deck.mdx`, use the Bee layouts:

```yaml
---
layouts: "@honeydeck/honeydeck/layouts/bee"
---
```

3. If you use `TwoCol`, import slots from the Bee layout path:

```mdx
import { Left, Right } from '@honeydeck/honeydeck/layouts/bee/TwoCol'
```

Restart `pnpm run dev`.

## Learn more

- [Honeydeck.dev](https://honeydeck.dev/docs)
- [Getting started](packages/docs/content/docs/(start)/getting-started.mdx)
- [Slides](packages/docs/content/docs/(core)/slides.mdx)
- [Configuration](packages/docs/content/docs/(core)/configuration.mdx)
- [Steps and reveals](packages/docs/content/docs/(core)/steps-and-reveals.mdx)
- [Components](packages/docs/content/docs/(components)/components.mdx)
- [Presenter mode](packages/docs/content/docs/(core)/presenter-mode.mdx)
- [PDF export](packages/docs/content/docs/(core)/pdf-export.mdx)
- [Package README](packages/honeydeck/Readme.md)

## For contributors

This repository also contains the Honeydeck CLI/runtime, docs site, and showcase deck. See [DEVELOPMENT.md](DEVELOPMENT.md) and [SPEC.md](SPEC.md) for monorepo development details. It's currently an experiment in Spec driven development.

## License

[MIT](LICENSE)
