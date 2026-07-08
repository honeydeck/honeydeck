# Honeydeck Color Mode Specification

> Observable behavior for effective color mode resolution and the document-level color mode attribute.

## Effective Color Mode

Honeydeck supports three configured color modes:

- `"system"` — follow the user's OS/browser preference
- `"light"` — force light mode
- `"dark"` — force dark mode

The effective color mode is always either `"light"` or `"dark"`.

`resolveEffectiveColorMode(configured, prefersDark)` returns:

- `"light"` when `configured` is `"light"`
- `"dark"` when `configured` is `"dark"`
- `"dark"` when `configured` is `"system"` (or any other non-literal value) and `prefersDark` is true
- `"light"` otherwise

`readSystemPrefersDark()` reads `window.matchMedia("(prefers-color-scheme: dark)").matches`.

## Document Attribute

`applyHoneydeckColorMode(mode)` writes the effective mode to the `<html>` element as `data-honeydeck-color-mode="light"` or `data-honeydeck-color-mode="dark"`.

The app shell applies the initial effective color mode to `<html>` before mounting React so first-render browser defaults and generated assets match the deck mode.

## React Context

`useEffectiveColorMode()` returns the effective mode. It prefers a context value when inside an `EffectiveColorModeProvider`, otherwise falls back to reading the document attribute. Outside a browser environment it returns `"light"`.

Color-mode-dependent components (for example Magic Code blocks) use this context instead of observing the document attribute individually.
