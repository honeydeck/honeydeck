# Reveal-with planning interview

Started: 2026-06-16

Goal: plan a Honeydeck component that reveals content at the same timeline step as another reveal/code/group step, targetable by id or step index.

Known codebase facts:
- `<Reveal>` already receives compiler-injected `at` and runtime shows when `stepIndex >= at`.
- `<RevealGroup>` compiles to `at` plus internal `targetStepsJson` for each child/list item.
- `remarkStepNumbering` is the compile-time source of slide-local timeline step numbers.
- Manual `<Reveal at={n}>` is already preserved but excluded from automatic counting.

Decisions pending:
- target API naming and semantics
- id scope/resolution
- relative vs absolute step index
- support for code and TimelineSteps targets
- behavior when target is missing/ambiguous
- whether the new component consumes timeline steps

Interview log:

Q1: What does index mean?
Decision: Use 1-based absolute slide step, same as current internal `at`.
Recommended API direction: expose as `at={n}` instead of `index={n}`.

Q2: What can be targeted by id?
Decision: v1 id targeting only supports `<Reveal id="...">` targets.
Notes: `RevealGroup` individual items use `at={n}`. No group-id targeting in v1.

Q3: Prop name for id targeting?
Decision: Use `target="id"`; use `at={n}` for numeric absolute step.
Constraint: Passing both should be invalid.

Q4: Component name?
Decision: Use `RevealWith`.

Q5: Does `RevealWith` consume timeline steps?
Decision: Never consumes timeline steps. It attaches to existing steps only.

Q6: Visibility semantics?
Decision: v1 is cumulative only, same as `<Reveal>` (`stepIndex >= at`).

Q7: Unresolved `target` behavior?
Decision: Build-time error for production/build. During dev, report a clear hint in terminal and browser overlay/console, but keep dev server alive.
Implementation note: need inspect existing Vite/MDX error behavior. Prefer plugin error diagnostics that Vite surfaces without killing server.

Q8: Duplicate ids?
Decision: Hard error for duplicate `<Reveal id="...">` ids within the same slide. Same id on different slides is allowed.

Q9: Forward references?
Decision: Allowed. `RevealWith target` can reference any `<Reveal id>` on the same slide, before or after it in MDX.
Implementation note: requires two-pass or deferred resolution per slide in step-numbering.

Q10: DOM id handling?
Decision: `<Reveal id="x">` should render an actual DOM id, prefixed by slide index, e.g. `slide-3-x` or similar.
Implementation note: virtual slide compile knows slide index and can pass it into `remarkStepNumbering`; runtime may receive compiler-injected prefixed id. Need decide exact prefix/string escaping.

Q11: DOM marker format?
Decision: Use data attribute only: rendered Reveal wrapper gets `data-honeydeck-reveal-id="authorId"`. Do not render DOM `id`; no slide prefix needed. Compile-time `target` uses unprefixed author id.

Q12: DOM marker on `RevealWith`?
Decision: When `target` is used, rendered wrapper should include `data-honeydeck-reveal-with="targetId"` for debugging/inspection.

Q13: Inline/block behavior?
Decision: Same as `<Reveal>` for all content. Compiler injects `as="span"` for text context and `as="div"` for flow/block context. Same classes/styles/future preview behavior unless later specified otherwise.

Q14: Implementation sharing?
Decision: Share implementation with `<Reveal>` where practical, e.g. internal primitive for visibility/style/wrapper behavior. Avoid drift.

Q15: Numeric `at` scope?
Decision: `RevealWith at={n}` is a generic absolute slide-local timeline step target. It may sync with Reveal, RevealGroup children/list items, code steps, Magic Code, or TimelineSteps.

Q16: Validate numeric `at` range?
Decision: Hard build error for invalid/non-literal/non-positive `at`, and for `at > slide stepCount`. Dev should surface error without killing dev server (same diagnostic goal as unresolved target).

Q17: Literal-only props?
Decision: v1 requires literal `target` and `at` props. Dynamic expressions are unsupported. Must document this clearly for users.

Q18: Both `target` and `at`?
Decision: Hard build error. `RevealWith` must receive exactly one of `target` or `at`.

Q19: Missing both `target` and `at`?
Decision: Hard build error. `RevealWith` requires exactly one of `target` or `at`.

Q20: Restrict id string format?
Decision: Do not validate id/target string format beyond literal/non-empty if needed. No safe-pattern check. Bad values may cause runtime/query issues; acceptable for v1.

Q21: Empty id/target strings?
Decision: Hard error for empty string `id` or `target`. No other format validation.

Q22: Manual `<Reveal at={n} id="x">` target resolution?
Decision: `RevealWith target="x"` appears with the referenced Reveal's effective step, including manually authored `at`.

Sidenote: Use `name` on `<Reveal>` instead of `id` for targetable reveals. Do not strip an `id`; avoid DOM-id semantics.
Clarification: `<Reveal at={n}>` is the supported explicit step API. It should always appear at that authored step; do not validate it as part of RevealWith planning.
Spec task: update docs/spec/comment wording to remove old "Future V2" language and state manual `at` is supported now.

Decision pivot:
- `<Reveal>` will NOT expose `at` as user-facing API.
- No plan to support user-authored `<Reveal at={n}>` in future docs/spec.
- Each normal `<Reveal>` component adds exactly one step to the timeline.
- Add `<RevealWith>` for sync/out-of-line reveal content. It never adds a timeline step.
- `RevealWith at={n}` targets a generic existing slide-local step.
- `RevealWith target="name"` targets a named `<Reveal name="...">`.

