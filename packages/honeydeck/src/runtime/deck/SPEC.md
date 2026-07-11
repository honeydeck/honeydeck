# Honeydeck Deck Specification

> Observable behavior for the deck runtime context, slide canvas, transitions, aspect ratio, and runtime errors.

## Consumer Runtime Context

`@honeydeck/honeydeck` exports `useHoneydeck()` for deck authors using custom components and custom layouts. Calling it outside a Honeydeck presentation runtime throws `useHoneydeck must be used inside a Honeydeck presentation runtime.`

`@honeydeck/honeydeck` also exports `useSlideScale()` for components and layouts that need the current rendered slide scale. It returns the scale factor applied to the logical slide canvas in the current render surface.

The hook returns a nested object:

- `config`: resolved deck-level config with Honeydeck defaults applied and unknown authored keys preserved
- `currentSlide.index`: 1-based current slide number, matching the URL
- `currentSlide.step`: 0-based current step index, matching the URL
- `currentSlide.maxSteps`: number of timeline steps on the current slide
- `currentSlide.layout`: layout map key for the current slide
- `currentSlide.layoutProps`: parsed slide frontmatter handed to the layout as `frontmatter`
- `slideWidth`: logical slide canvas width in pixels after resolving deck `aspectRatio`
- `slideHeight`: logical slide canvas height in pixels after resolving deck `aspectRatio`
- `mode`: effective current color mode, either `"light"` or `"dark"`

The context is available to slide content, custom layouts, overview thumbnails, and presenter previews. In presenter mode and preview surfaces, it describes the route's current slide/step, not the thumbnail's own preview target.

## SPA Architecture

Build output is a single-page application. The app preserves client-side slide transitions, presenter sync, and step timeline state.

### Audience overview overlay

Audience overview mode (`/#/overview/<slideNumber>/<stepIndex>`) renders the shared `OverviewView` component as a contained panel inside a full-screen Deck overlay wrapper. The wrapper supplies the fixed positioning, z-index, translucent themed background (`bg-background`), and backdrop blur. The `OverviewView` component itself knows nothing about full-screen overlay layout, which lets the same component render inside the smaller current-slide cell in presenter mode.

## Slide Transitions

Honeydeck uses a named slide transition system. Deck-level frontmatter sets defaults, and slide-level frontmatter overrides the transition **into that slide**:

```yaml
transition: fade
transitionDuration: 200
transitionEasing: ease
```

Built-in transition names are `fade`, `none`, `slide-left`, and `magic`. Any other string is exposed as a custom CSS hook on the participating slide layers. Legacy `transition: true` maps to `fade`, and `transition: false` maps to `none`.

During slide navigation, Honeydeck keeps the outgoing and incoming slide layers mounted inside a scaled slide-sized clipping viewport, applies `honeydeck-slide-layer`, `honeydeck-transition-{name}`, and either `honeydeck-transition-enter` or `honeydeck-transition-exit` only to those two layers, then clears transition state after the configured duration. Transition visuals are clipped to the slide canvas area and must not animate into letterbox or pillarbox bars around the slide. If the next transition is `none` or navigation is interrupted, stale transition state is cleared/replaced so old slides do not remain visible. Outgoing layers are visible during the transition but have pointer events disabled. The built-in `fade` transition uses keyframes and, when a fade is interrupted, starts the next fade from the participating layers' current computed opacity so quick back-and-forth navigation stays close to the old opacity-transition behavior.

The built-in `magic` transition is forward-only FLIP behavior for explicitly tagged elements. On forward navigation into a slide with `transition: magic`, Honeydeck measures only elements with `data-magic-id` in the outgoing and incoming slide DOM. Equal IDs move through fixed overlay clones; IDs present only on the outgoing slide fade out through clones; IDs present only on the incoming slide fade in through clones. Untagged slide content still crossfades as part of the slide layers. Honeydeck does not diff arbitrary DOM, text, or tag names, and equal text with different IDs must not match. During magic transitions, Honeydeck hides original tagged elements on both participating slides, copies computed styles recursively onto overlay clones, removes IDs from clones to avoid duplicate document IDs, and accounts for current slide scale when sizing and transforming clones. The magic overlay restores originals and removes itself when animations finish, when navigation interrupts the transition, or after a short timeout fallback. If clone or Web Animations API setup fails, Honeydeck leaves tagged originals visible and uses the layer crossfade. Backward navigation with `transition: magic` falls back to the layer crossfade without overlay matching.

Participating slide layers receive CSS variables: `--honeydeck-transition-duration`, `--honeydeck-transition-easing`, and `--honeydeck-transition-direction` (`1` forward, `-1` backward). Built-in `slide-left` uses the direction variable so backward navigation reverses direction. Custom transition CSS can use the same variable for opt-in reverse awareness. Reduced-motion preferences disable slide transition animations.

## Aspect Ratio

Slides render at a fixed 1920px logical width. Height is derived from deck-level `aspectRatio` when it is a string ratio matching `N:N` (default `16:9` → `1080`, `4:3` → `1440`, etc.). Invalid or missing ratios fall back to `16:9`.

The slide canvas scales uniformly to fit the available stage. There is no viewport inset token: slides fill the viewport as much as their aspect ratio allows. Any remaining letterbox/pillarbox area is black.

PDF pages use the same 1920px-wide dimensions derived from deck-level `aspectRatio`, so exported pages match the deck ratio without stretching or letterbox/pillarbox space. During crossfades, Honeydeck paints a themed `bg-background` backdrop at the scaled slide size behind the slides to avoid flicker.

No per-slide ratio.

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

## Chrome

The deck chrome is the runtime UI shell shown around the slide canvas in normal slide view.

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
  - Presenter mode button on `md` and wider screens
  - Fullscreen button
  - Mobile text selection toggle (off by default, enables selecting slide content when needed)
  - Color mode switch (system → light → dark → system)
  - All icon-only controls expose explicit accessible names via `aria-label` and matching hover titles
  - Zoom reset button when slide zoom is greater than `1`

When `showSlideNumbers: true`, normal slide view also renders the current slide number as a single global viewer overlay aligned to the bottom-right corner of the slide canvas. The slide number overlay is not part of individual slide content and does not participate in slide transition animations. It renders only the current slide number, not a total count, as larger unobtrusive text without a background container and uses the deck theme's foreground color.

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
