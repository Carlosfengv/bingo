/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ImageContextChip.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ContextChip } from "./ChatContextControls";
import { HoverCard, HoverCardContent, HoverCardTrigger, ImageIcon } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Attachments and agent screenshots share the same chip and delayed preview. */
function ImageContextChip(t0) {
  const $ = (0, import_compiler_runtime.c)(15);
  const { t } = useTranslation("editor");
  const {
    src,
    label,
    onClick,
    onRemove,
    className
  } = t0;
  const t1 = onClick ? void 0 : 0;
  const t2 = t("chat.previewImage", { name: label });
  let t3;
  if ($[0] !== className || $[1] !== label || $[2] !== onClick || $[3] !== onRemove) {
    t3 = <ContextChip icon={ImageIcon} label={label} title="" onClick={onClick} onRemove={onRemove} className={className} />;
    $[0] = className;
    $[1] = label;
    $[2] = onClick;
    $[3] = onRemove;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] !== t1 || $[6] !== t2 || $[7] !== t3) {
    t4 = <HoverCardTrigger asChild={true}>{<span className="inline-flex min-w-0 max-w-full" tabIndex={t1} aria-label={t2}>{t3}</span>}</HoverCardTrigger>;
    $[5] = t1;
    $[6] = t2;
    $[7] = t3;
    $[8] = t4;
  } else t4 = $[8];
  let t5;
  if ($[9] !== label || $[10] !== src) {
    t5 = <HoverCardContent side="top" align="end" className="w-auto max-w-64 rounded-md p-1">{<img src={src} alt={label} className="block max-h-48 max-w-full rounded object-contain" />}</HoverCardContent>;
    $[9] = label;
    $[10] = src;
    $[11] = t5;
  } else t5 = $[11];
  let t6;
  if ($[12] !== t4 || $[13] !== t5) {
    t6 = <HoverCard openDelay={200}>{t4}{t5}</HoverCard>;
    $[12] = t4;
    $[13] = t5;
    $[14] = t6;
  } else t6 = $[14];
  return t6;
}

export { ImageContextChip };