---

# Clean final implementation plan

## Final product behavior

- Add a public `<RevealWith>` component exported from `@honeydeck/honeydeck` and `@honeydeck/honeydeck/components`.
- Keep `<Reveal>` as the component that creates normal reveal steps.
- Do not expose `<Reveal at={n}>` as a user-facing API. `at` remains compiler-injected internal runtime plumbing for `<Reveal>`, `<RevealGroup>`, and `<RevealWith>`.
- Every authored `<Reveal>` adds exactly one slide-local timeline step.
- `<RevealWith>` never creates or consumes a timeline step. It only reveals alongside an existing step.
- `<RevealWith>` is cumulative like `<Reveal>`: visible when `stepIndex >= resolvedAt`, then stays visible.

## User-facing API

````mdx
import { Reveal, RevealWith } from '@honeydeck/honeydeck'

<Reveal name="intro">Intro appears first</Reveal>
<RevealWith target="intro">This appears with the intro reveal</RevealWith>

```ts {1|2|3}
const answer = 42
console.log(answer)
```

<RevealWith at={2}>This appears with slide step 2</RevealWith>
````

### `<Reveal name="...">`

- `name` is optional.
- If present, `name` must be a literal non-empty string.
- Dynamic `name` expressions are unsupported.
- Names are slide-local.
- Duplicate names within the same slide are compile/build errors.
- Same name on different slides is allowed.
- Named reveals render `data-honeydeck-reveal-id="name"` on the wrapper.
- Named reveals do not render a DOM `id`.

### `<RevealWith target="...">`

- `target` must be a literal non-empty string.
- It resolves to a `<Reveal name="...">` on the same slide.
- Forward references are supported; the named reveal may appear before or after the `RevealWith`.
- Missing targets are compile/build errors.
- In dev, diagnostics should appear in terminal and browser overlay/console, but the dev server should survive.
- When `target` is used, the wrapper renders `data-honeydeck-reveal-with="target"`.

### `<RevealWith at={n}>`

- `at` must be a literal positive integer.
- It targets an existing 1-based slide-local timeline step.
- It may sync with any timeline step source: `<Reveal>`, `<RevealGroup>` child/list item, stepped code, Magic Code state, or `<TimelineSteps>`.
- `at` outside `1..stepCount` is a compile/build error.
- Dynamic `at` expressions are unsupported.

### Invalid `<RevealWith>` prop combinations

- Exactly one of `target` or `at` is required.
- Both provided -> compile/build error.
- Neither provided -> compile/build error.

## Runtime/component implementation plan

1. Extract shared reveal wrapper logic from `Reveal.tsx` into an internal primitive (name TBD, e.g. `TimelineReveal`) that handles:
   - timeline visibility (`stepIndex >= at`)
   - future-step preview opacity
   - inline/block `as` behavior
   - shared classes/style
   - `className`
   - optional data attributes
2. Rebuild `<Reveal>` on top of that primitive.
3. Add `<RevealWith>` on top of the same primitive.
4. Extend `<Reveal>` props with `name?: string` and render `data-honeydeck-reveal-id` when present.
5. Extend exports:
   - `packages/honeydeck/src/runtime/index.ts`
   - `packages/honeydeck/src/runtime/components/index.ts`
   - public types for `RevealWithProps`

## Compiler/remark implementation plan

1. Update `remarkStepNumbering` to recognize `<RevealWith>` as a non-consuming timeline component.
2. Keep assigning internal `at` to each `<Reveal>` in document order; each `<Reveal>` increments the normal timeline counter.
3. Collect named reveal targets per slide:
   - read literal `name` from `<Reveal>`
   - reject empty/non-literal names
   - reject duplicate names in the same slide
   - store effective assigned step for each name
4. Resolve `<RevealWith>` in a second pass or deferred pass so forward references work.
5. For `<RevealWith target="name">`:
   - require literal non-empty target
   - error if missing target reveal
   - inject internal `at={targetStep}`
   - inject wrapper `as="div"`/`as="span"` like `<Reveal>`
6. For `<RevealWith at={n}>`:
   - require literal positive integer
   - defer range check until final `stepCount` is known
   - inject/keep internal resolved `at={n}`
   - inject wrapper `as="div"`/`as="span"`
7. Validate every numeric `RevealWith at` after all timeline producers are counted:
   - valid range: `1 <= at <= stepCount`
8. Ensure `<RevealWith>` itself never increments the timeline counter.
9. Add tests for:
   - target before named reveal
   - target after named reveal
   - duplicate names per slide
   - same name across slides allowed
   - missing target
   - empty/non-literal name/target
   - both/neither `target`/`at`
   - numeric `at` for RevealGroup/code/TimelineSteps steps
   - out-of-range numeric `at`
   - inline `<RevealWith>` gets `as="span"`

## Dev/build diagnostics plan

- Production build/PDF should fail on invalid timeline component usage.
- Dev should surface clear diagnostics in terminal and browser overlay/console without permanently killing the dev server.
- Prefer Vite/MDX plugin diagnostics so HMR can recover after the author fixes the deck.

## Documentation/spec work completed before implementation

Updated specs:

- `packages/honeydeck/SPEC.md`
- `packages/honeydeck/src/SPEC.md`
- `packages/honeydeck/src/runtime/SPEC.md`
- `packages/honeydeck/src/runtime/components/SPEC.md`
- `packages/honeydeck/src/vite-plugin/SPEC.md`
- `packages/honeydeck/src/remark/SPEC.md`
