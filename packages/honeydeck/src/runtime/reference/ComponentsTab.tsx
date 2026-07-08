import * as componentReference from "virtual:honeydeck/components";
import type { ComponentDoc, ComponentPropDoc } from "../types.ts";
import { Intro } from "./Intro.tsx";

const { componentDocWarnings, componentDocs, componentMap, componentNames } =
	componentReference;

type ComponentEntry = {
	name: string;
	doc?: ComponentDoc;
};

function buildComponentEntries(
	names: string[],
	docs: Record<string, ComponentDoc>,
): ComponentEntry[] {
	const entries: ComponentEntry[] = [];

	for (const name of names) {
		if (!componentMap[name]) continue;

		const entry: ComponentEntry = { name };
		const doc = docs[name];
		if (doc) entry.doc = doc;
		entries.push(entry);
	}

	return entries;
}

function ComponentPropsTable({ props }: { props: ComponentPropDoc[] }) {
	if (props.length === 0) {
		return (
			<div className="rounded-md border border-dashed border-border bg-background p-4 text-sm leading-6 text-surface-foreground/65 shadow-sm">
				<div className="font-medium text-surface-foreground">
					No props documented
				</div>
				<div className="mt-1">
					Add an exported props type with JSDoc comments to document component
					params here.
				</div>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-md border border-border bg-background shadow-sm">
			<table className="w-full min-w-180 table-fixed border-collapse text-left text-sm">
				<thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-surface-foreground/60">
					<tr>
						<th className="w-[16%] px-4 py-3 font-medium">Param</th>
						<th className="w-[20%] px-4 py-3 font-medium">Type</th>
						<th className="w-[12%] px-4 py-3 font-medium">Default</th>
						<th className="w-[52%] px-4 py-3 font-medium">Description</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{props.map((prop) => (
						<tr key={prop.name}>
							<td className="px-4 py-3 align-top">
								<code className="font-mono text-sm font-medium text-surface-foreground">
									{prop.name}
									{prop.required ? "" : "?"}
								</code>
							</td>
							<td className="px-4 py-3 align-top">
								<code className="break-words font-mono text-xs text-surface-foreground/70">
									{prop.type}
								</code>
							</td>
							<td className="px-4 py-3 align-top">
								{prop.defaultValue !== undefined ? (
									<code className="break-words font-mono text-xs text-surface-foreground/70">
										{prop.defaultValue}
									</code>
								) : (
									<span className="text-surface-foreground/40">—</span>
								)}
							</td>
							<td className="px-4 py-3 align-top leading-5 text-surface-foreground/70">
								{prop.description || "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function ComponentsTab() {
	const components = buildComponentEntries(componentNames, componentDocs);

	function scrollToComponent(name: string) {
		document
			.getElementById(componentSectionId(name))
			?.scrollIntoView({ block: "start" });
	}

	return (
		<>
			<Intro title="Components">
				Built-in components exported from{" "}
				<code className="rounded-xs bg-surface px-1 py-0.5 font-mono">
					honeydeck/components
				</code>
				, documented from their exported JSDoc comments and props types.
			</Intro>

			{componentDocWarnings.length > 0 && (
				<div className="mb-6 rounded-md border border-border bg-surface p-4 text-sm text-foreground/70">
					<div className="font-medium text-foreground">
						Component docs discovery warnings
					</div>
					<ul className="mb-0 mt-2 list-disc pl-5">
						{componentDocWarnings.map((warning) => (
							<li key={warning}>{warning}</li>
						))}
					</ul>
				</div>
			)}

			<div className="grid gap-8 xl:grid-cols-[12rem_minmax(0,1fr)]">
				<aside className="xl:block">
					<nav
						className="sticky top-28 flex gap-1 overflow-x-auto pb-2 xl:block xl:space-y-1 xl:overflow-visible xl:pb-0"
						aria-label="Built-in components"
					>
						{components.map((entry) => (
							<button
								key={entry.name}
								type="button"
								onClick={() => scrollToComponent(entry.name)}
								className="whitespace-nowrap rounded-sm px-2.5 py-2 text-left text-sm font-medium text-foreground/60 hover:bg-surface hover:text-foreground xl:block xl:w-full"
							>
								{entry.name}
							</button>
						))}
					</nav>
				</aside>

				<div className="min-w-0 ">
					{components.map((entry) => (
						<section
							key={entry.name}
							id={componentSectionId(entry.name)}
							className="scroll-mt-28 py-8 first:pt-0"
						>
							<h2 className="m-0 text-3xl font-semibold tracking-tight text-foreground">
								{entry.name}
							</h2>

							<div className="mt-5">
								{entry.doc ? (
									<div className="honeydeck-docs-content">
										<entry.doc.Component />
									</div>
								) : (
									<div className="text-sm leading-6 text-surface-foreground/65">
										No documentation comment found for this component.
									</div>
								)}
							</div>

							<div className="mt-6">
								<ComponentPropsTable props={entry.doc?.props ?? []} />
							</div>
						</section>
					))}
				</div>
			</div>
		</>
	);
}

function componentSectionId(name: string): string {
	return `component-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}
