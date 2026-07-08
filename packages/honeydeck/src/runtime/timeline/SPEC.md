# Honeydeck Timeline Specification

> Observable behavior for the per-slide timeline, step visibility, and Magic transitions.

## Concept

The **timeline** is a first-class Honeydeck concept. Each slide has a local timeline of steps. Code walkthroughs, Magic Code blocks, reveal/fade components, and statically registered custom component steps all hook into the same timeline.

Fenced code blocks join the timeline when their metadata uses `{group|group}` step syntax. The first code group is the block's baseline active highlight and consumes no timeline step. Each later group consumes one timeline step.

Magic Code blocks join the same timeline. Each inner code fence contributes its normal code highlight states; Honeydeck advances through those highlight states before morphing to the next inner code fence. Magic Code step counting is `sum(inner fence highlight groups) - 1`.

## Timeline State

- Initial state: `stepIndex = 0` (no reveal or custom step content active)
- Stepped code blocks show their first metadata group immediately as their baseline state whenever the block is visible
- Magic Code blocks show their first inner code fence and its first metadata group immediately whenever the block is visible
- First reveal/fade/custom timeline entry activates at `stepIndex = 1`
- For code walkthroughs and Magic Code inner code states, the second and later metadata groups activate at their assigned timeline steps
- Timeline entries are determined by document order (top-to-bottom)
- Each authored `<Reveal>` or `<Fade>` adds one step to the slide timeline. Honeydeck injects an internal `at={n}` prop during compilation to connect each component to its assigned timeline step; `at` is not a user-facing API for step-producing components, and author-authored `at` values are build errors.
- `<Reveal>` content is visible when `stepIndex >= at`; `<Fade>` content is visible when `stepIndex < at`.
- `<Reveal name="...">` may name that reveal's assigned step for same-slide `<RevealWith target="...">` or `<FadeWith target="...">` synchronization. Reveal names are slide-local, literal, non-empty strings.
- `<RevealWith>` and `<FadeWith>` never add timeline steps. They sync with an existing step resolved either from `target="name"` on a same-slide `<Reveal>`, from numeric `target={n}`, or from literal numeric `at={n}` targeting an existing 1-based slide-local step.
- Reveal/fade components reserve hidden layout space by default; with `ephemeral`, hidden content renders `null` and reserves no space while presenter future previews still render a muted ghost.
- Timeline entries are flat within each slide, even when authored with nested components. A parent `<Reveal>` or `<RevealGroup>` target consumes its step first, then any nested reveal/fade group, reveal/fade, or code walkthrough steps inside it are appended to the same slide timeline before the next sibling timeline target. `<RevealGroup listRevealMode="nested">` also treats nested list items in direct child lists as timeline targets in depth-first document order.
- `<RevealWith>` and `<FadeWith>` must not contain nested timeline producers because they do not add steps themselves. Target them at sibling timeline steps instead.
- `<Fade>` and `<FadeGroup>` targets must not contain nested timeline producers because a faded parent would hide later nested steps. Put fade components inside reveal targets instead.
- Custom React components can participate by wrapping their usage in `<TimelineSteps steps={N}>`. The wrapper must be visible in slide MDX so the compiler can reserve those steps at build time.
- Timeline context exposes `isPdfFinalRender` for components that need a special all-open/all-visible rendering when PDF export captures one final-state page per slide. This flag is false during normal presentation mode and during `pdfSteps: all` step-by-step PDF export.

Example:

````mdx
<Reveal>
  Parent
  <Reveal>Nested detail</Reveal>
  ```ts {1|2}
  const a = 1
  const b = 2
  ```
</Reveal>
````

Timeline:

1. Parent reveal appears; nested code is visible with line 1 highlighted
2. Nested detail appears
3. Code highlights line 2

## Step Navigation

Steps and slides have separate navigation axes:

| Input | Action |
|-------|--------|
| `→` / `d` | Next step; if no next step, next slide at step 0 |
| `←` / `a` | Previous step; if at step 0, previous slide at final step |
| `↓` / `s` | Next slide directly (skip remaining steps) |
| `↑` / `w` | Previous slide directly |

Horizontal = detailed progression through timeline. Vertical = jump between slides.
