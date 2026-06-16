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
| `className` | `string` | — | Custom class for styling or transitions. |
| `at` | `number` | injected | Timeline step. Honeydeck injects this during compilation; manual use is an escape hatch. |
| `as` | `"div" \| "span"` | injected | Wrapper element. Honeydeck injects this to keep valid MDX/HTML around block or inline content. |

## Behavior

- Reveals fade in.
- Hidden content uses `visibility: hidden` plus `opacity: 0`, not `display: none`.
- Nested reveals are supported.
- Inline reveals inside paragraphs render inline wrappers.

See [Steps and reveals](steps-and-reveals.md) for timeline ordering examples.
