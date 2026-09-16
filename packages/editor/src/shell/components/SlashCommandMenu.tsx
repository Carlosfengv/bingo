/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/SlashCommandMenu.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ComposerSuggestionGroup, ComposerSuggestionItem, ComposerSuggestionMenu } from "./ComposerSuggestionMenu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function SkillDescription(t0) {
  const $ = (0, import_compiler_runtime.c)(8);
  const {
    description
  } = t0;
  const textRef = (0, import_react.useRef)(null);
  const [open, setOpen] = (0, import_react.useState)(false);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = nextOpen => {
      const text = textRef.current;
      setOpen(nextOpen && !!text && text.scrollWidth > text.clientWidth);
    };
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  let t3;
  if ($[1] !== description) {
    t2 = <TooltipTrigger asChild={true}>{<span ref={textRef} className="min-w-0 truncate text-ed-muted-foreground">{description}</span>}</TooltipTrigger>;
    t3 = <TooltipContent side="right" className="max-w-48 whitespace-pre-wrap break-words">{description}</TooltipContent>;
    $[1] = description;
    $[2] = t2;
    $[3] = t3;
  } else {
    t2 = $[2];
    t3 = $[3];
  }
  let t4;
  if ($[4] !== open || $[5] !== t2 || $[6] !== t3) {
    t4 = <Tooltip open={open} onOpenChange={t1}>{t2}{t3}</Tooltip>;
    $[4] = open;
    $[5] = t2;
    $[6] = t3;
    $[7] = t4;
  } else t4 = $[7];
  return t4;
}
/**
* The `/` picker above the chat composer. Two groups: what Bingo adds, and
* every skill and custom command the user's Claude Code would accept, filtered
* by what they typed. Styled as the shared menu surface. Keyboard handling
* lives in the composer; this only renders and keeps the selected row in view.
*/
function SlashCommandMenu(t0) {
  const $ = (0, import_compiler_runtime.c)(13);
  const { t } = useTranslation("editor");
  const {
    commands,
    selectedIndex,
    onHover,
    onSelect,
    loading,
    agentName: t1
  } = t0;
  const agentName = t1 === void 0 ? "Claude Code" : t1;
  let t2;
  if (true) {
    const entries = commands.map(_temp$21);
    const bingo = entries.filter(_temp2$14);
    const skills = entries.filter(_temp3$9);
    let t3;
    if ($[7] !== onHover || $[8] !== onSelect || $[9] !== selectedIndex) {
      t3 = t4 => {
        const {
          command: command_2,
          i: i_0
        } = t4;
        return <ComposerSuggestionItem key={command_2.name} index={i_0} selected={i_0 === selectedIndex} onHover={onHover} onSelect={() => onSelect(command_2)}>{<span className="shrink-0 text-ed-muted-foreground">/</span>}{<span className="shrink-0 font-medium">{command_2.name}</span>}{command_2.description && <SkillDescription description={command_2.description} />}</ComposerSuggestionItem>;
      };
      $[7] = onHover;
      $[8] = onSelect;
      $[9] = selectedIndex;
      $[10] = t3;
    } else t3 = $[10];
    const row = t3;
    const t4 = t("slash.agentSkills", { agent: agentName });
    let t5;
    if ($[11] !== t4) {
      t5 = <ComposerSuggestionGroup>{t4}</ComposerSuggestionGroup>;
      $[11] = t4;
      $[12] = t5;
    } else t5 = $[12];
    t2 = <ComposerSuggestionMenu label={t("slash.menu")} selectedIndex={selectedIndex}>{bingo.length > 0 && <>{<ComposerSuggestionGroup>Bingo</ComposerSuggestionGroup>}{bingo.map(row)}{<div className="h-1" aria-hidden={true} />}</>}{t5}{skills.length > 0 ? skills.map(row) : <div className="flex h-6.5 items-center px-1.5 text-ed-muted-foreground">{t(loading ? "slash.loading" : "slash.empty")}</div>}</ComposerSuggestionMenu>;
    $[0] = agentName;
    $[1] = commands;
    $[2] = loading;
    $[3] = onHover;
    $[4] = onSelect;
    $[5] = selectedIndex;
    $[6] = t2;
  } else t2 = $[6];
  return t2;
}
function _temp3$9(t0) {
  const {
    command: command_1
  } = t0;
  return command_1.scope !== "bingo";
}
function _temp2$14(t0) {
  const {
    command: command_0
  } = t0;
  return command_0.scope === "bingo";
}
function _temp$21(command, i) {
  return {
    command,
    i
  };
}

export { SlashCommandMenu };
