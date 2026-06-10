# Mobile and Touch

Honeydeck works on phones and tablets, but mobile presentation mode behaves differently from desktop so touch gestures stay reliable.

## What is different from desktop?

| Area | Desktop | Mobile / touch |
|------|---------|----------------|
| Main input | Keyboard, mouse, trackpad | Tap zones, swipes, pinch, nav bar buttons |
| Navigation bar | Hidden until hover near bottom edge | Always visible in portrait; hidden by default in landscape until center tap |
| Text selection | Slide text can be selected normally | Slide text selection is off by default; use the nav bar toggle when you need it |
| Zoom | Browser/page zoom or normal browser controls | Honeydeck-controlled slide zoom with pinch, up to `5x` |
| Overview | Keyboard selection and mouse clicks | Responsive fixed two-column grid |
| Presenter mode | Current slide, next preview, notes, clock | Current slide, notes, navigation buttons; no next preview |

## Tap zones

In normal slide view, tapping the slide uses five zones:

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

Landscape mobile uses the center tap zone to show or hide the navigation bar. Portrait mobile keeps the navigation bar visible.

## Swipe navigation

Swipe gestures use the dominant movement axis and need roughly 50px movement:

- Swipe left → next step
- Swipe right → previous step
- Swipe up → next slide
- Swipe down → previous slide

Steps cross slide boundaries. For example, swiping left at the last step moves to the next slide at step 0.

## Pinch zoom and pan

Mobile slide zoom is controlled by Honeydeck, not browser page zoom.

- Pinch outward zooms the current slide content, up to `5x`.
- Pinch inward below roughly `1.05x` resets zoom to `1x`.
- When zoomed in, one-finger dragging pans the slide.
- While zoomed in, tap-zone navigation and swipe navigation are disabled so dragging does not accidentally change slides.
- The center tap still toggles the navigation bar, and nav bar buttons still work.
- Moving to another slide or step resets zoom to `1x`.

Use the reset zoom button in the navigation bar when it appears.

## Text selection

On touch devices, slide content is not text-selectable by default. This avoids accidental text highlights when tapping, swiping, or panning.

When you need to copy text from a slide:

1. Open the navigation bar if needed.
2. Tap the text selection button.
3. Select or copy slide text normally.
4. Tap the same button again to return to presentation gestures.

While text selection mode is active, mobile tap/swipe/pinch presentation gestures pause and the navigation bar stays visible so you can turn selection mode off.

Desktop slide text remains selectable by default.

## Interactive and scrollable content

Honeydeck avoids taking over gestures that start inside interactive or scrollable content.

Gestures that start inside buttons, links, inputs, textareas, selects, elements marked with `data-honeydeck-no-swipe`, or scrollable containers are owned by that content instead of slide navigation.

This means scrollable demos can scroll without accidentally changing slides, even at their scroll boundaries.

## Overview mode on mobile

Overview mode is available from the navigation bar. On mobile it becomes a scrollable responsive fixed two-column grid.

Touch scroll belongs to the overview grid and never navigates slides. Tap a slide thumbnail to jump to it.

## Presenter mode on mobile

Presenter mode keeps the mobile layout compact:

- Current slide preview
- Speaker notes
- Navigation buttons

The desktop next-slide preview is hidden on mobile because there is not enough space.

## Tips for mobile-friendly decks

- Prefer larger text and fewer dense bullets.
- Avoid content that requires precise hover interactions.
- Make buttons and links large enough for touch.
- Test portrait and landscape if people may open the deck on phones.
- Use pinch zoom for readability, but design important content to be readable at `1x`.
