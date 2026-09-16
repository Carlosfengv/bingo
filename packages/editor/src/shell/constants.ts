/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/constants.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { emptyStore } from "@bingo/compiler";

/**
* Shared constants for the editor shell — non-JSX, no React.
* UI-bound option arrays that contain JSX (icons) stay near their consumers.
*/
/**
* CSS properties that participate in text styling — when a text-selection
* overlay is active, these read from the overlay instead of the element.
*/
var TEXT_STYLE_KEYS = new Set(["color", "backgroundColor", "fontWeight", "fontStyle", "fontSize", "fontFamily", "textDecoration", "textDecorationLine", "textDecorationColor", "letterSpacing", "lineHeight"]);
/**
* Inline styles that belong to a text RUN (a highlighted portion), so a partial
* selection routes them to the run instead of the owning element.
*
* Deliberately NOT the same set as TEXT_STYLE_KEYS above: `backgroundColor` is a
* box property (the Background section, element-level) with no per-run highlight
* UI. When it crept in, an element-level apply whose base carried the box's
* backgroundColor leaked that color onto the run (a stray <span backgroundColor>
* over the text). The trailing four keys are text-gradient paint, so a gradient
* picked for a partial selection lands on the run as
* <span style="background-clip:text;..."> instead of the owner.
*/
var TEXT_RUN_STYLE_KEYS = new Set(["color", "fontWeight", "fontStyle", "fontSize", "fontFamily", "textDecoration", "textDecorationLine", "textDecorationColor", "letterSpacing", "backgroundImage", "backgroundClip", "WebkitBackgroundClip", "WebkitTextFillColor"]);
/** All CSS keys cleared when the Margin section's X is clicked. */
var MARGIN_KEYS = ["marginTop", "marginRight", "marginBottom", "marginLeft", "margin"];
/** All CSS keys cleared when the Padding section's X is clicked. */
var PADDING_KEYS = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "padding"];
/** All CSS keys cleared when the Radius section's X is clicked. */
var RADIUS_KEYS = ["borderRadius", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"];
/** All CSS keys cleared when the Border section's X is clicked. */
var BORDER_KEYS = ["borderWidth", "borderColor", "borderStyle", "border", "borderTop", "borderRight", "borderBottom", "borderLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle"];
/** All CSS keys cleared when the Typography section's X is clicked. */
var TYPOGRAPHY_KEYS = ["color", "fontSize", "fontWeight", "fontFamily", "lineHeight", "letterSpacing", "textAlign"];
/** Available border-style options shown in the Border section's style row. */
var BORDER_STYLES = ["solid", "dashed", "dotted"];
/** Position values offered in the PositionSection dropdown. */
var POSITION_TYPES = ["relative", "absolute", "fixed", "sticky", "static"];
var POSITION_LABELS = {
  static: "Static",
  relative: "Relative",
  absolute: "Absolute",
  fixed: "Fixed",
  sticky: "Sticky"
};
/**
* Per-subtype matcher for Tailwind effect classes — used to bucket existing
* classes into editable rows in the Effects section. Keep the regex precise
* so colors don't get classified as sizes (or vice versa).
*/
var EFFECT_DEFS = [{
  type: "shadow",
  label: "Size",
  prefix: /^shadow(-2xs|-xs|-sm|-md|-lg|-xl|-2xl|-none|-inner)?(\/\d+)?$/,
  example: "shadow-md",
  group: "Shadow"
}, {
  type: "shadow-color",
  label: "Color",
  prefix: /^shadow-(?!2xs(?:\/|$)|xs(?:\/|$)|sm(?:\/|$)|md(?:\/|$)|lg(?:\/|$)|xl(?:\/|$)|2xl(?:\/|$)|none(?:\/|$)|inner(?:\/|$))[a-z]/,
  example: "shadow-black/25",
  group: "Shadow"
}, {
  type: "ring",
  label: "Width",
  prefix: /^ring(-0|-1|-2|-4|-8)?$/,
  example: "ring-2",
  group: "Ring"
}, {
  type: "ring-color",
  label: "Color",
  prefix: /^ring-(?!0$|1$|2$|4$|8$|offset|inset)[a-z]/,
  example: "ring-blue-500",
  group: "Ring"
}, {
  type: "ring-offset",
  label: "Offset",
  prefix: /^ring-offset-\d/,
  example: "ring-offset-2",
  group: "Ring"
}, {
  type: "ring-offset-color",
  label: "Offset Color",
  prefix: /^ring-offset-(?!\d)[a-z]/,
  example: "ring-offset-white",
  group: "Ring"
}, {
  type: "blur",
  label: "Blur",
  prefix: /^blur(-none|-xs|-sm|-md|-lg|-xl|-2xl|-3xl)?$/,
  example: "blur-sm",
  group: "Blur"
}, {
  type: "backdrop-blur",
  label: "Backdrop Blur",
  prefix: /^backdrop-blur(-none|-xs|-sm|-md|-lg|-xl|-2xl|-3xl)?$/,
  example: "backdrop-blur-sm",
  group: "Backdrop Blur"
}];
/** Chat color palette for lock overlays and dropdown dots. */
var CHAT_COLORS = ["#2563eb", "#0d9488", "#f97316", "#16a34a", "#7c3aed", "#06b6d4"];
var ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
/** Shared empty-store singleton — one instance, so it stays referentially stable. */
var EMPTY_STORE = emptyStore();

export { ARROW_KEYS, BORDER_KEYS, BORDER_STYLES, CHAT_COLORS, EFFECT_DEFS, EMPTY_STORE, MARGIN_KEYS, PADDING_KEYS, POSITION_LABELS, POSITION_TYPES, RADIUS_KEYS, TEXT_RUN_STYLE_KEYS, TEXT_STYLE_KEYS, TYPOGRAPHY_KEYS };
