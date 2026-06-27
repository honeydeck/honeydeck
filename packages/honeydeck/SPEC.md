# @honeydeck/honeydeck — Compatibility Facade Specification

`@honeydeck/honeydeck` is the temporary compatibility facade for existing decks after the runtime/CLI split.

## Compatibility imports

Existing deck imports continue to work by re-exporting runtime APIs from `@honeydeck/runtime`:

```ts
import { Reveal } from '@honeydeck/honeydeck'
import { Left, Right } from '@honeydeck/honeydeck/layouts/TwoCol'
import '@honeydeck/honeydeck/theme.css'
```

New decks and docs prefer direct runtime imports:

```ts
import { Reveal } from '@honeydeck/runtime'
import { Left, Right } from '@honeydeck/runtime/layouts/TwoCol'
import '@honeydeck/runtime/theme.css'
```

## CLI compatibility

The `honeydeck` binary remains available from this package through a local bin wrapper that delegates to `@honeydeck/cli`. Published metadata must not point the bin directly into `node_modules`.

## Package boundaries

- Runtime implementation and specs live in `packages/runtime`.
- CLI/build tooling and specs live in `packages/cli`.
- This package owns compatibility wrappers, bundled skills, package-local docs, and release/packed-smoke scripts during migration.

## Deprecation policy

Keep this facade for one minor release after the split, or until `1.0.0`, whichever comes first. During that window, existing starter decks using `@honeydeck/honeydeck` keep working while generated projects and docs use `@honeydeck/runtime` plus `@honeydeck/cli`.
