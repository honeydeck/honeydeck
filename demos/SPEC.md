# Honeydeck Demos Specification

Demos are private example packages under `demos/`. They are part of the root pnpm workspace so `pnpm install` works normally from the repository root and from every demo directory.

## Demo model

- Each demo is a private workspace package with its own `package.json`, deck entry, local assets/components/styles, and dependency declarations.
- Demo dependencies demonstrate normal user-space integration. Honeydeck core must not gain a dependency just because a demo uses a library.
- Demo package dependencies on `@honeydeck/honeydeck` use the workspace package, while third-party feature dependencies remain declared by the demo that uses them.
- Demo READMEs document normal `pnpm install` and `pnpm run dev` usage without `--ignore-workspace`.

## Available demos

- `mermaid` demonstrates rendering Mermaid diagrams through a deck-local React component and a normal project dependency.
- `latex` demonstrates rendering inline and display LaTeX through a deck-local React component and a normal project dependency.
- `react-bits-backgrounds` demonstrates using a React Bits background installed through the shadcn registry with minimal shadcn wiring, including Beams as an edge-to-edge slide background through a custom layout.
