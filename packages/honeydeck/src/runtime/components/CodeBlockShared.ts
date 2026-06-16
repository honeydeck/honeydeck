/** A single step-through group: line numbers (1-based) or 'all'. */
export type StepGroup = number[] | "all";

export function parseJsonProp<T>(
	value: string,
	fallback: T,
	propName?: string,
): T {
	try {
		return JSON.parse(value) as T;
	} catch (error) {
		if (propName) {
			console.warn(`Honeydeck Magic Code could not parse ${propName}.`, error);
		}
		return fallback;
	}
}
