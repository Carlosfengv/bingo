/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/workspace/src/utils/projectCssIsolation.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var PROJECT_CSS_ISOLATION_TAIL = `
/* Project base-layer body rules must not set the editor's inherited text color.
 * Canvas content gets its project foreground explicitly below. */
body {
  color: var(--ed-foreground);
  background-color: var(--ed-background);
}
:where(body :not([data-canvas-content], [data-canvas-content] *)) {
  border-color: var(--ed-border);
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
/* Being unlayered, the reset above also beats our own (layered) font utilities.
 * Restate the stacks the chrome opts into, with the same values the utilities use. */
.font-lora:not([data-canvas-content] *),
.font-serif:not([data-canvas-content] *) {
  font-family: var(--ed-font-serif);
}
.font-mono:not([data-canvas-content] *) {
  font-family: var(--ed-font-mono, var(--font-mono));
}
/* The chrome reset above is unlayered, so restore semantic editor borders
 * after it just as we restore opted-in font stacks. */
.border-ed-field-border:not([data-canvas-content] *) {
  border-color: var(--ed-field-border);
}
.border-ed-menu-border:not([data-canvas-content] *) {
  border-color: var(--ed-menu-border);
}
/* Inactive selectors reserve border space without drawing a border. Restore
 * transparency because the chrome reset overrides their layered utilities. */
:where(
  [data-slot="toggle-group-item"][data-state="off"],
  [data-slot="tabs-trigger"][data-state="inactive"]
):not([data-canvas-content] *) {
  border-color: transparent;
}
:where(
  [data-slot="toggle-group-item"][data-state="on"],
  [data-slot="tabs-trigger"][data-state="active"]
):not([data-canvas-content] *) {
  border-color: var(--ed-field-border);
}
:where(body :not([data-canvas-content], [data-canvas-content] *)::before),
:where(body :not([data-canvas-content], [data-canvas-content] *)::after),
:where(body :not([data-canvas-content], [data-canvas-content] *)::file-selector-button) {
  border-color: var(--ed-border);
}
:where([data-canvas-content], [data-canvas-content] *, [data-canvas-content]::before, [data-canvas-content]::after, [data-canvas-content] *::before, [data-canvas-content] *::after, [data-canvas-content] ::file-selector-button) {
  border-color: var(--color-border, var(--border, transparent));
}
/* Do not inherit editor-chrome body color (--ed-foreground) into
 * project nodes. Root only — a universal color reset would beat text-* utilities. */
:where([data-canvas-content]) {
  color: var(--color-text-primary, var(--color-foreground, var(--foreground)));
}
/* shadcn uses \`border border-transparent\` on triggers/inputs. The reset
 * above is unlayered and beats the project's layered \`border-transparent\`
 * utility — restore transparency here (higher specificity, same layer). */
[data-canvas-content] .border-transparent {
  border-color: transparent;
}
/* Tailwind v4 composes box-shadow / ring from several --tw-* vars whose
   0-defaults normally come from @property — which doesn't reliably reach
   injected canvas content, so a lone shadow-* utility collapses to
   box-shadow: none. Re-establish the defaults in @layer base so the utilities
   (@layer utilities, ordered above base) still override the var they own —
   if these were unlayered they'd beat the utility and force a 0 0 #0000 shadow. */
@layer base {
  :where([data-canvas-content], [data-canvas-content] *, [data-canvas-content]::before, [data-canvas-content]::after, [data-canvas-content] *::before, [data-canvas-content] *::after) {
    --tw-shadow: 0 0 #0000;
    --tw-shadow-color: initial;
    --tw-inset-shadow: 0 0 #0000;
    --tw-inset-shadow-color: initial;
    --tw-ring-color: initial;
    --tw-ring-shadow: 0 0 #0000;
    --tw-inset-ring-color: initial;
    --tw-inset-ring-shadow: 0 0 #0000;
    --tw-ring-offset-width: 0px;
    --tw-ring-offset-color: #fff;
    --tw-ring-offset-shadow: 0 0 #0000;
  }
}
`;

export { PROJECT_CSS_ISOLATION_TAIL };
