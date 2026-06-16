# Honeydeck Runtime Specification

> Observable behavior for timeline state, slide navigation, SPA behavior, and runtime errors.

## Timeline & Steps

### Concept

The **timeline** is a first-class Honeydeck concept. Each slide has a local timeline of steps. Code walkthroughs, Magic Code blocks, reveal components, and statically registered custom component steps all hook into the same timeline.

Fenced code blocks join the timeline when their metadata uses `{group|group}` step syntax. The first code group is the block's baseline active highlight and consumes no timeline step. Each later group consumes one timeline step.

Magic Code blocks join the same timeline. Each inner code fence contributes its normal code highlight states; Honeydeck advances through those highlight states before morphing to the next inner code fence. Magic Code step counting is `sum(inner fence highlight groups) - 1`.

### Timeline State

- Initial state: `stepIndex = 0` (no reveal or custom step content active)
- Stepped code blocks show their first metadata group immediately as their baseline state whenever the block is visible
- Magic Code blocks show their first inner code fence and its first metadata group immediately whenever the block is visible
- First reveal/custom timeline entry activates at `stepIndex = 1`
- For code walkthroughs and Magic Code inner code states, the second and later metadata groups activate at their assigned timeline steps
- Timeline entries are determined by document order (top-to-bottom)
- Compiler-injected or manually-authored `<Reveal at={n}>` is preserved and excluded from automatic step counting
- Timeline entries are flat within each slide, even when authored with nested
  components. A parent `<Reveal>` or `<RevealGroup>` target consumes its step
  first, then any nested `<Reveal>`, `<RevealGroup>`, or code walkthrough steps
  inside it are appended to the same slide timeline before the next sibling
  timeline target.
- Custom React components can participate by wrapping their usage in
  `<TimelineSteps steps={N}>`. The wrapper must be visible in slide MDX so the
  compiler can reserve those steps at build time.
- Timeline context exposes `isPdfFinalRender` for components that need a special
  all-open/all-visible rendering when PDF export captures one final-state page
  per slide. This flag is false during normal presentation mode and during
  `pdfSteps: all` step-by-step PDF export.

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

### Navigation

Steps and slides have separate navigation axes:

| Input | Action |
|-------|--------|
| `→` / `d` | Next step; if no next step, next slide at step 0 |
| `←` / `a` | Previous step; if at step 0, previous slide at final step |
| `↓` / `s` | Next slide directly (skip remaining steps) |
| `↑` / `w` | Previous slide directly |

Horizontal = detailed progression through timeline. Vertical = jump between slides.

### URL State

Hash-based routing preserves position and navigable application views:

```txt
/#/slideNumber/stepIndex
/#/slideNumber
/#/overview/slideNumber/stepIndex
/#/presenter/slideNumber/stepIndex
/#/theme
/#/layouts
/#/components
```

- Slide number is 1-based
- Step index is 0-based
- Missing step defaults to `0`
- Invalid or negative slide/step values clamp to slide 1 / step 0; out-of-range positive steps are accepted as “past final step”
- Overview routes encode the slide to scroll into view and the remembered step

Examples:

```txt
/#/1/0             → slide 1, initial state
/#/1/2             → slide 1, step 2
/#/3/0             → slide 3, initial state
/#/overview/3/1    → overview at slide 3, remembering step 1
```

Reloading or sharing the URL restores both slide and step. Slide numbers beyond the deck length clamp to the final slide. Reloading or sharing an overview URL restores overview with the encoded slide scrolled into view.

Honeydeck navigation is browser navigation. Every slide/step navigation, overview entry, overview slide selection, and reference route navigation creates a browser history entry. Browser Back therefore moves through the user's actual Honeydeck navigation path. Entering overview from `/#/3/1` pushes `/#/overview/3/1`; browser Back from overview returns to `/#/3/1` and closes overview.

Reference page routes intentionally do not encode slide or step. During one browser session, Honeydeck remembers the last visited audience slide route (`slide` view with slide number and step index). Entering or navigating within reference pages (`/#/theme`, `/#/layouts`, `/#/components`) must not reset that remembered route. A reference page "Back to slides" action returns to the remembered slide and step. If no previous audience slide route is known, such as on a direct load of `/#/theme`, it falls back to `/#/1/0`.

