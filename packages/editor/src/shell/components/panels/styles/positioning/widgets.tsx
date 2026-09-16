/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/positioning/widgets.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { UnitMenu } from "../inputs/UnitMenu";
import { InspectorDropdown } from "../inputs/parts/InspectorDropdown";
import { translateInspectorText } from "../inspectorCopy";
import { useInspectorScrub } from "../inputs/useInspectorScrub";
import { useUnitValue } from "../inputs/useUnitValue";
import { IconBtn, InspectorControlInput, InspectorControlShell, InspectorScrubHandle, blurInspectorInputOnEnter } from "../primitives";
import { AlignBottomIcon, AlignCenterHorizontalIcon, AlignCenterVerticalIcon, AlignLeftIcon, AlignRightIcon, AlignTopIcon, DistributeHorizontalIcon, DistributeVerticalIcon, DotsThreeIcon, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, RotationIcon, Tooltip, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Stateless widgets for the Position section: the constraints anchor cross,
* the horizontal/vertical alignment buttons, the rotation degree field, and the
* single T/L/R/B offset input. None of these touch the StyleOps context — they
* are driven entirely by props so they can be unit-tested in isolation.
*/
function PositionTick(t0) {
  const $ = (0, import_compiler_runtime.c)(6);
  const {
    edge,
    className
  } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = {
      top: "M2 2H14M8 2V11",
      right: "M14 2V14M14 8H5",
      bottom: "M2 14H14M8 14V5",
      left: "M2 2V14M2 8H11"
    };
    $[0] = t1;
  } else t1 = $[0];
  const path = t1[edge];
  let t2;
  if ($[1] !== path) {
    t2 = <path d={path} stroke="currentColor" strokeWidth={1} strokeLinecap="round" />;
    $[1] = path;
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if ($[3] !== className || $[4] !== t2) {
    t3 = <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>{t2}</svg>;
    $[3] = className;
    $[4] = t2;
    $[5] = t3;
  } else t3 = $[5];
  return t3;
}
/** Compact constraint glyph used by the pinning-controls disclosure button. */
function PositionPinningIcon(t0) {
  const $ = (0, import_compiler_runtime.c)(34);
  const {
    horizontal,
    vertical,
    className
  } = t0;
  const top = vertical === "start" || vertical === "stretch";
  const right = horizontal === "end" || horizontal === "stretch";
  const bottom = vertical === "end" || vertical === "stretch";
  const left = horizontal === "start" || horizontal === "stretch";
  const horizontalCenter = horizontal === "center";
  const verticalCenter = vertical === "center";
  const pinClass = _temp$44;
  let t1;
  if ($[0] !== className) {
    t1 = cn$2("size-4", className);
    $[0] = className;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== top) {
    t2 = pinClass(top);
    $[2] = top;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== t2) {
    t3 = <path d="M5.5 2H10.5M8 2V5" stroke="currentColor" strokeLinecap="round" className={t2} />;
    $[4] = t2;
    $[5] = t3;
  } else t3 = $[5];
  let t4;
  if ($[6] !== right) {
    t4 = pinClass(right);
    $[6] = right;
    $[7] = t4;
  } else t4 = $[7];
  let t5;
  if ($[8] !== t4) {
    t5 = <path d="M14 5.5V10.5M14 8H11" stroke="currentColor" strokeLinecap="round" className={t4} />;
    $[8] = t4;
    $[9] = t5;
  } else t5 = $[9];
  let t6;
  if ($[10] !== bottom) {
    t6 = pinClass(bottom);
    $[10] = bottom;
    $[11] = t6;
  } else t6 = $[11];
  let t7;
  if ($[12] !== t6) {
    t7 = <path d="M5.5 14H10.5M8 14V11" stroke="currentColor" strokeLinecap="round" className={t6} />;
    $[12] = t6;
    $[13] = t7;
  } else t7 = $[13];
  let t8;
  if ($[14] !== left) {
    t8 = pinClass(left);
    $[14] = left;
    $[15] = t8;
  } else t8 = $[15];
  let t9;
  if ($[16] !== t8) {
    t9 = <path d="M2 5.5V10.5M2 8H5" stroke="currentColor" strokeLinecap="round" className={t8} />;
    $[16] = t8;
    $[17] = t9;
  } else t9 = $[17];
  let t10;
  if ($[18] !== horizontalCenter) {
    t10 = pinClass(horizontalCenter);
    $[18] = horizontalCenter;
    $[19] = t10;
  } else t10 = $[19];
  let t11;
  if ($[20] !== t10) {
    t11 = <path d="M8 5V11" stroke="currentColor" strokeLinecap="round" className={t10} />;
    $[20] = t10;
    $[21] = t11;
  } else t11 = $[21];
  let t12;
  if ($[22] !== verticalCenter) {
    t12 = pinClass(verticalCenter);
    $[22] = verticalCenter;
    $[23] = t12;
  } else t12 = $[23];
  let t13;
  if ($[24] !== t12) {
    t13 = <path d="M5 8H11" stroke="currentColor" strokeLinecap="round" className={t12} />;
    $[24] = t12;
    $[25] = t13;
  } else t13 = $[25];
  let t14;
  if ($[26] !== t1 || $[27] !== t11 || $[28] !== t13 || $[29] !== t3 || $[30] !== t5 || $[31] !== t7 || $[32] !== t9) {
    t14 = <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={t1}>{t3}{t5}{t7}{t9}{t11}{t13}</svg>;
    $[26] = t1;
    $[27] = t11;
    $[28] = t13;
    $[29] = t3;
    $[30] = t5;
    $[31] = t7;
    $[32] = t9;
    $[33] = t14;
  } else t14 = $[33];
  return t14;
}
function _temp$44(active) {
  return cn$2(active ? "opacity-100" : "opacity-25");
}
function PositionAnchorWidget(t0) {
  const $ = (0, import_compiler_runtime.c)(61);
  const { t } = useTranslation("editor");
  const {
    horizontal,
    vertical,
    allowCenter,
    allowStretch,
    onHorizontal,
    onVertical,
    onPin,
    className
  } = t0;
  const top = vertical === "start" || vertical === "stretch";
  const right = horizontal === "end" || horizontal === "stretch";
  const bottom = vertical === "end" || vertical === "stretch";
  const left = horizontal === "start" || horizontal === "stretch";
  const horizontalCenter = horizontal === "center";
  const verticalCenter = vertical === "center";
  let t1;
  if ($[0] !== allowStretch) {
    t1 = event => allowStretch && (event.metaKey || event.ctrlKey || event.shiftKey);
    $[0] = allowStretch;
    $[1] = t1;
  } else t1 = $[1];
  const additiveClick = t1;
  let t2;
  if ($[2] !== className) {
    t2 = cn$2("relative flex h-12 w-12 shrink-0 items-center justify-center rounded bg-ed-muted", className);
    $[2] = className;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== additiveClick || $[5] !== onPin) {
    t3 = event_0 => onPin("top", additiveClick(event_0));
    $[4] = additiveClick;
    $[5] = onPin;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = cn$2("group/anchor-line absolute flex items-center justify-center rounded-[2px] outline-none hover:bg-ed-foreground/10 focus-visible:bg-ed-foreground/10", "top-0 left-1/2 -translate-x-1/2 h-5 w-6");
    $[7] = t4;
  } else t4 = $[7];
  const t5 = top ? "text-ed-foreground" : "text-ed-muted-foreground/30 group-hover/anchor-line:text-ed-foreground";
  let t6;
  if ($[8] !== t5) {
    t6 = cn$2("size-3.5 translate-y-0.5", t5);
    $[8] = t5;
    $[9] = t6;
  } else t6 = $[9];
  let t7;
  if ($[10] !== t6) {
    t7 = <PositionTick edge="top" className={t6} />;
    $[10] = t6;
    $[11] = t7;
  } else t7 = $[11];
  let t8;
  if (true) {
    t8 = <Tooltip content={t("styles.pinTop")}>{<button type="button" aria-label={t("styles.pinTop")} onClick={t3} className={t4}>{t7}</button>}</Tooltip>;
    $[12] = t3;
    $[13] = t7;
    $[14] = t8;
  } else t8 = $[14];
  let t9;
  if ($[15] !== additiveClick || $[16] !== onPin) {
    t9 = event_1 => onPin("bottom", additiveClick(event_1));
    $[15] = additiveClick;
    $[16] = onPin;
    $[17] = t9;
  } else t9 = $[17];
  let t10;
  if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
    t10 = cn$2("group/anchor-line absolute flex items-center justify-center rounded-[2px] outline-none hover:bg-ed-foreground/10 focus-visible:bg-ed-foreground/10", "bottom-0 left-1/2 -translate-x-1/2 h-5 w-6");
    $[18] = t10;
  } else t10 = $[18];
  const t11 = bottom ? "text-ed-foreground" : "text-ed-muted-foreground/30 group-hover/anchor-line:text-ed-foreground";
  let t12;
  if ($[19] !== t11) {
    t12 = cn$2("size-3.5 -translate-y-0.5", t11);
    $[19] = t11;
    $[20] = t12;
  } else t12 = $[20];
  let t13;
  if ($[21] !== t12) {
    t13 = <PositionTick edge="bottom" className={t12} />;
    $[21] = t12;
    $[22] = t13;
  } else t13 = $[22];
  let t14;
  if (true) {
    t14 = <Tooltip content={t("styles.pinBottom")}>{<button type="button" aria-label={t("styles.pinBottom")} onClick={t9} className={t10}>{t13}</button>}</Tooltip>;
    $[23] = t13;
    $[24] = t9;
    $[25] = t14;
  } else t14 = $[25];
  let t15;
  if ($[26] !== additiveClick || $[27] !== onPin) {
    t15 = event_2 => onPin("left", additiveClick(event_2));
    $[26] = additiveClick;
    $[27] = onPin;
    $[28] = t15;
  } else t15 = $[28];
  let t16;
  if ($[29] === Symbol.for("react.memo_cache_sentinel")) {
    t16 = cn$2("group/anchor-line absolute flex items-center justify-center rounded-[2px] outline-none hover:bg-ed-foreground/10 focus-visible:bg-ed-foreground/10", "left-0 top-1/2 -translate-y-1/2 h-6 w-5");
    $[29] = t16;
  } else t16 = $[29];
  const t17 = left ? "text-ed-foreground" : "text-ed-muted-foreground/30 group-hover/anchor-line:text-ed-foreground";
  let t18;
  if ($[30] !== t17) {
    t18 = cn$2("size-3.5 translate-x-0.5", t17);
    $[30] = t17;
    $[31] = t18;
  } else t18 = $[31];
  let t19;
  if ($[32] !== t18) {
    t19 = <PositionTick edge="left" className={t18} />;
    $[32] = t18;
    $[33] = t19;
  } else t19 = $[33];
  let t20;
  if (true) {
    t20 = <Tooltip content={t("styles.pinLeft")}>{<button type="button" aria-label={t("styles.pinLeft")} onClick={t15} className={t16}>{t19}</button>}</Tooltip>;
    $[34] = t15;
    $[35] = t19;
    $[36] = t20;
  } else t20 = $[36];
  let t21;
  if ($[37] !== additiveClick || $[38] !== onPin) {
    t21 = event_3 => onPin("right", additiveClick(event_3));
    $[37] = additiveClick;
    $[38] = onPin;
    $[39] = t21;
  } else t21 = $[39];
  let t22;
  if ($[40] === Symbol.for("react.memo_cache_sentinel")) {
    t22 = cn$2("group/anchor-line absolute flex items-center justify-center rounded-[2px] outline-none hover:bg-ed-foreground/10 focus-visible:bg-ed-foreground/10", "right-0 top-1/2 -translate-y-1/2 h-6 w-5");
    $[40] = t22;
  } else t22 = $[40];
  const t23 = right ? "text-ed-foreground" : "text-ed-muted-foreground/30 group-hover/anchor-line:text-ed-foreground";
  let t24;
  if ($[41] !== t23) {
    t24 = cn$2("size-3.5 -translate-x-0.5", t23);
    $[41] = t23;
    $[42] = t24;
  } else t24 = $[42];
  let t25;
  if ($[43] !== t24) {
    t25 = <PositionTick edge="right" className={t24} />;
    $[43] = t24;
    $[44] = t25;
  } else t25 = $[44];
  let t26;
  if (true) {
    t26 = <Tooltip content={t("styles.pinRight")}>{<button type="button" aria-label={t("styles.pinRight")} onClick={t21} className={t22}>{t25}</button>}</Tooltip>;
    $[45] = t21;
    $[46] = t25;
    $[47] = t26;
  } else t26 = $[47];
  let t27;
  if (true) {
    t27 = allowCenter && <>{<Tooltip content={t("styles.centerHorizontally")}>{<button type="button" aria-label={t("styles.centerHorizontally")} onClick={() => onHorizontal("center")} className={cn$2("group/anchor-line absolute flex items-center justify-center rounded-[2px] outline-none hover:bg-ed-foreground/10 focus-visible:bg-ed-foreground/10", "left-1/2 top-1/2 z-10 h-6 w-2.5 -translate-x-1/2 -translate-y-1/2")}>{<span className={cn$2("h-3 w-px", horizontalCenter ? "bg-ed-foreground" : "bg-ed-muted-foreground/30 group-hover/anchor-line:bg-ed-foreground")} />}</button>}</Tooltip>}{<Tooltip content={t("styles.centerVertically")}>{<button type="button" aria-label={t("styles.centerVertically")} onClick={() => onVertical("center")} className={cn$2("group/anchor-line absolute flex items-center justify-center rounded-[2px] outline-none hover:bg-ed-foreground/10 focus-visible:bg-ed-foreground/10", "left-1/2 top-1/2 z-10 h-2.5 w-6 -translate-x-1/2 -translate-y-1/2")}>{<span className={cn$2("h-px w-3", verticalCenter ? "bg-ed-foreground" : "bg-ed-muted-foreground/30 group-hover/anchor-line:bg-ed-foreground")} />}</button>}</Tooltip>}</>;
    $[48] = allowCenter;
    $[49] = horizontalCenter;
    $[50] = onHorizontal;
    $[51] = onVertical;
    $[52] = verticalCenter;
    $[53] = t27;
  } else t27 = $[53];
  let t28;
  if ($[54] !== t14 || $[55] !== t2 || $[56] !== t20 || $[57] !== t26 || $[58] !== t27 || $[59] !== t8) {
    t28 = <div className={t2}>{t8}{t14}{t20}{t26}{t27}</div>;
    $[54] = t14;
    $[55] = t2;
    $[56] = t20;
    $[57] = t26;
    $[58] = t27;
    $[59] = t8;
    $[60] = t28;
  } else t28 = $[60];
  return t28;
}
function HorizontalConstraintIcon(props) {
  const $ = (0, import_compiler_runtime.c)(3);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <path d="M3 4.5v7M13 4.5v7M3 8h10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />;
    $[0] = t0;
  } else t0 = $[0];
  let t1;
  if ($[1] !== props) {
    t1 = <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>{t0}</svg>;
    $[1] = props;
    $[2] = t1;
  } else t1 = $[2];
  return t1;
}
function VerticalConstraintIcon(props) {
  const $ = (0, import_compiler_runtime.c)(3);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <path d="M4.5 3h7M4.5 13h7M8 3v10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />;
    $[0] = t0;
  } else t0 = $[0];
  let t1;
  if ($[1] !== props) {
    t1 = <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>{t0}</svg>;
    $[1] = props;
    $[2] = t1;
  } else t1 = $[2];
  return t1;
}
var HORIZONTAL_CONSTRAINTS = [{
  value: "start",
  label: "Left"
}, {
  value: "center",
  label: "Center"
}, {
  value: "end",
  label: "Right"
}, {
  value: "stretch",
  label: "Left & Right"
}];
var VERTICAL_CONSTRAINTS = [{
  value: "start",
  label: "Top"
}, {
  value: "center",
  label: "Center"
}, {
  value: "end",
  label: "Bottom"
}, {
  value: "stretch",
  label: "Top & Bottom"
}];
/** Direct alignment actions. In-flow conversion is owned by the section. */
function PositionAlignmentControls(t0) {
  const $ = (0, import_compiler_runtime.c)(42);
  const { t } = useTranslation("editor");
  const {
    canDistribute: t1,
    showDistribution: t2,
    onHorizontal,
    onVertical,
    onDistribute
  } = t0;
  const canDistribute = t1 === void 0 ? false : t1;
  const showDistribution = t2 === void 0 ? true : t2;
  let t3;
  if ($[0] !== onHorizontal) {
    t3 = () => onHorizontal("start");
    $[0] = onHorizontal;
    $[1] = t3;
  } else t3 = $[1];
  let t4;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = <AlignLeftIcon className="size-3.75" />;
    $[2] = t4;
  } else t4 = $[2];
  let t5;
  if ($[3] !== t3) {
    t5 = <IconBtn label="Align left" onClick={t3}>{t4}</IconBtn>;
    $[3] = t3;
    $[4] = t5;
  } else t5 = $[4];
  let t6;
  if ($[5] !== onHorizontal) {
    t6 = () => onHorizontal("center");
    $[5] = onHorizontal;
    $[6] = t6;
  } else t6 = $[6];
  let t7;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = <AlignCenterHorizontalIcon className="size-3.75" />;
    $[7] = t7;
  } else t7 = $[7];
  let t8;
  if ($[8] !== t6) {
    t8 = <IconBtn label="Center horizontally" onClick={t6}>{t7}</IconBtn>;
    $[8] = t6;
    $[9] = t8;
  } else t8 = $[9];
  let t9;
  if ($[10] !== onHorizontal) {
    t9 = () => onHorizontal("end");
    $[10] = onHorizontal;
    $[11] = t9;
  } else t9 = $[11];
  let t10;
  if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
    t10 = <AlignRightIcon className="size-3.75" />;
    $[12] = t10;
  } else t10 = $[12];
  let t11;
  if ($[13] !== t9) {
    t11 = <IconBtn label="Align right" onClick={t9}>{t10}</IconBtn>;
    $[13] = t9;
    $[14] = t11;
  } else t11 = $[14];
  let t12;
  if ($[15] !== onVertical) {
    t12 = () => onVertical("start");
    $[15] = onVertical;
    $[16] = t12;
  } else t12 = $[16];
  let t13;
  if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
    t13 = <AlignTopIcon className="size-3.75" />;
    $[17] = t13;
  } else t13 = $[17];
  let t14;
  if ($[18] !== t12) {
    t14 = <IconBtn label="Align top" onClick={t12}>{t13}</IconBtn>;
    $[18] = t12;
    $[19] = t14;
  } else t14 = $[19];
  let t15;
  if ($[20] !== onVertical) {
    t15 = () => onVertical("center");
    $[20] = onVertical;
    $[21] = t15;
  } else t15 = $[21];
  let t16;
  if ($[22] === Symbol.for("react.memo_cache_sentinel")) {
    t16 = <AlignCenterVerticalIcon className="size-3.75" />;
    $[22] = t16;
  } else t16 = $[22];
  let t17;
  if ($[23] !== t15) {
    t17 = <IconBtn label="Center vertically" onClick={t15}>{t16}</IconBtn>;
    $[23] = t15;
    $[24] = t17;
  } else t17 = $[24];
  let t18;
  if ($[25] !== onVertical) {
    t18 = () => onVertical("end");
    $[25] = onVertical;
    $[26] = t18;
  } else t18 = $[26];
  let t19;
  if ($[27] === Symbol.for("react.memo_cache_sentinel")) {
    t19 = <AlignBottomIcon className="size-3.75" />;
    $[27] = t19;
  } else t19 = $[27];
  let t20;
  if ($[28] !== t18) {
    t20 = <IconBtn label="Align bottom" onClick={t18}>{t19}</IconBtn>;
    $[28] = t18;
    $[29] = t20;
  } else t20 = $[29];
  let t21;
  if (true) {
    t21 = showDistribution ? <DropdownMenu modal={false}>{<DropdownMenuTrigger asChild={true}>{<IconBtn label="More arrangement options">{<DotsThreeIcon className="size-3.75 rotate-90" />}</IconBtn>}</DropdownMenuTrigger>}{<DropdownMenuContent align="end" className="min-w-[172px]">{<DropdownMenuItem className="gap-2" disabled={!canDistribute} onSelect={() => onDistribute("vertical")}>{<DistributeVerticalIcon className="size-4 shrink-0" />}{t("styles.distributeVertically")}</DropdownMenuItem>}{<DropdownMenuItem className="gap-2" disabled={!canDistribute} onSelect={() => onDistribute("horizontal")}>{<DistributeHorizontalIcon className="size-4 shrink-0" />}{t("styles.distributeHorizontally")}</DropdownMenuItem>}</DropdownMenuContent>}</DropdownMenu> : <span aria-hidden="true" className="size-[24px] shrink-0" />;
    $[30] = canDistribute;
    $[31] = onDistribute;
    $[32] = showDistribution;
    $[33] = t21;
  } else t21 = $[33];
  let t22;
  if (true) {
    t22 = <div role="group" aria-label={t("styles.positionAlignment")} className="flex shrink-0 items-center">{t5}{t8}{t11}{t14}{t17}{t20}{t21}</div>;
    $[34] = t11;
    $[35] = t14;
    $[36] = t17;
    $[37] = t20;
    $[38] = t21;
    $[39] = t5;
    $[40] = t8;
    $[41] = t22;
  } else t22 = $[41];
  return t22;
}
function PositionConstraintsControl(t0) {
  const $ = (0, import_compiler_runtime.c)(45);
  const { t } = useTranslation("editor");
  const {
    horizontal,
    vertical,
    showAnchor: t1,
    allowCenter: t2,
    allowStretch: t3,
    onHorizontal,
    onVertical,
    onPin
  } = t0;
  const showAnchor = t1 === void 0 ? true : t1;
  const allowCenter = t2 === void 0 ? true : t2;
  const allowStretch = t3 === void 0 ? true : t3;
  let t4;
  if ($[0] !== allowCenter || $[1] !== allowStretch) {
    t4 = HORIZONTAL_CONSTRAINTS.filter(item => (allowCenter || item.value !== "center") && (allowStretch || item.value !== "stretch"));
    $[0] = allowCenter;
    $[1] = allowStretch;
    $[2] = t4;
  } else t4 = $[2];
  const horizontalOptions = t4;
  let t5;
  if ($[3] !== allowCenter || $[4] !== allowStretch) {
    t5 = VERTICAL_CONSTRAINTS.filter(item_0 => (allowCenter || item_0.value !== "center") && (allowStretch || item_0.value !== "stretch"));
    $[3] = allowCenter;
    $[4] = allowStretch;
    $[5] = t5;
  } else t5 = $[5];
  const verticalOptions = t5;
  let t6;
  if ($[6] !== horizontal) {
    t6 = HORIZONTAL_CONSTRAINTS.find(item_1 => item_1.value === horizontal)?.label ?? "Left";
    $[6] = horizontal;
    $[7] = t6;
  } else t6 = $[7];
  const horizontalLabel = translateInspectorText(t, t6);
  let t7;
  if ($[8] !== vertical) {
    t7 = VERTICAL_CONSTRAINTS.find(item_2 => item_2.value === vertical)?.label ?? "Top";
    $[8] = vertical;
    $[9] = t7;
  } else t7 = $[9];
  const verticalLabel = translateInspectorText(t, t7);
  let t8;
  if ($[10] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = <HorizontalConstraintIcon className="size-4 shrink-0 text-ed-foreground-secondary" />;
    $[10] = t8;
  } else t8 = $[10];
  let t9;
  if ($[11] !== horizontalLabel) {
    t9 = <span className="flex min-w-0 items-center gap-1.5">{t8}{<span className="truncate">{horizontalLabel}</span>}</span>;
    $[11] = horizontalLabel;
    $[12] = t9;
  } else t9 = $[12];
  let t10;
  if ($[13] !== onHorizontal) {
    t10 = value => onHorizontal(value);
    $[13] = onHorizontal;
    $[14] = t10;
  } else t10 = $[14];
  let t11;
  if ($[15] !== horizontal || $[16] !== horizontalOptions || $[17] !== t10 || $[18] !== t9) {
    t11 = <InspectorDropdown label="Horizontal constraint" value={t9} className="w-full" selectedValue={horizontal} options={horizontalOptions} onValueChange={t10} />;
    $[15] = horizontal;
    $[16] = horizontalOptions;
    $[17] = t10;
    $[18] = t9;
    $[19] = t11;
  } else t11 = $[19];
  let t12;
  if ($[20] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = <VerticalConstraintIcon className="size-4 shrink-0 text-ed-foreground-secondary" />;
    $[20] = t12;
  } else t12 = $[20];
  let t13;
  if ($[21] !== verticalLabel) {
    t13 = <span className="flex min-w-0 items-center gap-1.5">{t12}{<span className="truncate">{verticalLabel}</span>}</span>;
    $[21] = verticalLabel;
    $[22] = t13;
  } else t13 = $[22];
  let t14;
  if ($[23] !== onVertical) {
    t14 = value_0 => onVertical(value_0);
    $[23] = onVertical;
    $[24] = t14;
  } else t14 = $[24];
  let t15;
  if ($[25] !== t13 || $[26] !== t14 || $[27] !== vertical || $[28] !== verticalOptions) {
    t15 = <InspectorDropdown label="Vertical constraint" value={t13} className="w-full" selectedValue={vertical} options={verticalOptions} onValueChange={t14} />;
    $[25] = t13;
    $[26] = t14;
    $[27] = vertical;
    $[28] = verticalOptions;
    $[29] = t15;
  } else t15 = $[29];
  let t16;
  if ($[30] !== t11 || $[31] !== t15) {
    t16 = <div className="flex min-w-0 flex-1 flex-col gap-2">{t11}{t15}</div>;
    $[30] = t11;
    $[31] = t15;
    $[32] = t16;
  } else t16 = $[32];
  let t17;
  if ($[33] !== allowCenter || $[34] !== allowStretch || $[35] !== horizontal || $[36] !== onHorizontal || $[37] !== onPin || $[38] !== onVertical || $[39] !== showAnchor || $[40] !== vertical) {
    t17 = showAnchor && <PositionAnchorWidget horizontal={horizontal} vertical={vertical} allowCenter={allowCenter} allowStretch={allowStretch} onHorizontal={onHorizontal} onVertical={onVertical} onPin={onPin} className="h-auto min-h-[60px] min-w-0 flex-1 self-stretch" />;
    $[33] = allowCenter;
    $[34] = allowStretch;
    $[35] = horizontal;
    $[36] = onHorizontal;
    $[37] = onPin;
    $[38] = onVertical;
    $[39] = showAnchor;
    $[40] = vertical;
    $[41] = t17;
  } else t17 = $[41];
  let t18;
  if ($[42] !== t16 || $[43] !== t17) {
    t18 = <div className="flex w-full gap-2">{t16}{t17}</div>;
    $[42] = t16;
    $[43] = t17;
    $[44] = t18;
  } else t18 = $[44];
  return t18;
}
function RotationField(t0) {
  const $ = (0, import_compiler_runtime.c)(39);
  const {
    value,
    onChange,
    isMixed,
    onScrubStart,
    onScrubPreview,
    onScrubCommit
  } = t0;
  const fmt = _temp2$34;
  const [local, setLocal] = (0, import_react.useState)(isMixed ? "" : value ? fmt(value) : "");
  const [showMixed, setShowMixed] = (0, import_react.useState)(isMixed);
  const [focused, setFocused] = (0, import_react.useState)(false);
  let t1;
  if ($[0] !== isMixed || $[1] !== value) {
    t1 = {
      value,
      isMixed
    };
    $[0] = isMixed;
    $[1] = value;
    $[2] = t1;
  } else t1 = $[2];
  const [synced, setSynced] = (0, import_react.useState)(t1);
  if (value !== synced.value || isMixed !== synced.isMixed) {
    setSynced({
      value,
      isMixed
    });
    if (isMixed) {
      setLocal("");
      setShowMixed(true);
    } else {
      setLocal(value ? fmt(value) : "");
      setShowMixed(false);
    }
  }
  let t2;
  if ($[3] !== local || $[4] !== onChange || $[5] !== showMixed) {
    t2 = () => {
      if (local === "" && showMixed) return;
      if (local === "") {
        onChange(0);
        return;
      }
      const n = parseFloat(local);
      if (!Number.isNaN(n)) onChange(n);
    };
    $[3] = local;
    $[4] = onChange;
    $[5] = showMixed;
    $[6] = t2;
  } else t2 = $[6];
  const save = t2;
  const shiftHeldRef = (0, import_react.useRef)(false);
  const latestScrubValueRef = (0, import_react.useRef)(null);
  const shiftListenersRef = (0, import_react.useRef)(null);
  let t3;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = () => {
      if (shiftListenersRef.current) return;
      const onDown = e => {
        if (e.key === "Shift") shiftHeldRef.current = true;
      };
      const onUp = e_0 => {
        if (e_0.key === "Shift") shiftHeldRef.current = false;
      };
      window.addEventListener("keydown", onDown);
      window.addEventListener("keyup", onUp);
      shiftListenersRef.current = () => {
        window.removeEventListener("keydown", onDown);
        window.removeEventListener("keyup", onUp);
        shiftHeldRef.current = false;
        shiftListenersRef.current = null;
      };
    };
    $[7] = t3;
  } else t3 = $[7];
  const attachShiftListeners = t3;
  let t4;
  if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = () => {
      shiftListenersRef.current?.();
    };
    $[8] = t4;
  } else t4 = $[8];
  const detachShiftListeners = t4;
  let t5;
  let t6;
  if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = () => () => detachShiftListeners();
    t6 = [];
    $[9] = t5;
    $[10] = t6;
  } else {
    t5 = $[9];
    t6 = $[10];
  }
  (0, import_react.useEffect)(t5, t6);
  let t7;
  if ($[11] !== value) {
    t7 = () => value || 0;
    $[11] = value;
    $[12] = t7;
  } else t7 = $[12];
  let t8;
  if ($[13] !== onChange || $[14] !== onScrubPreview) {
    t8 = next => {
      const rounded = shiftHeldRef.current ? Math.round(next / 15) * 15 : Math.round(next);
      setLocal(String(rounded));
      setShowMixed(false);
      latestScrubValueRef.current = rounded;
      if (onScrubPreview) onScrubPreview(rounded);else onChange(rounded);
    };
    $[13] = onChange;
    $[14] = onScrubPreview;
    $[15] = t8;
  } else t8 = $[15];
  let t9;
  if ($[16] !== onScrubStart) {
    t9 = () => {
      latestScrubValueRef.current = null;
      attachShiftListeners();
      onScrubStart?.();
    };
    $[16] = onScrubStart;
    $[17] = t9;
  } else t9 = $[17];
  let t10;
  if ($[18] !== onChange || $[19] !== onScrubCommit) {
    t10 = () => {
      detachShiftListeners();
      if (latestScrubValueRef.current !== null) {
        if (onScrubCommit) onScrubCommit(latestScrubValueRef.current);else onChange(latestScrubValueRef.current);
      }
    };
    $[18] = onChange;
    $[19] = onScrubCommit;
    $[20] = t10;
  } else t10 = $[20];
  let t11;
  if ($[21] !== t10 || $[22] !== t9) {
    t11 = {
      onStart: t9,
      onEnd: t10
    };
    $[21] = t10;
    $[22] = t9;
    $[23] = t11;
  } else t11 = $[23];
  const {
    scrubRef,
    isScrubbing
  } = useInspectorScrub(t7, t8, t11);
  const numericLooking = !showMixed && local !== "" && /^-?[\d.]+$/.test(local);
  const display = focused ? local : numericLooking ? `${local}°` : showMixed ? "" : local;
  let t12;
  if ($[24] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = <RotationIcon className="size-3.75" />;
    $[24] = t12;
  } else t12 = $[24];
  let t13;
  if ($[25] !== scrubRef) {
    t13 = <InspectorScrubHandle ref={scrubRef}>{t12}</InspectorScrubHandle>;
    $[25] = scrubRef;
    $[26] = t13;
  } else t13 = $[26];
  let t14;
  let t15;
  if ($[27] === Symbol.for("react.memo_cache_sentinel")) {
    t14 = () => setFocused(true);
    t15 = e_1 => {
      const stripped = e_1.target.value.replace(/°/g, "");
      setLocal(stripped);
      setShowMixed(false);
    };
    $[27] = t14;
    $[28] = t15;
  } else {
    t14 = $[27];
    t15 = $[28];
  }
  let t16;
  if ($[29] !== save) {
    t16 = () => {
      setFocused(false);
      save();
    };
    $[29] = save;
    $[30] = t16;
  } else t16 = $[30];
  const t17 = showMixed ? "-" : "0°";
  let t18;
  if ($[31] !== display || $[32] !== t16 || $[33] !== t17) {
    t18 = <InspectorControlInput tooltip="Rotation" value={display} onFocus={t14} onChange={t15} onBlur={t16} onKeyDown={blurInspectorInputOnEnter} placeholder={t17} className="px-1 placeholder:text-ed-muted-foreground/50" />;
    $[31] = display;
    $[32] = t16;
    $[33] = t17;
    $[34] = t18;
  } else t18 = $[34];
  let t19;
  if ($[35] !== isScrubbing || $[36] !== t13 || $[37] !== t18) {
    t19 = <InspectorControlShell active={isScrubbing} className="min-w-0 flex-1">{t13}{t18}</InspectorControlShell>;
    $[35] = isScrubbing;
    $[36] = t13;
    $[37] = t18;
    $[38] = t19;
  } else t19 = $[38];
  return t19;
}
function _temp2$34(v) {
  return String(+v.toFixed(2));
}
function PositionOffsetField(t0) {
  const $ = (0, import_compiler_runtime.c)(28);
  const {
    label,
    tooltipLabel,
    icon,
    value,
    onChange,
    isMixed,
    className
  } = t0;
  const [unitMenuOpen, setUnitMenuOpen] = (0, import_react.useState)(false);
  let t1;
  if ($[0] !== isMixed || $[1] !== onChange || $[2] !== value) {
    t1 = {
      value,
      onChange,
      isMixedValue: isMixed,
      allowAuto: true
    };
    $[0] = isMixed;
    $[1] = onChange;
    $[2] = value;
    $[3] = t1;
  } else t1 = $[3];
  const unitValue = useUnitValue(t1);
  const {
    scrubRef,
    isScrubbing
  } = useInspectorScrub(unitValue.scrubValue, unitValue.applyScrub);
  const t2 = isScrubbing || unitMenuOpen;
  const t3 = unitValue.isInvalid || void 0;
  const t4 = icon ?? label;
  let t5;
  if ($[4] !== scrubRef || $[5] !== t4 || $[6] !== tooltipLabel) {
    t5 = <InspectorScrubHandle ref={scrubRef} title={tooltipLabel}>{t4}</InspectorScrubHandle>;
    $[4] = scrubRef;
    $[5] = t4;
    $[6] = tooltipLabel;
    $[7] = t5;
  } else t5 = $[7];
  const t6 = unitValue.showMixed ? "" : unitValue.draft;
  let t7;
  if ($[8] !== unitValue) {
    t7 = event => unitValue.setDraft(event.target.value);
    $[8] = unitValue;
    $[9] = t7;
  } else t7 = $[9];
  const t8 = unitValue.showMixed ? "-" : "Auto";
  const t9 = unitValue.isInvalid || void 0;
  const t10 = unitValue.errorMessage ?? tooltipLabel;
  let t11;
  if ($[10] !== t10 || $[11] !== t6 || $[12] !== t7 || $[13] !== t8 || $[14] !== t9 || $[15] !== unitValue.commit) {
    t11 = <InspectorControlInput value={t6} onChange={t7} onBlur={unitValue.commit} onKeyDown={blurInspectorInputOnEnter} placeholder={t8} aria-invalid={t9} tooltip={t10} className="px-1 placeholder:text-ed-muted-foreground/50" />;
    $[10] = t10;
    $[11] = t6;
    $[12] = t7;
    $[13] = t8;
    $[14] = t9;
    $[15] = unitValue.commit;
    $[16] = t11;
  } else t11 = $[16];
  const t12 = `${label} offset`;
  let t13;
  if ($[17] !== t12 || $[18] !== unitValue.selectUnit || $[19] !== unitValue.selectedUnit) {
    t13 = <UnitMenu value={unitValue.selectedUnit} onValueChange={unitValue.selectUnit} label={t12} onOpenChange={setUnitMenuOpen} allowAuto={true} />;
    $[17] = t12;
    $[18] = unitValue.selectUnit;
    $[19] = unitValue.selectedUnit;
    $[20] = t13;
  } else t13 = $[20];
  let t14;
  if ($[21] !== className || $[22] !== t11 || $[23] !== t13 || $[24] !== t2 || $[25] !== t3 || $[26] !== t5) {
    t14 = <InspectorControlShell active={t2} aria-invalid={t3} className={className}>{t5}{t11}{t13}</InspectorControlShell>;
    $[21] = className;
    $[22] = t11;
    $[23] = t13;
    $[24] = t2;
    $[25] = t3;
    $[26] = t5;
    $[27] = t14;
  } else t14 = $[27];
  return t14;
}

export { PositionAlignmentControls, PositionConstraintsControl, PositionOffsetField, PositionPinningIcon, RotationField };
