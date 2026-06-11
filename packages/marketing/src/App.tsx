import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AudiencePage } from "./pages/AudiencePage.js";
import { DocPage } from "./pages/DocPage.js";
import { LandingPage } from "./pages/LandingPage.js";
import { NotFound } from "./pages/NotFound.js";
import { Footer, Header } from "./ui/Chrome.js";
import { useColorMode } from "./ui/useColorMode.js";

export function App() {
	const { mode, setMode } = useColorMode();

	return (
		<div className="flex min-h-dvh flex-col">
			<ScrollToTop />
			<Header mode={mode} onSetMode={setMode} />
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route
					path="/for/developers"
					element={<AudiencePage audience="developers" />}
				/>
				<Route path="/for/ai" element={<AudiencePage audience="ai" />} />
				<Route
					path="/for/product"
					element={<AudiencePage audience="product" />}
				/>
				<Route path="/docs" element={<DocPage />} />
				<Route path="/docs/:slug" element={<DocPage />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
			<Footer />
		</div>
	);
}

function ScrollToTop() {
	const { pathname, search } = useLocation();

	return <RouteScrollReset key={`${pathname}${search}`} />;
}

function RouteScrollReset() {
	useEffect(() => {
		window.scrollTo({ top: 0, left: 0, behavior: "auto" });
	}, []);

	return null;
}
