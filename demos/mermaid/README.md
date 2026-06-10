# Honeydeck Mermaid demo

This demo shows how to use Mermaid as a normal project dependency with a local React component. Mermaid is not part of Honeydeck core.

The local component accepts Mermaid source as children, reads Honeydeck theme tokens for Mermaid's colors, and re-renders when Honeydeck switches between light and dark color modes. The second slide shows the same tokens next to a rendered diagram.

## Run locally

```bash
cd demos/mermaid
npm install
npm run dev
```

Open the local URL printed by the dev server.

## Build

```bash
npm run build
```
