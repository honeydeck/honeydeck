# Honeydeck LaTeX demo

This demo shows how to render LaTeX as a normal project dependency with a local React component. LaTeX rendering is powered by KaTeX and is not part of Honeydeck core.

The local component accepts LaTeX source, renders it with `katex.renderToString`, and relies on CSS imported by this demo project. The deck shows inline equations, display equations, source beside rendered output, and theme-friendly equation cards.

## Run locally

```bash
cd demos/latex
pnpm install
pnpm run dev
```

Open the local URL printed by the dev server.

## Build

```bash
pnpm run build
```
