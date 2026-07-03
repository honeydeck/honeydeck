# React Bits backgrounds demo

Standalone Honeydeck demo for using React Bits backgrounds through shadcn registry items, including Beams as an edge-to-edge slide background.

## Run with npm

```bash
npm install
npm run dev
```

## Run with pnpm

Because this repository has a root `pnpm-workspace.yaml`, use `--ignore-workspace` inside this demo:

```bash
pnpm install --ignore-workspace
pnpm run dev
```

## Add another React Bits background

This demo has minimal shadcn setup in `components.json` and follows the manual shadcn setup shape. Add more React Bits backgrounds with:

```bash
pnpm dlx shadcn@latest add @react-bits/<Component-Name>
```

Browse backgrounds at https://reactbits.dev/get-started/introduction.
