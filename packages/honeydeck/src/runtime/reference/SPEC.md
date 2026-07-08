# Honeydeck Reference Pages Specification

> Observable behavior for the built-in theme, layout, and component reference pages.

## Routes

Built-in reference pages start at `/#/theme`. Included in both dev and production builds.

```txt
/#/theme                  → deep link to theme tokens tab
/#/layouts                → deep link to layouts tab
/#/components             → deep link to components tab
```

User-facing product copy should call this area "reference pages". Theme, layout, and component customization is described in [Customization — Theme CSS, Layout Maps, Components](../../layouts/SPEC.md#customization--theme-css-layout-maps-components).

## Returning to Slides

Reference pages include a "Back to slides" button. It returns to the last visited audience slide and step from the current browser session. Pressing `Escape` on any reference page performs the same return-to-slides action, unless focus is in an editable field. Reference tab changes and theme/layout/component deep links keep the same return target. Directly opening or reloading a reference page without a known previous slide falls back to slide 1, step 0.

The reference header shows only Theme tokens, Layouts, and Components tabs. It also provides an always-underlined external Docs link to `https://honeydeck.dev` with an icon indicating that it opens a new tab.

## Theme Tab

Displays all `--honeydeck-*` CSS tokens with:

- Current computed values
- Default values from `base.css`
- Descriptions when available

## Layouts Tab

Shows one card for each layout currently available to the deck author, i.e. every key in the active layout map (`layouts:` or built-in fallback), regardless of whether a slide currently uses it:

- Visual preview rendered from the layout's `demo` export when statically discoverable
- "No demo MDX provided" hint when no static demo MDX is discovered
- Usage reference with visibly tab-like controls:
  - `Usage` shows a copyable MDX snippet from the layout demo's explicit `mdx` field
  - `Props` shows slide frontmatter fields accepted by that layout, including property name, required marker, type, and description
  - Active/inactive states must read as tabs, not plain text links
- The copy action in the usage reference must look and behave like a button, with clear affordance and copied feedback

Layout prop docs are statically extracted from the layout component's `LayoutProps<Frontmatter>` type. Property descriptions come from JSDoc comments on the frontmatter type fields. If no layout-specific frontmatter is discovered, the `Props` tab still documents the required `layout` selector.

## Components Tab

Shows generated documentation for each public built-in component exported from `@honeydeck/honeydeck/components`, discovered from the component barrel at build time. Unlike the layouts tab, components are primarily documented with prose and usage examples rather than visual previews:

- A side navigation lists all discovered built-in components and scrolls to the matching section
- Each component appears as a full-width documentation section, one below another
- The info section comes from the exported component declaration's JSDoc comment, interpreted as Markdown/MDX
- Usage examples live in that component JSDoc comment, usually as fenced `mdx` code blocks
- Params are generated from the component's exported props type or interface, including prop names, TypeScript type text, required/optional state, prop JSDoc descriptions, and default values inferred from destructured parameter defaults when possible
- The component params table gives most horizontal space to the Description column; Param, Type, and Default columns stay narrower and wrap when needed
- Components without a docs comment or exported props type still appear with a helpful fallback
- Non-component exports such as hooks are skipped from the generated section list
