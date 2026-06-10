import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { type SplitResult, splitSlides } from "./splitter.ts";

export type LoadedDeck = SplitResult & {
	watchedFiles: string[];
};

type ExpandContext = {
	watchedFiles: Set<string>;
	stack: string[];
};

type MdxImport = {
	localName: string;
	source: string;
};

const DEFAULT_MDX_IMPORT_RE =
	/^import\s+([A-Za-z_$][\w$]*)\s+from\s+(['"])([^'"]+\.mdx)\2\s*;?\s*$/;

const RELATIVE_IMPORT_RE =
	/^(?<prefix>\s*import\s+(?:(?:[^'"]+?)\s+from\s+)?)(?<quote>['"])(?<specifier>\.{1,2}\/[^'"]+)(?<suffix>\k<quote>\s*;?\s*)$/;

export function loadDeck(entryPath: string): LoadedDeck {
	const watchedFiles = new Set<string>();
	const source = expandMdxFile(resolve(entryPath), {
		watchedFiles,
		stack: [],
	});
	const result = splitSlides(source, { trimLeadingEmptyBlocks: false });

	return {
		...result,
		watchedFiles: Array.from(watchedFiles),
	};
}

function expandMdxFile(filePath: string, context: ExpandContext): string {
	const absolutePath = resolve(filePath);

	if (context.stack.includes(absolutePath)) {
		throw new Error(
			`Honeydeck: circular MDX import detected: ${[...context.stack, absolutePath].join(" -> ")}`,
		);
	}

	context.watchedFiles.add(absolutePath);

	const rawSource = readFileSync(absolutePath, "utf-8");
	const baseDir = dirname(absolutePath);
	const imports = new Map<string, MdxImport>();
	const nextContext = {
		...context,
		stack: [...context.stack, absolutePath],
	};

	const withoutMdxImports = mapMdxLines(rawSource, (line) => {
		const match = line.match(DEFAULT_MDX_IMPORT_RE);
		if (!match) return line;

		const [, localName, , importPath] = match;
		if (!localName || !importPath) return line;

		const importedPath = resolve(baseDir, importPath);
		const importedSource = expandMdxFile(importedPath, nextContext);
		const importedSlides = splitSlides(importedSource, {
			frontmatterMode: "slide",
		}).slides;

		imports.set(localName, {
			localName,
			source: importedSlides.map((slide) => slide.rawMdx).join("\n\n---\n\n"),
		});

		return "";
	});

	const withFileAnchoredImports =
		context.stack.length > 0
			? rewriteRelativeImports(withoutMdxImports, baseDir)
			: withoutMdxImports;

	return expandMdxUsages(withFileAnchoredImports, imports);
}

function expandMdxUsages(
	source: string,
	imports: Map<string, MdxImport>,
): string {
	return mapMdxLines(source, (line) => {
		for (const imported of imports.values()) {
			if (isStandaloneMdxUsage(line, imported.localName)) {
				return ["---", imported.source.trim(), "---"].join("\n");
			}
		}

		return line;
	});
}

function isStandaloneMdxUsage(line: string, localName: string): boolean {
	const escapedName = escapeRegExp(localName);
	return (
		new RegExp(`^\\s*<${escapedName}\\s*/>\\s*$`).test(line) ||
		new RegExp(`^\\s*<${escapedName}\\s*>\\s*</${escapedName}>\\s*$`).test(line)
	);
}

function rewriteRelativeImports(source: string, baseDir: string): string {
	return mapMdxLines(source, (line) => {
		const match = line.match(RELATIVE_IMPORT_RE);
		const groups = match?.groups;
		if (!groups) return line;

		const specifier = groups.specifier;
		if (!specifier || specifier.endsWith(".mdx")) return line;

		return `${groups.prefix}${groups.quote}${toFsImportSpecifier(resolve(baseDir, specifier))}${groups.suffix}`;
	});
}

function mapMdxLines(
	source: string,
	mapLine: (line: string) => string,
): string {
	let inFence = false;

	return source
		.split("\n")
		.map((line) => {
			if (/^\s*```/.test(line)) {
				inFence = !inFence;
				return line;
			}

			return inFence ? line : mapLine(line);
		})
		.join("\n");
}

function toFsImportSpecifier(path: string): string {
	return `/@fs/${path.replace(/\\/g, "/")}`;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
