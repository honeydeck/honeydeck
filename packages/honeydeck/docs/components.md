# Components

Honeydeck core components are explicit imports from `@honeydeck/honeydeck`. They are also exported from `@honeydeck/honeydeck/components`.

```mdx
import { Reveal, RevealWith, RevealGroup, TimelineSteps, ListStyle, Keyboard, BrowserFrame, Notes } from '@honeydeck/honeydeck'
```

Use these pages as the component reference:

| Component | Use it for |
| --- | --- |
| [`Reveal`](components-reveal.md) | Show content at a specific slide timeline step. |
| [`RevealWith`](components-reveal-with.md) | Show content with an existing reveal or numeric slide step without adding another step. |
| [`RevealGroup`](components-reveal-group.md) | Reveal each direct child or list item one after another, with optional nested-list reveals. |
| [`TimelineSteps`](components-timeline-steps.md) | Reserve timeline steps for an imported custom React component. |
| [`ListStyle`](components-list-style.md) | Style Markdown, HTML, or JSX lists with no markers or custom markers. |
| [`Keyboard`](components-keyboard.md) | Render semantic inline keyboard keys and shortcuts. |
| [`BrowserFrame`](components-browser-frame.md) | Show a live iframe or fallback screenshot inside browser chrome. |
| [`Notes`](components-notes.md) | Add formatted speaker notes for presenter mode. |

For broader timing concepts, see [Steps and reveals](steps-and-reveals.md). For custom components and layouts, see [Customization](customization.md).
