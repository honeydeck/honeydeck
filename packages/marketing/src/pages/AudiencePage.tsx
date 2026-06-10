import {
	ArrowRightIcon,
	BotIcon,
	CheckIcon,
	Code2Icon,
	UsersIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { HeroVisual } from "../ui/HeroVisual.js";
import { buttonPrimaryClass, eyebrowClass } from "../ui/styles.js";

export function AudiencePage({
	audience,
}: {
	audience: "developers" | "ai" | "product";
}) {
	const content = {
		developers: {
			icon: <Code2Icon size={28} aria-hidden="true" />,
			title: "Honeydeck for developers",
			subtitle:
				"Bring React components, MDX, Vite, Tailwind, presenter mode, and PDF export to decks without leaving your code workflow.",
			bullets: [
				"Create a first deck with npx @honeydeck/honeydeck init.",
				"Use explicit imports and reusable React components.",
				"Keep talks reviewable in pull requests.",
			],
			cta: "Start with the docs",
		},
		ai: {
			icon: <BotIcon size={28} aria-hidden="true" />,
			title: "Honeydeck for AI-assisted authoring",
			subtitle:
				"Honeydeck is AI-friendly, not an AI slide generator. The win is that an agent can read and edit the same MDX files you review.",
			bullets: [
				"Plain text content and frontmatter are easy to inspect.",
				"Honeydeck skills and package docs guide agents toward valid syntax.",
				"Humans stay in control of narrative and visual choices.",
			],
			cta: "Read AI-friendly docs",
		},
		product: {
			icon: <UsersIcon size={28} aria-hidden="true" />,
			title: "Honeydeck for product stories",
			subtitle:
				"Pair AI-assisted drafting with developer-grade presentation source to produce crisp roadmap, strategy, and launch decks.",
			bullets: [
				"Ask an agent to draft structure, notes, and demo narrative.",
				"Collaborate with developers when live product components help.",
				"Export presenter-ready PDFs when sharing offline.",
			],
			cta: "Open getting started",
		},
	}[audience];
	return (
		<main className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.8fr]">
			<section>
				<p className={eyebrowClass}>{content.icon} Audience guide</p>
				<h1 className="mt-5 text-balance text-5xl font-black sm:text-7xl">
					{content.title}
				</h1>
				<p className="mt-6 text-xl leading-8 text-[color:var(--honeydeck-color-muted-foreground)]">
					{content.subtitle}
				</p>
				<ul className="mt-8 grid gap-3">
					{content.bullets.map((bullet) => (
						<li className="flex gap-3" key={bullet}>
							<CheckIcon
								className="mt-1 shrink-0 text-[color:var(--honeydeck-color-primary)]"
								size={18}
								aria-hidden="true"
							/>
							<span>{bullet}</span>
						</li>
					))}
				</ul>
				<Link
					className={`${buttonPrimaryClass} mt-8`}
					to="/docs/getting-started"
				>
					{content.cta}
					<ArrowRightIcon size={18} aria-hidden="true" />
				</Link>
			</section>
			<HeroVisual />
		</main>
	);
}
