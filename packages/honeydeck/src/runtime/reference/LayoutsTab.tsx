import * as layoutReference from "virtual:honeydeck/layouts";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BASE_HEIGHT, BASE_WIDTH, resolveLayout } from "../deck/slideData.ts";
import { TimelineProvider } from "../timeline/TimelineContext.tsx";
import type { CompiledLayoutDemo, LayoutPropDoc } from "../types.ts";
import { Intro } from "./Intro.tsx";

const { layoutDemos, layoutDemoWarnings, layoutNames, layoutPropDocs } =
	layoutReference;

type LayoutEntry = {
	name: string;
	demo?: CompiledLayoutDemo;
	propDocs: LayoutPropDoc[];
	snippet?: string;
};

function buildLayoutEntries(
	names: string[],
	demos: Record<string, CompiledLayoutDemo>,
	propDocs: Record<string, LayoutPropDoc[]>,
): LayoutEntry[] {
	const entries: LayoutEntry[] = [];

	for (const name of names) {
		const demo = demos[name] as CompiledLayoutDemo | undefined;
		const snippet =
			typeof demo?.mdx === "string" && demo.mdx.trim().length > 0
				? demo.mdx.trim()
				: undefined;
		const entry: LayoutEntry = {
			name,
			propDocs: propDocs[name] ?? [],
		};
		if (demo) entry.demo = demo;
		if (snippet) entry.snippet = snippet;
		entries.push(entry);
	}

	return entries;
}

function UsageCode({ code }: { code: string }) {
	return (
		<pre className="m-0 min-h-0 max-w-full flex-1 overflow-x-auto overflow-y-auto p-3 font-mono text-sm leading-6 text-surface-foreground">
			{code}
		</pre>
	);
}

