import type { Metadata } from "next";
import { Provider } from "@/components/provider";
import "./global.css";

export const metadata: Metadata = {
	metadataBase: new URL("https://honeydeck.dev"),
	title: {
		default: "Honeydeck Docs",
		template: "%s | Honeydeck Docs",
	},
	description:
		"Documentation for Honeydeck, the MDX and React presentation framework.",
};

export default function Layout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="flex min-h-screen flex-col">
				<Provider>{children}</Provider>
			</body>
		</html>
	);
}
