# Honeydeck CLI Specification

> Observable behavior for CLI commands, build command, and PDF export.

## CLI Commands

### `honeydeck`

Shows help text listing available commands and usage.

Subcommand help:

```bash
honeydeck help init
honeydeck dev --help
honeydeck pdf -h
```

Behavior:

- `honeydeck`, `honeydeck --help`, `honeydeck -h`, and `honeydeck help` show top-level help
- `honeydeck help <command>`, `honeydeck <command> --help`, and `honeydeck <command> -h` show a command-specific help page owned by that subcommand for `init`, `skill`, `dev`, `build`, or `pdf`
- Subcommand help exits successfully without starting the requested command
- Unknown help targets show top-level help and exit with an error

### `honeydeck init`

Creates a new Honeydeck project interactively.

```bash
honeydeck init                         # prompts for deck name and optional agent skill installer
honeydeck init --name awesome-talk     # skip deck name prompt
honeydeck init --skip-install          # write files without installing dependencies
honeydeck init --skip-skill            # do not prompt/open the Honeydeck agent skills installer
honeydeck init --install-skill         # open the Honeydeck agent skills installer without prompting first
```

Behavior:

- Prompts for project name using clack (skippable with `--name` flag)
- Validates the project name and creates a directory with that name
- Prompts before continuing if the target directory already exists
- Generates starter files, including `deck.mdx`, `styles.css`, `.gitignore`, `package.json`, `public/`, and `components/SparkleButton.tsx`
- Renders `deck.mdx` and `styles.css` from real template files that can also run as a development demo
- Installs dependencies with npm unless `--skip-install` is used
- Shows a live process indicator for non-interactive work such as starter file generation and dependency installation; long-running installs keep updating so users know work is still active
- Asks whether to open the Honeydeck agent skills installer unless `--skip-skill` or `--install-skill` is used, and makes clear that accepting runs `npx skills add`
- Cancelling any `honeydeck init` prompt or interrupting the spawned skills installer aborts the init flow instead of continuing
- If cancellation or interruption happens after `honeydeck init` created a new project directory, Honeydeck cleans up that generated project directory before exiting; it never deletes a directory that existed before init started
- Opens the same interactive `npx skills add <honeydeck-package-source> --copy` flow as `honeydeck skill`, so the `skills` CLI owns skill selection, scope selection, and agent selection
- `--install-skill` opens the Honeydeck agent skills installer without the preceding Honeydeck confirmation prompt
- The success outro lists `cd <project>` and `pnpm run dev` as next steps; it does not include `pnpm install` because init already attempted dependency installation unless `--skip-install` was used
- Terminal output is clean, guided, and tasteful with emojis

### `honeydeck skill`

Installs Honeydeck agent skills into the current project.

```bash
honeydeck skill
```

Behavior:

- Starts the normal interactive `npx skills add` flow from the local Honeydeck package source and tells users this before launching it
- Lets the `skills` CLI prompt for bundled skill selection, scope (project/global), and agent selection
- Uses copy mode so generated projects do not depend on a symlink to the installed Honeydeck package
- Prints a clear failure message and a manual `npx skills add <honeydeck-repo-url> --copy` fallback if installation fails

### `honeydeck dev`

Starts the development server.

```bash
honeydeck dev                # default port 4200
honeydeck dev --port 8080    # custom port
honeydeck dev -p 8080        # custom port alias
honeydeck dev --open         # auto-open browser
honeydeck dev -o             # auto-open alias
honeydeck dev --deck talk.mdx # use a different deck entry file
```

Behavior:
- Starts internal Vite dev server
- Binds the dev server to all local network interfaces so other devices on the same LAN can open the printed Network URL
- HMR enabled for MDX/components/styles
- Does not auto-open browser unless `--open` flag is used

Terminal output:

```txt

  ✨ Honeydeck v0.1.0

  🚀 Local:   http://localhost:4200/
  🌐 Network: http://192.168.1.42:4200/
  🎨 Theme:   http://localhost:4200/#/theme

  👀 Watching for changes...

```

### `honeydeck build`

Builds a static SPA.

```bash
honeydeck build
honeydeck build --deck talk.mdx
```

Output structure (Vite default asset names):

```txt
dist/
  index.html
  assets/
    index-[hash].js
    index-[hash].css
  (contents of project public/ copied to dist root)
```

Deployable to any static host without server-side routing (hash-based URLs).

