# Honeydeck Runtime Views Specification

> Observable behavior for presenter mode, overview mode, and built-in reference pages.

## Presenter Mode

### Activation

- Keyboard shortcut `p` (opens presenter mode in the current tab)
- Navigation controls button on `md` and wider screens
- Direct URL: `/#/presenter/1/0`

### Deactivation

- Keyboard shortcut `p` exits presenter mode back to audience slide view at the same slide/step.
- Keyboard shortcut `Escape` exits presenter mode back to audience slide view at the same slide/step.

### UI Layout

```txt
┌──────────────────────────────────────────┐
│  ┌──────────────────┐  ┌──────────┐      │
│  │                  │  │          │      │
│  │     Current      │  │   Next   │      │
│  │     (larger)     │  │ (smaller)│      │
│  │                  │  │          │      │
│  └──────────────────┘  └──────────┘      │
│                                          │
│  Notes:                                  │
│  - Remember to demo the sparkle button   │
│  - Mention PDF export                    │
│                                          │
│  Slide 3/12 · Step 2/4  12:34  Timer 1:23  [Open] │
└──────────────────────────────────────────┘
```

Includes:
- Current slide preview (larger)
- Next timeline-state preview (smaller): the next step on the current slide when one exists, otherwise the next slide at step 0
- Speaker notes for current slide, with Markdown formatting from `<Notes>` rendered as compact presenter prose
- Slide/step counter
- Clock (wall clock)
- Elapsed presentation timer sits next to the slide/step counter on the left side of the bottom bar and has idle/running/paused states. Idle shows a start action. Running shows a prominent elapsed display plus pause action. Paused shows elapsed time plus continue, restart-from-zero, and close/reset actions.
- Button to open audience view in new tab, preserving the current slide/step and deck base path
- Color mode cycle button (system → light → dark → system). Presenter color mode changes also sync to BroadcastChannel audience views and Presentation API cast receivers.
- Blank screen toggle button and `b` keyboard shortcut. While blanked, the presenter sees a `Screen blanked (b)` indicator and audience/cast views see a black screen.
- Button to cast the audience view to a secondary display when the Presentation API is supported. Unsupported browsers keep a visibly disabled-looking control in the action row; it does not render extra inline feedback, and its hover title/accessible label explains that Presentation API casting is unavailable. Active casting can be stopped from the same control.
- Timeline keyboard shortcuts (`→`/`←`/`↓`/`↑`, `d`/`a`/`s`/`w`) update the presenter route and keep the window in presenter mode on supported desktop layouts.
- Presenter notes are scroll-owned regions: wheel, trackpad, touch scroll, and swipe gestures that start in notes scroll notes and never navigate slides, even at scroll boundaries.
- Code step-through previews use the same timeline state as audience view, so the Next preview shows the upcoming highlighted code step.
- Presenter previews render code highlight states statically without line-enter animations, so timer ticks and preview rerenders do not flicker highlighted code lines.
- In the Next preview, reveal content from later timeline steps is visible at reduced opacity so the speaker can see what is still coming on that slide. Audience view and the Current preview keep future steps hidden.
- When no next timeline state exists (final step of the final slide), the Next preview shows a placeholder (`No next step`) instead of trying to render a missing slide.

### Presenter Responsiveness

Presenter mode uses a two-column preview area (`Current` larger, `Next` smaller), a notes panel, and a bottom status/action bar on `md` and wider screens. Below Tailwind's `md` breakpoint, presenter mode is not supported: direct presenter URLs show a full-page hint that presenter mode is not supported on mobile and provide a button back to the same slide/step in audience view.

### Presentation Timer

- Idle state shows a `Start timer` button.
- Starting changes to running state, displaying elapsed time as `MM:SS` or `H:MM:SS`.
- In running state, clicking the elapsed time or pause action pauses the timer.
- In paused state, controls let the presenter continue, restart from zero, or close/reset the timer back to idle.

### Blank Screen

- Pressing `b` toggles the audience screen to black; pressing `b` again restores the normal view.
- A blank screen button in the bottom action bar provides the same toggle.
- While blanked, the presenter sees a `Screen blanked (b)` indicator overlay.
- The blank-screen state is broadcast via both `BroadcastChannel` and the Presentation API cast connection as a `blank-screen` sync message with `mode: "black" | "off"`.
- When the presenter disconnects, audience windows automatically unblank.

### Audience Sync

Presenter mode and audience view synchronize via `BroadcastChannel` and the Presentation API:

- Same browser/profile BroadcastChannel sync remains available when casting is unsupported or unavailable
- Presenter mode is the controller
- Audience view listens for navigation updates, presenter color mode changes, and blank-screen commands
- Late-opening audience tabs request the current presenter position via a `sync-request` / `sync-response` handshake as soon as a receiver connection is available, so they sync immediately instead of waiting for the next presenter move
- Presence messages (`presenter-connected` / `presenter-disconnected`) are broadcast
- When the Presentation API is supported, presenter mode can cast the audience view to a secondary display; the receiver asks for the current route when a connection becomes available and presenter replies with a `sync-response` so the cast audience resyncs even if it missed the first `navigate` message
- Audience sync ignores navigation while the audience window is in the docs/reference view
- If sync is unavailable, both still work independently

---

---

## Overview Mode

Toggled via `o` or the overview button. Overview is also directly addressable as `/#/overview/<slideNumber>/<stepIndex>`.

