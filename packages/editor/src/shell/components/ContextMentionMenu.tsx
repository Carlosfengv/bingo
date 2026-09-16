/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ContextMentionMenu.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ComposerSuggestionGroup, ComposerSuggestionItem, ComposerSuggestionMenu } from "./ComposerSuggestionMenu";
import { DiamondIcon, FileIcon } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_compiler_runtime from "react/compiler-runtime";

var groups = [{
  type: "connection",
  labelKey: "chat.contextConnections"
}, {
  type: "component",
  labelKey: "chat.contextComponents"
}, {
  type: "page",
  labelKey: "chat.contextPages"
}];
function ContextMentionMenu(t0) {
  const $ = (0, import_compiler_runtime.c)(20);
  const { t } = useTranslation("editor");
  const {
    id,
    options,
    selectedIndex,
    onHover,
    onSelect,
    loading
  } = t0;
  let T0;
  let t1;
  let t2;
  let t3;
  let t4;
  if (true) {
    const entries = options.map(_temp$22);
    T0 = ComposerSuggestionMenu;
    t1 = id;
    t2 = t("chat.addContext");
    t3 = selectedIndex;
    t4 = groups.map(group => {
      const items = entries.filter(t5 => {
        const {
          option: option_0
        } = t5;
        return option_0.type === group.type;
      });
      if (!items.length) return null;
      const groupLabel = t(group.labelKey);
      return <div key={group.type} role="group" aria-label={groupLabel}>{<ComposerSuggestionGroup>{groupLabel}</ComposerSuggestionGroup>}{items.map(t6 => {
          const {
            option: option_1,
            index: index_0
          } = t6;
          return <ComposerSuggestionItem key={option_1.id} id={`${id}-option-${index_0}`} index={index_0} selected={index_0 === selectedIndex} onHover={onHover} onSelect={() => onSelect(option_1)}>{option_1.type === "component" && <DiamondIcon className="size-4 shrink-0 text-ed-layer-component" />}{option_1.type === "page" && <FileIcon className="size-4 shrink-0 text-ed-muted-foreground" />}{<span className="truncate">{option_1.displayName ?? option_1.name}</span>}</ComposerSuggestionItem>;
        })}</div>;
    });
    $[0] = id;
    $[1] = onHover;
    $[2] = onSelect;
    $[3] = options;
    $[4] = selectedIndex;
    $[5] = T0;
    $[6] = t1;
    $[7] = t2;
    $[8] = t3;
    $[9] = t4;
  } else {
    T0 = $[5];
    t1 = $[6];
    t2 = $[7];
    t3 = $[8];
    t4 = $[9];
  }
  let t5;
  if (true) {
    t5 = !options.length && <div className="px-1.5 py-1 text-ed-muted-foreground">{t(loading ? "chat.loadingContext" : "chat.noMatchingContext")}</div>;
    $[10] = loading;
    $[11] = options.length;
    $[12] = t5;
  } else t5 = $[12];
  let t6;
  if ($[13] !== T0 || $[14] !== t1 || $[15] !== t2 || $[16] !== t3 || $[17] !== t4 || $[18] !== t5) {
    t6 = <T0 id={t1} label={t2} selectedIndex={t3}>{t4}{t5}</T0>;
    $[13] = T0;
    $[14] = t1;
    $[15] = t2;
    $[16] = t3;
    $[17] = t4;
    $[18] = t5;
    $[19] = t6;
  } else t6 = $[19];
  return t6;
}
function _temp$22(option, index) {
  return {
    option,
    index
  };
}

export { ContextMentionMenu };
