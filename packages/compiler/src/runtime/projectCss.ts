/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/projectCss.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Project CSS is injected into the editor document as a <style> element, so its
* `@import` rules resolve against the app's own URL — not the project. A bare
* specifier (`@import "tailwindcss"`) or a relative path therefore requests a
* path the app doesn't serve, and a dev server or SPA host answers with
* index.html. The rule never applies either way.
*
* Left in place they are not merely inert: html-to-image re-fetches every
* `@import` on each capture to inline its webfonts, then inserts what came back
* as rules on the live stylesheet — so every screenshot logs a burst of parse
* errors over the returned HTML.
*
* Absolute URLs (a Google Fonts import) do resolve and are needed for fonts to
* render, so those stay. An unquoted `url(...)` specifier is left alone too:
* matching it is not worth the risk of mangling a rule that works today.
*/
function stripUnresolvableCssImports(css) {
  return css.replace(/@import\s+(?:url\()?["']([^"']+)["']\)?[^;]*;/g, (rule, specifier) => /^(?:https?:)?\/\/|^data:/.test(specifier) ? rule : `/* bingo: dropped unresolvable @import "${specifier}" */`);
}

export { stripUnresolvableCssImports };
