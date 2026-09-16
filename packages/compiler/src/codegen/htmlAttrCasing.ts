/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/htmlAttrCasing.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var HTML_ATTR_TO_REACT = {
  autoplay: "autoPlay",
  playsinline: "playsInline",
  crossorigin: "crossOrigin",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
  novalidate: "noValidate",
  formnovalidate: "formNoValidate",
  srcset: "srcSet",
  referrerpolicy: "referrerPolicy",
  allowfullscreen: "allowFullScreen"
};
/**
* Rename HTML-cased attribute keys to their React equivalents, de-duping when a
* value already exists under the canonical key (canonical wins, alias dropped —
* so a legacy `autoplay` alongside a new `autoPlay` collapses to one). Returns the
* same reference when nothing changed.
*/
function normalizeReactAttrs(props) {
  if (!props) return props;
  let result = null;
  for (const key of Object.keys(props)) {
    const canonical = HTML_ATTR_TO_REACT[key];
    if (!canonical || canonical === key) continue;
    if (!result) result = {
      ...props
    };
    if (!(canonical in props)) result[canonical] = props[key];
    delete result[key];
  }
  return result ?? props;
}

export { normalizeReactAttrs };
