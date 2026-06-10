declare module "*.mdx" {
	import type { ComponentType } from "react";

	const Component: ComponentType;
	export default Component;
}

declare module "*.webp" {
	const src: string;
	export default src;
}
