/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/types/components.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var PHOSPHOR_PROPS_SCHEMA = {
  size: {
    type: "number",
    default: 24,
    label: "Size"
  },
  weight: {
    type: "enum",
    options: ["thin", "light", "regular", "bold", "fill", "duotone"],
    default: "regular",
    label: "Weight"
  },
  color: {
    type: "color",
    label: "Color"
  },
  mirrored: {
    type: "boolean",
    default: false,
    label: "Mirrored"
  }
};
var LUCIDE_PROPS_SCHEMA = {
  size: {
    type: "number",
    default: 24,
    label: "Size"
  },
  strokeWidth: {
    type: "number",
    default: 2,
    label: "Stroke Width"
  },
  color: {
    type: "color",
    label: "Color"
  },
  absoluteStrokeWidth: {
    type: "boolean",
    default: false,
    label: "Absolute Stroke"
  }
};

export { LUCIDE_PROPS_SCHEMA, PHOSPHOR_PROPS_SCHEMA };
