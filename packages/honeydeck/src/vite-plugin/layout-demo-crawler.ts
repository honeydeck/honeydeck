import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
	dirname,
	extname,
	isAbsolute,
	relative,
	resolve,
	sep,
} from "node:path";
import ts from "typescript";

const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

type ImportBinding = {
	moduleSpecifier: string;
	importedName: "default" | string;
};

type StaticDemoMetadata = {
	mdx?: string;
	dynamicMdx?: boolean;
};

export type LayoutPropDoc = {
	name: string;
	type: string;
	required: boolean;
	description: string;
};

export type DiscoveredLayoutDemo = {
	layoutName: string;
	modulePath: string;
	publicModuleSpecifier: string;
	demoMetadata?: StaticDemoMetadata;
	propDocs: LayoutPropDoc[];
};

export type LayoutDemoCrawlResult = {
	mapPath: string | null;
	demos: DiscoveredLayoutDemo[];
	watchedFiles: string[];
	warnings: string[];
};

export type ResolveLayoutMapOptions = {
	entryPath: string;
	packageRoot: string;
	layoutSpecifier: string;
};

export function resolveLayoutMapPath({
	entryPath,
	packageRoot,
	layoutSpecifier,
}: ResolveLayoutMapOptions): string | null {
	const specifier = layoutSpecifier.trim();

	if (!specifier) {
		return resolve(packageRoot, "src/layouts/index.ts");
	}

	if (specifier === "@honeydeck/honeydeck/layouts") {
		return resolve(packageRoot, "src/layouts/index.ts");
	}

	if (specifier === "@honeydeck/honeydeck/layouts/clean") {
		return resolve(packageRoot, "src/layouts/clean/index.ts");
	}

	if (specifier === "@honeydeck/honeydeck/layouts/bee") {
		return resolve(packageRoot, "src/layouts/bee/index.ts");
	}

	if (specifier.startsWith("./") || specifier.startsWith("../")) {
		return resolveSourceFile(resolve(dirname(entryPath), specifier));
	}

	try {
		const requireFromDeck = createRequire(
			resolve(dirname(entryPath), "__honeydeck_resolve__.js"),
		);
		return resolveSourceFile(requireFromDeck.resolve(specifier));
	} catch {
		return null;
	}
}

export function crawlLayoutDemos(
	options: ResolveLayoutMapOptions,
): LayoutDemoCrawlResult {
	const mapPath = resolveLayoutMapPath(options);
	const context: CrawlContext = {
		...options,
		watchedFiles: new Set<string>(),
		warnings: [],
		visitedMaps: new Set<string>(),
	};

	if (!mapPath) {
		context.warnings.push(
			`Could not resolve layout map "${options.layoutSpecifier || "@honeydeck/honeydeck/layouts"}" for demo discovery.`,
		);
		return {
			mapPath: null,
			demos: [],
			watchedFiles: [],
			warnings: context.warnings,
		};
	}

	const demos = crawlLayoutMapFile(mapPath, context);
	return {
		mapPath,
		demos,
		watchedFiles: [...context.watchedFiles],
		warnings: context.warnings,
	};
}

type CrawlContext = ResolveLayoutMapOptions & {
	watchedFiles: Set<string>;
	warnings: string[];
	visitedMaps: Set<string>;
};

