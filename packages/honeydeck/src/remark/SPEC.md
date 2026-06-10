# Honeydeck Remark Transform Specification

> Observable behavior for code highlighting transforms.

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

### Visual Style

- Highlighted lines: normal brightness
- Non-highlighted lines: dimmed (reduced opacity)
- No background stripe

### Theme

Code highlighting colors come from Honeydeck's built-in light/dark syntax themes, not from Honeydeck CSS tokens. Honeydeck does not expose syntax theme configuration. The `--honeydeck-code-line-dim-opacity` token controls dimming of non-highlighted lines.
