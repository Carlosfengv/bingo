/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ComposerSuggestionMenu.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ScrollArea, cn$2 } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function ComposerSuggestionMenu(t0) {
  const $ = (0, import_compiler_runtime.c)(9);
  const {
    id,
    label,
    selectedIndex,
    children
  } = t0;
  const listRef = (0, import_react.useRef)(null);
  let t1;
  let t2;
  if ($[0] !== selectedIndex) {
    t1 = () => {
      listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)?.scrollIntoView({
        block: "nearest"
      });
    };
    t2 = [selectedIndex];
    $[0] = selectedIndex;
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  (0, import_react.useEffect)(t1, t2);
  let t3;
  if ($[3] !== children) {
    t3 = <ScrollArea viewportClassName="max-h-72 p-1">{<div ref={listRef} className="flex flex-col gap-0.5">{children}</div>}</ScrollArea>;
    $[3] = children;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] !== id || $[6] !== label || $[7] !== t3) {
    t4 = <div id={id} role="listbox" aria-label={label} className="absolute inset-x-0 bottom-full overflow-hidden rounded-t-md border-x border-t border-ed-menu-border bg-ed-menu text-[11px] text-ed-popover-foreground shadow-ed-popover">{t3}</div>;
    $[5] = id;
    $[6] = label;
    $[7] = t3;
    $[8] = t4;
  } else t4 = $[8];
  return t4;
}
function ComposerSuggestionGroup(t0) {
  const $ = (0, import_compiler_runtime.c)(2);
  const {
    children
  } = t0;
  let t1;
  if ($[0] !== children) {
    t1 = <div className="px-1.5 py-1 font-normal text-ed-muted-foreground/60">{children}</div>;
    $[0] = children;
    $[1] = t1;
  } else t1 = $[1];
  return t1;
}
function ComposerSuggestionItem(t0) {
  const $ = (0, import_compiler_runtime.c)(15);
  const {
    id,
    index,
    selected,
    onHover,
    onSelect,
    children
  } = t0;
  let t1;
  if ($[0] !== index || $[1] !== onHover) {
    t1 = () => onHover(index);
    $[0] = index;
    $[1] = onHover;
    $[2] = t1;
  } else t1 = $[2];
  let t2;
  if ($[3] !== onSelect) {
    t2 = event => {
      event.preventDefault();
      onSelect();
    };
    $[3] = onSelect;
    $[4] = t2;
  } else t2 = $[4];
  const t3 = selected && "bg-ed-accent text-ed-accent-foreground";
  let t4;
  if ($[5] !== t3) {
    t4 = cn$2("flex h-6.5 select-none items-center gap-1.5 rounded px-1.5", t3);
    $[5] = t3;
    $[6] = t4;
  } else t4 = $[6];
  let t5;
  if ($[7] !== children || $[8] !== id || $[9] !== index || $[10] !== selected || $[11] !== t1 || $[12] !== t2 || $[13] !== t4) {
    t5 = <div id={id} data-index={index} role="option" aria-selected={selected} onMouseEnter={t1} onMouseDown={t2} className={t4}>{children}</div>;
    $[7] = children;
    $[8] = id;
    $[9] = index;
    $[10] = selected;
    $[11] = t1;
    $[12] = t2;
    $[13] = t4;
    $[14] = t5;
  } else t5 = $[14];
  return t5;
}

export { ComposerSuggestionGroup, ComposerSuggestionItem, ComposerSuggestionMenu };
