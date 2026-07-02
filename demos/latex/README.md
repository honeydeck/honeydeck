# Honeydeck LaTeX demo

This demo shows how to render LaTeX as a normal project dependency with a local React component. LaTeX rendering is powered by KaTeX and is not part of Honeydeck core.

The local component accepts LaTeX source, renders it with `katex.renderToString`, and relies on CSS imported by this demo project. The deck shows inline equations, display equations, source beside rendered output, and theme-friendly equation cards.

## Run locally

With npm:

```bash
cd demos/latex
npm install
npm run dev
```

With pnpm:

```bash
cd demos/latex
pnpm install --ignore-workspace
pnpm run dev
```

The `--ignore-workspace` flag matters because this demo is intentionally not part of the repository's root pnpm workspace. Without it, pnpm will install the root workspace projects instead of this standalone demo.

Open the local URL printed by the dev server.

## Build

With npm:

```bash
npm run build
```

With pnpm:

```bash
pnpm run build
```
