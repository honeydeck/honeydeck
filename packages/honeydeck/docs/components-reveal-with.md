# RevealWith

Use `<RevealWith>` when content should appear at the same timeline step as a named `<Reveal>` or any existing numeric slide step. It never adds a new step.

````mdx
import { Reveal, RevealWith } from '@honeydeck/honeydeck'

<Reveal name="intro">Intro appears first</Reveal>
<RevealWith target="intro">This appears with the intro reveal</RevealWith>

```ts {1|2|3}
const answer = 42
console.log(answer)
```

<RevealWith at={2}>This appears with step 2</RevealWith>
````

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `target` | `string` | — | Same-slide `<Reveal name="...">` target. Must be a literal non-empty string. Use exactly one of `target` or `at`. |
| `at` | `number` | resolved/injected | Existing 1-based slide-local timeline step. Must be a literal positive integer when authored. Use exactly one of `target` or `at`. |
| `children` | `ReactNode` | — | Content to reveal with the target step. |
| `className` | `string` | — | Custom class for styling or transitions. |
| `as` | `"div" | "span"` | injected | Wrapper element. Honeydeck injects this to keep valid MDX/HTML around block or inline content. |

## Behavior

- `RevealWith` is cumulative like `Reveal`: once visible, it stays visible.
- `target` supports forward references to named reveals later on the same slide.
- `at` can target any existing slide step, including a `RevealGroup` item, code highlight, Magic Code state, or `TimelineSteps` state.
- Hidden content reserves layout space and uses the same fade/future-preview behavior as `Reveal`.
- Invalid targets, duplicate reveal names, non-literal values, and out-of-range numeric steps are build errors.

See [Steps and reveals](steps-and-reveals.md#revealwith) for timeline ordering examples.