function crawlLayoutMapFile(
	mapPath: string,
	context: CrawlContext,
): DiscoveredLayoutDemo[] {
	if (context.visitedMaps.has(mapPath)) return [];
	context.visitedMaps.add(mapPath);
	context.watchedFiles.add(mapPath);

	let sourceFile: ts.SourceFile;
	try {
		sourceFile = parseFile(mapPath);
	} catch (error) {
		context.warnings.push(
			`Could not read layout map "${mapPath}": ${String(error)}`,
		);
		return [];
	}

	const bindings = collectImportBindings(sourceFile);
	const exportObject = findDefaultExportObject(sourceFile);

	if (!exportObject) {
		context.warnings.push(
			`Could not statically read default export object from layout map "${mapPath}".`,
		);
		return [];
	}

	const demos: DiscoveredLayoutDemo[] = [];

	for (const property of exportObject.properties) {
		if (ts.isSpreadAssignment(property)) {
			demos.push(...crawlSpreadLayoutMap(property, bindings, mapPath, context));
			continue;
		}

		if (
			!ts.isPropertyAssignment(property) &&
			!ts.isShorthandPropertyAssignment(property)
		)
			continue;

		const layoutName = getLayoutName(property);
		const localName = getLayoutLocalIdentifier(property);
		if (!layoutName || !localName) continue;

		const binding = bindings.get(localName);
		if (!binding) {
			context.warnings.push(
				`Layout "${layoutName}" is not backed by a static import; demo auto-discovery skipped.`,
			);
			continue;
		}

		const modulePath = resolveImportedModule(
			mapPath,
			binding.moduleSpecifier,
			context.packageRoot,
		);
		if (!modulePath) {
			context.warnings.push(
				`Could not resolve layout module "${binding.moduleSpecifier}" for layout "${layoutName}".`,
			);
			continue;
		}

		context.watchedFiles.add(modulePath);
		const publicModuleSpecifier = toPublicSpecifier({
			entryPath: context.entryPath,
			packageRoot: context.packageRoot,
			mapPath,
			modulePath,
			originalSpecifier: binding.moduleSpecifier,
		});

		let demoMetadata: StaticDemoMetadata | undefined;
		try {
			demoMetadata = extractDemoMetadata(modulePath);
		} catch (error) {
			context.warnings.push(
				`Could not inspect demo for layout "${layoutName}": ${String(error)}`,
			);
		}

		const propDocs = extractLayoutPropDocs(modulePath, context.packageRoot);
		demos.push({
			layoutName,
			modulePath,
			publicModuleSpecifier,
			demoMetadata,
			propDocs,
		});
	}

	return demos;
}

function crawlSpreadLayoutMap(
	property: ts.SpreadAssignment,
	bindings: Map<string, ImportBinding>,
	mapPath: string,
	context: CrawlContext,
): DiscoveredLayoutDemo[] {
	const expression = unwrapExpression(property.expression);
	if (!ts.isIdentifier(expression)) {
		context.warnings.push(
			`Spread layout map in "${mapPath}" is dynamic; demo auto-discovery skipped for that spread.`,
		);
		return [];
	}

	const binding = bindings.get(expression.text);
	if (!binding) {
		context.warnings.push(
			`Spread layout map "${expression.text}" in "${mapPath}" is not a static import; demo auto-discovery skipped for that spread.`,
		);
		return [];
	}

	if (binding.importedName !== "default") {
		context.warnings.push(
			`Spread layout map "${expression.text}" in "${mapPath}" is not a default import; demo auto-discovery skipped for that spread.`,
		);
		return [];
	}

	const spreadMapPath = resolveImportedModule(
		mapPath,
		binding.moduleSpecifier,
		context.packageRoot,
	);
	if (!spreadMapPath) {
		context.warnings.push(
			`Could not resolve spread layout map "${binding.moduleSpecifier}" from "${mapPath}".`,
		);
		return [];
	}

	return crawlLayoutMapFile(spreadMapPath, context);
}

export function toFsImportSpecifier(path: string): string {
	return `/@fs/${normalizePath(path)}`;
}

function parseFile(path: string): ts.SourceFile {
	const source = readFileSync(path, "utf-8");
	const kind =
		path.endsWith(".tsx") || path.endsWith(".jsx")
			? ts.ScriptKind.TSX
			: ts.ScriptKind.TS;
	return ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
}

function collectImportBindings(
	sourceFile: ts.SourceFile,
): Map<string, ImportBinding> {
	const bindings = new Map<string, ImportBinding>();

	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement)) continue;
		if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

		const moduleSpecifier = statement.moduleSpecifier.text;
		const clause = statement.importClause;
		if (!clause) continue;

		if (clause.name) {
			bindings.set(clause.name.text, {
				moduleSpecifier,
				importedName: "default",
			});
		}

		const namedBindings = clause.namedBindings;
		if (namedBindings && ts.isNamedImports(namedBindings)) {
			for (const element of namedBindings.elements) {
				bindings.set(element.name.text, {
					moduleSpecifier,
					importedName: element.propertyName?.text ?? element.name.text,
				});
			}
		}
	}

	return bindings;
}

function findDefaultExportObject(
	sourceFile: ts.SourceFile,
): ts.ObjectLiteralExpression | null {
	const variables = new Map<string, ts.Expression>();

	for (const statement of sourceFile.statements) {
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name) && declaration.initializer) {
					variables.set(declaration.name.text, declaration.initializer);
				}
			}
		}
	}

	for (const statement of sourceFile.statements) {
		if (ts.isExportAssignment(statement)) {
			const expression = unwrapExpression(statement.expression);
			if (ts.isObjectLiteralExpression(expression)) return expression;
			if (ts.isIdentifier(expression)) {
				const initializer = variables.get(expression.text);
				const unwrapped = initializer ? unwrapExpression(initializer) : null;
				if (unwrapped && ts.isObjectLiteralExpression(unwrapped))
					return unwrapped;
			}
		}
	}

	return null;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
	let current = expression;
	while (
		ts.isAsExpression(current) ||
		ts.isSatisfiesExpression(current) ||
		ts.isParenthesizedExpression(current) ||
		ts.isTypeAssertionExpression(current)
	) {
		current = current.expression;
	}
	return current;
}

