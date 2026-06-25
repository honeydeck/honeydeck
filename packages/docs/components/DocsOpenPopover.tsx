"use client";

import { buttonVariants } from "fumadocs-ui/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "fumadocs-ui/components/ui/popover";
import {
	ChevronDownIcon,
	CodeIcon,
	ExternalLinkIcon,
	TextIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type LinkItem = {
	href: string;
	icon: ReactNode;
	title: string;
};

type DocsOpenPopoverProps = ComponentProps<typeof PopoverTrigger> & {
	githubUrl?: string;
	markdownUrl?: string;
};

export function DocsOpenPopover({
	githubUrl,
	markdownUrl,
	...props
}: DocsOpenPopoverProps) {
	const items: LinkItem[] = [];

	if (githubUrl) {
		items.push({
			title: "Open in GitHub",
			href: githubUrl,
			icon: <CodeIcon aria-hidden="true" />,
		});
	}

	if (markdownUrl) {
		items.push({
			title: "View as Markdown",
			href: markdownUrl,
			icon: <TextIcon aria-hidden="true" />,
		});
	}

	if (items.length === 0) {
		return null;
	}

	return (
		<Popover>
			<PopoverTrigger
				{...props}
				className={cn(
					buttonVariants({ color: "secondary", size: "sm" }),
					"gap-2 data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground",
					props.className,
				)}
			>
				{props.children ?? "Open"}
				<ChevronDownIcon
					aria-hidden="true"
					className="size-3.5 text-fd-muted-foreground"
				/>
			</PopoverTrigger>
			<PopoverContent className="flex flex-col">
				{items.map((item) => (
					<a
						key={item.href}
						href={item.href}
						rel="noreferrer noopener"
						target="_blank"
						className="inline-flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-fd-accent hover:text-fd-accent-foreground [&_svg]:size-4"
					>
						{item.icon}
						{item.title}
						<ExternalLinkIcon
							aria-hidden="true"
							className="ms-auto size-3.5 text-fd-muted-foreground"
						/>
					</a>
				))}
			</PopoverContent>
		</Popover>
	);
}
