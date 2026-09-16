/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/parts/ClassPickerPopover.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { releaseInspectorControlFocus } from "../../primitives";
import { ClassPickerContent } from "../ClassPickerContent";
import { PopoverContent } from "@bingo/ui";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* The PopoverContent + ClassPickerContent pairing shared by every style input
* that offers Tailwind-class suggestions. Only the popover width varies
* (colors use a slightly wider list), so it's a prop.
*/
function ClassPickerPopover(t0) {
  const $ = (0, import_compiler_runtime.c)(9);
  const {
    suggestions,
    cssProperty,
    sourceClass,
    onSelect,
    onClose,
    width: t1
  } = t0;
  const t2 = `${t1 === void 0 ? "w-56" : t1} p-0`;
  let t3;
  if ($[0] !== cssProperty || $[1] !== onClose || $[2] !== onSelect || $[3] !== sourceClass || $[4] !== suggestions) {
    t3 = <ClassPickerContent suggestions={suggestions} cssProperty={cssProperty} sourceClass={sourceClass} onSelect={onSelect} onClose={onClose} />;
    $[0] = cssProperty;
    $[1] = onClose;
    $[2] = onSelect;
    $[3] = sourceClass;
    $[4] = suggestions;
    $[5] = t3;
  } else t3 = $[5];
  let t4;
  if ($[6] !== t2 || $[7] !== t3) {
    t4 = <PopoverContent align="end" className={t2} onOpenAutoFocus={_temp$48} onCloseAutoFocus={releaseInspectorControlFocus}>{t3}</PopoverContent>;
    $[6] = t2;
    $[7] = t3;
    $[8] = t4;
  } else t4 = $[8];
  return t4;
}
function _temp$48(e) {
  return e.preventDefault();
}

export { ClassPickerPopover };
