import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import ts from "typescript";
import type { ComponentPropDoc } from "../runtime/types.ts";

const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];
const COMPONENT_DOC_EXPORT_EXCLUSIONS = new Set([
	"Button",
	"COLOR_MODES",
	"ColorModeCycleButton",
]);

export type DiscoveredComponentDoc = {
	componentName: string;
	modulePath: string;
	publicModuleSpecifier: string;
	markdown: string;
	props: ComponentPropDoc[];
};

export type ComponentDocCrawlResult = {
	barrelPath: string;
	docs: DiscoveredComponentDoc[];
	watchedFiles: string[];
	warnings: string[];
};

export type CrawlComponentDocsOptions = {
	packageRoot: string;
};

export function crawlComponentDocs({
	packageRoot,
}: CrawlComponentDocsOptions): ComponentDocCrawlResult {
	const barrelPath = resolve(packageRoot, "src/runtime/components/index.ts");
	const watchedFiles = new Set<string>([barrelPath]);
	const warnings: string[] = [];

	let sourceFile: ts.SourceFile;
	try {
		sourceFile = parseFile(barrelPath);
	} catch (error) {
		warnings.push(
			`Could not read component barrel "${barrelPath}": ${String(error)}`,
		);
		return { barrelPath, docs: [], watchedFiles: [...watchedFiles], warnings };
	}

	const docs: DiscoveredComponentDoc[] = [];

	for (const statement of sourceFile.statements) {
		if (!ts.isExportDeclaration(statement)) continue;
		if (statement.isTypeOnly) continue;
		if (!statement.exportClause || !ts.isNamedExports(statement.exportClause))
			continue;
		if (
			!statement.moduleSpecifier ||
			!ts.isStringLiteral(statement.moduleSpecifier)
		)
			continue;

		const moduleSpecifier = statement.moduleSpecifier.text;
		const modulePath = resolveSourceFile(
			resolve(dirname(barrelPath), moduleSpecifier),
		);
		if (!modulePath) {
			warnings.push(
				`Could not resolve component module "${moduleSpecifier}" from "${barrelPath}".`,
			);
			continue;
		}

		watchedFiles.add(modulePath);

		for (const element of statement.exportClause.elements) {
			if (element.isTypeOnly) continue;
			const exportedName = element.name.text;
			if (!isPublicComponentName(exportedName)) continue;

			try {
				const doc = extractComponentDoc({
					modulePath,
					componentName: exportedName,
					localName: element.propertyName?.text ?? exportedName,
				});
				docs.push({
					componentName: exportedName,
					modulePath,
					publicModuleSpecifier: "@honeydeck/honeydeck/components",
					...doc,
				});
			} catch (error) {
				warnings.push(
					`Could not inspect docs for component "${exportedName}": ${String(error)}`,
				);
			}
		}
	}

	return {
		barrelPath,
		docs,
		watchedFiles: [...watchedFiles],
		warnings,
	};
}

function isPublicComponentName(name: string): boolean {
	if (COMPONENT_DOC_EXPORT_EXCLUSIONS.has(name)) return false;
	return /^[A-Z]/.test(name);
}

function parseFile(path: string): ts.SourceFile {
	const source = readFileSync(path, "utf-8");
	const kind =
		path.endsWith(".tsx") || path.endsWith(".jsx")
			? ts.ScriptKind.TSX
			: ts.ScriptKind.TS;
	return ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
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

function extractComponentDoc({
	modulePath,
	componentName,
	localName,
}: {
	modulePath: string;
	componentName: string;
	localName: string;
}): { markdown: string; props: ComponentPropDoc[] } {
	const sourceFile = parseFile(modulePath);
	const component = findComponentDeclaration(sourceFile, localName);
	if (!component)
		throw new Error(`exported component "${localName}" not found`);

	const markdown =
		getJSDocMarkdown(component) ||
		`Public docs for \`${componentName}\` have not been written yet.`;
	const propTypeName =
		getComponentPropTypeName(component) ?? `${componentName}Props`;
	const defaults = collectParameterDefaults(component);
	const props = propTypeName
		? extractProps(sourceFile, propTypeName, defaults)
		: [];

	return { markdown, props };
}

type ComponentDeclaration =
	| ts.FunctionDeclaration
	| ts.VariableDeclaration
	| ts.ArrowFunction
	| ts.FunctionExpression;

function findComponentDeclaration(
	sourceFile: ts.SourceFile,
	name: string,
): ComponentDeclaration | null {
	for (const statement of sourceFile.statements) {
		if (
			ts.isFunctionDeclaration(statement) &&
			statement.name?.text === name &&
			hasExportModifier(statement)
		) {
			return statement;
		}

		if (!ts.isVariableStatement(statement) || !hasExportModifier(statement))
			continue;

		for (const declaration of statement.declarationList.declarations) {
			if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name)
				continue;
			const initializer = declaration.initializer;
			if (
				initializer &&
				(ts.isArrowFunction(initializer) ||
					ts.isFunctionExpression(initializer))
			) {
				return initializer;
			}
			return declaration;
		}
	}

	return null;
}