function getLayoutName(
	property: ts.PropertyAssignment | ts.ShorthandPropertyAssignment,
): string | null {
	if (ts.isShorthandPropertyAssignment(property)) return property.name.text;

	const name = property.name;
	if (
		ts.isIdentifier(name) ||
		ts.isStringLiteral(name) ||
		ts.isNumericLiteral(name)
	)
		return name.text;
	return null;
}

function getLayoutLocalIdentifier(
	property: ts.PropertyAssignment | ts.ShorthandPropertyAssignment,
): string | null {
	if (ts.isShorthandPropertyAssignment(property)) return property.name.text;

	const initializer = unwrapExpression(property.initializer);
	return ts.isIdentifier(initializer) ? initializer.text : null;
}

function resolveImportedModule(
	fromFile: string,
	specifier: string,
	packageRoot: string,
): string | null {
	if (specifier === "@honeydeck/honeydeck/layouts") {
		return resolve(packageRoot, "src/layouts/index.ts");
	}

	if (specifier === "@honeydeck/honeydeck/layouts/clean") {
		return resolve(packageRoot, "src/layouts/clean/index.ts");
	}

	if (specifier === "@honeydeck/honeydeck/layouts/bee") {
		return resolve(packageRoot, "src/layouts/bee/index.ts");
	}

	if (specifier.startsWith("@honeydeck/honeydeck/layouts/clean/")) {
		const layoutName = specifier.slice(
			"@honeydeck/honeydeck/layouts/clean/".length,
		);
		const builtInPath =
			layoutName === "Image"
				? resolve(packageRoot, "src/layouts/clean/Image/Image.tsx")
				: resolve(packageRoot, `src/layouts/clean/${layoutName}.tsx`);
		return resolveSourceFile(builtInPath);
	}

	if (specifier.startsWith("@honeydeck/honeydeck/layouts/bee/")) {
		const layoutName = specifier.slice(
			"@honeydeck/honeydeck/layouts/bee/".length,
		);
		const builtInPath =
			layoutName === "Image"
				? resolve(packageRoot, "src/layouts/bee/Image/Image.tsx")
				: resolve(packageRoot, `src/layouts/bee/${layoutName}.tsx`);
		return resolveSourceFile(builtInPath);
	}

	if (specifier.startsWith("@honeydeck/honeydeck/layouts/")) {
		const layoutName = specifier.slice("@honeydeck/honeydeck/layouts/".length);
		const builtInPath =
			layoutName === "Image"
				? resolve(packageRoot, "src/layouts/clean/Image/Image.tsx")
				: resolve(packageRoot, `src/layouts/clean/${layoutName}.tsx`);
		return resolveSourceFile(builtInPath);
	}

	if (specifier.startsWith("./") || specifier.startsWith("../")) {
		return resolveSourceFile(resolve(dirname(fromFile), specifier));
	}

	if (specifier.startsWith("/@fs/"))
		return resolveSourceFile(specifier.slice("/@fs/".length));
	if (isAbsolute(specifier)) return resolveSourceFile(specifier);

	try {
		const requireFromMap = createRequire(fromFile);
		return resolveSourceFile(requireFromMap.resolve(specifier));
	} catch {
		return null;
	}
}

function resolveSourceFile(basePath: string): string | null {
	if (existsSync(basePath) && extname(basePath)) return basePath;

	for (const extension of SOURCE_EXTENSIONS) {
		const candidate = `${basePath}${extension}`;
		if (existsSync(candidate)) return candidate;
	}

	if (existsSync(basePath) && !extname(basePath)) {
		for (const extension of SOURCE_EXTENSIONS) {
			const candidate = resolve(basePath, `index${extension}`);
			if (existsSync(candidate)) return candidate;
		}
	}

	return existsSync(basePath) ? basePath : null;
}

