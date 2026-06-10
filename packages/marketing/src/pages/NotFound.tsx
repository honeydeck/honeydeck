import { Link, useLocation } from "react-router-dom";
import { buttonPrimaryClass } from "../ui/styles.js";

export function NotFound() {
	const location = useLocation();
	return (
		<main className="mx-auto max-w-3xl px-4 py-24 text-center">
			<h1 className="text-5xl font-black">Page not found</h1>
			<p className="mt-4 text-[color:var(--honeydeck-color-muted-foreground)]">
				No Honeydeck page at <code>{location.pathname}</code>.
			</p>
			<Link className={`${buttonPrimaryClass} mt-8`} to="/">
				Go home
			</Link>
		</main>
	);
}
