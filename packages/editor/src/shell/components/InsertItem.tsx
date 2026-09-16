/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/InsertItem.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { setElementDragData } from "../../shared/utils/clipboard";
import { createElementFromTag } from "../utils/htmlTagsData";
import { Text$4 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var renderPreview = (tagData, componentLabel) => {
  const element = createElementFromTag(tagData);
  if (element.type !== "html") return <div>{componentLabel}</div>;
  const previewStyles = {
    ...element.styles,
    width: "auto",
    height: "auto",
    maxWidth: "100%",
    maxHeight: "100%",
    position: "static",
    margin: "0",
    fontSize: "6px",
    padding: "2px"
  };
  const isVoidElement = ["input", "img", "br", "hr", "meta", "link", "area", "base", "col", "embed", "param", "source", "track", "wbr"].includes(element.tag?.toLowerCase() || "");
  const usesValueProp = ["textarea", "select"].includes(element.tag?.toLowerCase() || "");
  const textChild = element.children?.find(child => child.type === "text");
  const textContent = textChild?.type === "text" ? textChild.text : void 0;
  const elementProps = {
    style: previewStyles
  };
  if (usesValueProp && textContent) elementProps.defaultValue = textContent;
  return <div className="pointer-events-none text-[6px] leading-tight">{(0, import_react.createElement)(element.tag ?? "div", elementProps, isVoidElement || usesValueProp ? void 0 : textContent)}</div>;
};
var InsertItem = t0 => {
  const $ = (0, import_compiler_runtime.c)(24);
  const { t } = useTranslation("editor");
  const {
    tagData,
    onClick,
    readOnly: t1
  } = t0;
  const readOnly = t1 === void 0 ? false : t1;
  let t2;
  if ($[0] !== readOnly || $[1] !== tagData) {
    t2 = e => {
      if (readOnly) return;
      setElementDragData(e, createElementFromTag(tagData));
    };
    $[0] = readOnly;
    $[1] = tagData;
    $[2] = t2;
  } else t2 = $[2];
  const handleDragStart = t2;
  const t3 = !readOnly;
  const t4 = `w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ed-accent border-b border-ed-border ${!readOnly && "cursor-grab active:cursor-grabbing"}`;
  let t5;
  if (true) {
    t5 = renderPreview(tagData, t("shell.componentPreview"));
    $[3] = tagData;
    $[4] = t5;
  } else t5 = $[4];
  let t6;
  if ($[5] !== t5) {
    t6 = <div data-panel-drag-preview={true} className="shrink-0 w-10 h-10 rounded border border-ed-border flex items-center justify-center bg-ed-secondary overflow-hidden">{t5}</div>;
    $[5] = t5;
    $[6] = t6;
  } else t6 = $[6];
  let t7;
  if (true) {
    t7 = <Text$4 size="sm" weight="medium" variant="primary" className="mb-0.5 block">{t(`htmlTags.${tagData.tag}.title`)}</Text$4>;
    $[7] = tagData.title;
    $[8] = t7;
  } else t7 = $[8];
  let t8;
  if (true) {
    t8 = <Text$4 size="xs" variant="secondary" className="truncate block">{t(`htmlTags.${tagData.tag}.description`)}</Text$4>;
    $[9] = tagData.description;
    $[10] = t8;
  } else t8 = $[10];
  let t9;
  if ($[11] !== t7 || $[12] !== t8) {
    t9 = <div className="flex-1 min-w-0 text-left">{t7}{t8}</div>;
    $[11] = t7;
    $[12] = t8;
    $[13] = t9;
  } else t9 = $[13];
  let t10;
  if ($[14] !== tagData.tag) {
    t10 = <div className="shrink-0">{<Text$4 size="2xs" variant="tertiary" className="font-mono">{"<"}{tagData.tag}{">"}</Text$4>}</div>;
    $[14] = tagData.tag;
    $[15] = t10;
  } else t10 = $[15];
  let t11;
  if ($[16] !== handleDragStart || $[17] !== onClick || $[18] !== t10 || $[19] !== t3 || $[20] !== t4 || $[21] !== t6 || $[22] !== t9) {
    t11 = <div draggable={t3} onDragStart={handleDragStart} onClick={onClick} className={t4}>{t6}{t9}{t10}</div>;
    $[16] = handleDragStart;
    $[17] = onClick;
    $[18] = t10;
    $[19] = t3;
    $[20] = t4;
    $[21] = t6;
    $[22] = t9;
    $[23] = t11;
  } else t11 = $[23];
  return t11;
};

export { InsertItem };
