# RevealGroup

Use `<RevealGroup>` when a short sequence should appear one item at a time.

```mdx
import { RevealGroup } from '@honeydeck/honeydeck'

<RevealGroup>
  - First point
  - Second point
  - Third point
</RevealGroup>
```

Each meaningful direct child becomes one timeline step. Whitespace-only text children are ignored. Markdown, HTML, and JSX lists are special: each list item is revealed one after another while preserving the list container.

To reveal multiple elements together, wrap them in one direct child:

```mdx
<RevealGroup>
  <div>
    <h3>One idea</h3>
    <p>Supporting context appears with it.</p>
  </div>
  <div>Next idea</div>
</RevealGroup>
```

Nested timeline entries inside a group target are flattened after that target and before the following group target:

```mdx
<RevealGroup>
  <div>
    Parent item
    <Reveal>Nested detail</Reveal>
  </div>
  <div>Sibling item</div>
</RevealGroup>
```

**Timeline:**

1. Parent item appears
2. Nested detail appears
3. Sibling item appears
