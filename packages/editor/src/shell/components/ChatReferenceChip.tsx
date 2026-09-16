/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ChatReferenceChip.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { connectionDisplayName } from "../hooks/useClaudeContext";
import { CanvasContextChip } from "./CanvasContextChip";
import { ContextChip } from "./ChatContextControls";
import { ImageContextChip } from "./ImageContextChip";
import { getById } from "@bingo/compiler";
import { FileIcon, FolderIcon, ImageIcon, PlugsIcon } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_compiler_runtime from "react/compiler-runtime";

var REFERENCE_ICONS = {
  image: ImageIcon,
  file: FileIcon,
  connection: PlugsIcon,
  folder: FolderIcon,
  page: FileIcon
};
/** Draft and sent sources share their label, icon, chip geometry, and hover behavior. */
function ChatReferenceChip(t0) {
  const $ = (0, import_compiler_runtime.c)(36);
  const { t } = useTranslation("editor");
  const {
    reference,
    store,
    onRemove,
    onSelectElement,
    className
  } = t0;
  if (reference.type === "component") {
    const t1 = reference.path ?? reference.name;
    let t2;
    if ($[0] !== className || $[1] !== onRemove || $[2] !== reference.name || $[3] !== t1) {
      t2 = <CanvasContextChip component={true} label={reference.name} title={t1} onRemove={onRemove} className={className} />;
      $[0] = className;
      $[1] = onRemove;
      $[2] = reference.name;
      $[3] = t1;
      $[4] = t2;
    } else t2 = $[4];
    return t2;
  }
  if (reference.type === "element") {
    let t1;
    if ($[5] !== reference.id || $[6] !== store) {
      t1 = getById(store, reference.id);
      $[5] = reference.id;
      $[6] = store;
      $[7] = t1;
    } else t1 = $[7];
    const element = t1;
    let t2;
    if ($[8] !== reference.name) {
      let t3;
      if ($[10] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = /^<([^>]+)>.*$/;
        $[10] = t3;
      } else t3 = $[10];
      t2 = reference.name.replace(t3, "$1");
      $[8] = reference.name;
      $[9] = t2;
    } else t2 = $[9];
    const label = t2;
    const t3 = reference.elementKind === "component";
    const t4 = element && onSelectElement ? t("chat.showOnCanvas", { name: label }) : reference.name;
    let t5;
    if ($[11] !== onSelectElement || $[12] !== reference.id) {
      t5 = onSelectElement ? () => onSelectElement(reference.id) : void 0;
      $[11] = onSelectElement;
      $[12] = reference.id;
      $[13] = t5;
    } else t5 = $[13];
    const t6 = !onRemove;
    let t7;
    if ($[14] !== className || $[15] !== element || $[16] !== label || $[17] !== onRemove || $[18] !== t3 || $[19] !== t4 || $[20] !== t5 || $[21] !== t6) {
      t7 = <CanvasContextChip element={element} label={label} component={t3} title={t4} onClick={t5} onRemove={onRemove} showNavigationIcon={t6} className={className} />;
      $[14] = className;
      $[15] = element;
      $[16] = label;
      $[17] = onRemove;
      $[18] = t3;
      $[19] = t4;
      $[20] = t5;
      $[21] = t6;
      $[22] = t7;
    } else t7 = $[22];
    return t7;
  }
  let t1;
  if ($[23] !== reference) {
    t1 = reference.type === "connection" ? connectionDisplayName(reference) : reference.name;
    $[23] = reference;
    $[24] = t1;
  } else t1 = $[24];
  const label_0 = t1;
  if (reference.type === "image" && reference.data) {
    let t2;
    if ($[25] !== className || $[26] !== label_0 || $[27] !== onRemove || $[28] !== reference.data) {
      t2 = <ImageContextChip src={reference.data} label={label_0} onRemove={onRemove} className={className} />;
      $[25] = className;
      $[26] = label_0;
      $[27] = onRemove;
      $[28] = reference.data;
      $[29] = t2;
    } else t2 = $[29];
    return t2;
  }
  const t2 = REFERENCE_ICONS[reference.type];
  const t3 = reference.type === "folder" ? `${reference.path}\n${t("chat.forThisMessageOnly")}` : reference.name;
  let t4;
  if ($[30] !== className || $[31] !== label_0 || $[32] !== onRemove || $[33] !== t2 || $[34] !== t3) {
    t4 = <ContextChip icon={t2} label={label_0} title={t3} className={className} onRemove={onRemove} />;
    $[30] = className;
    $[31] = label_0;
    $[32] = onRemove;
    $[33] = t2;
    $[34] = t3;
    $[35] = t4;
  } else t4 = $[35];
  return t4;
}

export { ChatReferenceChip };
