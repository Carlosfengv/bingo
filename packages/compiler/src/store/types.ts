/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/store/types.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var ROOT = "ROOT";
var LEAF_TYPES = new Set(["text", "icon", "webview"]);
var VOID_HTML_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
var VOID_SVG_TAGS = new Set(["circle", "ellipse", "image", "line", "path", "polygon", "polyline", "rect", "stop", "use", "feBlend", "feColorMatrix", "feComposite", "feConvolveMatrix", "feDisplacementMap", "feDropShadow", "feFlood", "feGaussianBlur", "feImage", "feMorphology", "feOffset", "feTile", "feTurbulence", "feMergeNode", "feFuncR", "feFuncG", "feFuncB", "feFuncA", "feDistantLight", "fePointLight", "feSpotLight"]);
function hasChildren$1(el) {
  if (LEAF_TYPES.has(el.type)) return false;
  if (el.type === "html" && (VOID_HTML_TAGS.has(el.tag) || VOID_SVG_TAGS.has(el.tag))) return false;
  return true;
}
var SVG_CONTAINER_TAGS = new Set(["svg", "g", "defs", "symbol", "marker", "mask", "pattern", "switch", "clipPath", "linearGradient", "radialGradient", "text", "tspan", "textPath", "filter", "feMerge", "feComponentTransfer", "feDiffuseLighting", "feSpecularLighting"]);
var ALL_SVG_TAGS = new Set([...SVG_CONTAINER_TAGS, ...VOID_SVG_TAGS]);
var RESTRICTED_CHILD_TAGS = {
  video: new Set(["source", "track"]),
  audio: new Set(["source", "track"]),
  picture: new Set(["source", "img"]),
  select: new Set(["option", "optgroup", "hr"]),
  optgroup: new Set(["option"]),
  object: new Set(["param"]),
  iframe: new Set(),
  canvas: new Set(),
  textarea: new Set(),
  option: new Set()
};
var TEXT_CONTENT_TAGS = new Set(["option", "textarea"]);
function canAcceptChild(parent, child) {
  if (!hasChildren$1(parent)) return false;
  if (parent.type !== "html") return true;
  if (parent.tag === "foreignObject") return true;
  const restricted = RESTRICTED_CHILD_TAGS[parent.tag];
  if (restricted) {
    if (child.type === "text") return TEXT_CONTENT_TAGS.has(parent.tag);
    return child.type === "html" && restricted.has(child.tag);
  }
  if (!SVG_CONTAINER_TAGS.has(parent.tag)) return true;
  return child.type === "html" && (ALL_SVG_TAGS.has(child.tag) || child.tag === "foreignObject");
}
[... new Set(["svg", "g", "defs", "symbol", "marker", "mask", "pattern", "switch", "clipPath", "linearGradient", "radialGradient", "text", "tspan", "textPath", "filter", "feMerge", "feComponentTransfer", "feDiffuseLighting", "feSpecularLighting"]), ...VOID_SVG_TAGS];

export { ROOT, canAcceptChild, hasChildren$1 };
