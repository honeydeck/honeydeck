import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	devIndicators: false,
	transpilePackages: ["@honeydeck/runtime"],
};

export default withMDX(config);
