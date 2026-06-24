# Notes

Use `<Notes>` to add presenter-only speaker notes to a slide.

<NotesPlayground />

```mdx
import { Notes } from '@honeydeck/honeydeck'

# Launch plan

- What changed
- Why it matters

<Notes>
  # Demo cue

  - Demo the interactive component.
  - Mention PDF export.
</Notes>
```

Notes render nothing in audience view, overview thumbnails, and normal PDF output. In presenter mode, Markdown inside `<Notes>` renders as formatted speaker notes, including headings, paragraphs, lists, links, inline code, code blocks, and block quotes.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | Speaker-note content collected by presenter mode. |

## Behavior

- `<Notes>` is a no-op outside presenter mode.
- Notes are collected from the current slide preview in presenter mode.
- Updating the slide notes updates the presenter notes panel.
- You can use Markdown inside Notes.

See [Presenter mode](presenter-mode.md) for the full presenter workflow.
