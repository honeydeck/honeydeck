# Reveal

Use `<Reveal>` when content should appear at the next timeline step.

```mdx
import { Reveal } from '@honeydeck/honeydeck'

<Reveal>Start with Markdown</Reveal>
<Reveal>Enhance with React</Reveal>
<Reveal>Export to PDF</Reveal>
```

Reveals are cumulative: once visible, they stay visible while you advance through the slide. Hidden reveal content reserves layout space, so the slide does not jump when the content appears.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | Content to reveal. |
| `name` | `string` | — | Optional slide-local target for [`RevealWith target="..."`](components-reveal-with.md). Must be a literal non-empty string. |
| `className` | `string` | — | Custom class for styling or transitions. |
| `at` | `number` | injected | Timeline step. Honeydeck injects this during compilation; author-authored values are build errors. Use [`RevealWith`](components-reveal-with.md) to sync with an existing step. |
| `as` | `"div" \| "span"` | injected | Wrapper element. Honeydeck injects this to keep valid MDX/HTML around block or inline content. |

## Behavior

- Reveals fade in.
- Hidden content uses `visibility: hidden` plus `opacity: 0`, not `display: none`.
- Nested reveals are supported.
- Inline reveals inside paragraphs render inline wrappers.
- Optional `name="..."` creates a slide-local target for [`RevealWith`](components-reveal-with.md).

See [Steps and reveals](steps-and-reveals.md) for timeline ordering examples.
