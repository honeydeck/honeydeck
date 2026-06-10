export {
	buttonPrimaryClass,
	buttonSecondaryClass,
	hoverBorderClass,
	iconButtonClass,
	quietLinkClass,
	smallButtonClass,
	surfaceControlClass,
	transitionClass,
} from "@honeydeck/honeydeck/components";
export const eyebrowClass =
	"inline-flex items-center gap-2 text-[0.82rem] font-black uppercase text-[color:var(--honeydeck-color-primary)]";
export const panelClass =
	"rounded-lg border border-[color:var(--honeydeck-color-border)] bg-[color-mix(in_oklab,var(--marketing-panel)_86%,transparent)] shadow-[0_18px_48px_var(--marketing-shadow)]";
export const heroCardClass = `${panelClass} p-[clamp(1.1rem,3vw,1.6rem)]`;
export const docsMobileNavClass =
	"group rounded-lg border border-[color:var(--honeydeck-color-border)] bg-[color-mix(in_oklab,var(--marketing-panel)_86%,transparent)] p-3 lg:hidden";
const docsNavLinkBaseClass =
	"block rounded-lg border px-3 py-2 text-[0.94rem] font-bold no-underline";
const docsNavLinkActiveClass =
	"border-[color:color-mix(in_oklab,var(--honeydeck-color-primary)_60%,var(--honeydeck-color-border))] bg-[color-mix(in_oklab,var(--honeydeck-color-primary)_25%,transparent)] text-[color:var(--honeydeck-color-foreground)]";
const docsNavLinkInactiveClass =
	"border-transparent text-[color:var(--honeydeck-color-muted-foreground)] hover:bg-[color-mix(in_oklab,var(--honeydeck-color-surface)_68%,transparent)] hover:text-[color:var(--honeydeck-color-foreground)]";

export function docsNavLinkClass(active: boolean) {
	return `${docsNavLinkBaseClass} ${active ? docsNavLinkActiveClass : docsNavLinkInactiveClass}`;
}
