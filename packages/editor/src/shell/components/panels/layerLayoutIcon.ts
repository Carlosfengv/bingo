/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/layerLayoutIcon.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { parseTailwindClass } from "../../../shared/utils/tailwindScale";
import { LayerBlockIcon, LayerFlexHCenterIcon, LayerFlexHEndIcon, LayerFlexHStartIcon, LayerFlexVCenterIcon, LayerFlexVEndIcon, LayerFlexVStartIcon, LayerGridIcon } from "@bingo/ui";

/** Resolve stored layout without measuring every layer on the canvas. */
function getLayerLayoutIcon(element) {
  const classStyles = {};
  const className = "props" in element ? element.props?.className : void 0;
  if (typeof className === "string") for (const token of className.split(/\s+/)) Object.assign(classStyles, parseTailwindClass(token));
  const get = property => element.styles?.[property] || classStyles[property];
  const display = get("display");
  if (display === "grid" || display === "inline-grid") return LayerGridIcon;
  if (display !== "flex" && display !== "inline-flex") return LayerBlockIcon;
  const direction = get("flexDirection");
  const column = direction === "column" || direction === "column-reverse";
  const alignment = get("alignItems")?.replace(/^(safe|unsafe)\s+/, "");
  if (alignment === "center") return column ? LayerFlexVCenterIcon : LayerFlexHCenterIcon;
  if (alignment === "flex-end" || alignment === "end" || alignment === "self-end") return column ? LayerFlexVEndIcon : LayerFlexHEndIcon;
  return column ? LayerFlexVStartIcon : LayerFlexHStartIcon;
}

export { getLayerLayoutIcon };
