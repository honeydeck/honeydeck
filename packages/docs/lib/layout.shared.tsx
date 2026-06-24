import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { BookOpenIcon } from "lucide-react";
import Image from "next/image";
import { appName, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: (
				<span className="flex items-center gap-2 font-black">
					<Image
						alt=""
						className="size-7 rounded-full"
						height={28}
						src="/images/dex-avatar-transparent.webp"
						width={28}
					/>
					<span>{appName}</span>
				</span>
			),
		},
		githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
		links: [
			{
				text: "Getting started",
				url: "/docs/getting-started",
				icon: <BookOpenIcon />,
			},
		],
	};
}