- Responsive grid of rendered slide thumbnails
- Overview appears over the current slide with a translucent themed background (`bg-background`) and backdrop blur so the active slide remains softly visible behind the grid
- Desktop thumbnails render the first step of each slide at a fixed visual width (360px) using `SlideCanvas`
- Mobile overview is a responsive page with a fixed two-column grid; two columns are the minimum supported mobile overview density
- Future reveal steps are visible at reduced opacity in thumbnails so authors can see what each slide will contain by the end
- The current slide gets a `Current` badge; desktop keyboard selection gets the stronger accent-color outline. Mobile overview does not show a separate focused-slide indicator because compact padding makes that indicator visually noisy.
- Click or tap a thumbnail to jump to that slide, reset to step 0, and exit overview by creating a new slide history entry
- Browser Back from overview closes overview by returning to the previous route
- Overview scroll is scroll-owned: wheel, trackpad, touch scroll, and swipe gestures that start in the overview grid scroll the grid and never navigate slides, even at scroll boundaries
- Overview does not handle pinch gestures; pinch zoom is only supported on slides
- The overview header is sticky and uses a blurred translucent themed background while the slide grid scrolls underneath
- On entering overview, the route/current slide is scrolled into view
- **Timeline navigation is disabled** — arrow keys are repurposed for overview grid selection; WASD are no-ops
- Keyboard in overview:
  - Arrow keys move selection within the rendered grid; vertical movement uses the actual measured column count so it stays correct after initial layout and window resizes while overview is open
  - Pressing Up while the selected thumbnail is already in the topmost rendered row keeps the current selection instead of jumping to the first slide
  - Pressing Down while the selected thumbnail is already in the bottommost rendered row keeps the current selection instead of jumping to the last slide
  - Overview gives a short visual boundary nudge when Up or Down cannot move because the selection is already at the top or bottom row
  - Keyboard navigation keeps the selected thumbnail smoothly scrolled into view, with margin so the selection is not flush against the viewport edge; if repeated key presses change the selection while a scroll animation is running, the new scroll target takes over instead of queueing behind the previous animation
  - Enter jumps to selected slide, resets to step 0, exits overview, and creates a new slide history entry
  - `o` toggles (also exits) overview
  - Escape exits overview
  - Overview button in nav bar exits overview

---

---

## Reference Pages

Built-in reference pages start at `/#/theme`. Included in both dev and production builds.

User-facing product copy should call this area "reference pages". Theme, layout, and component customization is described in [Customization — Theme CSS, Layout Maps, Components](../../layouts/SPEC.md#customization--theme-css-layout-maps-components).

### Routes

```txt
/#/theme                  → deep link to theme tokens tab
/#/layouts                → deep link to layouts tab
/#/components             → deep link to built-in components tab
```

### Returning to Slides

Reference pages include a "Back to slides" button. It returns to the last visited audience slide and step from the current browser session. Pressing `Escape` on any reference page performs the same return-to-slides action, unless focus is in an editable field. Reference tab changes and theme/layout/component deep links keep the same return target. Directly opening or reloading a reference page without a known previous slide falls back to slide 1, step 0.

The reference header shows only Theme tokens, Layouts, and Components tabs. It also provides an always-underlined external Docs link to `https://honeydeck.dev` with an icon indicating that it opens a new tab.

### Theme Tab

Displays all `--honeydeck-*` CSS tokens with:

- Current computed values
- Default values from `base.css`
- Descriptions when available

### Layouts Tab

Shows one card for each layout currently available to the deck author, i.e. every key in the active layout map (`layouts:` or built-in fallback), regardless of whether a slide currently uses it:

- Visual preview rendered from the layout's `demo` export when statically discoverable
- "No demo MDX provided" hint when no static demo MDX is discovered
- Usage reference with visibly tab-like controls:
  - `Usage` shows a copyable MDX snippet from the layout demo's explicit `mdx` field
  - `Props` shows slide frontmatter fields accepted by that layout, including property name, required marker, type, and description
  - Active/inactive states must read as tabs, not plain text links
- The copy action in the usage reference must look and behave like a button, with clear affordance and copied feedback

Layout prop docs are statically extracted from the layout component's `LayoutProps<Frontmatter>` type. Property descriptions come from JSDoc comments on the frontmatter type fields. If no layout-specific frontmatter is discovered, the `Props` tab still documents the required `layout` selector.

### Components Tab

Shows generated documentation for each public built-in component exported from `@honeydeck/honeydeck/components`, discovered from the component barrel at build time. Unlike the layouts tab, components are primarily documented with prose and usage examples rather than visual previews:

- A side navigation lists all discovered built-in components and scrolls to the matching section
- Each component appears as a full-width documentation section, one below another
- The info section comes from the exported component declaration's JSDoc comment, interpreted as Markdown/MDX
- Usage examples live in that component JSDoc comment, usually as fenced `mdx` code blocks
- Params are generated from the component's exported props type or interface, including prop names, TypeScript type text, required/optional state, prop JSDoc descriptions, and default values inferred from destructured parameter defaults when possible
- The component params table gives most horizontal space to the Description column; Param, Type, and Default columns stay narrower and wrap when needed
- Components without a docs comment or exported props type still appear with a helpful fallback
- Non-component exports such as hooks are skipped from the generated section list
