"use client";

import {
	BrowserFrame,
	Keyboard,
	ListStyle,
} from "@honeydeck/honeydeck/components";
import {
	CheckIcon,
	CircleIcon,
	MessageSquareTextIcon,
	MousePointerClickIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/Button";

function Playground({
	title,
	description,
	children,
	code,
}: {
	title: string;
	description: string;
	children: ReactNode;
	code: string;
}) {
	return (
		<section className="not-prose my-6 overflow-hidden rounded-2xl border border-[color:var(--honeydeck-color-border)] bg-[color:var(--docs-panel)] shadow-sm">
			<div className="border-[color:var(--honeydeck-color-border)] border-b p-4 sm:p-5">
				<p className="text-sm font-black text-[color:var(--honeydeck-color-muted-foreground)]">
					Playground
				</p>
				<h3 className="mt-1 text-xl font-black">{title}</h3>
				<p className="mt-2 text-sm leading-6 text-[color:var(--honeydeck-color-muted-foreground)]">
					{description}
				</p>
			</div>
			<div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)]">
				<div className="min-h-56 p-4 sm:p-5">{children}</div>
				<pre className="m-0 overflow-auto border-[color:var(--honeydeck-color-border)] border-t bg-[color:color-mix(in_oklab,var(--honeydeck-color-foreground)_5%,var(--honeydeck-color-background))] p-4 text-sm leading-6 lg:border-t-0 lg:border-l">
					<code>{code}</code>
				</pre>
			</div>
		</section>
	);
}

export function KeyboardPlayground() {
	const shortcuts = [
		{ label: "Overview", keys: ["O"] },
		{ label: "Presenter", keys: ["P"] },
		{ label: "Command", keys: ["⌘", "K"] },
		{ label: "Advance", keys: ["Space"] },
	] as const;
	const [active, setActive] = useState(2);
	const shortcut = shortcuts[active];

	return (
		<Playground
			title="Shortcut badges"
			description="Switch examples to see how Keyboard renders single keys and multi-key shortcuts inline."
			code={`<Keyboard keys={${JSON.stringify(shortcut.keys)}} />`}
		>
			<div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-[color:var(--honeydeck-color-border)] bg-[color:var(--honeydeck-color-background)] p-5">
				<div className="flex flex-wrap gap-2">
					{shortcuts.map((item, index) => (
						<Button
							className="border-[color:var(--honeydeck-color-border)] data-[active=true]:bg-[color:var(--honeydeck-color-primary)] data-[active=true]:text-[color:var(--honeydeck-color-primary-foreground)]"
							data-active={active === index}
							key={item.label}
							onClick={() => setActive(index)}
							size="sm"
							type="button"
						>
							{item.label}
						</Button>
					))}
				</div>
				<p className="text-2xl font-black leading-10">
					Press <Keyboard keys={shortcut.keys} /> to open {shortcut.label}.
				</p>
			</div>
		</Playground>
	);
}

export function ListStylePlayground() {
	const modes = [
		{
			label: "Check icons",
			bullets: [<CheckIcon key="check" />, <CircleIcon key="circle" />],
		},
		{ label: "Arrows", bullets: ["→", "–", "·"] },
		{ label: "Markerless", bullets: false },
	] as const;
	const [active, setActive] = useState(0);
	const mode = modes[active];

	return (
		<Playground
			title="Styled lists"
			description="Try marker styles for nested lists before using them in a deck."
			code={`<ListStyle bullets={${mode.label === "Markerless" ? "false" : mode.label === "Arrows" ? '["→", "–", "·"]' : "[<CheckIcon />, <CircleIcon />]"}}>\n  <ul>...</ul>\n</ListStyle>`}
		>
			<div className="flex h-full flex-col gap-5 rounded-2xl border border-[color:var(--honeydeck-color-border)] bg-[color:var(--honeydeck-color-background)] p-5">
				<div className="flex flex-wrap gap-2">
					{modes.map((item, index) => (
						<Button
							className="border-[color:var(--honeydeck-color-border)] data-[active=true]:bg-[color:var(--honeydeck-color-primary)] data-[active=true]:text-[color:var(--honeydeck-color-primary-foreground)]"
							data-active={active === index}
							key={item.label}
							onClick={() => setActive(index)}
							size="sm"
							type="button"
						>
							{item.label}
						</Button>
					))}
				</div>
				<ListStyle bullets={mode.bullets} className="text-lg leading-8">
					<ul>
						<li>Open with a clear story</li>
						<li>
							Show the workflow
							<ul>
								<li>MDX source</li>
								<li>Presenter view</li>
							</ul>
						</li>
						<li>Export and share</li>
					</ul>
				</ListStyle>
			</div>
		</Playground>
	);
}

