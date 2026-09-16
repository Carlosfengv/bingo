/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/tailwindClasses.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Tailwind class helpers — predicates over the project's class index.
*/
var TYPOGRAPHY_CLASS_RE = /^(text-|font-|leading-|tracking-|decoration-|italic$|not-italic$|underline$|overline$|line-through$|no-underline$|uppercase$|lowercase$|capitalize$|normal-case$|truncate$|antialiased$|subpixel-antialiased$)/;
/** True when the class sets a typography property (see {@link TYPOGRAPHY_CLASS_RE}). */
function isTypographyClass(cls) {
  return TYPOGRAPHY_CLASS_RE.test(cls);
}
/**
* Single source of truth for "this class change targets the highlighted text
* run, not the owning element". True only when there's a non-full text selection
* active AND every class is a typography class. Used by both the panel (which
* props to diff against) and the host (whether to route to the text editor) so
* the two gates can't drift.
*/
function isInlineTypographyEdit(textSelectionState, classes) {
  return !!textSelectionState && !textSelectionState.isFull && classes.length > 0 && classes.every(isTypographyClass);
}

export { isInlineTypographyEdit, isTypographyClass };
