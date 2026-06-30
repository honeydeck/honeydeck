# Honeydeck demos

Demos are standalone example projects. They are intentionally not part of the root pnpm workspace, so root workspace scripts do not build or lint demos by default.

## Package manager notes

### npm

Use npm normally inside a demo folder:

```bash
cd demos/<demo-name>
npm install
npm run dev
```

### pnpm

Because this repository has a root `pnpm-workspace.yaml`, running plain `pnpm install` from a demo folder will install the root workspace instead of the standalone demo project.

Use `--ignore-workspace` when installing demo dependencies with pnpm:

```bash
cd demos/<demo-name>
pnpm install --ignore-workspace
pnpm run dev
```

## Available demos

- [`mermaid`](./mermaid/) — Mermaid diagrams rendered through a deck-local React component and normal project dependency.
