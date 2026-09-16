/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/layerAppearance.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getLayerLayoutIcon } from "./layerLayoutIcon";
import { BrowserIcon, CodeIcon, DiamondIcon, LayerTextIcon, SparkleIcon } from "@bingo/ui";

/** The same element identity is used in Layers and chat context/action tags. */
function getLayerIcon(element) {
  switch (element?.type) {
    case "text":
      return LayerTextIcon;
    case "component":
    case "capture":
      return DiamondIcon;
    case "icon":
      return SparkleIcon;
    case "webview":
      return BrowserIcon;
    case "html":
      return element.props?.["data-component"] ? DiamondIcon : getLayerLayoutIcon(element);
    default:
      return CodeIcon;
  }
}
/** Icon stays the layer hue at secondary emphasis; missing components stay a warning. */
function getLayerAccent(element) {
  const behind = color => `${color} opacity-60`;
  if (element.type === "text") return {
    icon: behind("text-ed-muted-foreground"),
    label: "text-ed-inspector-value"
  };
  if (element.type === "component" || element.type === "icon") {
    if (element._componentMissing) return {
      icon: "text-ed-layer-missing",
      label: "text-ed-layer-missing"
    };
    return {
      icon: behind("text-ed-layer-component"),
      label: "text-ed-layer-component"
    };
  }
  if (element.type === "capture") return {
    icon: behind("text-ed-layer-capture"),
    label: "text-ed-layer-capture"
  };
  if (element.type === "html" && element.props?.["data-component"]) return {
    icon: "text-ed-layer-missing",
    label: "text-ed-layer-missing"
  };
  if (element.type === "webview") return {
    icon: behind("text-ed-layer-webview"),
    label: "text-ed-layer-webview"
  };
  return {
    icon: behind("text-ed-muted-foreground"),
    label: "text-ed-inspector-value"
  };
}

export { getLayerAccent, getLayerIcon };
