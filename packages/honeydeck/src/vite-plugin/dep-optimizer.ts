/**
 * Dependency pre-bundling policy for Honeydeck.
 *
 * Two stale-cache problems show up as
 * `The requested module '/node_modules/.vite/deps/react_jsx-runtime.js?v=...'
 * doesn't provide an export named: 't'`:
 *
 *  1. **Cache reuse across Honeydeck versions.** Vite invalidates its
 *     dependency cache when the lockfile hash or its config hash changes. A
 *     linked, `file:`, or republished-same-version Honeydeck install changes
 *     neither, so pre-bundled chunks from an older Honeydeck version can be
 *     mixed with freshly bundled ones. Vite hashes plugin names into that
 *     config hash, so the dependency policy plugin name carries the installed
 *     Honeydeck version and every version change re-optimizes dependencies.
 *
 *  2. **Mid-session dependency discovery.** Honeydeck serves its own HTML, so
 *     Vite has no crawlable entry point and discovers deck dependencies only
 *     when the browser requests them. Each discovery run rewrites the shared
 *     dependency chunks with a new browser hash, and modules already loaded in
 *     the browser still point at the previous generation. Pre-declaring the
 *     deck's bare imports keeps everything in the first optimizer run.
 *
 * The specifier scanning here is pure: it takes MDX source text and returns
 * specifiers. Only `collectDeckOptimizeDepsInclude` touches the file system.
 */

import packageJson from "../../package.json" with { type: "json" };
import { loadDeck } from "./deck-loader.ts";
import { partitionImportStatements } from "./import-statements.ts";

/** Honeydeck's own package name; its entries are never pre-bundled. */
const HONEYDECK_PACKAGE_NAME = "@honeydeck/honeydeck";

/**
 * Plugin name for the Honeydeck dependency policy plugin.
 *
 * The version suffix is load-bearing: Vite hashes `plugins.map(p => p.name)`
 * into the dependency optimizer cache key.
 */
export const HONEYDECK_DEPENDENCY_POLICY_PLUGIN_NAME = `honeydeck:dependency-policy@${packageJson.version}`;

/**
 * Bare dependencies imported by the Honeydeck app shell and runtime. They are
 * always pre-bundled, because the app shell loads them before any deck module.
 */
export const HONEYDECK_RUNTIME_OPTIMIZE_DEPS = [
	"react",
	"react/jsx-runtime",
	"react/jsx-dev-runtime",
	"react-dom/client",
	"lucide-react",
] as const;

/** Specifiers Vite cannot pre-bundle as a JavaScript dependency entry. */
const NON_JS_SPECIFIER_RE =
	/\.(css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot|json|md|mdx|txt|wasm|mp4|webm|mp3|wav)$/i;

/** `from "specifier"` in an import statement. */
const FROM_SPECIFIER_RE = /\bfrom\s*(['"])([^'"]+)\1/g;

/** Side-effect only import: `import "specifier"`. */
const SIDE_EFFECT_SPECIFIER_RE = /^\s*import\s*(['"])([^'"]+)\1/gm;

/**
 * True when `specifier` is a bare package specifier Honeydeck wants Vite to
 * pre-bundle.
 *
 * Rejected: relative/absolute paths, protocol specifiers, query suffixes,
 * non-JavaScript files, and Honeydeck's own package entries (those are
 * explicitly excluded from pre-bundling so they stay in one source graph).
 */
export function isPrebundlableSpecifier(specifier: string): boolean {
	if (specifier === "") return false;
	if (specifier.startsWith(".")) return false;
	if (specifier.startsWith("/")) return false;
	if (specifier.startsWith("\0")) return false;
	if (specifier.includes("?")) return false;
	if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(specifier)) return false;
	if (NON_JS_SPECIFIER_RE.test(specifier)) return false;
	if (specifier === HONEYDECK_PACKAGE_NAME) return false;
	if (specifier.startsWith(`${HONEYDECK_PACKAGE_NAME}/`)) return false;
	return true;
}

/**
 * Collect bare package specifiers from every complete import statement in an
 * MDX source. Code fences and prose that merely starts with the word `import`
 * are ignored, because statement detection is shared with slide splitting.
 */
export function collectBareImportSpecifiers(source: string): string[] {
	const { importLines } = partitionImportStatements(source.split(/\r?\n/));
	const importSource = importLines.join("\n");
	const specifiers = new Set<string>();

	for (const match of importSource.matchAll(FROM_SPECIFIER_RE)) {
		const specifier = match[2];
		if (specifier && isPrebundlableSpecifier(specifier)) {
			specifiers.add(specifier);
		}
	}

	for (const match of importSource.matchAll(SIDE_EFFECT_SPECIFIER_RE)) {
		const specifier = match[2];
		if (specifier && isPrebundlableSpecifier(specifier)) {
			specifiers.add(specifier);
		}
	}

	return [...specifiers].sort();
}

/**
 * Build the `optimizeDeps.include` list for a deck: the Honeydeck runtime
 * dependencies plus every bare package the deck (and its imported MDX files)
 * imports.
 *
 * Deck loading failures are intentionally swallowed. A broken deck must still
 * start a dev server so the MDX error can be reported in the browser; the only
 * cost is that Vite discovers deck dependencies lazily again.
 */
export function collectDeckOptimizeDepsInclude(entryPath: string): string[] {
	const include = new Set<string>(HONEYDECK_RUNTIME_OPTIMIZE_DEPS);

	try {
		const deck = loadDeck(entryPath);
		const sources = [deck.sharedImports, ...deck.slides.map((s) => s.rawMdx)];
		for (const source of sources) {
			for (const specifier of collectBareImportSpecifiers(source)) {
				include.add(specifier);
			}
		}
	} catch {
		// Keep the runtime dependencies; the deck error is reported elsewhere.
	}

	return [...include];
}
