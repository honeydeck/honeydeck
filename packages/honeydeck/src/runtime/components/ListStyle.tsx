import {
	Children,
	type CSSProperties,
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
} from "react";

export type ListBullet = ReactNode;

export type ListBullets =
	| false
	| "none"
	| null
	| ListBullet
	| readonly ListBullet[];

export type ListStyleProps = {
	/**
	 * Custom bullet marker(s). Omit, `false`, `null`, or `"none"` to remove
	 * markers. Pass one marker for every level or an array by nesting level.
	 */
	bullets?: ListBullets;
	className?: string;
	style?: CSSProperties;
	children?: ReactNode;
};

type CommonElement = ReactElement<{
	children?: ReactNode;
	className?: string;
}>;

function cn(...classes: (string | undefined | false)[]): string | undefined {
	const value = classes.filter(Boolean).join(" ");
	return value || undefined;
}

function isCommonElement(node: ReactNode): node is CommonElement {
	return isValidElement(node);
}

function isListItemElement(node: ReactNode): node is CommonElement {
	return (
		isCommonElement(node) && typeof node.type === "string" && node.type === "li"
	);
}

function hasCustomBullets(bullets: ListBullets | undefined): boolean {
	return !(
		bullets === undefined ||
		bullets === null ||
		bullets === false ||
		bullets === "none" ||
		(Array.isArray(bullets) && bullets.length === 0)
	);
}

function bulletForLevel(
	bullets: ListBullets | undefined,
	level: number,
): ReactNode {
	if (!hasCustomBullets(bullets)) return null;

	if (Array.isArray(bullets)) {
		const index = Math.min(level - 1, bullets.length - 1);
		const bullet = bullets[index];
		return bullet === undefined || bullet === false ? null : bullet;
	}

	return bullets;
}

function transformChildren(
	children: ReactNode,
	level: number,
	bullets: ListBullets,
): ReactNode {
	return Children.map(children, (child) =>
		transformNode(child, level, bullets),
	);
}

function transformNode(
	node: ReactNode,
	level: number,
	bullets: ListBullets,
): ReactNode {
	if (!isCommonElement(node)) return node;

	const element = node;
	if (
		typeof element.type === "string" &&
		(element.type === "ul" || element.type === "ol")
	) {
		return transformList(element, level, bullets);
	}

	if (element.props.children === undefined) return element;

	return cloneElement(element, {
		children: transformChildren(element.props.children, level, bullets),
	});
}

function transformList(
	list: CommonElement,
	level: number,
	bullets: ListBullets,
): ReactNode {
	return cloneElement(list, {
		className: cn(list.props.className, "honeydeck-list-style-list"),
		children: Children.map(list.props.children, (child) => {
			if (!isListItemElement(child))
				return transformNode(child, level + 1, bullets);
			return transformListItem(child, level, bullets);
		}),
	});
}

function transformListItem(
	item: CommonElement,
	level: number,
	bullets: ListBullets,
): ReactNode {
	const bullet = bulletForLevel(bullets, level);
	const hasBullet = bullet !== null && bullet !== undefined && bullet !== false;
	const marker = hasBullet ? (
		<span
			className="honeydeck-list-style-marker inline-flex h-[1.7em] w-[0.9em] flex-[0_0_0.9em] items-center justify-center text-accent font-bold leading-none [&>svg]:h-[0.9em] [&>svg]:w-[0.9em] [&>svg]:stroke-[3]"
			aria-hidden="true"
		>
			{bullet}
		</span>
	) : null;

	return cloneElement(item, {
		className: cn(
			item.props.className,
			"honeydeck-list-style-item",
			hasBullet &&
				"honeydeck-list-style-item--with-marker flex items-start gap-[0.35em]",
		),
		children: hasBullet ? (
			<>
				{marker}
				<div className="honeydeck-list-style-content min-w-0 flex-1">
					{transformChildren(item.props.children, level + 1, bullets)}
				</div>
			</>
		) : (
			transformChildren(item.props.children, level + 1, bullets)
		),
	});
}

/**
 * Wrap Markdown/HTML/JSX lists to remove native markers or render custom
 * bullet markers per nesting level.
 *
 * Omit `bullets` to remove native markers while keeping list alignment. Pass
 * one marker to reuse it for every nesting level, or an array to assign markers
 * by level. Markers can be strings, icons, or any React node that fits inline.
 *
 * ```mdx
 * import { ListStyle } from '@honeydeck/honeydeck'
 *
 * <ListStyle>
 *   - No marker
 *   - Still aligned
 * </ListStyle>
 *
 * <ListStyle bullets={["01", "+"]}>
 *   - First level
 *     - Nested detail
 *   - Aligned custom markers
 * </ListStyle>
 * ```
 */
export function ListStyle({
	bullets,
	className,
	style,
	children,
}: ListStyleProps) {
	const customBullets = hasCustomBullets(bullets);

	return (
		<div
			className={cn(
				"honeydeck-list-style [&_:is(ul,ol)]:list-none [&_:is(ul,ol)]:pl-0 [&_li>:is(ul,ol)]:mt-[0.35em] [&_li>:is(ul,ol)]:pl-[1.5em] [&_.honeydeck-list-style-content>:is(ul,ol)]:mt-[0.35em] [&_.honeydeck-list-style-content>:is(ul,ol)]:pl-[1.5em]",
				customBullets
					? "honeydeck-list-style--custom"
					: "honeydeck-list-style--plain",
				className,
			)}
			style={style}
		>
			{customBullets ? transformChildren(children, 1, bullets) : children}
		</div>
	);
}
