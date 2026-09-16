/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/typography/TextFormatRow.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { isBoldFontWeight } from "../../../../utils/typography";
import { IconBtn } from "../primitives";
import { TextBoldIcon, TextItalicIcon, TextStrikethroughIcon, TextUnderlineIcon, Tooltip, TooltipContent, TooltipTrigger } from "@bingo/ui";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Bold / Italic / Underline / Strikethrough toggle row. Active state is a hint
* derived from the resolved fontWeight/fontStyle/textDecoration — when a text
* selection is active the editor owns the authoritative per-run state and
* corrects any mismatch on the next selection update.
*/
function TextFormatRow(t0) {
  const $ = (0, import_compiler_runtime.c)(22);
  const {
    fontWeight,
    fontStyle,
    textDecoration,
    onToggle
  } = t0;
  const td = String(textDecoration ?? "");
  let t1;
  if ($[0] !== fontWeight) {
    t1 = isBoldFontWeight(fontWeight);
    $[0] = fontWeight;
    $[1] = t1;
  } else t1 = $[1];
  const isBold = t1;
  const isItalic = fontStyle === "italic";
  let t2;
  if ($[2] !== td) {
    t2 = td.includes("underline");
    $[2] = td;
    $[3] = t2;
  } else t2 = $[3];
  const isUnderline = t2;
  let t3;
  if ($[4] !== td) {
    t3 = td.includes("line-through");
    $[4] = td;
    $[5] = t3;
  } else t3 = $[5];
  const isStrike = t3;
  let t4;
  if ($[6] !== isBold) {
    t4 = {
      key: "bold",
      active: isBold,
      tip: "Bold",
      Icon: TextBoldIcon
    };
    $[6] = isBold;
    $[7] = t4;
  } else t4 = $[7];
  let t5;
  if ($[8] !== isItalic) {
    t5 = {
      key: "italic",
      active: isItalic,
      tip: "Italic",
      Icon: TextItalicIcon
    };
    $[8] = isItalic;
    $[9] = t5;
  } else t5 = $[9];
  let t6;
  if ($[10] !== isUnderline) {
    t6 = {
      key: "underline",
      active: isUnderline,
      tip: "Underline",
      Icon: TextUnderlineIcon
    };
    $[10] = isUnderline;
    $[11] = t6;
  } else t6 = $[11];
  let t7;
  if ($[12] !== isStrike) {
    t7 = {
      key: "strikethrough",
      active: isStrike,
      tip: "Strikethrough",
      Icon: TextStrikethroughIcon
    };
    $[12] = isStrike;
    $[13] = t7;
  } else t7 = $[13];
  let t8;
  if ($[14] !== t4 || $[15] !== t5 || $[16] !== t6 || $[17] !== t7) {
    t8 = [t4, t5, t6, t7];
    $[14] = t4;
    $[15] = t5;
    $[16] = t6;
    $[17] = t7;
    $[18] = t8;
  } else t8 = $[18];
  const buttons = t8;
  let t9;
  if ($[19] !== buttons || $[20] !== onToggle) {
    t9 = <div className="flex gap-2">{buttons.map(t10 => {
        const {
          key,
          active,
          tip,
          Icon
        } = t10;
        return <Tooltip key={key}>{<TooltipTrigger asChild={true}>{<IconBtn label={tip} active={active} onMouseDown={_temp$38} onClick={() => onToggle(key)}>{<Icon />}</IconBtn>}</TooltipTrigger>}{<TooltipContent>{tip}</TooltipContent>}</Tooltip>;
      })}</div>;
    $[19] = buttons;
    $[20] = onToggle;
    $[21] = t9;
  } else t9 = $[21];
  return t9;
}
function _temp$38(e) {
  return e.preventDefault();
}

export { TextFormatRow };
