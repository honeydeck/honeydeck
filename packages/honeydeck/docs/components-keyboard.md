# Keyboard

Use `<Keyboard>` to show one key or a shortcut in slide prose.

```mdx
import { Keyboard } from '@honeydeck/honeydeck'

Press <Keyboard>Esc</Keyboard> to close overview.

Advance with <Keyboard keys="Space" />.

Open command palette with <Keyboard keys={["Ctrl", "Shift", "P"]} />.
```

`keys` accepts a single value or an ordered array. When `keys` is omitted, `children` is rendered as one key. Array values render one `<kbd>` per key, separated by `+` by default:

```mdx
<Keyboard keys={["⌘", "K"]} />
<Keyboard keys={["Ctrl", "Alt", "Delete"]} separator=" " />
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `keys` | `ReactNode \| ReactNode[]` | — | Key label or ordered shortcut key labels. |
| `children` | `ReactNode` | — | Single key label when `keys` is omitted. |
| `separator` | `ReactNode` | `+` | Separator rendered between array entries. |
| `className` | `string` | — | Custom class for the outer wrapper. |

The component uses semantic `<kbd>` markup, is inline by default, uses Honeydeck theme styling, and does not add timeline steps.
