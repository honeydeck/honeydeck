# @honeydeck/cli — CLI Package Specification

`@honeydeck/cli` owns the `honeydeck` binary and build-time tooling: `init`, `skill`, `dev`, `build`, `pdf`, Vite orchestration, virtual modules, deck loading, starter templates, and remark transforms.

## Public commands

Generated projects run the CLI through package binary scripts:

```json
{
  "scripts": {
    "dev": "honeydeck dev",
    "build": "honeydeck build",
    "pdf": "honeydeck pdf"
  }
}
```

## Runtime boundary

The CLI loads Honeydeck runtime code only through stable `@honeydeck/runtime` package entrypoints. Dev/build HTML injects:

```html
<script type="module">
  import '@honeydeck/runtime/app-shell'
</script>
```

The CLI must not alias `@honeydeck/runtime` imports to `src/runtime/**` file-system paths in Vite, because that can create duplicate runtime contexts beside deck-authored package imports.

## Ownership map

- CLI commands and PDF export: [`src/cli/SPEC.md`](src/cli/SPEC.md)
- Starter templates: [`src/cli/templates/SPEC.md`](src/cli/templates/SPEC.md)
- Remark transforms: [`src/remark/SPEC.md`](src/remark/SPEC.md)
- Vite plugin and virtual modules: [`src/vite-plugin/SPEC.md`](src/vite-plugin/SPEC.md)

## Generated project dependencies

New starter projects depend on `@honeydeck/runtime` for authored deck imports and install `@honeydeck/cli` as a development dependency for the `honeydeck` binary.