function hasExportModifier(node: ts.HasModifiers): boolean {
	return !!ts
		.getModifiers(node)
		?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function getJSDocMarkdown(node: ts.Node): string {
	const docs = ts
		.getJSDocCommentsAndTags(node)
		.filter((doc): doc is ts.JSDoc => ts.isJSDoc(doc));
	const latest = docs.at(-1);
	const comment = latest?.comment;
	if (typeof comment === "string") return comment.trim();
	return "";
}

function getComponentPropTypeName(
	component: ComponentDeclaration,
): string | null {
	const parameters =
		ts.isFunctionDeclaration(component) ||
		ts.isArrowFunction(component) ||
		ts.isFunctionExpression(component)
			? component.parameters
			: [];
	const firstParam = parameters[0];
	const type = firstParam?.type;
	if (type && ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)) {
		return type.typeName.text;
	}
	return null;
}

function collectParameterDefaults(
	component: ComponentDeclaration,
): Map<string, string> {
	const defaults = new Map<string, string>();
	const parameters =
		ts.isFunctionDeclaration(component) ||
		ts.isArrowFunction(component) ||
		ts.isFunctionExpression(component)
			? component.parameters
			: [];
	const firstParam = parameters[0];
	if (!firstParam || !ts.isObjectBindingPattern(firstParam.name))
		return defaults;

	for (const element of firstParam.name.elements) {
		if (!element.initializer) continue;
		const name = bindingElementName(element);
		if (!name) continue;
		defaults.set(name, element.initializer.getText());
	}

	return defaults;
}

function bindingElementName(element: ts.BindingElement): string | null {
	if (element.propertyName) return propertyNameText(element.propertyName);
	return ts.isIdentifier(element.name) ? element.name.text : null;
}

function extractProps(
	sourceFile: ts.SourceFile,
	typeName: string,
	defaults: Map<string, string>,
): ComponentPropDoc[] {
	const declaration = findTypeDeclaration(sourceFile, typeName);
	if (!declaration) return [];

	const members = ts.isInterfaceDeclaration(declaration)
		? [...declaration.members]
		: typeAliasMembers(sourceFile, declaration);

	return members.flatMap((member) => {
		if (!ts.isPropertySignature(member)) return [];
		const name = propertyNameText(member.name);
		if (!name) return [];

		const doc: ComponentPropDoc = {
			name,
			type: member.type?.getText(sourceFile) ?? "unknown",
			required: !member.questionToken,
			description: getJSDocMarkdown(member),
		};
		const defaultValue = defaults.get(name);
		if (defaultValue !== undefined) doc.defaultValue = defaultValue;
		return [doc];
	});
}

function typeAliasMembers(
	sourceFile: ts.SourceFile,
	declaration: ts.TypeAliasDeclaration,
): ts.TypeElement[] {
	if (ts.isTypeLiteralNode(declaration.type))
		return [...declaration.type.members];
	if (!ts.isIntersectionTypeNode(declaration.type)) return [];

	return declaration.type.types.flatMap((type) => {
		if (ts.isTypeLiteralNode(type)) return [...type.members];
		if (!ts.isTypeReferenceNode(type) || !ts.isIdentifier(type.typeName))
			return [];

		const referencedDeclaration = findTypeDeclaration(
			sourceFile,
			type.typeName.text,
		);
		if (!referencedDeclaration) return [];
		if (ts.isInterfaceDeclaration(referencedDeclaration)) {
			return [...referencedDeclaration.members];
		}
		return typeAliasMembers(sourceFile, referencedDeclaration);
	});
}

function findTypeDeclaration(
	sourceFile: ts.SourceFile,
	typeName: string,
): ts.InterfaceDeclaration | ts.TypeAliasDeclaration | null {
	for (const statement of sourceFile.statements) {
		if (
			ts.isInterfaceDeclaration(statement) &&
			statement.name.text === typeName
		)
			return statement;
		if (
			ts.isTypeAliasDeclaration(statement) &&
			statement.name.text === typeName
		)
			return statement;
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
