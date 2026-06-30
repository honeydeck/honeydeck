# Honeydeck Mermaid demo

This demo shows how to use Mermaid as a normal project dependency with a local React component. Mermaid is not part of Honeydeck core.

The local component accepts Mermaid source as children, reads Honeydeck theme tokens for Mermaid's colors, and re-renders when Honeydeck switches between light and dark color modes. The second slide shows the same tokens next to a rendered diagram.

## Run locally

With npm:

```bash
cd demos/mermaid
npm install
npm run dev
```

With pnpm:

```bash
cd demos/mermaid
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
