/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/layout/controls.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { InspectorToggleGroup } from "../InspectorToggleGroup";
import { useStyleField, useStyleOps } from "../StyleOpsContext";
import { StyleLayoutInput } from "../fields/layout";
import { LayoutValueInput } from "../inputs/LayoutValueInput";
import { IconBtn, styleFieldLabel } from "../primitives";
import { asFlexDistribution } from "./flexDistribution";
import { FlexColumnGlyph, FlexRowGlyph, FlexWrapGlyph } from "./glyphs";
import { DisplayBlockIcon, DisplayGridIcon, EyeClosedIcon, EyeIcon, GapIcon, MarginBottomIcon, MarginLeftIcon, MarginRightIcon, MarginSeparateIcon, MarginTopIcon, PaddingBottomIcon, PaddingLeftIcon, PaddingRightIcon, PaddingSeparateIcon, PaddingTopIcon, cn$2 } from "@bingo/ui";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Context-bound layout controls: the display/flow toggle group, the visibility
* toggle, and the linked-sides padding/margin grid + its link toggle button.
*/
/** Gap-menu modes. The distribution keywords are `justify-content` values. */
var MAIN_AXIS_GAP_MODES = [{
  value: "normal",
  label: "Normal"
}, {
  value: "space-between",
  label: "Space between"
}, {
  value: "space-around",
  label: "Space around"
}, {
  value: "space-evenly",
  label: "Space evenly"
}];
function canonicalAlignmentPosition(value) {
  if (value === "center") return "center";
  if (value === "flex-end" || value === "end") return "flex-end";
  return "flex-start";
}
/**
* Display/flow selector (Block / Flex column / Flex row / Grid). Reads the
* current display + flex-direction via the StyleOps context.
*/
function FlowToggleGroup() {
  const $ = (0, import_compiler_runtime.c)(17);
  const display = useStyleField("display");
  const flexDir = useStyleField("flexDirection");
  const alignItems = useStyleField("alignItems");
  const justifyContent = useStyleField("justifyContent");
  const {
    setMultiple
  } = useStyleOps();
  let t0;
  if ($[0] !== display || $[1] !== flexDir) {
    t0 = !display.isMixed && !flexDir.isMixed && (display.equals("flex") || display.equals("inline-flex"));
    $[0] = display;
    $[1] = flexDir;
    $[2] = t0;
  } else t0 = $[2];
  const flexActive = t0;
  const value = display.isMixed ? "__mixed__" : display.equals("block") ? "block" : display.equals("grid") ? "grid" : flexActive && flexDir.in("column", "column-reverse") ? "column" : flexActive && flexDir.in("row", "row-reverse") ? "row" : "__none__";
  let t1;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = {
      value: "block",
      label: "Block",
      tooltip: "Block",
      content: <DisplayBlockIcon className="!size-3" />
    };
    $[3] = t1;
  } else t1 = $[3];
  let t2;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = {
      value: "column",
      label: "Flex Column",
      tooltip: "Flex Column",
      content: <FlexColumnGlyph />
    };
    $[4] = t2;
  } else t2 = $[4];
  let t3;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = {
      value: "row",
      label: "Flex Row",
      tooltip: "Flex Row",
      content: <FlexRowGlyph />
    };
    $[5] = t3;
  } else t3 = $[5];
  let t4;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = [t1, t2, t3, {
      value: "grid",
      label: "Grid",
      tooltip: "Grid",
      content: <DisplayGridIcon className="!size-3" />
    }];
    $[6] = t4;
  } else t4 = $[6];
  const options = t4;
  let t5;
  if ($[7] !== alignItems || $[8] !== display || $[9] !== flexActive || $[10] !== flexDir || $[11] !== justifyContent || $[12] !== setMultiple) {
    t5 = nextValue => {
      if (nextValue === "block" || nextValue === "grid") display.set(nextValue);else if (nextValue === "column" || nextValue === "row") {
        const currentDirection = flexDir.in("column", "column-reverse") ? "column" : "row";
        const updates = {
          display: "flex",
          flexDirection: nextValue
        };
        if (flexActive && currentDirection !== nextValue && !alignItems.isMixed && !justifyContent.isMixed && !asFlexDistribution(justifyContent.value)) {
          const verticalPosition = canonicalAlignmentPosition(currentDirection === "column" ? justifyContent.value : alignItems.value);
          const horizontalPosition = canonicalAlignmentPosition(currentDirection === "column" ? alignItems.value : justifyContent.value);
          if (nextValue === "column") {
            updates.justifyContent = verticalPosition;
            updates.alignItems = horizontalPosition;
          } else {
            updates.alignItems = verticalPosition;
            updates.justifyContent = horizontalPosition;
          }
        }
        setMultiple(updates);
      }
    };
    $[7] = alignItems;
    $[8] = display;
    $[9] = flexActive;
    $[10] = flexDir;
    $[11] = justifyContent;
    $[12] = setMultiple;
    $[13] = t5;
  } else t5 = $[13];
  let t6;
  if ($[14] !== t5 || $[15] !== value) {
    t6 = <InspectorToggleGroup aria-label="Flow" value={value} options={options} onValueChange={t5} />;
    $[14] = t5;
    $[15] = value;
    $[16] = t6;
  } else t6 = $[16];
  return t6;
}
/**
* Main-axis gap input. Like Figma's "Auto" spacing, the menu also offers the
* CSS distribution modes: picking one writes `justify-content` and the field
* shows that mode in place of the gap; entering a number again packs the
* items back to the start. The gap value itself is left untouched.
*/
function FlexMainAxisGapInput() {
  const $ = (0, import_compiler_runtime.c)(28);
  const flexDir = useStyleField("flexDirection");
  const justifyContent = useStyleField("justifyContent");
  const {
    setMultiple
  } = useStyleOps();
  let t0;
  if ($[0] !== flexDir) {
    t0 = flexDir.in("column", "column-reverse");
    $[0] = flexDir;
    $[1] = t0;
  } else t0 = $[1];
  const isColumn = t0;
  const property = isColumn ? "rowGap" : "columnGap";
  const gap = useStyleField(property);
  let t1;
  if ($[2] !== justifyContent.isMixed || $[3] !== justifyContent.value) {
    t1 = justifyContent.isMixed ? null : asFlexDistribution(justifyContent.value);
    $[2] = justifyContent.isMixed;
    $[3] = justifyContent.value;
    $[4] = t1;
  } else t1 = $[4];
  const distributed = t1;
  const t2 = !isColumn && "rotate-90";
  let t3;
  if ($[5] !== t2) {
    t3 = cn$2("size-3.75 shrink-0", t2);
    $[5] = t2;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== t3) {
    t4 = <GapIcon className={t3} />;
    $[7] = t3;
    $[8] = t4;
  } else t4 = $[8];
  const t5 = distributed ?? (gap.isMixed ? "" : gap.value);
  let t6;
  if ($[9] !== distributed || $[10] !== gap || $[11] !== property || $[12] !== setMultiple) {
    t6 = next => {
      if (asFlexDistribution(next)) setMultiple({
        justifyContent: next
      });else if (distributed) setMultiple({
        [property]: next,
        justifyContent: "flex-start"
      });else gap.set(next);
    };
    $[9] = distributed;
    $[10] = gap;
    $[11] = property;
    $[12] = setMultiple;
    $[13] = t6;
  } else t6 = $[13];
  const t7 = !distributed && gap.isMixed;
  let t8;
  if ($[14] !== distributed || $[15] !== gap.source) {
    t8 = distributed ? {} : gap.source;
    $[14] = distributed;
    $[15] = gap.source;
    $[16] = t8;
  } else t8 = $[16];
  let t9;
  if ($[17] !== property) {
    t9 = styleFieldLabel(property);
    $[17] = property;
    $[18] = t9;
  } else t9 = $[18];
  let t10;
  if ($[19] !== gap.addClass || $[20] !== property || $[21] !== t4 || $[22] !== t5 || $[23] !== t6 || $[24] !== t7 || $[25] !== t8 || $[26] !== t9) {
    t10 = <LayoutValueInput icon={t4} value={t5} onChange={t6} modeOptions={MAIN_AXIS_GAP_MODES} isMixedValue={t7} {...t8} cssProperty={property} tooltipLabel={t9} onSelectClass={gap.addClass} />;
    $[19] = gap.addClass;
    $[20] = property;
    $[21] = t4;
    $[22] = t5;
    $[23] = t6;
    $[24] = t7;
    $[25] = t8;
    $[26] = t9;
    $[27] = t10;
  } else t10 = $[27];
  return t10;
}
/** Toggle flex wrapping from the fixed action slot beside the flow switcher. */
function WrapToggleButton() {
  const $ = (0, import_compiler_runtime.c)(10);
  const flexWrap = useStyleField("flexWrap");
  let t0;
  if ($[0] !== flexWrap) {
    t0 = flexWrap.equals("wrap");
    $[0] = flexWrap;
    $[1] = t0;
  } else t0 = $[1];
  const isWrapped = t0;
  const t1 = isWrapped ? "Disable wrapping" : "Wrap items";
  let t2;
  if ($[2] !== flexWrap || $[3] !== isWrapped) {
    t2 = () => flexWrap.set(isWrapped ? "nowrap" : "wrap");
    $[2] = flexWrap;
    $[3] = isWrapped;
    $[4] = t2;
  } else t2 = $[4];
  let t3;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <FlexWrapGlyph />;
    $[5] = t3;
  } else t3 = $[5];
  let t4;
  if ($[6] !== isWrapped || $[7] !== t1 || $[8] !== t2) {
    t4 = <IconBtn label={t1} active={isWrapped} onClick={t2}>{t3}</IconBtn>;
    $[6] = isWrapped;
    $[7] = t1;
    $[8] = t2;
    $[9] = t4;
  } else t4 = $[9];
  return t4;
}
/**
* Section-header toggle button bound to `visibility: hidden`. Active when
* the element is hidden; clicking toggles it.
*/
function VisibilityToggleButton() {
  const $ = (0, import_compiler_runtime.c)(12);
  const f = useStyleField("visibility");
  let t0;
  if ($[0] !== f) {
    t0 = f.equals("hidden");
    $[0] = f;
    $[1] = t0;
  } else t0 = $[1];
  const isHidden = t0;
  const t1 = isHidden ? "Show" : "Hide";
  let t2;
  if ($[2] !== f || $[3] !== isHidden) {
    t2 = () => isHidden ? f.clear() : f.set("hidden");
    $[2] = f;
    $[3] = isHidden;
    $[4] = t2;
  } else t2 = $[4];
  let t3;
  if ($[5] !== isHidden) {
    t3 = isHidden ? <EyeClosedIcon /> : <EyeIcon />;
    $[5] = isHidden;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== isHidden || $[8] !== t1 || $[9] !== t2 || $[10] !== t3) {
    t4 = <IconBtn label={t1} active={isHidden} onClick={t2}>{t3}</IconBtn>;
    $[7] = isHidden;
    $[8] = t1;
    $[9] = t2;
    $[10] = t3;
    $[11] = t4;
  } else t4 = $[11];
  return t4;
}
/** A grid of layout inputs for the four sides of padding/margin, with link mode. */
function LinkedSidesGrid(t0) {
  const $ = (0, import_compiler_runtime.c)(52);
  const {
    prefix,
    linked,
    linkedHorizontalIcon,
    linkedVerticalIcon,
    showTooltips: t1
  } = t0;
  const showTooltips = t1 === void 0 ? true : t1;
  const {
    setMultiple
  } = useStyleOps();
  const top = `${prefix}Top`;
  const right = `${prefix}Right`;
  const bottom = `${prefix}Bottom`;
  const left = `${prefix}Left`;
  if (linked) {
    let t2;
    if ($[0] !== left || $[1] !== right || $[2] !== setMultiple) {
      t2 = v => setMultiple({
        [left]: v,
        [right]: v
      });
      $[0] = left;
      $[1] = right;
      $[2] = setMultiple;
      $[3] = t2;
    } else t2 = $[3];
    let t3;
    if ($[4] !== left || $[5] !== linkedHorizontalIcon || $[6] !== showTooltips || $[7] !== t2) {
      t3 = <StyleLayoutInput property={left} icon={linkedHorizontalIcon} showTooltip={showTooltips} onChange={t2} />;
      $[4] = left;
      $[5] = linkedHorizontalIcon;
      $[6] = showTooltips;
      $[7] = t2;
      $[8] = t3;
    } else t3 = $[8];
    let t4;
    if ($[9] !== bottom || $[10] !== setMultiple || $[11] !== top) {
      t4 = v_0 => setMultiple({
        [top]: v_0,
        [bottom]: v_0
      });
      $[9] = bottom;
      $[10] = setMultiple;
      $[11] = top;
      $[12] = t4;
    } else t4 = $[12];
    let t5;
    if ($[13] !== linkedVerticalIcon || $[14] !== showTooltips || $[15] !== t4 || $[16] !== top) {
      t5 = <StyleLayoutInput property={top} icon={linkedVerticalIcon} showTooltip={showTooltips} onChange={t4} />;
      $[13] = linkedVerticalIcon;
      $[14] = showTooltips;
      $[15] = t4;
      $[16] = top;
      $[17] = t5;
    } else t5 = $[17];
    let t6;
    if ($[18] !== t3 || $[19] !== t5) {
      t6 = <>{t3}{t5}</>;
      $[18] = t3;
      $[19] = t5;
      $[20] = t6;
    } else t6 = $[20];
    return t6;
  }
  let t2;
  if ($[21] !== prefix) {
    t2 = prefix === "margin" ? {
      top: MarginTopIcon,
      bottom: MarginBottomIcon,
      left: MarginLeftIcon,
      right: MarginRightIcon
    } : {
      top: PaddingTopIcon,
      bottom: PaddingBottomIcon,
      left: PaddingLeftIcon,
      right: PaddingRightIcon
    };
    $[21] = prefix;
    $[22] = t2;
  } else t2 = $[22];
  const side = t2;
  let t3;
  if ($[23] !== side.left) {
    t3 = <side.left className="size-3.75" />;
    $[23] = side.left;
    $[24] = t3;
  } else t3 = $[24];
  let t4;
  if ($[25] !== left || $[26] !== showTooltips || $[27] !== t3) {
    t4 = <StyleLayoutInput property={left} icon={t3} showTooltip={showTooltips} />;
    $[25] = left;
    $[26] = showTooltips;
    $[27] = t3;
    $[28] = t4;
  } else t4 = $[28];
  let t5;
  if ($[29] !== side.top) {
    t5 = <side.top className="size-3.75" />;
    $[29] = side.top;
    $[30] = t5;
  } else t5 = $[30];
  let t6;
  if ($[31] !== showTooltips || $[32] !== t5 || $[33] !== top) {
    t6 = <StyleLayoutInput property={top} icon={t5} showTooltip={showTooltips} />;
    $[31] = showTooltips;
    $[32] = t5;
    $[33] = top;
    $[34] = t6;
  } else t6 = $[34];
  let t7;
  if ($[35] !== side.right) {
    t7 = <side.right className="size-3.75" />;
    $[35] = side.right;
    $[36] = t7;
  } else t7 = $[36];
  let t8;
  if ($[37] !== right || $[38] !== showTooltips || $[39] !== t7) {
    t8 = <StyleLayoutInput property={right} icon={t7} showTooltip={showTooltips} />;
    $[37] = right;
    $[38] = showTooltips;
    $[39] = t7;
    $[40] = t8;
  } else t8 = $[40];
  let t9;
  if ($[41] !== side.bottom) {
    t9 = <side.bottom className="size-3.75" />;
    $[41] = side.bottom;
    $[42] = t9;
  } else t9 = $[42];
  let t10;
  if ($[43] !== bottom || $[44] !== showTooltips || $[45] !== t9) {
    t10 = <StyleLayoutInput property={bottom} icon={t9} showTooltip={showTooltips} />;
    $[43] = bottom;
    $[44] = showTooltips;
    $[45] = t9;
    $[46] = t10;
  } else t10 = $[46];
  let t11;
  if ($[47] !== t10 || $[48] !== t4 || $[49] !== t6 || $[50] !== t8) {
    t11 = <>{t4}{t6}{t8}{t10}</>;
    $[47] = t10;
    $[48] = t4;
    $[49] = t6;
    $[50] = t8;
    $[51] = t11;
  } else t11 = $[51];
  return t11;
}
function LinkSidesButton(t0) {
  const $ = (0, import_compiler_runtime.c)(7);
  const {
    linked,
    onToggle,
    kind: t1
  } = t0;
  const SeparateIcon = (t1 === void 0 ? "padding" : t1) === "margin" ? MarginSeparateIcon : PaddingSeparateIcon;
  const t2 = linked ? "Separate sides" : "Link sides";
  const t3 = !linked;
  let t4;
  if ($[0] !== SeparateIcon) {
    t4 = <SeparateIcon />;
    $[0] = SeparateIcon;
    $[1] = t4;
  } else t4 = $[1];
  let t5;
  if ($[2] !== onToggle || $[3] !== t2 || $[4] !== t3 || $[5] !== t4) {
    t5 = <IconBtn label={t2} active={t3} onClick={onToggle}>{t4}</IconBtn>;
    $[2] = onToggle;
    $[3] = t2;
    $[4] = t3;
    $[5] = t4;
    $[6] = t5;
  } else t5 = $[6];
  return t5;
}

export { FlexMainAxisGapInput, FlowToggleGroup, LinkSidesButton, LinkedSidesGrid, VisibilityToggleButton, WrapToggleButton };
