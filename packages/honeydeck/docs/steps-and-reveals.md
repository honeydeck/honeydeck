# Steps & Reveals

Honeydeck has a first-class step concept. Each slide has a timeline built from `Reveal`/`RevealGroup` components, custom component step blocks, and code highlight ranges, counted in document order.

## Timeline Model

- Slides start at **step 0** — no reveals or custom component steps active.
- Stepped code blocks show their first highlight group immediately whenever the block is visible.
- Each `Reveal`, `RevealGroup` child, `TimelineSteps` block, or code highlight group after the first adds a step.
- All step-producing elements share one slide-local timeline.
- Nested step-producing elements are flattened into that same timeline. A parent
  reveal target appears first; nested reveals, reveal groups, and code highlight
  ranges appear after the parent and before the next sibling target.

## Reveal

```mdx
import { Reveal } from '@honeydeck/honeydeck'

# Why Honeydeck?

<Reveal>Start with Markdown</Reveal>

<Reveal>
  Add <strong>interactive React</strong> when needed
</Reveal>

<Reveal>Export to PDF</Reveal>
```

### Behavior

- **Cumulative** — once visible, content stays visible for the rest of the slide.
- **Layout-stable** — hidden content reserves space (`opacity: 0` / `visibility: hidden`, not `display: none`).
- **Default effect** — fade-in. Customize with `className` and Tailwind/CSS.

## RevealGroup

Reveals each direct child as its own step. If a direct child is a list, each
list item is revealed as its own step:

```mdx
import { RevealGroup } from '@honeydeck/honeydeck'

<RevealGroup>
  - Markdown-first
  - React-powered
  - PDF-ready
</RevealGroup>
```

To reveal multiple elements together, wrap them in a single `Reveal` instead.

Nested reveals and code walkthroughs work inside group items:

````mdx
<RevealGroup>
  <div>
    Parent item
    <Reveal>Nested detail</Reveal>
  </div>
  <div>
    Code item
    ```ts {1|2}
    const a = 1
    const b = 2
    ```
  </div>
</RevealGroup>
````

Timeline:

1. Parent item appears
2. Nested detail appears
3. Code item appears with line 1 highlighted
4. Code highlights line 2

## Custom Component Steps

Use `TimelineSteps` when an imported React component should control part of
the slide timeline, such as an accordion, tab set, or diagram walkthrough:

```mdx
import { Reveal, TimelineSteps } from '@honeydeck/honeydeck'
import { AccordionDemo } from './AccordionDemo'

<Reveal>Before the custom component</Reveal>

<TimelineSteps steps={3}>
  <AccordionDemo />
</TimelineSteps>

<Reveal>After the custom component</Reveal>
```

Inside the custom component:

```tsx
import { useTimelineSteps } from '@honeydeck/honeydeck'

export function AccordionDemo() {
  const { phase, stepIndex, stepCount, isPdfFinalRender } = useTimelineSteps()
  // Open section stepIndex - 1 when phase is "active".
  // Open all sections when isPdfFinalRender is true.
}
```

`TimelineSteps` must be written in slide MDX with a literal positive integer
`steps` value. Rendering it only inside an imported TSX component does not
register steps, because Honeydeck counts the timeline at build time.

When PDF export renders one final-state page per slide (`pdfSteps: final`),
`useTimelineSteps()` exposes `isPdfFinalRender: true`. Step-driven custom
components can use that to render a PDF-specific final composition, such as an
accordion with every section open. In `pdfSteps: all`, the flag stays false
because each step is captured as its own page.

## Code Step-Through

Code blocks support highlight ranges that participate in the same timeline:

````mdx
```ts {2-3|5|all}
const a = 1
const b = 2
const c = 3
console.log(a + b)
console.log(c)
```
````

- `{2-3|5|all}` — starts with lines 2-3 active, then steps to line 5, then all lines.
- Index starts at 1.
- The first group is the baseline highlight and adds 0 timeline steps; every later group adds 1 timeline step.

### Code Step Behavior

- **Baseline:** The first metadata group is active immediately, including at slide step 0 when the block is visible.
- **Non-cumulative:** Only the lines specified for the active group are highlighted; previous highlights don't persist.
- **Dim approach:** Non-highlighted lines are dimmed (controlled by `--honeydeck-code-line-dim-opacity: 0.4`).
- **Shiki at build time:** No runtime JS cost for syntax highlighting.

## Mixed Timeline Example

````mdx
# Demo

```ts {2|4|all}
const a = 1
const b = 2
console.log(a + b)
```

<Reveal>Now notice the output</Reveal>
````

Timeline:
1. Slide starts with code line 2 highlighted
2. Code highlights line 4
3. Code highlights all lines
4. Reveal appears

## PDF Export of Steps

Controlled by deck-level `pdfSteps` setting:

| Value | Behavior |
|-------|----------|
| `final` (default) | Each slide appears once with all reveals visible, code at final highlight |
| `all` | Each step state becomes a separate PDF page |
