/**
 * Template generator for package.json in a new honeydeck project.
 */

import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
	readFileSync(new URL("../../../package.json", import.meta.url), "utf-8"),
) as { version: string };

export function generatePackageJson(projectName: string): string {
	const pkg = {
		name: projectName,
		version: "0.1.0",
		private: true,
		type: "module",
		scripts: {
			dev: "honeydeck dev",
			build: "honeydeck build",
			pdf: "honeydeck pdf",
		},
		dependencies: {
			"@honeydeck/honeydeck": `^${packageJson.version}`,
			react: "^19.0.0",
			"react-dom": "^19.0.0",
		},
		devDependencies: {
			tailwindcss: "^4.0.0",
			typescript: "^5.0.0",
			"@types/react": "^19.0.0",
			"@types/react-dom": "^19.0.0",
		},
	};

	return `${JSON.stringify(pkg, null, 2)}\n`;
}
