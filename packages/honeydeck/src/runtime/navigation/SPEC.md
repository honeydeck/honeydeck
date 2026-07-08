# Honeydeck Navigation Specification

> Observable behavior for hash-based routing, keyboard shortcuts, and input ownership.

## URL State

Hash-based routing preserves position and navigable application views:

```txt
/#/slideNumber/stepIndex
/#/slideNumber
/#/overview/slideNumber/stepIndex
/#/presenter/slideNumber/stepIndex
/#/presenter/overview/slideNumber/stepIndex
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
/#/1/0                         → slide 1, initial state
/#/1/2                         → slide 1, step 2
/#/3/0                         → slide 3, initial state
/#/overview/3/1                → audience overview at slide 3, remembering step 1
/#/presenter/3/1               → presenter mode at slide 3, step 1
/#/presenter/overview/3/1    → presenter overview at slide 3, remembering step 1
```

Reloading or sharing the URL restores both slide and step. Slide numbers beyond the deck length clamp to the final slide. Reloading or sharing an overview URL restores overview with the encoded slide scrolled into view.

Honeydeck navigation is browser navigation. Every slide/step navigation, overview entry, overview slide selection, and reference route navigation creates a browser history entry. Browser Back therefore moves through the user's actual Honeydeck navigation path. Entering overview from `/#/3/1` pushes `/#/overview/3/1`; browser Back from overview returns to `/#/3/1` and closes overview. Entering presenter overview from `/#/presenter/3/1` pushes `/#/presenter/overview/3/1`; browser Back returns to `/#/presenter/3/1` and closes the presenter overview.

Reference page routes intentionally do not encode slide or step. During one browser session, Honeydeck remembers the last visited audience slide route (`slide` view with slide number and step index). Entering or navigating within reference pages (`/#/theme`, `/#/layouts`, `/#/components`) must not reset that remembered route. A reference page "Back to slides" action returns to the remembered slide and step. If no previous audience slide route is known, such as on a direct load of `/#/theme`, it falls back to `/#/1/0`.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `→` / `d` | Next step (crosses slide boundary); in overview, timeline navigation is disabled: arrow keys move overview selection and WASD are no-ops |
| `←` / `a` | Previous step (crosses slide boundary); in overview, timeline navigation is disabled: arrow keys move overview selection and WASD are no-ops |
| `↓` / `s` | Next slide; in overview, timeline navigation is disabled: arrow keys move overview selection and WASD are no-ops |
| `↑` / `w` | Previous slide; in overview, timeline navigation is disabled: arrow keys move overview selection and WASD are no-ops |
| `o` | Toggle overview mode in audience view; toggle presenter overview in presenter mode |
| `p` | Open presenter mode (same tab); presenter mode is unsupported below Tailwind's `md` breakpoint and shows a mobile hint with a button back to the same audience slide/step. While in presenter mode, `p` exits presenter mode even if the overview is open |
| `f` | Toggle fullscreen |
| `Escape` | Exit overview; in presenter mode, first `Escape` closes the presenter overview and a second `Escape` exits presenter mode; in reference pages, return to slides; browser-native Escape handles fullscreen exit |

Honeydeck keyboard shortcuts only run for unmodified key presses. If `Alt`, `Control`, `Meta`/`Command`, or `Shift` is held, Honeydeck ignores the event so browser and operating-system shortcuts (for example `⌘O`) remain native.

## Input Ownership

Navigation input is routed through a shared command abstraction used by audience, presenter, overview, reference pages, keyboard, touch, and button controls. Input handlers call semantic commands such as `nextStep`, `previousStep`, `nextSlide`, `previousSlide`, `openOverview`, `closeOverview`, `openReference`, `openPresenter`, `toggleNavBar`, and `resetZoom` instead of directly mutating route state.

Keyboard shortcuts are registered through a central hotkey utility. Each hotkey definition includes a stable `id`, user-facing `name`, `description`, key list, and handler so Honeydeck can later expose shortcut help and override shortcuts from one place. The utility owns shared hotkey behavior, including ignoring modified key events and editable targets before handlers run.

Wheel and trackpad scroll never navigate slides. Scrollable content owns scroll input. If a touch/pointer gesture starts inside an interactive element (`button`, `a`, `input`, `textarea`, `select`, etc.), an element marked `data-honeydeck-no-swipe`, or an auto-detected scrollable ancestor before the deck/slide root, Honeydeck does not claim swipe navigation for that gesture. A scrollable ancestor is an element whose scroll dimensions exceed client dimensions and whose computed overflow allows `auto` or `scroll` on either axis. Scroll-owned gestures never hand off to slide navigation at scroll boundaries.
