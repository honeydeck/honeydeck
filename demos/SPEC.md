# Honeydeck Demos Specification

Demos are standalone example projects under `demos/`. They are intentionally outside the root pnpm workspace, so root workspace scripts do not build, lint, or typecheck them by default.

## Demo model

- Each demo is a self-contained Honeydeck project with its own `package.json`, deck entry, local assets/components/styles, and dependency declarations.
- Demo dependencies demonstrate normal user-space integration. Honeydeck core must not gain a dependency just because a demo uses a library.
- Demo READMEs document how to run with npm and with pnpm using `pnpm install --ignore-workspace`.

## Available demos

- `mermaid` demonstrates rendering Mermaid diagrams through a deck-local React component and a normal project dependency.
- `latex` demonstrates rendering inline and display LaTeX through a deck-local React component and a normal project dependency.
- `react-bits-backgrounds` demonstrates using a React Bits background installed through the shadcn registry with minimal shadcn wiring, including Beams as an edge-to-edge slide background through a custom layout.