function extractDemoMetadata(
	modulePath: string,
): StaticDemoMetadata | undefined {
	const sourceFile = parseFile(modulePath);
	const demoInitializer = findExportedDemoInitializer(sourceFile);
	if (!demoInitializer) return undefined;

	const demoObject = unwrapExpression(demoInitializer);
	if (!ts.isObjectLiteralExpression(demoObject)) return { dynamicMdx: true };

	const result: StaticDemoMetadata = {};

	for (const property of demoObject.properties) {
		if (!ts.isPropertyAssignment(property)) continue;
		const name = propertyNameText(property.name);
		if (!name) continue;

		const initializer = unwrapExpression(property.initializer);

		if (name === "mdx") {
			const text = staticPrimitive(initializer);
			if (typeof text === "string") {
				result.mdx = text;
			} else {
				result.dynamicMdx = true;
			}
		}
	}

	return result;
}

function extractLayoutPropDocs(
	modulePath: string,
	packageRoot: string,
): LayoutPropDoc[] {
	let sourceFile: ts.SourceFile;
	try {
		sourceFile = parseFile(modulePath);
	} catch {
		return [];
	}

	const frontmatterType = findFirstLayoutPropsTypeArgument(sourceFile);
	if (!frontmatterType) return [];

	return extractPropDocsFromTypeNode(
		frontmatterType,
		sourceFile,
		modulePath,
		packageRoot,
	);
}

