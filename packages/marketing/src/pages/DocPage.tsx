import { Button } from "@honeydeck/honeydeck/components";
import { MDXProvider } from "@mdx-js/react";
import {
	BookOpenIcon,
	CheckIcon,
	ChevronDownIcon,
	CopyIcon,
} from "lucide-react";
import {
	type RefObject,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
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
	const articleRef = useRef<HTMLElement | null>(null);
	const headings = useArticleHeadings(articleRef, doc.slug);
	return (
		<main className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8 lg:py-10 xl:grid-cols-[18rem_minmax(0,1fr)_13rem]">
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
				<article className="doc-content" ref={articleRef}>
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
			<PageHeadingsNav headings={headings} />
		</main>
	);
}

function DocsSidebar({ activeSlug }: { activeSlug?: string }) {
	const groups = useMemo(() => [...docsByGroup()], []);
	const activeGroup = groups.find(([, items]) =>
		items.some((doc) => doc.slug === activeSlug),
	)?.[0];
	const [expandedGroups, setExpandedGroups] = useState(
		() => new Set(activeGroup ? [activeGroup] : []),
	);

	useEffect(() => {
		if (!activeGroup) return;
		setExpandedGroups((current) => {
			if (current.has(activeGroup)) return current;
			const next = new Set(current);
			next.add(activeGroup);
			return next;
		});
	}, [activeGroup]);

	function toggleGroup(group: string) {
		setExpandedGroups((current) => {
			const next = new Set(current);
			if (next.has(group)) {
				next.delete(group);
			} else {
				next.add(group);
			}
			return next;
		});
	}

	return (
		<aside className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
			<nav className="p-1" aria-label="Documentation navigation">
				{groups.map(([group, items]) => {
					const expanded = expandedGroups.has(group);
					const contentId = `docs-nav-${slugify(group)}`;
					return (
						<div className="mb-5 last:mb-0" key={group}>
							<button
								aria-controls={contentId}
								aria-expanded={expanded}
								className="mb-2 flex w-full cursor-default items-center justify-between gap-2 text-left text-xs font-black uppercase text-[color:var(--honeydeck-color-muted-foreground)]"
								type="button"
								onClick={() => toggleGroup(group)}
							>
								<span>{group}</span>
								<ChevronDownIcon
									className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}
									aria-hidden="true"
								/>
							</button>
							<div className={expanded ? "block" : "hidden"} id={contentId}>
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
					);
				})}
			</nav>
		</aside>
	);
}

type ArticleHeading = {
	id: string;
	level: number;
	text: string;
};

function PageHeadingsNav({ headings }: { headings: ArticleHeading[] }) {
	if (headings.length === 0) return null;
	return (
		<aside className="hidden xl:sticky xl:top-24 xl:block xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain">
			<nav
				aria-label="On this page"
				className="border-l border-[color:color-mix(in_oklab,var(--honeydeck-color-border)_70%,transparent)] pl-4 text-xs"
			>
				<h2 className="mb-2 font-black uppercase tracking-wide text-[color:color-mix(in_oklab,var(--honeydeck-color-muted-foreground)_74%,transparent)]">
					On this page
				</h2>
				<ul className="grid gap-1.5">
					{headings.map((heading) => (
						<li
							key={heading.id}
							style={{ paddingLeft: `${(heading.level - 1) * 0.55}rem` }}
						>
							<a
								className="block rounded-md py-0.5 text-[color:color-mix(in_oklab,var(--honeydeck-color-muted-foreground)_78%,transparent)] no-underline hover:text-[color:var(--honeydeck-color-foreground)]"
								href={`#${heading.id}`}
							>
								{heading.text}
							</a>
						</li>
					))}
				</ul>
			</nav>
		</aside>
	);
}

function useArticleHeadings(
	articleRef: RefObject<HTMLElement | null>,
	contentKey: string,
) {
	const [headings, setHeadings] = useState<ArticleHeading[]>([]);

	useLayoutEffect(() => {
		const article = articleRef.current;
		if (!article) {
			setHeadings([]);
			return;
		}
		const usedIds = new Set<string>();
		const nextHeadings = Array.from(
			article.querySelectorAll<HTMLHeadingElement>("h1, h2, h3, h4, h5, h6"),
		).map((heading) => {
			const text = heading.textContent?.trim() ?? "";
			const baseId = heading.id || slugify(text) || "section";
			let id = baseId;
			let count = 2;
			while (usedIds.has(id)) {
				id = `${baseId}-${count}`;
				count += 1;
			}
			usedIds.add(id);
			heading.id = id;
			return {
				id,
				level: Number(heading.tagName.slice(1)),
				text,
			};
		});
		setHeadings(nextHeadings.filter((heading) => heading.text.length > 0));
	}, [articleRef, contentKey]);

	return headings;
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