---

---

## Navigation

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `→` / `d` | Next step (crosses slide boundary); in overview, timeline navigation is disabled: arrow keys move overview selection and WASD are no-ops |
| `←` / `a` | Previous step (crosses slide boundary); in overview, timeline navigation is disabled: arrow keys move overview selection and WASD are no-ops |
| `↓` / `s` | Next slide; in overview, timeline navigation is disabled: arrow keys move overview selection and WASD are no-ops |
| `↑` / `w` | Previous slide; in overview, timeline navigation is disabled: arrow keys move overview selection and WASD are no-ops |
| `o` | Toggle overview mode |
| `p` | Open presenter mode (new window) |
| `f` | Toggle fullscreen |
| `Escape` | Exit overview; in reference pages, return to slides; browser-native Escape handles fullscreen exit |

### Navigation UI Bar

Shown in normal slide view only (not presenter/reference views).

- Positioned bottom-center on narrow mobile screens and bottom-left from wider breakpoints
- **Hidden by default** on desktop — appears on cursor hover near bottom edge
- **Always visible** on mobile/tablet portrait
- **Hidden by default** on mobile/tablet landscape — appears when the center tap zone is tapped, fades after roughly 3 seconds of idle time, and stays visible while being interacted with
- On narrow mobile screens, stays within the viewport by wrapping controls into compact groups instead of extending past the screen edge
- Contains:
  - Current slide number
  - Navigation arrows (step left/right)
  - Overview mode button
  - Layouts reference button (opens `/#/layouts` while preserving the current slide/step as the return target)
  - Docs website button (opens `https://honeydeck.dev` in a new tab)
  - Presenter mode button
  - Fullscreen button
  - Mobile text selection toggle (off by default, enables selecting slide content when needed)
  - Color mode switch (system → light → dark → system)
  - All icon-only controls expose explicit accessible names via `aria-label` and matching hover titles
  - Zoom reset button when slide zoom is greater than `1`

When `showSlideNumbers: true`, normal slide view also renders the current slide number as a single global viewer overlay aligned to the bottom-right corner of the slide canvas. The slide number overlay is not part of individual slide content and does not participate in slide transition animations. It renders only the current slide number, not a total count, as larger unobtrusive text without a background container and uses the deck theme's foreground color.

### Input Ownership

Navigation input is routed through a shared command abstraction used by audience, presenter, overview, reference pages, keyboard, touch, and button controls. Input handlers call semantic commands such as `nextStep`, `previousStep`, `nextSlide`, `previousSlide`, `openOverview`, `closeOverview`, `openReference`, `openPresenter`, `toggleNavBar`, and `resetZoom` instead of directly mutating route state.

Wheel and trackpad scroll never navigate slides. Scrollable content owns scroll input. If a touch/pointer gesture starts inside an interactive element (`button`, `a`, `input`, `textarea`, `select`, etc.), an element marked `data-honeydeck-no-swipe`, or an auto-detected scrollable ancestor before the deck/slide root, Honeydeck does not claim swipe navigation for that gesture. A scrollable ancestor is an element whose scroll dimensions exceed client dimensions and whose computed overflow allows `auto` or `scroll` on either axis. Scroll-owned gestures never hand off to slide navigation at scroll boundaries.

### Mobile/Touch

Normal slide view uses a five-zone tap model:

```txt
┌───────────────┐
│ Previous slide│
├─────┬───┬─────┤
│Prev │Nav│Next │
│step │bar│step │
├─────┴───┴─────┤
│  Next slide   │
└───────────────┘
```

