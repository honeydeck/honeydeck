import type { ComponentType } from "react";
import docsIndex from "./content/docs/generated/index.json" with {
	type: "json",
};

export type DocMeta = {
	title: string;
	description: string;
	slug: string;
	navGroup: string;
	order: number;
	route: string;
	markdownPath: string;
	copiedFrom: string;
};

export const docs = [...(docsIndex as DocMeta[])].sort(
	(a, b) => a.order - b.order,
);

const docModules = import.meta.glob("./content/docs/generated/*.md", {
	eager: true,
}) as Record<string, { default: ComponentType }>;

export function docComponent(slug: string): ComponentType | undefined {
	return docModules[`./content/docs/generated/${slug}.md`]?.default;
}

export function docsByGroup() {
	const groups = new Map<string, DocMeta[]>();
	for (const doc of docs) {
		const items = groups.get(doc.navGroup) ?? [];
		items.push(doc);
		groups.set(doc.navGroup, items);
	}
	return groups;
}
