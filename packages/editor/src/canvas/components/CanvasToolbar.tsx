/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/CanvasToolbar.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useActiveTool } from "../../shared/contexts/ActiveToolContext";
import { useEditorMode } from "../../shared/contexts/EditorModeContext";
import { SplitButton } from "./SplitButton";
import { ArrowsOutIcon, BrowserIcon, Button, ChatIcon, CodeIcon, CursorIcon, DeviceMobileIcon, DeviceTabletIcon, DisplayFlexColumnIcon, DisplayFlexRowIcon, DisplayGridIcon, FrameIcon, HandIcon, ScaleIcon, TextTIcon, Tooltip, TooltipContent, TooltipTrigger } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var TOOLBAR_ICON_STROKE_WIDTH = .8;
var SHOW_COMPONENTS = false;
var SHOW_LIVE_PREVIEW = false;
var LAST_INSERT_KEY = "bingo-last-insert-tool";
/** Single source of truth for the Insert dropdown. `frame` stays first so it is
*  the fallback when nothing has been used yet. */
var INSERT_OPTIONS = [{
  tool: "frame",
  icon: FrameIcon,
  labelKey: "frame",
  shortcut: "F"
}, {
  tool: "stack-h",
  icon: DisplayFlexRowIcon,
  labelKey: "horizontalStack",
  shortcut: "S"
}, {
  tool: "stack-v",
  icon: DisplayFlexColumnIcon,
  labelKey: "verticalStack",
  shortcut: "S"
}, {
  tool: "grid",
  icon: DisplayGridIcon,
  labelKey: "grid",
  shortcut: "⇧G"
}, ...[]];
/** A plain 36px icon button with a tooltip. */
function ToolButton(t0) {
  const $ = (0, import_compiler_runtime.c)(14);
  const {
    icon: Icon,
    label,
    active: t1,
    onClick
  } = t0;
  const active = t1 === void 0 ? false : t1;
  const t2 = active ? "toolbarSelected" : "ghost";
  let t3;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = {
      borderRadius: 8
    };
    $[0] = t3;
  } else t3 = $[0];
  const t4 = active ? "size-[22px]" : "size-[22px] text-ed-muted-foreground";
  let t5;
  if ($[1] !== Icon || $[2] !== t4) {
    t5 = <Icon strokeWidth={TOOLBAR_ICON_STROKE_WIDTH} className={t4} />;
    $[1] = Icon;
    $[2] = t4;
    $[3] = t5;
  } else t5 = $[3];
  let t6;
  if ($[4] !== label || $[5] !== onClick || $[6] !== t2 || $[7] !== t5) {
    t6 = <TooltipTrigger asChild={true}>{<Button size="icon" variant={t2} isChildText={false} aria-label={label} onClick={onClick} style={t3}>{t5}</Button>}</TooltipTrigger>;
    $[4] = label;
    $[5] = onClick;
    $[6] = t2;
    $[7] = t5;
    $[8] = t6;
  } else t6 = $[8];
  let t7;
  if ($[9] !== label) {
    t7 = <TooltipContent side="top">{label}</TooltipContent>;
    $[9] = label;
    $[10] = t7;
  } else t7 = $[10];
  let t8;
  if ($[11] !== t6 || $[12] !== t7) {
    t8 = <Tooltip>{t6}{t7}</Tooltip>;
    $[11] = t6;
    $[12] = t7;
    $[13] = t8;
  } else t8 = $[13];
  return t8;
}
function CanvasToolbarImpl(t0) {
  const $ = (0, import_compiler_runtime.c)(105);
  const {
    showCommentTools: t1,
    commentMode: t2,
    onToggleCommentMode,
    showResolvedComments: t3,
    onShowResolvedChange,
    onPickPreviewPreset,
    onOpenMoreHtml
  } = t0;
  const showCommentTools = t1 === void 0 ? false : t1;
  const commentMode = t2 === void 0 ? false : t2;
  const showResolvedComments = t3 === void 0 ? false : t3;
  const { t } = useTranslation("editor");
  const insertOptions = INSERT_OPTIONS.map(option => ({ ...option, label: t(`canvas.${option.labelKey}`) }));
  const {
    activeTool,
    setActiveTool
  } = useActiveTool();
  const {
    mode,
    setMode
  } = useEditorMode();
  const [openMenu, setOpenMenu] = (0, import_react.useState)(null);
  const [lastInsertTool, setLastInsertTool] = (0, import_react.useState)(_temp$60);
  let t4;
  if ($[0] !== openMenu) {
    t4 = id => ({
      open: openMenu === id,
      onOpenChange: o => setOpenMenu(prev => o ? id : prev === id ? null : prev),
      modal: false
    });
    $[0] = openMenu;
    $[1] = t4;
  } else t4 = $[1];
  const menuProps = t4;
  let t5;
  if ($[2] !== setActiveTool) {
    t5 = tool => setActiveTool(tool);
    $[2] = setActiveTool;
    $[3] = t5;
  } else t5 = $[3];
  const arm = t5;
  let t6;
  if ($[4] !== activeTool) {
    t6 = insertOptions.find(o_0 => o_0.tool === activeTool);
    $[4] = activeTool;
    $[5] = t6;
  } else t6 = $[5];
  const activeOption = t6;
  const isInsertActive = !!activeOption;
  let t7;
  if ($[6] !== activeOption || $[7] !== lastInsertTool) {
    t7 = activeOption ?? insertOptions.find(o_1 => o_1.tool === lastInsertTool) ?? insertOptions[0];
    $[6] = activeOption;
    $[7] = lastInsertTool;
    $[8] = t7;
  } else t7 = $[8];
  const insertOption = t7;
  const InsertIcon = insertOption.icon;
  if (activeOption && activeOption.tool !== lastInsertTool) setLastInsertTool(activeOption.tool);
  let t8;
  let t9;
  if ($[9] !== lastInsertTool) {
    t8 = () => {
      try {
        localStorage.setItem(LAST_INSERT_KEY, lastInsertTool);
      } catch {}
    };
    t9 = [lastInsertTool];
    $[9] = lastInsertTool;
    $[10] = t8;
    $[11] = t9;
  } else {
    t8 = $[10];
    t9 = $[11];
  }
  (0, import_react.useEffect)(t8, t9);
  let t10;
  if ($[12] !== arm) {
    t10 = {
      icon: CursorIcon,
      label: t("canvas.move"),
      shortcut: "V",
      onSelect: () => arm("move")
    };
    $[12] = arm;
    $[13] = t10;
  } else t10 = $[13];
  let t11;
  if ($[14] !== arm) {
    t11 = {
      icon: ScaleIcon,
      label: t("canvas.scale"),
      shortcut: "K",
      onSelect: () => arm("scale")
    };
    $[14] = arm;
    $[15] = t11;
  } else t11 = $[15];
  let t12;
  if ($[16] !== arm) {
    t12 = {
      icon: HandIcon,
      label: t("canvas.pan"),
      shortcut: "H",
      onSelect: () => arm("pan")
    };
    $[16] = arm;
    $[17] = t12;
  } else t12 = $[17];
  let t13;
  if ($[18] !== t10 || $[19] !== t11 || $[20] !== t12) {
    t13 = [t10, t11, t12];
    $[18] = t10;
    $[19] = t11;
    $[20] = t12;
    $[21] = t13;
  } else t13 = $[21];
  const moveItems = t13;
  let t14;
  if ($[22] !== arm || $[23] !== onOpenMoreHtml) {
    let t15;
    if ($[25] !== arm) {
      t15 = o_2 => ({
        icon: o_2.icon,
        label: o_2.label,
        shortcut: o_2.shortcut,
        separatorBefore: o_2.separatorBefore,
        onSelect: () => arm(o_2.tool)
      });
      $[25] = arm;
      $[26] = t15;
    } else t15 = $[26];
    let t16;
    if ($[27] !== onOpenMoreHtml) {
      t16 = {
        icon: CodeIcon,
        label: t("canvas.moreHtml"),
        shortcut: "⌘K",
        onSelect: () => onOpenMoreHtml?.(),
        separatorBefore: true
      };
      $[27] = onOpenMoreHtml;
      $[28] = t16;
    } else t16 = $[28];
    t14 = [...insertOptions.map(t15), t16];
    $[22] = arm;
    $[23] = onOpenMoreHtml;
    $[24] = t14;
  } else t14 = $[24];
  const insertItems = t14;
  let t15;
  if ($[29] !== onPickPreviewPreset) {
    t15 = {
      icon: BrowserIcon,
      label: t("canvas.browser"),
      shortcut: "⇧P",
      onSelect: () => onPickPreviewPreset?.("browser")
    };
    $[29] = onPickPreviewPreset;
    $[30] = t15;
  } else t15 = $[30];
  let t16;
  if ($[31] !== onPickPreviewPreset) {
    t16 = {
      icon: DeviceMobileIcon,
      label: t("canvas.mobile"),
      onSelect: () => onPickPreviewPreset?.("mobile")
    };
    $[31] = onPickPreviewPreset;
    $[32] = t16;
  } else t16 = $[32];
  let t17;
  if ($[33] !== onPickPreviewPreset) {
    t17 = {
      icon: DeviceTabletIcon,
      label: t("canvas.tablet"),
      onSelect: () => onPickPreviewPreset?.("tablet")
    };
    $[33] = onPickPreviewPreset;
    $[34] = t17;
  } else t17 = $[34];
  let t18;
  if ($[35] !== onPickPreviewPreset) {
    t18 = {
      icon: ArrowsOutIcon,
      label: t("canvas.responsive"),
      onSelect: () => onPickPreviewPreset?.("responsive"),
      separatorBefore: true
    };
    $[35] = onPickPreviewPreset;
    $[36] = t18;
  } else t18 = $[36];
  let t19;
  if ($[37] !== t15 || $[38] !== t16 || $[39] !== t17 || $[40] !== t18) {
    t19 = [t15, t16, t17, t18];
    $[37] = t15;
    $[38] = t16;
    $[39] = t17;
    $[40] = t18;
    $[41] = t19;
  } else t19 = $[41];
  const previewItems = t19;
  const moveOrPanActive = activeTool === "move" || activeTool === "pan" || activeTool === "scale";
  const MoveIcon = activeTool === "pan" ? HandIcon : activeTool === "scale" ? ScaleIcon : CursorIcon;
  let t20;
  if ($[42] === Symbol.for("react.memo_cache_sentinel")) {
    t20 = {
      gap: 6,
      height: 52,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 6,
      paddingRight: 6,
      borderRadius: 12
    };
    $[42] = t20;
  } else t20 = $[42];
  let t21;
  if ($[43] !== menuProps) {
    t21 = menuProps("move");
    $[43] = menuProps;
    $[44] = t21;
  } else t21 = $[44];
  const t22 = moveOrPanActive ? "size-[22px]" : "size-[22px] text-ed-muted-foreground";
  let t23;
  if ($[45] !== MoveIcon || $[46] !== t22) {
    t23 = <MoveIcon strokeWidth={TOOLBAR_ICON_STROKE_WIDTH} className={t22} />;
    $[45] = MoveIcon;
    $[46] = t22;
    $[47] = t23;
  } else t23 = $[47];
  const t24 = activeTool === "scale" ? `${t("canvas.scale")} (K)` : t("canvas.moveOrPan");
  const t25 = moveOrPanActive ? "toolbarSelected" : "ghost";
  let t26;
  if ($[48] !== activeTool || $[49] !== arm) {
    t26 = () => arm(activeTool === "pan" ? "pan" : activeTool === "scale" ? "scale" : "move");
    $[48] = activeTool;
    $[49] = arm;
    $[50] = t26;
  } else t26 = $[50];
  let t27;
  if ($[51] !== moveItems || $[52] !== moveOrPanActive || $[53] !== t21 || $[54] !== t23 || $[55] !== t24 || $[56] !== t25 || $[57] !== t26) {
    t27 = <SplitButton menu={t21} primary={t23} primaryLabel={t24} active={moveOrPanActive} primaryVariant={t25} onPrimary={t26} items={moveItems} minWidth="10rem" />;
    $[51] = moveItems;
    $[52] = moveOrPanActive;
    $[53] = t21;
    $[54] = t23;
    $[55] = t24;
    $[56] = t25;
    $[57] = t26;
    $[58] = t27;
  } else t27 = $[58];
  let t28;
  if ($[59] === Symbol.for("react.memo_cache_sentinel")) {
    t28 = {
      display: "flex",
      flexDirection: "row",
      gap: 8
    };
    $[59] = t28;
  } else t28 = $[59];
  let t29;
  if ($[60] !== menuProps) {
    t29 = menuProps("insert");
    $[60] = menuProps;
    $[61] = t29;
  } else t29 = $[61];
  const t30 = isInsertActive ? "size-[22px]" : "size-[22px] text-ed-muted-foreground";
  let t31;
  if ($[62] !== InsertIcon || $[63] !== t30) {
    t31 = <InsertIcon strokeWidth={TOOLBAR_ICON_STROKE_WIDTH} className={t30} />;
    $[62] = InsertIcon;
    $[63] = t30;
    $[64] = t31;
  } else t31 = $[64];
  const t32 = t("canvas.insert", { item: insertOption.label });
  const t33 = isInsertActive ? "toolbarSelected" : "ghost";
  let t34;
  if ($[65] !== arm || $[66] !== insertOption.tool) {
    t34 = () => arm(insertOption.tool);
    $[65] = arm;
    $[66] = insertOption.tool;
    $[67] = t34;
  } else t34 = $[67];
  let t35;
  if ($[68] !== insertItems || $[69] !== isInsertActive || $[70] !== t29 || $[71] !== t31 || $[72] !== t32 || $[73] !== t33 || $[74] !== t34) {
    t35 = <SplitButton menu={t29} primary={t31} primaryLabel={t32} active={isInsertActive} primaryVariant={t33} onPrimary={t34} items={insertItems} minWidth="12rem" />;
    $[68] = insertItems;
    $[69] = isInsertActive;
    $[70] = t29;
    $[71] = t31;
    $[72] = t32;
    $[73] = t33;
    $[74] = t34;
    $[75] = t35;
  } else t35 = $[75];
  const t36 = activeTool === "text";
  let t37;
  if ($[76] !== arm) {
    t37 = () => arm("text");
    $[76] = arm;
    $[77] = t37;
  } else t37 = $[77];
  let t38;
  if ($[78] !== t36 || $[79] !== t37) {
    t38 = <ToolButton icon={TextTIcon} label={t("canvas.text")} active={t36} onClick={t37} />;
    $[78] = t36;
    $[79] = t37;
    $[80] = t38;
  } else t38 = $[80];
  let t39;
  if ($[81] === Symbol.for("react.memo_cache_sentinel")) {
    t39 = SHOW_COMPONENTS;
    $[81] = t39;
  } else t39 = $[81];
  let t40;
  if ($[82] !== t35 || $[83] !== t38) {
    t40 = <div style={t28}>{t35}{t38}{t39}</div>;
    $[82] = t35;
    $[83] = t38;
    $[84] = t40;
  } else t40 = $[84];
  let t41;
  if ($[85] !== commentMode || $[86] !== menuProps || $[87] !== onShowResolvedChange || $[88] !== onToggleCommentMode || $[89] !== previewItems || $[90] !== showCommentTools || $[91] !== showResolvedComments) {
    t41 = showCommentTools && <div style={{
      display: "flex",
      flexDirection: "row",
      gap: 2
    }}>{SHOW_LIVE_PREVIEW}{showCommentTools && <SplitButton menu={menuProps("comment")} primary={<ChatIcon className={commentMode ? "size-[22px]" : "size-[22px] text-ed-muted-foreground"} />} primaryLabel={t("canvas.comment")} active={commentMode} onPrimary={() => onToggleCommentMode?.()} items={[{
        label: t("canvas.commentMode"),
        checked: commentMode,
        onSelect: () => onToggleCommentMode?.()
      }, {
        label: t("canvas.showResolved"),
        checked: showResolvedComments,
        onSelect: () => onShowResolvedChange?.(!showResolvedComments)
      }]} minWidth="11rem" />}</div>;
    $[85] = commentMode;
    $[86] = menuProps;
    $[87] = onShowResolvedChange;
    $[88] = onToggleCommentMode;
    $[89] = previewItems;
    $[90] = showCommentTools;
    $[91] = showResolvedComments;
    $[92] = t41;
  } else t41 = $[92];
  let t42;
  if ($[93] === Symbol.for("react.memo_cache_sentinel")) {
    t42 = {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 6
    };
    $[93] = t42;
  } else t42 = $[93];
  const t43 = mode === "dev";
  let t44;
  if ($[94] !== mode || $[95] !== setMode) {
    t44 = () => setMode(mode === "dev" ? "design" : "dev");
    $[94] = mode;
    $[95] = setMode;
    $[96] = t44;
  } else t44 = $[96];
  let t45;
  if ($[97] !== t43 || $[98] !== t44) {
    t45 = <div style={t42}>{<ToolButton icon={CodeIcon} label={t("canvas.codeWindow")} active={t43} onClick={t44} />}</div>;
    $[97] = t43;
    $[98] = t44;
    $[99] = t45;
  } else t45 = $[99];
  let t46;
  if ($[100] !== t27 || $[101] !== t40 || $[102] !== t41 || $[103] !== t45) {
    t46 = <div className="flex items-center border border-ed-border bg-ed-toolbar shadow-lg pointer-events-auto" style={t20}>{t27}{t40}{t41}{t45}</div>;
    $[100] = t27;
    $[101] = t40;
    $[102] = t41;
    $[103] = t45;
    $[104] = t46;
  } else t46 = $[104];
  return t46;
}
function _temp$60() {
  try {
    const stored = localStorage.getItem(LAST_INSERT_KEY);
    if (stored) return stored;
  } catch {}
  return "frame";
}

function CanvasToolbar(props) {
  const { i18n } = useTranslation("editor");
  return <CanvasToolbarImpl key={i18n.resolvedLanguage} {...props} />;
}

export { CanvasToolbar };
