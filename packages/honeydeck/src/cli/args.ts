export function hasHelpFlag(args: string[]): boolean {
	return args.some((arg) => arg === "--help" || arg === "-h");
}
