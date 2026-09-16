/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/parts/OverrideChip.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { Tooltip, XIcon, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* The struck-through class badge shown when an inline value overrides a
* Tailwind class (source === "inline"). Clicking the X restores the class
* value. The numeric inputs share this; ColorRow uses the higher-level
* SourceChip primitive instead because its layout differs.
*/
function OverrideChip(t0) {
  const $ = (0, import_compiler_runtime.c)(11);
  const { t } = useTranslation("editor");
  const {
    sourceClass,
    onClearOverride,
    className,
    xSize: t1
  } = t0;
  const xSize = t1 === void 0 ? 8 : t1;
  let t2;
  if ($[0] !== className) {
    t2 = cn$2("text-[10px] font-mono text-ed-muted-foreground/50 line-through truncate", className);
    $[0] = className;
    $[1] = t2;
  } else t2 = $[1];
  let t3;
  if ($[2] !== sourceClass || $[3] !== t2) {
    t3 = <span className={t2}>{sourceClass}</span>;
    $[2] = sourceClass;
    $[3] = t2;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if (true) {
    t4 = onClearOverride && <Tooltip content={t("styles.restoreClassValue")}>{<button type="button" aria-label={t("styles.restoreClassValue")} onClick={e => {
        e.stopPropagation();
        onClearOverride();
      }} className="text-ed-muted-foreground/50 hover:text-ed-foreground">{<XIcon width={xSize} height={xSize} />}</button>}</Tooltip>;
    $[5] = onClearOverride;
    $[6] = xSize;
    $[7] = t4;
  } else t4 = $[7];
  let t5;
  if ($[8] !== t3 || $[9] !== t4) {
    t5 = <span className="flex items-center gap-0.5 px-1 shrink-0">{t3}{t4}</span>;
    $[8] = t3;
    $[9] = t4;
    $[10] = t5;
  } else t5 = $[10];
  return t5;
}

export { OverrideChip };
