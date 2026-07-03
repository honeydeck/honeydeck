# Honeydeck demos

Demos are private workspace packages. They are part of the root pnpm workspace so `pnpm install` works normally from the repository root and from every demo folder.

## Run a demo

```bash
cd demos/<demo-name>
pnpm install
pnpm run dev
```

You can also run a demo from the repository root with a filter:

```bash
pnpm --filter @honeydeck/demo-mermaid run dev
```

## Available demos

- [`latex`](./latex/) — LaTeX rendered through a deck-local React component and normal project dependency.
- [`mermaid`](./mermaid/) — Mermaid diagrams rendered through a deck-local React component and normal project dependency.
- [`react-bits-backgrounds`](./react-bits-backgrounds/) — React Bits Beams background installed through shadcn registry with minimal shadcn setup.
