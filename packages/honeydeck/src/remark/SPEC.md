# Honeydeck Remark Transform Specification

> Observable behavior for timeline annotation and code highlighting transforms.

## Timeline Step Annotation

Honeydeck's remark pipeline assigns slide-local timeline metadata to built-in components before MDX is compiled.

Behavior:

- `<Reveal>` consumes one timeline step in document order and receives an internal `at` prop for runtime visibility. Author-authored `at` on `<Reveal>` is a compile error; use `<RevealWith at={n}>` for same-step synchronization.
- `<RevealGroup>` consumes one step per meaningful direct child/list item, including nested timeline gaps, and receives internal `at`/target metadata for runtime visibility. Author-authored `at` on `<RevealGroup>` is a compile error; use `<RevealWith at={n}>` for same-step synchronization.
- `<RevealWith>` consumes no timeline steps. It receives an internal resolved `at` prop based on either a same-slide `<Reveal name="...">` target or a literal numeric `at={n}` target.
- Named reveal targets are slide-local. Duplicate `<Reveal name="...">` values on the same slide are compile errors; reuse across slides is allowed.
- `<RevealWith target="...">` supports forward references to named reveals anywhere on the same slide.
- `<RevealWith>` requires exactly one of `target` or `at`; both and neither are compile errors.
- `Reveal` `name`, `RevealWith` `target`, and `RevealWith` `at` must be literal values. Empty names/targets, non-positive numeric `at`, and numeric `at` values greater than the slide's final step count are compile errors.
- `RevealWith at={n}` can target any existing slide timeline step, including code, Magic Code, `RevealGroup`, and `TimelineSteps` steps.
- Flow/block usages of `<Reveal>` and `<RevealWith>` receive an internal block wrapper marker; text/inline usages receive an internal inline wrapper marker so compiled HTML remains valid.

## Code Highlighting

### Syntax Highlighting

Honeydeck highlights fenced code blocks without author configuration. Unsupported or failed languages render as plain code using Honeydeck CSS tokens.

### Step-Through Syntax

````mdx
```ts {2|4|all}
const a = 1
const b = 2
console.log(a + b)
```
````

Syntax:

- `{2}` — highlight line 2 immediately; adds 0 timeline steps
- `{2-3}` — highlight lines 2 through 3 immediately; adds 0 timeline steps
- `{1,3}` — highlight lines 1 and 3 immediately; adds 0 timeline steps
- `{2-3|5|all}` — start with lines 2-3 active, then step to line 5, then all
- `|` separates code highlight groups; every group after the first adds one timeline step

### Behavior

- Stepped code blocks show the first metadata group immediately, including at slide step 0 when the block is visible
- Each later code group adds one timeline step
- `{1|3-4|6-7|all}` starts with line 1 active, then steps to lines 3-4, then lines 6-7, then all lines
- Each active code group highlights only the specified lines (non-cumulative)
- Non-highlighted lines are dimmed (`--honeydeck-code-line-dim-opacity`)
- Dimming is applied by Honeydeck runtime markup/styles independently of Tailwind utility generation
- Code steps participate in the same slide timeline as `Reveal` components
- Unsupported/failed languages render as plain code using Honeydeck CSS tokens
- Code blocks expose a hover/focus copy control that copies the original fenced code text, not the highlighted HTML

## Magic Code

Honeydeck supports **Magic Code** as built-in Markdown syntax for animated transitions between code states. Magic Code builds on Shiki Magic Code / Shiki Magic Move, but Honeydeck precompiles the highlighted token data at build time.

Canonical syntax:

`````mdx
````md magic-code {duration:500}
```ts
const count = 1
```

```ts
const count = 2
```
````
`````

Compatibility alias:

`````mdx
````md magic-move
```ts
const count = 1
```

```ts
const count = 2
```
````
`````

Rules:

- Magic Code is triggered only by an outer `md` fence whose first metadata token is `magic-code` or `magic-move`.
- `magic-code` is Honeydeck's canonical syntax. `magic-move` is a silent compatibility alias for Slidev migration.
- Documentation and generated examples use `magic-code`.
- The only supported block option is `{duration:<number>}` in milliseconds.
- Duration resolution is block option, then deck-level `magicCodeDuration`, then Honeydeck default `800`.
- Slide-level frontmatter does not configure Magic Code.
- Unknown outer extras/options are ignored. An explicit invalid `duration` is a compile error.
- Only inner fenced code blocks produce output. Other Markdown inside the Magic Code block is ignored.
- Zero inner code fences render nothing and add no timeline steps.
- One inner code fence renders one code state with normal Honeydeck code highlighting/step behavior.
- Two or more inner code fences render one animated code block backed by build-time precompiled Shiki Magic Move token data for Honeydeck's built-in light and dark syntax themes.
- Inner code fences keep normal Honeydeck code fence behavior, including language selection and line-highlight metadata.
- Inner code fences may use different languages, though animations are expected to look best when states use the same language.
- Magic Code uses the same visual treatment and copy affordance as normal Honeydeck code blocks.
- Copying copies the currently visible code text. Highlight-only steps copy the same code text; morph steps copy the active state's code text.

Timeline behavior:

- Each inner code fence contributes its normal line-highlight states.
- Magic Code advances through the current code state's line-highlight groups before morphing to the next code state.
- The target state's baseline line highlight is active immediately when the morph state becomes current.
- `total timeline states = sum(inner fence highlight groups)`.
- `timeline steps added = total timeline states - 1`.

Example:

`````mdx
````md magic-code
```ts {1|2}
const a = 1
const b = 2
```

```ts {all}
const sum = a + b
```
````
`````

Timeline:

1. First code state, line 1 highlighted
2. First code state, line 2 highlighted
3. Morph to second code state, all lines highlighted

### Visual Style

- Highlighted lines: normal brightness
- Non-highlighted lines: dimmed (reduced opacity)
- No background stripe
- Magic Code uses the same code block surface, syntax colors, typography, light/dark behavior, and copy button as normal code blocks
- Honeydeck ships the Shiki Magic Move transition CSS through its base theme CSS; deck authors do not import Magic Move CSS manually
- Magic Code does not render filename/title chrome in v1

### Theme

Code highlighting colors come from Honeydeck's built-in light/dark syntax themes, not from Honeydeck CSS tokens. Honeydeck does not expose syntax theme configuration. The `--honeydeck-code-line-dim-opacity` token controls dimming of non-highlighted lines.
