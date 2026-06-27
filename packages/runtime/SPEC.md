# @honeydeck/runtime — Runtime Package Specification

`@honeydeck/runtime` owns Honeydeck runtime source that runs in browser decks: app shell, deck rendering, timeline contexts, built-in components, layouts, theme CSS, runtime views, and runtime public types.

## Public imports

Decks and custom components import runtime APIs from `@honeydeck/runtime`:

```ts
import { Reveal, TimelineSteps, useTimelineSteps } from '@honeydeck/runtime'
import { Left, Right } from '@honeydeck/runtime/layouts/TwoCol'
import '@honeydeck/runtime/theme.css'
```

## Ownership map

- Runtime behavior: [`src/runtime/SPEC.md`](src/runtime/SPEC.md)
- Runtime components: [`src/runtime/components/SPEC.md`](src/runtime/components/SPEC.md)
- Runtime views: [`src/runtime/views/SPEC.md`](src/runtime/views/SPEC.md)
- Layouts: [`src/layouts/SPEC.md`](src/layouts/SPEC.md)
- Theme CSS: [`src/theme/SPEC.md`](src/theme/SPEC.md)
- Public exports: [`src/SPEC.md`](src/SPEC.md)

## Package rules

- No dist build step is required; package exports TypeScript/TSX/CSS source.
- `react`, `react-dom`, and `tailwindcss` are peer dependencies.
- Runtime code must not import from `@honeydeck/cli`.
- App shell is loaded through `@honeydeck/runtime/app-shell` so deck-authored imports and shell imports share one runtime module graph.
