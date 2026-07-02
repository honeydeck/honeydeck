"use client";

import { create } from "@orama/orama";
import { useDocsSearch } from "fumadocs-core/search/client";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import {
	SearchDialog,
	SearchDialogClose,
	SearchDialogContent,
	SearchDialogHeader,
	SearchDialogIcon,
	SearchDialogInput,
	SearchDialogList,
	SearchDialogOverlay,
	type SearchItemType,
	type SharedProps,
} from "fumadocs-ui/components/dialog/search";
import { isValidElement, useMemo, useRef } from "react";

function initOrama() {
	return create({
		schema: { _: "string" },
		language: "english",
	});
}

type SearchResult = SearchItemType & {
	content?: unknown;
	breadcrumbs?: unknown[];
	type?: string;
};

function extractSearchText(value: unknown): string {
	if (value == null || typeof value === "boolean") return "";
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "bigint"
	) {
		return String(value);
	}
	if (Array.isArray(value)) return value.map(extractSearchText).join(" ");
	if (isValidElement(value)) {
		const props = value.props as { children?: unknown };
		return extractSearchText(props.children);
	}
	if (typeof value === "object" && Symbol.iterator in value) {
		return Array.from(value as Iterable<unknown>)
			.map(extractSearchText)
			.join(" ");
	}
	return String(value);
}

function normalizeSearchText(value: unknown) {
	return extractSearchText(value)
		.replace(/<[^>]*>/g, "")
		.toLowerCase()
		.trim();
}

function scoreResult(result: SearchResult, rawQuery: string) {
	const query = normalizeSearchText(rawQuery);
	if (!query) return 0;

	const content = normalizeSearchText(result.content);
	const breadcrumbs = result.breadcrumbs ?? [];
	const lastBreadcrumb = normalizeSearchText(breadcrumbs.at(-1));
	const candidates = [content, lastBreadcrumb];
	let score = 0;

	for (const candidate of candidates) {
		if (!candidate) continue;
		if (candidate === query) score += 1000;
		else if (candidate.startsWith(query)) score += 200;
		else if (new RegExp(`\\b${escapeRegExp(query)}\\b`).test(candidate)) {
			score += 80;
		}
	}

	if (
		result.type === "page" &&
		(content === query || lastBreadcrumb === query)
	) {
		score += 300;
	}

	return score;
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rerankSearchResults<T extends SearchResult>(
	items: T[],
	query: string,
) {
	return items
		.map((item, index) => ({ item, index, score: scoreResult(item, query) }))
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.map(({ item }) => item);
}

export function ClientSearchDialog(props: SharedProps) {
	const searchClient = useMemo(
		() =>
			oramaStaticClient({
				from: "/search-index.json",
				initOrama,
			}),
		[],
	);
	const { search, setSearch, query } = useDocsSearch({
		client: searchClient,
	});
	const cachedItemsRef = useRef<SearchResult[] | null>(null);
	const hasSearch = search.trim().length > 0;
	const isLoading = query.isLoading;
	const items = useMemo(() => {
		if (!hasSearch) {
			cachedItemsRef.current = null;
			return null;
		}

		if (isLoading && cachedItemsRef.current) return cachedItemsRef.current;

		if (query.data && query.data !== "empty") {
			const nextItems = rerankSearchResults(query.data, search);
			cachedItemsRef.current = nextItems;
			return nextItems;
		}

		return null;
	}, [hasSearch, isLoading, query.data, search]);
	const showLoadingFallback = isLoading && items === null;

	return (
		<SearchDialog
			isLoading={isLoading}
			onSearchChange={setSearch}
			search={search}
			{...props}
		>
			<SearchDialogOverlay />
			<SearchDialogContent>
				<SearchDialogHeader>
					<SearchDialogIcon />
					<SearchDialogInput />
					<SearchDialogClose />
				</SearchDialogHeader>
				{showLoadingFallback ? (
					<div className="px-4 py-8 text-center text-sm text-fd-muted-foreground">
						Loading search index…
					</div>
				) : (
					<SearchDialogList items={items} />
				)}
			</SearchDialogContent>
		</SearchDialog>
	);
}
