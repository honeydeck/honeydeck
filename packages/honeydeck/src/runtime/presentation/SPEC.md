# Honeydeck Presentation Mode Specification

> Observable behavior for presenter mode, presenter sync, and the Presentation API.

## Activation

- Keyboard shortcut `p` (opens presenter mode in the current tab)
- Navigation controls button on `md` and wider screens
- Direct URL: `/#/presenter/1/0`

## Deactivation

- Keyboard shortcut `p` exits presenter mode back to audience slide view at the same slide/step.
- Keyboard shortcut `Escape` exits presenter mode back to audience slide view at the same slide/step.

## UI Layout

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
- Presenter slide previews use the same themed slide-canvas background and foreground color behavior as the audience view, so transparent layouts still show the effective light/dark deck colors.
- Presenter previews render code highlight states statically without line-enter animations, so timer ticks and preview rerenders do not flicker highlighted code lines.
- In the Next preview, reveal content from later timeline steps is visible at reduced opacity so the speaker can see what is still coming on that slide. Audience view and the Current preview keep future steps hidden.
- When no next timeline state exists (final step of the final slide), the Next preview shows a placeholder (`No next step`) instead of trying to render a missing slide.

## Presenter overview

Presenter mode supports the same slide overview as the audience view, rendered inside the current-slide cell.

- Pressing `o` while in presenter mode navigates to `/#/presenter/overview/<slideNumber>/<stepIndex>` and replaces the `Current` slide preview with a thumbnail grid.
- The overview uses the same `OverviewView` component as the audience view; only the surrounding container differs. Deck wraps the audience overview in a full-screen overlay, while presenter mode places it inside the current-slide cell.
- Arrow keys move the selection within the grid; WASD timeline shortcuts are disabled while the overview is open.
- `Enter` or clicking a thumbnail jumps to that slide at step 0 and returns to the plain presenter route (`/#/presenter/<slide>/0`).
- Clicking or pressing `Enter` on the already-current slide does nothing.
- `o` toggles the overview closed.
- `Escape` closes the overview and returns to `/#/presenter/<slide>/<step>`; pressing `Escape` again exits presenter mode entirely.
- `p` exits presenter mode entirely even if the overview is open.
- `b` (blank screen) remains active while the overview is open.
- The overview panel is scroll-owned; scrolling inside it never navigates slides.
- Jumping to a different slide from the overview broadcasts a `navigate` sync message to audience/cast views as usual.

## Presenter Responsiveness

Presenter mode uses a two-column preview area (`Current` larger, `Next` smaller), a notes panel, and a bottom status/action bar on `md` and wider screens. Below Tailwind's `md` breakpoint, presenter mode is not supported: direct presenter URLs show a full-page hint that presenter mode is not supported on mobile and provide a button back to the same slide/step in audience view.

## Presentation Timer

- Idle state shows a `Start timer` button.
- Starting changes to running state, displaying elapsed time as `MM:SS` or `H:MM:SS`.
- In running state, clicking the elapsed time or pause action pauses the timer.
- In paused state, controls let the presenter continue, restart from zero, or close/reset the timer back to idle.

## Blank Screen

- Pressing `b` toggles the audience screen to black; pressing `b` again restores the normal view.
- A blank screen button in the bottom action bar provides the same toggle.
- While blanked, the presenter sees a `Screen blanked (b)` indicator overlay.
- The blank-screen state is broadcast via both `BroadcastChannel` and the Presentation API cast connection as a `blank-screen` sync message with `mode: "black" | "off"`.
- When the presenter disconnects, audience windows automatically unblank.

## Audience Sync

Presenter mode and audience view synchronize via `BroadcastChannel` and the Presentation API:

- Same browser/profile BroadcastChannel sync remains available when casting is unsupported or unavailable
- Presenter mode is the controller
- Audience view listens for navigation updates, presenter color mode changes, and blank-screen commands
- Late-opening audience tabs request the current presenter position via a `sync-request` / `sync-response` handshake as soon as a receiver connection is available, so they sync immediately instead of waiting for the next presenter move
- Presence messages (`presenter-connected` / `presenter-disconnected`) are broadcast
- When the Presentation API is supported, presenter mode can cast the audience view to a secondary display; the receiver asks for the current route when a connection becomes available and presenter replies with a `sync-response` so the cast audience resyncs even if it missed the first `navigate` message
- Audience sync ignores navigation while the audience window is in the docs/reference view
- If sync is unavailable, both still work independently
