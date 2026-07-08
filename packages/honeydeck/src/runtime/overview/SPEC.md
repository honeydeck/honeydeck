# Honeydeck Overview Specification

> Observable behavior for overview mode and the overview grid.

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

## Keyboard in Overview

- Arrow keys move selection within the rendered grid; vertical movement uses the actual measured column count so it stays correct after initial layout and window resizes while overview is open
- Pressing Up while the selected thumbnail is already in the topmost rendered row keeps the current selection instead of jumping to the first slide
- Pressing Down while the selected thumbnail is already in the bottommost rendered row keeps the current selection instead of jumping to the last slide
- Overview gives a short visual boundary nudge when Up or Down cannot move because the selection is already at the top or bottom row
- Keyboard navigation keeps the selected thumbnail smoothly scrolled into view, with margin so the selection is not flush against the viewport edge; if repeated key presses change the selection while a scroll animation is running, the new scroll target takes over instead of queueing behind the previous animation
- Enter jumps to selected slide, resets to step 0, exits overview, and creates a new browser history entry
- `o` toggles (also exits) overview
- Escape exits overview
- Overview button in nav bar exits overview
