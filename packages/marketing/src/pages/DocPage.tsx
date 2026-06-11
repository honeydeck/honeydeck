import { Button } from "@honeydeck/honeydeck/components";
import { MDXProvider } from "@mdx-js/react";
import { BookOpenIcon, CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { docComponent, docs, docsByGroup } from "../docs.js";
import { marketingImages } from "../marketingContent.js";
import { docsNavLinkClass, smallButtonClass } from "../ui/styles.js";

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
		<main className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[18rem_1fr] lg:gap-8 lg:py-10">
			<DocsSidebar activeSlug={doc.slug} />
			<section className="min-w-0">
				<div className="mb-6 grid gap-2 text-sm min-[360px]:grid-cols-2 md:mb-8 md:flex md:flex-wrap md:justify-end">
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
				<article className="doc-content">
					{doc.slug === "getting-started" ? (
						<img
							src={marketingImages.docsHelper}
							alt="Dex, the Honeydeck mascot, holding a getting-started document."
							className="mb-6 hidden w-32 sm:float-right sm:ml-6 sm:block lg:w-36 xl:w-40"
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
