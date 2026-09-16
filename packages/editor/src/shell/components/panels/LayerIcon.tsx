/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/LayerIcon.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getLayerAccent, getLayerIcon } from "./layerAppearance";
import { Tooltip, TooltipContent, TooltipTrigger } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function LayerIcon(t0) {
  const $ = (0, import_compiler_runtime.c)(8);
  const { t } = useTranslation("editor");
  const {
    element,
    size: t1
  } = t0;
  const size = t1 === void 0 ? 16 : t1;
  let t2;
  if ($[0] !== element || $[1] !== size) {
    const t3 = getLayerIcon(element);
    let t4;
    if ($[3] !== element) {
      t4 = getLayerAccent(element);
      $[3] = element;
      $[4] = t4;
    } else t4 = $[4];
    t2 = (0, import_react.createElement)(t3, {
      width: size,
      height: size,
      className: `${size === 14 ? "size-3.5" : "size-4"} shrink-0 ${t4.icon}`
    });
    $[0] = element;
    $[1] = size;
    $[2] = t2;
  } else t2 = $[2];
  const icon = t2;
  const missingComponent = element.type === "component" && !!element._componentMissing || element.type === "html" && !!element.props?.["data-component"];
  let t3;
  if (true) {
    t3 = missingComponent ? <Tooltip>{<TooltipTrigger asChild={true}>{<span className="inline-flex">{icon}</span>}</TooltipTrigger>}{<TooltipContent side="top">{t("shell.missingComponent")}</TooltipContent>}</Tooltip> : icon;
    $[5] = icon;
    $[6] = missingComponent;
    $[7] = t3;
  } else t3 = $[7];
  return t3;
}

export { LayerIcon };