Terminal output:

```txt

  ✨ Honeydeck v0.1.0

  📦 Build complete!
  📁 Output: dist/
  📄 12 slides

```

### `honeydeck pdf`

Exports the deck to PDF.

```bash
honeydeck pdf                          # output: deck.pdf in current working directory
honeydeck pdf -o my-talk.pdf           # custom filename
honeydeck pdf --output my-talk.pdf     # custom filename alias
honeydeck pdf --steps final            # one page per slide at final state (default)
honeydeck pdf --steps all              # include all steps as pages
honeydeck pdf --mode dark              # force dark mode
honeydeck pdf --mode light             # force light mode
honeydeck pdf --parallel 6             # capture up to 6 pages at a time
honeydeck pdf --deck talk.mdx          # use a different deck entry file
```

Behavior:

- Does not pollute `dist/`
- Builds an ordered capture plan from the deck and renders one rasterized page per captured state
- May capture planned pages with bounded parallelism, but final PDF page order must follow the capture plan regardless of screenshot completion order
- CLI flags override frontmatter (`--mode` over `pdfColorMode`, `--steps` over `pdfSteps`)
- Effective PDF color mode is `--mode` > `pdfColorMode` > pinned `colorMode` (`light`/`dark`) > `light`
- Default output: `deck.pdf` resolved relative to the current working directory
- Default capture parallelism: detected CPU count, capped at `16`; `--parallel` accepts integers from `1` to `16`

Terminal output:

```txt

  ✨ Honeydeck v0.1.0

  🖨️  Exporting PDF...
  🧵 Capturing 12 pages with N workers...
  📄 Rendering page 1/12 (slide 1/12)...
  📄 Rendering page 2/12 (slide 2/12)...
  ...
  ✅ Done! deck.pdf (12 pages)

```

---

---

## PDF Export

### Output Format

PDF export preserves browser rendering fidelity by exporting rasterized slide pages. PDF text is not selectable/searchable.

### Behavior

- Does not require a pre-existing production build and does not write to the normal `dist/` output
- One rendered slide/state per PDF page
- PDF page dimensions follow deck-level `aspectRatio`: width is fixed at 1920 and height is derived from the ratio (`16:9` → 1920×1080, `4:3` → 1920×1440, etc.). Invalid or missing ratios fall back to 1920×1080.
- Default output: `deck.pdf` in the current working directory
- Default steps: final state only

### Color Mode Resolution

PDF color mode resolves in this order:

1. CLI `--mode` (`light` or `dark`)
2. `pdfColorMode` frontmatter
3. Deck-level `colorMode` when pinned to `light` or `dark` (not `system`)
4. `light` (ultimate default)

### Settings

| Setting | CLI Flag | Frontmatter | Default |
|---------|----------|-------------|---------|
| Steps | `--steps final` / `--steps all` | `pdfSteps: final` / `pdfSteps: all` | `final` |
| Color mode | `--mode dark` / `--mode light` | `pdfColorMode: dark` / `pdfColorMode: light` | unset; falls back to pinned `colorMode`, then `light` |
| Output | `-o file.pdf` / `--output file.pdf` | — | `deck.pdf` |
| Deck entry | `--deck file.mdx` | — | `deck.mdx` in current directory |
| Capture parallelism | `--parallel 1` through `--parallel 16` | — | CPU count, capped at `16` |

### Step Handling

- `pdfSteps: final` — each slide appears once, all reveals visible, code at final highlight, and Magic Code at final code state/final highlight
- `pdfSteps: all` — step `0` through final step state are separate PDF pages, including Magic Code line-highlight states and morph states
- Magic Code is captured at the requested state, not mid-transition; PDF export disables Magic Move animation while preserving the selected timeline state
- Capture order is slide order first; in `pdfSteps: all`, step states ascend within each slide. Parallel capture must not change this final PDF page order.
- During `pdfSteps: final`, `useTimeline()` and `useTimelineSteps()` expose
  `isPdfFinalRender: true` so custom step-driven components can render an
  all-open/all-visible PDF state. During `pdfSteps: all`, this flag remains
  false because components are rendered at their normal step states.

### Interactive Components in PDF

Interactive components (like `SparkleButton`) render their current timeline-driven state. Component mount JavaScript still runs, but no user interactions are simulated during PDF capture.

### Notes in PDF

`<Notes>` content is excluded from normal PDF output.
