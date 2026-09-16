/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/lib/capture/constants.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Shared capture constants — used by the core DOM walker, the runtime style
* extractor, and any consumer that needs to know default/inherited CSS
* behavior. Must stay self-contained (no imports) so the module can be
* bundled into a standalone IIFE for guest injection.
*/
var CSS_DEFAULTS$1 = {
  alignContent: "normal",
  alignItems: "normal",
  alignSelf: "auto",
  aspectRatio: "auto",
  backgroundColor: "rgba(0, 0, 0, 0)",
  backgroundImage: "none",
  backgroundPositionX: "0%",
  backgroundPositionY: "0%",
  backgroundRepeat: "repeat",
  backgroundSize: "auto",
  borderBottomColor: "rgb(0, 0, 0)",
  borderBottomLeftRadius: "0px",
  borderBottomRightRadius: "0px",
  borderBottomStyle: "none",
  borderBottomWidth: "0px",
  borderCollapse: "separate",
  borderLeftColor: "rgb(0, 0, 0)",
  borderLeftStyle: "none",
  borderLeftWidth: "0px",
  borderRightColor: "rgb(0, 0, 0)",
  borderRightStyle: "none",
  borderRightWidth: "0px",
  borderTopColor: "rgb(0, 0, 0)",
  borderTopLeftRadius: "0px",
  borderTopRightRadius: "0px",
  borderTopStyle: "none",
  borderTopWidth: "0px",
  bottom: "auto",
  boxShadow: "none",
  boxSizing: "content-box",
  clipPath: "none",
  color: "rgb(0, 0, 0)",
  columnCount: "auto",
  columnGap: "normal",
  cursor: "auto",
  filter: "none",
  flexBasis: "auto",
  flexDirection: "row",
  flexGrow: "0",
  flexShrink: "1",
  flexWrap: "nowrap",
  fontFamily: "Times",
  fontSize: "16px",
  fontStyle: "normal",
  fontWeight: "400",
  gap: "normal",
  gridAutoColumns: "auto",
  gridAutoFlow: "row",
  gridAutoRows: "auto",
  gridColumnEnd: "auto",
  gridColumnStart: "auto",
  gridRowEnd: "auto",
  gridRowStart: "auto",
  gridTemplateAreas: "none",
  gridTemplateColumns: "none",
  gridTemplateRows: "none",
  height: "auto",
  justifyContent: "normal",
  justifyItems: "normal",
  justifySelf: "auto",
  left: "auto",
  letterSpacing: "normal",
  lineHeight: "normal",
  listStyleImage: "none",
  listStylePosition: "outside",
  listStyleType: "disc",
  marginBottom: "0px",
  marginLeft: "0px",
  marginRight: "0px",
  marginTop: "0px",
  maxHeight: "none",
  maxWidth: "none",
  minHeight: "0px",
  minWidth: "0px",
  mixBlendMode: "normal",
  objectFit: "fill",
  opacity: "1",
  outlineColor: "rgb(0, 0, 0)",
  outlineOffset: "0px",
  outlineStyle: "none",
  outlineWidth: "0px",
  overflow: "visible",
  overflowX: "visible",
  overflowY: "visible",
  paddingBottom: "0px",
  paddingLeft: "0px",
  paddingRight: "0px",
  paddingTop: "0px",
  position: "static",
  right: "auto",
  rowGap: "normal",
  textAlign: "start",
  textDecorationColor: "rgb(0, 0, 0)",
  textDecorationLine: "none",
  textDecorationStyle: "solid",
  textIndent: "0px",
  textShadow: "none",
  textTransform: "none",
  top: "auto",
  transform: "none",
  verticalAlign: "baseline",
  visibility: "visible",
  whiteSpace: "normal",
  width: "auto",
  writingMode: "horizontal-tb",
  zIndex: "auto"
};
/** Properties never worth capturing (vendor-prefix noise, animations, transitions, SVG paint). */
var SKIP_PROPS = new Set(["webkitAppearance", "webkitBoxOrient", "webkitLineClamp", "webkitTapHighlightColor", "mozAppearance", "webkitBoxAlign", "webkitBoxDecorationBreak", "webkitBoxFlex", "webkitBoxOrdinalGroup", "webkitLocale", "webkitMaskBoxImageOutset", "webkitMaskBoxImageRepeat", "webkitMaskBoxImageSlice", "webkitRtlOrdering", "webkitTextFillColor", "webkitTextOrientation", "webkitTextStrokeColor", "webkitUserModify", "webkitWritingMode", "borderBlockStartWidth", "borderBlockEndWidth", "borderInlineStartWidth", "borderInlineEndWidth", "borderBlockStartStyle", "borderBlockEndStyle", "borderInlineStartStyle", "borderInlineEndStyle", "borderBlockStartColor", "borderBlockEndColor", "borderInlineStartColor", "borderInlineEndColor", "paddingBlockStart", "paddingBlockEnd", "paddingInlineStart", "paddingInlineEnd", "marginBlockStart", "marginBlockEnd", "marginInlineStart", "marginInlineEnd", "insetBlockStart", "insetBlockEnd", "insetInlineStart", "insetInlineEnd", "blockSize", "inlineSize", "maxBlockSize", "minBlockSize", "maxInlineSize", "minInlineSize", "overflowBlock", "overflowInline", "animationName", "animationDuration", "animationTimingFunction", "animationDelay", "animationIterationCount", "animationDirection", "animationFillMode", "animationPlayState", "animationComposition", "transitionProperty", "transitionDuration", "transitionTimingFunction", "transitionDelay", "perspectiveOrigin", "transformOrigin", "transformStyle", "fill", "fillOpacity", "fillRule", "clipRule", "stroke", "strokeLinecap", "strokeLinejoin", "strokeMiterlimit", "strokeOpacity", "strokeWidth", "strokeDasharray", "strokeDashoffset", "floodColor", "floodOpacity", "lightingColor", "stopColor", "stopOpacity", "colorInterpolation", "colorInterpolationFilters", "shapeImageThreshold", "maskClip", "maskComposite", "maskMode", "maskOrigin", "maskPosition", "maskRepeat", "maskType", "borderImageOutset", "borderImageRepeat", "borderImageSlice", "borderImageWidth", "backgroundAttachment", "backgroundClip", "backgroundOrigin", "backgroundPosition", "boxDecorationBreak", "captionSide", "caretColor", "emptyCells", "fontStretch", "hyphens", "imageOrientation", "interpolateSize", "mathDepth", "objectPosition", "offsetRotate", "orphans", "widows", "printColorAdjust", "rubyAlign", "rubyPosition", "tabSize", "textAutospace", "textDecorationColor", "textEmphasisColor", "textEmphasisPosition", "textSizeAdjust", "textWrapMode", "unicodeBidi", "whiteSpaceCollapse", "zoom", "fieldSizing", "dynamicRangeLimit", "positionVisibility", "readingOrder", "scrollTimelineAxis", "viewTimelineAxis", "scrollbarWidth", "cornerBottomLeftShape", "cornerBottomRightShape", "cornerTopLeftShape", "cornerTopRightShape", "cornerEndEndShape", "cornerEndStartShape", "cornerStartEndShape", "cornerStartStartShape", "columnRuleColor", "borderStartStartRadius", "borderStartEndRadius", "borderEndStartRadius", "borderEndEndRadius", "order", "overflowClipMargin", "appearance", "direction", "textDecoration"]);
/** Properties that inherit from parent — skip when parent already has the same value. */
var INHERITED_PROPS = new Set(["color", "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant", "lineHeight", "letterSpacing", "wordSpacing", "textAlign", "textIndent", "textTransform", "whiteSpace", "wordBreak", "overflowWrap", "direction", "cursor", "visibility", "listStyleType", "listStylePosition"]);
/** Default values to treat as "implicit" even when not listed in CSS_DEFAULTS. */
var SKIP_DEFAULT_VALUES = new Set(["auto", "normal", "none", "static", "visible", "0px", "0", "start", "baseline", "clip"]);
/** HTML attributes worth capturing as React props. */
var CAPTURE_ATTRS = new Set(["alt", "href", "src", "placeholder", "type", "value", "target", "rel", "title", "role", "id", "for", "disabled", "checked", "readonly", "required", "multiple", "poster"]);
/** Tags skipped entirely (no children, no capture). */
var SKIP_TAGS$1 = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "HEAD", "META", "LINK", "BR"]);
/** Tags whose wrapper is skipped — just recurse into children. */
var PASSTHROUGH_TAGS = new Set(["HTML", "BODY"]);
/** Void elements: self-closing, no children possible. */
var VOID_ELEMENTS$1 = new Set(["IMG", "INPUT", "BR", "HR", "AREA", "COL", "EMBED", "SOURCE", "TRACK", "WBR"]);
/** Replaced elements — user-specified dimensions matter; don't strip width/height. */
var REPLACED = new Set(["IMG", "VIDEO", "CANVAS", "IFRAME"]);
/** Tags whose default `display` is block — skip explicit `display:block` on them. */
var BLOCK_TAGS = new Set(["div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article", "nav", "aside", "main", "header", "footer", "form", "fieldset", "ul", "ol", "li", "dl", "dt", "dd", "figure", "figcaption", "blockquote", "pre", "hr", "address"]);
/** Attribute-prefix blacklist — skip React-internal + known framework markers. */
var SKIP_ATTR_PREFIXES = ["data-reactroot", "data-rh", "data-fg-", "data-h2d"];

export { BLOCK_TAGS, CAPTURE_ATTRS, CSS_DEFAULTS$1, INHERITED_PROPS, PASSTHROUGH_TAGS, REPLACED, SKIP_ATTR_PREFIXES, SKIP_DEFAULT_VALUES, SKIP_PROPS, SKIP_TAGS$1, VOID_ELEMENTS$1 };