export function BrowserFramePlayground() {
	const pages = [
		{
			label: "Landing",
			address: "demo.honeydeck.dev/landing",
			title: "Launch deck",
			body: "A warm hero, clear CTA, and room for your story.",
		},
		{
			label: "Metrics",
			address: "demo.honeydeck.dev/metrics",
			title: "Quarterly update",
			body: "Use a browser frame when live product context matters.",
		},
	] as const;
	const [active, setActive] = useState(0);
	const page = pages[active];
	const srcDoc = `<!doctype html><html><body style="margin:0;font-family:Inter,system-ui,sans-serif;background:#fff8e8;color:#191528;"><main style="display:grid;min-height:100vh;place-items:center;padding:32px;"><section style="max-width:640px;border:1px solid #ded7c5;border-radius:24px;background:white;padding:32px;box-shadow:0 24px 60px rgb(71 54 21 / 14%);"><p style="margin:0 0 12px;font-weight:900;color:#8b6a00;">${page.label}</p><h1 style="margin:0;font-size:44px;line-height:1;font-weight:950;">${page.title}</h1><p style="font-size:20px;line-height:1.5;color:#696475;">${page.body}</p></section></main></body></html>`;

	return (
		<Playground
			title="Browser preview"
			description="Toggle example pages and see the macOS-style frame around live iframe content."
			code={`<BrowserFrame\n  src="about:blank"\n  addressBar="${page.address}"\n/>`}
		>
			<div className="flex h-full flex-col gap-4">
				<div className="flex flex-wrap gap-2">
					{pages.map((item, index) => (
						<Button
							className="border-[color:var(--honeydeck-color-border)] data-[active=true]:bg-[color:var(--honeydeck-color-primary)] data-[active=true]:text-[color:var(--honeydeck-color-primary-foreground)]"
							data-active={active === index}
							key={item.label}
							onClick={() => setActive(index)}
							size="sm"
							type="button"
						>
							{item.label}
						</Button>
					))}
				</div>
				<div className="h-72 text-[28px]">
					<BrowserFrame
						addressBar={page.address}
						allow=""
						src="about:blank"
						srcDoc={srcDoc}
						title={`${page.label} preview`}
					/>
				</div>
			</div>
		</Playground>
	);
}

export function NotesPlayground() {
	return (
		<Playground
			title="Audience slide + presenter notes"
			description="Notes are invisible to the audience, then appear in presenter mode as delivery cues."
			code={`# Launch plan\n\n- What changed\n- Why it matters\n\n<Notes>\n  # Demo cue\n  - Show the interactive component.\n  - Mention PDF export.\n</Notes>`}
		>
			<div className="grid h-full gap-4 md:grid-cols-2">
				<div className="rounded-2xl border border-[color:var(--honeydeck-color-border)] bg-[color:var(--honeydeck-color-background)] p-5">
					<p className="flex items-center gap-2 text-sm font-black text-[color:var(--honeydeck-color-muted-foreground)]">
						<MousePointerClickIcon size={16} aria-hidden="true" /> Audience view
					</p>
					<h4 className="mt-6 text-3xl font-black">Launch plan</h4>
					<ul className="mt-4 list-disc pl-5 text-lg leading-8">
						<li>What changed</li>
						<li>Why it matters</li>
					</ul>
				</div>
				<div className="rounded-2xl border border-[color:var(--honeydeck-color-border)] bg-[color:var(--docs-panel-strong)] p-5">
					<p className="flex items-center gap-2 text-sm font-black text-[color:var(--honeydeck-color-muted-foreground)]">
						<MessageSquareTextIcon size={16} aria-hidden="true" /> Presenter
						notes
					</p>
					<h4 className="mt-6 text-2xl font-black">Demo cue</h4>
					<ul className="mt-4 list-disc pl-5 leading-7">
						<li>Show the interactive component.</li>
						<li>Mention PDF export.</li>
					</ul>
				</div>
			</div>
		</Playground>
	);
}
