import { Button } from "@honeydeck/honeydeck/components";
import { MDXProvider } from "@mdx-js/react";
import { BookOpenIcon, CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { docComponent, docs, docsByGroup } from "../docs.js";
import { marketingImages } from "../marketingContent.js";
import {
	docsMobileNavClass,
	docsNavLinkClass,
	smallButtonClass,
} from "../ui/styles.js";

export function DocPage() {
	const { slug = "getting-started" } = useParams();
	const doc = docs.find((entry) => entry.slug === slug) ?? docs[0];
	const Component = docComponent(doc.slug);
	const [copied, setCopied] = useState(false);
	async function copyMarkdown() {
		const text = await fetch(doc.markdownPath).then((response) =>
			response.text(),
		);
		await navigator.clipboard.writeText(text);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1800);
	}
	return (
		<main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[18rem_1fr] lg:py-10">
			<DocsSidebar activeSlug={doc.slug} />
			<section className="min-w-0">
				<div className="mb-8 flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
					<DocsMobileNav activeSlug={doc.slug} activeTitle={doc.title} />
					<div className="flex flex-wrap gap-2 md:justify-end">
						<a className={smallButtonClass} href={doc.markdownPath}>
							<BookOpenIcon size={15} aria-hidden="true" /> View as Markdown
						</a>
						<Button variant="small" onClick={copyMarkdown}>
							{copied ? (
								<CheckIcon size={15} aria-hidden="true" />
							) : (
								<CopyIcon size={15} aria-hidden="true" />
							)}{" "}
							Copy page as Markdown
						</Button>
					</div>
				</div>
				<article className="doc-content">
					{doc.slug === "getting-started" ? (
						<img
							src={marketingImages.docsHelper}
							alt="Dex, the Honeydeck mascot, holding a getting-started document."
							className="mx-auto mb-6 block w-32 sm:float-right sm:ml-6 lg:w-36 xl:w-40"
						/>
					) : null}
					{Component ? (
						<MDXProvider>
							<Component />
						</MDXProvider>
					) : (
						<p>Documentation page not found.</p>
					)}
				</article>
			</section>
		</main>
	);
}

function DocsSidebar({ activeSlug }: { activeSlug?: string }) {
	return (
		<aside className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
			<nav className="p-1" aria-label="Documentation navigation">
				{[...docsByGroup()].map(([group, items]) => (
					<div className="mb-5 last:mb-0" key={group}>
						<h2 className="mb-2 text-xs font-black uppercase text-[color:var(--honeydeck-color-muted-foreground)]">
							{group}
						</h2>
						{items.map((doc) => (
							<Link
								className={docsNavLinkClass(activeSlug === doc.slug)}
								to={doc.route}
								key={doc.slug}
							>
								{doc.title}
							</Link>
						))}
					</div>
				))}
			</nav>
		</aside>
	);
}

function DocsMobileNav({
	activeSlug,
	activeTitle,
}: {
	activeSlug?: string;
	activeTitle: string;
}) {
	return (
		<details className={docsMobileNavClass}>
			<summary className="flex list-none justify-between font-black [&::-webkit-details-marker]:hidden">
				<span>Docs: {activeTitle}</span>
				<span
					aria-hidden="true"
					className="text-[color:var(--honeydeck-color-muted-foreground)] group-open:hidden"
				>
					+
				</span>
				<span
					aria-hidden="true"
					className="hidden text-[color:var(--honeydeck-color-muted-foreground)] group-open:inline"
				>
					-
				</span>
			</summary>
			<nav className="mt-3" aria-label="Documentation navigation">
				{[...docsByGroup()].map(([group, items]) => (
					<div className="mb-4 last:mb-0" key={group}>
						<h2 className="text-xs font-black uppercase text-[color:var(--honeydeck-color-muted-foreground)]">
							{group}
						</h2>
						<div className="mt-2 grid gap-1">
							{items.map((doc) => (
								<Link
									className={docsNavLinkClass(activeSlug === doc.slug)}
									to={doc.route}
									key={doc.slug}
								>
									{doc.title}
								</Link>
							))}
						</div>
					</div>
				))}
			</nav>
		</details>
	);
}
