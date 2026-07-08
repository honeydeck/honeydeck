# Honeydeck App Shell Specification

> Observable behavior for the Vite HTML entry and build-time app shell wiring.

## Build System

Honeydeck owns the build/dev configuration. Users do not provide `index.html` or `vite.config.ts`.

Observable build/dev behavior:

- `honeydeck dev` starts a hot-reloading development server.
- `honeydeck build` produces a static single-page application.
- Project `public/` assets are served/copied at the web root.
- Project-local CSS, React components, layout maps, and static image imports work from the selected deck root.
- In dev, Honeydeck's package app shell may be served from outside the selected deck root, but Vite still allows the user's workspace root for normal dependency serving and pre-bundles Honeydeck runtime browser dependencies such as React, React DOM, and runtime icons.
- Built decks use hash-based routes and can be deployed to static hosts without server-side routing.
- The app shell applies the initial effective `data-honeydeck-color-mode` to `<html>` before mounting React so first-render browser defaults and generated assets match the deck mode.

## App Shell Entry

The app shell is loaded through the package subpath `@honeydeck/honeydeck/app-shell`. It bootstraps React, applies the resolved effective color mode to the document, and mounts the deck root component. All presentation logic lives in the deck runtime; the shell entry is intentionally minimal.
