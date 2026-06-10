# Components

Honeydeck core components are explicit imports from `@honeydeck/honeydeck`. They are also exported from `@honeydeck/honeydeck/components`.

```mdx
import { Keyboard } from '@honeydeck/honeydeck'
```

## BrowserFrame

Use `<BrowserFrame>` to show a live iframe inside a macOS-style browser window.

```mdx
import { BrowserFrame } from '@honeydeck/honeydeck'

<BrowserFrame
  src="https://example.com"
  addressBar="example.com"
  fallbackImage="/example-fallback-light.png"
  fallbackDarkImage="/example-fallback-dark.png"
/>
```

The component renders browser chrome with macOS traffic-light controls and an optional address bar. It can show a light or dark fallback screenshot when the iframe cannot be loaded. It uses Honeydeck theme tokens for the frame, border, typography, and iframe surface.

Props:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `src` | `string` | Required | URL loaded by the iframe. Use an external `https://` URL or a local Vite-served route like `/demo.html`. |
| `addressBar` | `ReactNode` | — | Optional content shown in the address-bar field. Omit it to hide the input-like address field. |
| `fallbackImage` | `string` | — | Light/default screenshot shown when iframe loading fails or fallback mode is toggled on. |
| `fallbackDarkImage` | `string` | — | Dark-mode screenshot shown when fallback mode is active. Falls back to `fallbackImage` when omitted. |
| `fallbackAlt` | `string` | `Fallback preview` | Accessible alt text for fallback images. |
| `defaultFallback` | `boolean` | `false` | Starts in fallback mode instead of loading the iframe. Useful for deterministic demos, final-state screenshots, and PDF-friendly decks. |
| `aspectRatio` | `CSSProperties["aspectRatio"]` | `16 / 9` | Aspect ratio for the full browser window, including chrome. Accepts values such as `16 / 9`, `"4 / 3"`, or `1.6`. |
| `className` | `string` | — | Additional CSS class for the outer browser frame. |
| `iframeClassName` | `string` | — | Additional CSS class for the iframe element. Only applies while live iframe content is rendered. |

Standard iframe attributes such as `allow`, `sandbox`, `loading`, and `referrerPolicy` are forwarded.

When fallback mode is active, the browser frame shows a badge in the top chrome, visually aligned with the address bar. A fourth round control sits beside the macOS traffic-light controls and only becomes visible when the control itself is hovered or keyboard-focused; it toggles fallback mode.

## Keyboard

Use `<Keyboard>` to show one key or a shortcut in slide prose.

```mdx
Press <Keyboard>Esc</Keyboard> to close overview.

Advance with <Keyboard keys="Space" />.

Open command palette with <Keyboard keys={["Ctrl", "Shift", "P"]} />.
```

`keys` accepts a single value or an ordered array. When `keys` is omitted, `children` is rendered as one key. Array values render one `<kbd>` per key, separated by `+` by default:

```mdx
<Keyboard keys={["⌘", "K"]} />
<Keyboard keys={["Ctrl", "Alt", "Delete"]} separator=" " />
```

The component is inline by default, uses Honeydeck theme styling, supports `className`, and does not add timeline steps.
