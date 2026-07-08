# Honeydeck Runtime Specification

> Overview of the Honeydeck browser runtime. Detailed observable behavior lives in colocated feature specs.

The runtime is organized into feature folders. Each folder owns its own `SPEC.md`:

| Feature | Spec | Owns |
|---------|------|------|
| App shell | [`app-shell/SPEC.md`](app-shell/SPEC.md) | Vite HTML entry, build/dev wiring, boot color mode |
| Deck | [`deck/SPEC.md`](deck/SPEC.md) | Deck orchestration, slide canvas, chrome, context, transitions, aspect ratio, runtime errors |
| Navigation | [`navigation/SPEC.md`](navigation/SPEC.md) | Hash routing, URL state, keyboard shortcuts, input ownership |
| Timeline | [`timeline/SPEC.md`](timeline/SPEC.md) | Per-slide timeline, steps, reveal/fade/code step semantics |
| Color mode | [`color-mode/SPEC.md`](color-mode/SPEC.md) | Effective color mode resolution and document attribute |
| Presentation | [`presentation/SPEC.md`](presentation/SPEC.md) | Presenter mode, sync, Presentation API casting |
| Overview | [`overview/SPEC.md`](overview/SPEC.md) | Overview mode and thumbnail grid |
| Reference | [`reference/SPEC.md`](reference/SPEC.md) | Built-in theme/layout/component reference pages |
| Components | [`components/SPEC.md`](components/SPEC.md) | Public built-in slide components |

## Reading Rules

- Treat every colocated `SPEC.md` as part of the runtime specification.
- If specs disagree, the more specific feature spec owns behavior for its area.
- Behavior changes must update the owning feature spec before implementation changes.