- Left center zone → previous step
- Right center zone → next step
- Top zone → previous slide
- Bottom zone → next slide
- Center zone → toggle the navigation bar and never navigate slides
- Swipe left → next step (crosses slide boundary)
- Swipe right → previous step (crosses slide boundary)
- Swipe up → next slide
- Swipe down → previous slide
- Swipes use dominant axis and require roughly 50px movement
- Pinch gestures and slide zoom take precedence over tap and swipe navigation
- Slide content is not text-selectable by default on touch/mobile devices so taps and drags remain presentation controls; the navigation bar provides a mobile toggle to temporarily enable slide text selection. While selection mode is active, mobile tap/swipe/pinch presentation gestures pause and the navigation bar remains visible so the user can turn selection mode off.

Slide zoom is Honeydeck-controlled rather than browser page zoom:

- Pinch outward in normal slide view zooms the current slide content for readability
- Zoom applies a scale plus pan transform to the slide canvas while keeping browser layout stable
- Minimum zoom is `1`, maximum zoom is `5`, and double-tap may toggle between `1` and a readable preset around `2`
- When zoom is greater than `1`, dragging pans the slide, tap-zone slide/step navigation and swipe navigation are disabled, center tap still toggles the navigation bar, and nav bar buttons still work
- Navigating to another slide or step resets zoom to `1`
- Pinching back below roughly `1.05` resets zoom to `1`

---

---

## Build & Runtime Behavior

### Build System

Honeydeck owns the build/dev configuration. Users do not provide `index.html` or `vite.config.ts`.

Observable build/dev behavior:

- `honeydeck dev` starts a hot-reloading development server.
- `honeydeck build` produces a static single-page application.
- Project `public/` assets are served/copied at the web root.
- Project-local CSS, React components, layout maps, and static image imports work from the selected deck root.
- In dev, Honeydeck's package app shell may be served from outside the selected deck root, but Vite still allows the user's workspace root for normal dependency serving and pre-bundles Honeydeck runtime browser dependencies such as React, React DOM, and runtime icons.
- Built decks use hash-based routes and can be deployed to static hosts without server-side routing.
- The app shell applies the initial effective `data-honeydeck-color-mode` to `<html>` before mounting React so first-render browser defaults and generated assets match the deck mode.

### SPA Architecture

Build output is a single-page application. The app preserves client-side slide transitions, presenter sync, and step timeline state.

### Slide Transitions

Honeydeck includes a single subtle crossfade (~200ms) between slides. Disabled with:

```yaml
transition: false
```

### Aspect Ratio

Slides render at a fixed 1920px logical width. Height is derived from deck-level `aspectRatio` when it is a string ratio matching `N:N` (default `16:9` → `1080`, `4:3` → `1440`, etc.). Invalid or missing ratios fall back to `16:9`.

The slide canvas scales uniformly to fit the available stage. There is no viewport inset token: slides fill the viewport as much as their aspect ratio allows. Any remaining letterbox/pillarbox area is black.

PDF pages use the same 1920px-wide dimensions derived from deck-level `aspectRatio`, so exported pages match the deck ratio without stretching or letterbox/pillarbox space. During crossfades, Honeydeck paints a themed `bg-background` backdrop at the scaled slide size behind the slides to avoid flicker.

No per-slide ratio.

---

---

## Error Handling

### Runtime Slide Errors

Each slide is wrapped in a per-slide React `ErrorBoundary` in the main deck. A render error in one slide does not crash the whole presentation; other slides remain navigable.

- Dev mode: shows a full-slide error view with slide number, error message, stack trace, component stack, and `BombIcon`.
- Production mode: shows a minimal “Something went wrong” fallback with the slide number and `AlertTriangleIcon`.
- Errors are also logged to `console.error`.

`SlideCanvas` instances used by presenter/overview previews are not wrapped in this per-slide boundary.

### Invalid Layout Name

**Dev mode:** Logs a browser `console.warn` and falls back to the configured `defaultLayout`, then `Default`, then the first available layout.

```txt
Layout "Covr" not found in layout map. Falling back to "Default". Available layouts: Blank, Default, Cover, Section, TwoCol, Image, ImageLeft, ImageRight
```

**Build/PDF:** Production rendering throws a hard error with available layout names. The error does not include a slide number.

```txt
Error: Layout "Covr" not found in layout map.
Available layouts: Blank, Default, Cover, Section, TwoCol, Image, ImageLeft, ImageRight
```