function findFirstLayoutPropsTypeArgument(
	sourceFile: ts.SourceFile,
): ts.TypeNode | null {
	let result: ts.TypeNode | null = null;

	function visit(node: ts.Node): void {
		if (result) return;
		if (
			ts.isTypeReferenceNode(node) &&
			node.typeArguments?.[0] &&
			typeReferenceName(node.typeName) === "LayoutProps"
		) {
			result = node.typeArguments[0];
			return;
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return result;
}

function extractPropDocsFromTypeNode(
	typeNode: ts.TypeNode,
	sourceFile: ts.SourceFile,
	modulePath: string,
	packageRoot: string,
	visited = new Set<string>(),
): LayoutPropDoc[] {
	if (ts.isTypeLiteralNode(typeNode)) {
		return typeNode.members.flatMap((member) => {
			if (!ts.isPropertySignature(member)) return [];
			const name = propertyNameText(member.name);
			if (!name) return [];

			return [
				{
					name,
					type: normalizeTypeText(
						member.type ? member.type.getText(sourceFile) : "unknown",
					),
					required: !member.questionToken,
					description: jsDocDescription(member),
				},
			];
		});
	}

	if (ts.isIntersectionTypeNode(typeNode)) {
		return dedupePropDocs(
			typeNode.types.flatMap((part) =>
				extractPropDocsFromTypeNode(
					part,
					sourceFile,
					modulePath,
					packageRoot,
					visited,
				),
			),
		);
	}

	if (ts.isTypeReferenceNode(typeNode)) {
		const name = typeReferenceName(typeNode.typeName);
		if (!name) return [];

		const localKey = `${modulePath}#${name}`;
		if (visited.has(localKey)) return [];
		visited.add(localKey);

		const localAlias = findTypeAlias(sourceFile, name);
		if (localAlias) {
			return extractPropDocsFromTypeNode(
				localAlias.type,
				sourceFile,
				modulePath,
				packageRoot,
				visited,
			);
		}

		const binding = collectImportBindings(sourceFile).get(name);
		if (!binding) return [];

		const importedModulePath = resolveImportedModule(
			modulePath,
			binding.moduleSpecifier,
			packageRoot,
		);
		if (!importedModulePath) return [];

		let importedSourceFile: ts.SourceFile;
		try {
			importedSourceFile = parseFile(importedModulePath);
		} catch {
			return [];
		}

		const importedName =
			binding.importedName === "default" ? name : binding.importedName;
		const importedAlias = findTypeAlias(importedSourceFile, importedName);
		if (!importedAlias) return [];

		return extractPropDocsFromTypeNode(
			importedAlias.type,
			importedSourceFile,
			importedModulePath,
			packageRoot,
			visited,
		);
	}

	return [];
}

function typeReferenceName(typeName: ts.EntityName): string | null {
	if (ts.isIdentifier(typeName)) return typeName.text;
	return typeName.right.text;
}

function findTypeAlias(
	sourceFile: ts.SourceFile,
	name: string,
): ts.TypeAliasDeclaration | null {
	return (
		sourceFile.statements.find(
			(statement): statement is ts.TypeAliasDeclaration =>
				ts.isTypeAliasDeclaration(statement) && statement.name.text === name,
		) ?? null
	);
}

function normalizeTypeText(type: string): string {
	return type.replace(/\s+/g, " ").trim();
}

function jsDocDescription(node: ts.Node): string {
	const jsDoc = (node as { jsDoc?: Array<{ comment?: unknown }> }).jsDoc?.[0];
	const comment = jsDoc?.comment;
	if (typeof comment === "string") return comment.trim();
	if (Array.isArray(comment)) {
		return comment
			.map((part) => ("text" in part ? String(part.text) : ""))
			.join("")
			.trim();
	}
	return "";
}

function dedupePropDocs(propDocs: LayoutPropDoc[]): LayoutPropDoc[] {
	const seen = new Set<string>();
	const result: LayoutPropDoc[] = [];

	for (const prop of propDocs) {
		if (seen.has(prop.name)) continue;
		seen.add(prop.name);
		result.push(prop);
	}

	return result;
}

function findExportedDemoInitializer(
	sourceFile: ts.SourceFile,
): ts.Expression | null {
	for (const statement of sourceFile.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		const exported = statement.modifiers?.some(
			(modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
		);
		if (!exported) continue;

		for (const declaration of statement.declarationList.declarations) {
			if (
				!ts.isIdentifier(declaration.name) ||
				declaration.name.text !== "demo" ||
				!declaration.initializer
			)
				continue;
			return declaration.initializer;
		}
	}

	return null;
}

function propertyNameText(name: ts.PropertyName): string | null {
	if (
		ts.isIdentifier(name) ||
		ts.isStringLiteral(name) ||
		ts.isNumericLiteral(name)
	)
		return name.text;
	return null;
}

function staticPrimitive(
	expression: ts.Expression,
): string | number | boolean | undefined {
	if (
		ts.isStringLiteral(expression) ||
		ts.isNoSubstitutionTemplateLiteral(expression)
	)
		return expression.text;
	if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
	if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
	if (ts.isNumericLiteral(expression)) return Number(expression.text);
	return undefined;
}

function toPublicSpecifier({
	entryPath,
	packageRoot,
	mapPath,
	modulePath,
	originalSpecifier,
}: {
	entryPath: string;
	packageRoot: string;
	mapPath: string;
	modulePath: string;
	originalSpecifier: string;
}): string {
	const builtInLayoutsDir = resolve(packageRoot, "src/layouts");
	const relToBuiltIn = relative(builtInLayoutsDir, modulePath);
	if (!relToBuiltIn.startsWith("..") && !isAbsolute(relToBuiltIn)) {
		const withoutExt = stripExtension(normalizePath(relToBuiltIn));
		const mapRel = stripExtension(
			normalizePath(relative(builtInLayoutsDir, mapPath)),
		);
		const layoutSubpath = withoutExt === "Image/Image" ? "Image" : withoutExt;

		if (withoutExt === "index") return "@honeydeck/honeydeck/layouts";
		if (withoutExt === "clean/index")
			return "@honeydeck/honeydeck/layouts/clean";
		if (withoutExt === "bee/index") return "@honeydeck/honeydeck/layouts/bee";

		if (withoutExt.startsWith("clean/")) {
			const cleanSubpath =
				withoutExt === "clean/Image/Image"
					? "Image"
					: withoutExt.slice("clean/".length);
			if (
				originalSpecifier.startsWith("@honeydeck/honeydeck/layouts/clean") ||
				mapRel.startsWith("clean/")
			) {
				return `@honeydeck/honeydeck/layouts/clean/${cleanSubpath}`;
			}
			return `@honeydeck/honeydeck/layouts/${cleanSubpath}`;
		}

		if (withoutExt.startsWith("bee/")) {
			const beeSubpath =
				withoutExt === "bee/Image/Image"
					? "Image"
					: withoutExt.slice("bee/".length);
			return `@honeydeck/honeydeck/layouts/bee/${beeSubpath}`;
		}

		return `@honeydeck/honeydeck/layouts/bee/${layoutSubpath}`;
	}

	if (
		originalSpecifier.startsWith("./") ||
		originalSpecifier.startsWith("../") ||
		isAbsolute(modulePath)
	) {
		const relToDeck = normalizePath(relative(dirname(entryPath), modulePath));
		const withDot = relToDeck.startsWith(".") ? relToDeck : `./${relToDeck}`;
		return stripExtension(withDot);
	}

	return originalSpecifier;
}

function stripExtension(path: string): string {
	return path.replace(/\.(tsx|ts|jsx|js)$/, "");
}

function normalizePath(path: string): string {
	return path.split(sep).join("/");
}