function PropsTable({ entry }: { entry: LayoutEntry }) {
	const props: LayoutPropDoc[] = [
		{
			name: "layout",
			type: JSON.stringify(entry.name),
			required: true,
			description: `Selects the ${entry.name} layout for this slide.`,
		},
		...entry.propDocs,
	];

	return (
		<div className="min-h-0 flex-1 overflow-auto p-3">
			<table className="w-full min-w-0 table-fixed border-collapse text-left text-sm">
				<thead className="text-xs uppercase tracking-wider text-surface-foreground/55">
					<tr className="border-b border-border">
						<th className="w-[30%] px-2 py-2 font-medium">Prop</th>
						<th className="w-[25%] px-2 py-2 font-medium">Type</th>
						<th className="w-[45%] px-2 py-2 font-medium">Description</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{props.map((prop) => (
						<tr key={prop.name}>
							<td className="px-2 py-2 align-top">
								<code className="font-mono text-sm font-medium text-surface-foreground">
									{prop.name}
									{prop.required ? "" : "?"}
								</code>
							</td>
							<td className="px-2 py-2 align-top">
								<code className="break-words font-mono text-xs text-surface-foreground/70">
									{prop.type}
								</code>
							</td>
							<td className="px-2 py-2 align-top leading-5 text-surface-foreground/70">
								{prop.description || "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function LayoutReferenceTabs({ entry }: { entry: LayoutEntry }) {
	const [copied, setCopied] = useState(false);
	const [tab, setTab] = useState<"usage" | "props">("usage");

	async function copy() {
		if (!entry.snippet) return;
		try {
			await navigator.clipboard.writeText(entry.snippet);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1200);
		} catch {
			// Ignore clipboard failures; the snippet remains selectable.
		}
	}

	return (
		<div className="flex h-full min-h-0 min-w-0 w-full flex-col rounded-md border border-border bg-background shadow-sm">
			<div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/60 px-3 py-2">
				<div
					className="inline-flex rounded-sm border border-border bg-background p-1 shadow-xs"
					role="tablist"
					aria-label={`${entry.name} reference`}
				>
					<button
						type="button"
						role="tab"
						aria-selected={tab === "usage"}
						onClick={() => setTab("usage")}
						className={`rounded-xs px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
							tab === "usage"
								? "bg-primary text-primary-foreground shadow-sm"
								: "text-surface-foreground/60 hover:bg-surface hover:text-surface-foreground"
						}`}
					>
						Usage
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={tab === "props"}
						onClick={() => setTab("props")}
						className={`rounded-xs px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
							tab === "props"
								? "bg-primary text-primary-foreground shadow-sm"
								: "text-surface-foreground/60 hover:bg-surface hover:text-surface-foreground"
						}`}
					>
						Props
					</button>
				</div>
				{tab === "usage" && entry.snippet && (
					<button
						type="button"
						onClick={copy}
						className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-1.5 text-xs font-semibold text-surface-foreground shadow-xs transition hover:border-primary/55 hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
					>
						{copied ? (
							<CheckIcon className="size-3.5" aria-hidden="true" />
						) : (
							<CopyIcon className="size-3.5" aria-hidden="true" />
						)}
						<span>{copied ? "Copied" : "Copy"}</span>
					</button>
				)}
			</div>
			{tab === "usage" ? (
				entry.snippet ? (
					<UsageCode code={entry.snippet} />
				) : (
					<MissingSnippet />
				)
			) : (
				<PropsTable entry={entry} />
			)}
		</div>
	);
}

function MissingSnippet() {
	return (
		<div className="h-full min-h-0 min-w-0 w-full overflow-y-auto rounded-md border border-dashed border-border bg-background p-4 text-sm leading-6 text-surface-foreground/65 shadow-sm">
			<div className="font-medium text-surface-foreground">
				No demo MDX provided
			</div>
			<div className="mt-1 max-w-full">
				Add{" "}
				<code className="rounded-xs bg-surface px-1 py-0.5 font-mono">mdx</code>{" "}
				to this layout's{" "}
				<code className="rounded-xs bg-surface px-1 py-0.5 font-mono">
					demo
				</code>{" "}
				export to show copyable usage here.
			</div>
		</div>
	);
}

function LayoutPreview({ entry }: { entry: LayoutEntry }) {
	const boxRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(0.2);

	useEffect(() => {
		const box = boxRef.current;
		if (!box) return;

		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;
			const { width, height } = entry.contentRect;
			setScale(Math.min(width / BASE_WIDTH, height / BASE_HEIGHT));
		});

		observer.observe(box);
		return () => observer.disconnect();
	}, []);

	if (!entry.demo) {
		return (
			<div className="flex aspect-video w-full min-w-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background text-center text-sm text-foreground/55">
				<div>
					<div className="font-medium text-foreground/70">
						No demo MDX provided
					</div>
					<div className="mt-1">
						Export{" "}
						<code className="rounded-xs bg-surface px-1 py-0.5 font-mono">
							demo.mdx
						</code>{" "}
						from this layout to preview it here.
					</div>
				</div>
			</div>
		);
	}

	const DemoComponent = entry.demo.Component;
	const LayoutComponent = resolveLayout(entry.demo.layoutName || entry.name);

	return (
		<div
			ref={boxRef}
			className="flex aspect-video w-full min-w-0 items-center justify-center overflow-hidden rounded-md"
		>
			<div
				className="relative overflow-hidden bg-background"
				style={{ width: BASE_WIDTH * scale, height: BASE_HEIGHT * scale }}
			>
				<div
					className="honeydeck-slide-canvas absolute left-0 top-0"
					style={{
						width: BASE_WIDTH,
						height: BASE_HEIGHT,
						transform: `scale(${scale})`,
						transformOrigin: "top left",
					}}
				>
					<TimelineProvider
						stepIndex={0}
						stepCount={entry.demo.stepCount}
						showFutureSteps={true}
					>
						<LayoutComponent
							title={entry.demo.title || null}
							frontmatter={entry.demo.frontmatter}
							rawChildren={<DemoComponent />}
						>
							<DemoComponent />
						</LayoutComponent>
					</TimelineProvider>
				</div>
			</div>
		</div>
	);
}

export function LayoutsTab() {
	const layouts = buildLayoutEntries(layoutNames, layoutDemos, layoutPropDocs);

	return (
		<>
			<Intro title="Layouts">
				Currently available layouts rendered with their{" "}
				<code className="rounded-xs bg-surface px-1 py-0.5 font-mono">
					demo.mdx
				</code>{" "}
				source and explicit copyable MDX snippets.
			</Intro>

			{layoutDemoWarnings.length > 0 && (
				<div className="mb-6 rounded-md border border-border bg-surface p-4 text-sm text-foreground/70">
					<div className="font-medium text-foreground">
						Demo discovery warnings
					</div>
					<ul className="mb-0 mt-2 list-disc pl-5">
						{layoutDemoWarnings.map((warning) => (
							<li key={warning}>{warning}</li>
						))}
					</ul>
				</div>
			)}

			<div className="w-full min-w-0 space-y-6">
				{layouts.map((entry) => (
					<section
						key={entry.name}
						className="w-full min-w-0 overflow-hidden rounded-md border border-border bg-surface"
					>
						<header className="border-b border-border px-4 py-3">
							<h2 className="m-0 text-2xl font-semibold text-foreground">
								{entry.name}
							</h2>
						</header>
						<div className="grid min-w-0 items-stretch gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
							<div className="min-w-0">
								<LayoutPreview entry={entry} />
							</div>
							<div className="relative h-80 min-w-0 lg:h-auto lg:min-h-0">
								<div className="h-full min-h-0 min-w-0 lg:absolute lg:inset-0">
									<LayoutReferenceTabs entry={entry} />
								</div>
							</div>
						</div>
					</section>
				))}
			</div>
		</>
	);
}
