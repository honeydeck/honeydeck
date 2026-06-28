# Honeydeck Starter Template Specification

> Observable behavior for generated projects and starter files owned by CLI templates.

## Generated Project Structure

Generated user projects created by `honeydeck init`:

```txt
awesome-talk/
  package.json          ← scripts, dependencies, package metadata
  deck.mdx              ← root deck file (tutorial-style starter)
  styles.css            ← explicit Tailwind + Honeydeck theme imports; imported by deck.mdx
  .gitignore            ← default ignored files
  components/
    SparkleButton.tsx   ← fun demo component
  public/               ← static assets
```

The `package.json` includes package metadata (`name`, `version`, `private`, `type`), scripts, runtime dependencies (`honeydeck`, `react`, `react-dom`), and dev dependencies (`tailwindcss`, `typescript`, React types). The generated `honeydeck` dependency version is derived from the current package version so freshly initialized projects install the same Honeydeck release line as the CLI that created them. Scripts include at least:

```json
{
  "scripts": {
    "dev": "honeydeck dev",
    "build": "honeydeck build",
    "pdf": "honeydeck pdf"
  }
}
```

`honeydeck init` generates a pnpm-marked starter `package.json`, installs dependencies with `pnpm install` by default, and can skip installation with `--skip-install`. It also offers to open the Honeydeck agent skills installer and tells users that accepting runs `npx skills add`. Users can skip the prompt with `--skip-skill`, open the installer without the Honeydeck confirmation prompt with `--install-skill`, install from the local package with `honeydeck skill`, or install the same skills later from the Honeydeck repository with `npx skills add <honeydeck-repo-url> --copy`.

---

---

## Generated Starter Project

### `deck.mdx`

Generated starter tree includes `package.json`, `deck.mdx`, `styles.css`, `.gitignore`, `public/`, and `components/SparkleButton.tsx`.

Tutorial-style `deck.mdx` imports `./styles.css` so styling stays explicit and user-controlled. It demonstrates:

- Deck frontmatter, including `colorMode: system`, named transition defaults (`transition`, `transitionDuration`, `transitionEasing`), and layout map hints
- Slide separators
- Built-in slide transitions via deck-level defaults and at least one slide-level `transition:` override
- Built-in layouts via per-slide `layout:` (`Default`, `Section`, `TwoCol`, `Cover`, `Blank`)
- Code highlighting with step-through
- Custom interactive component (`SparkleButton`)
- Reveal/timeline features
- Presenter notes with `<Notes>`
- Keyboard navigation hints
- Design tokens
- PDF export commands

### `styles.css`

Generated `styles.css` is the explicit styling entry point:

```css
@import "tailwindcss";
@import "@honeydeck/honeydeck/theme.css";
```

Users may add kit theme layers or overrides after the base theme import.

### `components/SparkleButton.tsx`

Generated starter projects include a small dependency-free interactive React component. It demonstrates that slides can import local components, use client-side state, and add playful behavior without extra Honeydeck configuration. Like a button that spawns a small confetti effect.
