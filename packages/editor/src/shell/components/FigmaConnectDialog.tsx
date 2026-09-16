/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/FigmaConnectDialog.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_compiler_runtime from "react/compiler-runtime";

function FigmaConnectDialog(t0) {
  const $ = (0, import_compiler_runtime.c)(19);
  const { t } = useTranslation("editor");
  const {
    open,
    imageCount,
    onConnect,
    onSkip
  } = t0;
  let t1;
  if ($[0] !== onSkip) {
    t1 = isOpen => {
      if (!isOpen) onSkip();
    };
    $[0] = onSkip;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if (true) {
    t2 = <DialogTitle>{t("figmaConnect.title")}</DialogTitle>;
    $[2] = t2;
  } else t2 = $[2];
  const t3 = t("figmaConnect.description", { count: imageCount });
  let t4;
  if ($[3] !== t3) {
    t4 = <DialogHeader>{t2}{<DialogDescription>{t3}</DialogDescription>}</DialogHeader>;
    $[3] = t3;
    $[4] = t4;
  } else t4 = $[4];
  let t5;
  if (true) {
    t5 = <Button variant="outline" onClick={onSkip}>{t("figmaConnect.pasteWithout")}</Button>;
    $[5] = onSkip;
    $[6] = t5;
  } else t5 = $[6];
  let t6;
  if (true) {
    t6 = <Button onClick={onConnect}>{t("figmaConnect.connect")}</Button>;
    $[7] = onConnect;
    $[8] = t6;
  } else t6 = $[8];
  let t7;
  if ($[9] !== t5 || $[10] !== t6) {
    t7 = <DialogFooter>{t5}{t6}</DialogFooter>;
    $[9] = t5;
    $[10] = t6;
    $[11] = t7;
  } else t7 = $[11];
  let t8;
  if ($[12] !== t4 || $[13] !== t7) {
    t8 = <DialogContent className="!max-w-[440px]">{t4}{t7}</DialogContent>;
    $[12] = t4;
    $[13] = t7;
    $[14] = t8;
  } else t8 = $[14];
  let t9;
  if ($[15] !== open || $[16] !== t1 || $[17] !== t8) {
    t9 = <Dialog open={open} onOpenChange={t1}>{t8}</Dialog>;
    $[15] = open;
    $[16] = t1;
    $[17] = t8;
    $[18] = t9;
  } else t9 = $[18];
  return t9;
}

export { FigmaConnectDialog };
