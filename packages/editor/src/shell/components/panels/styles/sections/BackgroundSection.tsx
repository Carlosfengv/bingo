/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/sections/BackgroundSection.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useClassesForProperty } from "../../../../hooks/useClassSuggestions";
import { isEmptyImage, parseFills, serializeFills } from "../../../../utils/backgroundFills";
import { isTransparentColor } from "../../../../utils/fillValue";
import { useStyleOps } from "../StyleOpsContext";
import { ClassPickerContent } from "../inputs/ClassPickerContent";
import { ColorRow } from "../inputs/ColorRow";
import { IconBtn, InspectorControlAction, InspectorControlShell, InspectorDraggableRow } from "../primitives";
import { InspectorSection } from "./InspectorSection";
import { AddVariableIcon, CaretDownIcon, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, MinusIcon, PlusIcon, Popover, PopoverAnchor, PopoverContent, PopoverTrigger, Text$4, UnlinkIcon } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Background section — a Figma-style ordered list of fills. Each row is one fill
* (solid / gradient / image); the list serializes to layered CSS via
* {@link serializeFills}. Fills of any kind can repeat and stack (top row = top
* layer, drag the grip to reorder), each with a per-fill opacity and, when
* stacking, a blend mode. The bottom-most solid is the base color and may be
* linked to a Tailwind `bg-*` token (the variable button). The shared
* InspectorSection owns the empty/addable state; each fill row removes itself.
*
* The list is held in local state (stable ids for keys + reorder) and resynced
* from CSS when it changes underneath us (element switch, undo); every edit
* writes back.
*/
var KIND_LABEL = {
  solid: "Color",
  gradient: "Gradient",
  image: "Image"
};
var BLEND_MODES = ["normal", "multiply", "screen", "overlay", "darken", "lighten", "difference", "exclusion"];
var STYLE_KEYS = ["backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat", "backgroundBlendMode", "background"];
var equalStyle = (a, b) => STYLE_KEYS.every(k => (a[k] ?? "") === (b[k] ?? ""));
function BackgroundSection() {
  const $ = (0, import_compiler_runtime.c)(85);
  const ops = useStyleOps();
  const {
    setMultiple,
    removeClassesByCategory,
    addClassForProperty
  } = ops;
  const bgSuggestions = useClassesForProperty("backgroundColor");
  let t0;
  if ($[0] !== ops) {
    t0 = () => ({
      backgroundColor: ops.getExplicit("backgroundColor") || void 0,
      backgroundImage: ops.getExplicit("backgroundImage") || void 0,
      background: ops.getExplicit("background") || void 0,
      backgroundSize: ops.getExplicit("backgroundSize") || void 0,
      backgroundPosition: ops.getExplicit("backgroundPosition") || void 0,
      backgroundRepeat: ops.getExplicit("backgroundRepeat") || void 0,
      backgroundBlendMode: ops.getExplicit("backgroundBlendMode") || void 0
    });
    $[0] = ops;
    $[1] = t0;
  } else t0 = $[1];
  const readCss = t0;
  let t1;
  if ($[2] !== ops || $[3] !== readCss) {
    t1 = () => {
      const css = readCss();
      const src = ops.sourceProps("backgroundColor");
      const token = src?.source === "class" ? src.sourceClass : void 0;
      if (token) css.backgroundColor = void 0;
      const parsed = parseFills(css);
      if (token) parsed.push({
        kind: "solid",
        value: ops.get("backgroundColor") || "",
        token
      });
      return parsed;
    };
    $[2] = ops;
    $[3] = readCss;
    $[4] = t1;
  } else t1 = $[4];
  const buildFills = t1;
  let t2;
  if ($[5] !== buildFills) {
    t2 = () => buildFills().map(_temp$40);
    $[5] = buildFills;
    $[6] = t2;
  } else t2 = $[6];
  const [fills, setFills] = (0, import_react.useState)(t2);
  const [openId, setOpenId] = (0, import_react.useState)(null);
  const [openForElement, setOpenForElement] = (0, import_react.useState)(ops.selectedElementId);
  if (openForElement !== ops.selectedElementId) {
    setOpenForElement(ops.selectedElementId);
    setOpenId(null);
  }
  const [dragId, setDragId] = (0, import_react.useState)(null);
  const dragStartOrder = (0, import_react.useRef)(null);
  const [showLibrary, setShowLibrary] = (0, import_react.useState)(false);
  const cssFills = buildFills();
  const cssStyle = serializeFills(cssFills);
  const cssToken = cssFills[cssFills.length - 1]?.token ?? "";
  const localToken = fills[fills.length - 1]?.token ?? "";
  if (dragId === null && (!equalStyle(cssStyle, serializeFills(fills)) || cssToken !== localToken)) setFills(buildFills().map(_temp2$30));
  let t3;
  if ($[7] !== addClassForProperty || $[8] !== ops.elementClassName || $[9] !== removeClassesByCategory || $[10] !== setMultiple) {
    t3 = next => {
      setFills(next);
      setMultiple(serializeFills(next));
      const real = next.filter(_temp3$19);
      const base = real[real.length - 1];
      const token_0 = base?.kind === "solid" ? base.token : void 0;
      const classes = ops.elementClassName.split(/\s+/).filter(Boolean);
      if (token_0) {
        if (!classes.includes(token_0)) addClassForProperty(token_0, "backgroundColor");
      } else if (classes.some(_temp4$16)) removeClassesByCategory("background");
    };
    $[7] = addClassForProperty;
    $[8] = ops.elementClassName;
    $[9] = removeClassesByCategory;
    $[10] = setMultiple;
    $[11] = t3;
  } else t3 = $[11];
  const write = t3;
  let t4;
  if ($[12] !== fills || $[13] !== write) {
    t4 = (id, changes) => write(fills.map(f_2 => f_2.id === id ? {
      ...f_2,
      ...changes
    } : f_2));
    $[12] = fills;
    $[13] = write;
    $[14] = t4;
  } else t4 = $[14];
  const patch = t4;
  let t5;
  if ($[15] !== fills || $[16] !== ops.computed.backgroundColor || $[17] !== write) {
    t5 = () => {
      const computed = ops.computed.backgroundColor ?? "";
      const seed = !isTransparentColor(computed) && computed ? computed : "#FFFFFF";
      const nf = {
        id: Math.max(0, ...fills.map(_temp5$13)) + 1,
        kind: "solid",
        value: seed
      };
      write([...fills, nf]);
      setOpenId(nf.id);
    };
    $[15] = fills;
    $[16] = ops.computed.backgroundColor;
    $[17] = write;
    $[18] = t5;
  } else t5 = $[18];
  const addFill = t5;
  let t6;
  if ($[19] !== fills || $[20] !== write) {
    t6 = (id_0, value, kind) => {
      write(fills.map(f_4 => f_4.id !== id_0 ? f_4 : kind !== f_4.kind ? {
        id: id_0,
        kind,
        value,
        blend: f_4.blend
      } : {
        ...f_4,
        value,
        token: void 0
      }));
    };
    $[19] = fills;
    $[20] = write;
    $[21] = t6;
  } else t6 = $[21];
  const changeFill = t6;
  let t7;
  if ($[22] !== fills || $[23] !== write) {
    t7 = id_1 => write(fills.filter(f_5 => f_5.id !== id_1));
    $[22] = fills;
    $[23] = write;
    $[24] = t7;
  } else t7 = $[24];
  const removeFill = t7;
  let t8;
  if ($[25] !== fills) {
    t8 = (e, id_2) => {
      e.stopPropagation();
      dragStartOrder.current = fills.map(_temp6$11);
      setDragId(id_2);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(id_2));
    };
    $[25] = fills;
    $[26] = t8;
  } else t8 = $[26];
  const handleDragStart = t8;
  let t9;
  if ($[27] !== dragId) {
    t9 = (e_0, targetId) => {
      e_0.preventDefault();
      if (dragId === null || dragId === targetId) return;
      const rect = e_0.currentTarget.getBoundingClientRect();
      const after = e_0.clientY > rect.top + rect.height / 2;
      setFills(prev => {
        const from = prev.findIndex(f_7 => f_7.id === dragId);
        const t = prev.findIndex(f_8 => f_8.id === targetId);
        if (from < 0 || t < 0) return prev;
        let to = after ? t + 1 : t;
        if (from < to) to = to - 1;
        if (to === from) return prev;
        const next_0 = [...prev];
        const [moved] = next_0.splice(from, 1);
        next_0.splice(to, 0, moved);
        return next_0;
      });
    };
    $[27] = dragId;
    $[28] = t9;
  } else t9 = $[28];
  const handleDragOver = t9;
  let t10;
  if ($[29] !== fills || $[30] !== write) {
    t10 = () => {
      const start = dragStartOrder.current;
      dragStartOrder.current = null;
      setDragId(null);
      if (start && fills.some((f_9, i_1) => f_9.id !== start[i_1])) write(fills);
    };
    $[29] = fills;
    $[30] = write;
    $[31] = t10;
  } else t10 = $[31];
  const commitDrag = t10;
  let t11;
  if ($[32] !== fills || $[33] !== ops || $[34] !== patch || $[35] !== write) {
    t11 = cls => {
      const real_0 = fills.filter(_temp7$7);
      const base_0 = real_0[real_0.length - 1];
      if (base_0?.kind === "solid") patch(base_0.id, {
        token: cls
      });else write([...fills, {
        id: Math.max(0, ...fills.map(_temp8$5)) + 1,
        kind: "solid",
        value: ops.get("backgroundColor") || "",
        token: cls
      }]);
      setShowLibrary(false);
    };
    $[32] = fills;
    $[33] = ops;
    $[34] = patch;
    $[35] = write;
    $[36] = t11;
  } else t11 = $[36];
  const linkToken = t11;
  let t12;
  if ($[37] !== ops || $[38] !== patch) {
    t12 = id_3 => patch(id_3, {
      token: void 0,
      value: ops.get("backgroundColor") || "#000000"
    });
    $[37] = ops;
    $[38] = patch;
    $[39] = t12;
  } else t12 = $[39];
  const unlinkToken = t12;
  let t13;
  if ($[40] !== bgSuggestions || $[41] !== fills || $[42] !== write) {
    t13 = (id_4, isBase, cls_0) => {
      const s = bgSuggestions.find(x => x.className === cls_0);
      write(fills.map(f_12 => f_12.id !== id_4 ? f_12 : isBase ? {
        id: id_4,
        kind: "solid",
        value: s?.value ?? "",
        token: cls_0,
        blend: f_12.blend
      } : {
        id: id_4,
        kind: "solid",
        value: s?.rawValue ?? s?.value ?? cls_0,
        blend: f_12.blend
      }));
    };
    $[40] = bgSuggestions;
    $[41] = fills;
    $[42] = write;
    $[43] = t13;
  } else t13 = $[43];
  const applyLibraryColor = t13;
  const stacked = fills.length > 1;
  let t14;
  if ($[44] !== fills) {
    t14 = fills.filter(_temp9$5);
    $[44] = fills;
    $[45] = t14;
  } else t14 = $[45];
  const renderedFills = t14;
  const bottomFill = renderedFills[renderedFills.length - 1];
  const backgroundColorFillId = bottomFill?.kind === "solid" ? bottomFill.id : null;
  const t15 = fills.length > 0;
  let t16;
  if ($[46] !== write) {
    t16 = () => write([]);
    $[46] = write;
    $[47] = t16;
  } else t16 = $[47];
  let t17;
  if ($[48] === Symbol.for("react.memo_cache_sentinel")) {
    t17 = <PopoverTrigger asChild={true}>{<IconBtn label="Link a color token">{<AddVariableIcon />}</IconBtn>}</PopoverTrigger>;
    $[48] = t17;
  } else t17 = $[48];
  let t18;
  if ($[49] === Symbol.for("react.memo_cache_sentinel")) {
    t18 = () => setShowLibrary(false);
    $[49] = t18;
  } else t18 = $[49];
  let t19;
  if ($[50] !== bgSuggestions || $[51] !== linkToken) {
    t19 = <PopoverContent align="end" className="w-64 p-0" onOpenAutoFocus={_temp0$4}>{<ClassPickerContent suggestions={bgSuggestions} cssProperty="backgroundColor" onSelect={linkToken} onClose={t18} />}</PopoverContent>;
    $[50] = bgSuggestions;
    $[51] = linkToken;
    $[52] = t19;
  } else t19 = $[52];
  let t20;
  if ($[53] !== showLibrary || $[54] !== t19) {
    t20 = <Popover open={showLibrary} onOpenChange={setShowLibrary} modal={false}>{t17}{t19}</Popover>;
    $[53] = showLibrary;
    $[54] = t19;
    $[55] = t20;
  } else t20 = $[55];
  let t21;
  if ($[56] === Symbol.for("react.memo_cache_sentinel")) {
    t21 = <PlusIcon />;
    $[56] = t21;
  } else t21 = $[56];
  let t22;
  if ($[57] !== addFill) {
    t22 = <IconBtn label="Add fill" onClick={addFill}>{t21}</IconBtn>;
    $[57] = addFill;
    $[58] = t22;
  } else t22 = $[58];
  let t23;
  if ($[59] !== t20 || $[60] !== t22) {
    t23 = <div className="flex items-center gap-1.5">{t20}{t22}</div>;
    $[59] = t20;
    $[60] = t22;
    $[61] = t23;
  } else t23 = $[61];
  let t24;
  if ($[62] !== applyLibraryColor || $[63] !== backgroundColorFillId || $[64] !== changeFill || $[65] !== commitDrag || $[66] !== dragId || $[67] !== fills || $[68] !== handleDragOver || $[69] !== handleDragStart || $[70] !== openId || $[71] !== ops.computed.backgroundColor || $[72] !== patch || $[73] !== removeFill || $[74] !== stacked || $[75] !== unlinkToken) {
    t24 = fills.length > 0 ? <div className="space-y-2">{fills.map((f_13, i_2) => {
        const isBase_0 = i_2 === fills.length - 1;
        return <InspectorDraggableRow key={f_13.id} dragging={dragId === f_13.id} reorderable={stacked} action={<RemoveButton onClick={() => removeFill(f_13.id)} />} contentClassName="flex items-center gap-1" onDragOver={e_2 => handleDragOver(e_2, f_13.id)} onDrop={e_3 => {
          e_3.preventDefault();
          commitDrag();
        }} onDragHandleStart={e_4 => handleDragStart(e_4, f_13.id)} onDragHandleEnd={commitDrag}>{<div className="flex-1 min-w-0">{<ColorRow label={KIND_LABEL[f_13.kind]} hideLabel={true} showTooltip={false} value={f_13.token ? ops.computed.backgroundColor || f_13.value || "#000000" : f_13.value} source={f_13.token ? "class" : void 0} sourceClass={f_13.token} onClearOverride={f_13.token ? () => unlinkToken(f_13.id) : void 0} cssProperty="backgroundColor" allowedFillKinds={["solid", "gradient", "image"]} onSelectClass={cls_1 => applyLibraryColor(f_13.id, isBase_0, cls_1)} defaultPickerTab="custom" onChange={v => changeFill(f_13.id, v, f_13.kind)} onChangeFill={(v_0, k) => changeFill(f_13.id, v_0, k)} imageConfig={{
              size: f_13.size,
              position: f_13.position,
              repeat: f_13.repeat
            }} onChangeImageConfig={p => patch(f_13.id, p)} endAddon={stacked && f_13.id !== backgroundColorFillId ? <BlendDropdown value={f_13.blend ?? "normal"} onChange={v_1 => patch(f_13.id, {
              blend: v_1 === "normal" ? void 0 : v_1
            })} /> : void 0} open={openId === f_13.id} onOpenChange={o => setOpenId(o ? f_13.id : null)} />}</div>}</InspectorDraggableRow>;
      })}</div> : null;
    $[62] = applyLibraryColor;
    $[63] = backgroundColorFillId;
    $[64] = changeFill;
    $[65] = commitDrag;
    $[66] = dragId;
    $[67] = fills;
    $[68] = handleDragOver;
    $[69] = handleDragStart;
    $[70] = openId;
    $[71] = ops.computed.backgroundColor;
    $[72] = patch;
    $[73] = removeFill;
    $[74] = stacked;
    $[75] = unlinkToken;
    $[76] = t24;
  } else t24 = $[76];
  let t25;
  if ($[77] !== addFill || $[78] !== bgSuggestions || $[79] !== linkToken || $[80] !== t15 || $[81] !== t16 || $[82] !== t23 || $[83] !== t24) {
    t25 = <InspectorSection reserveActionRail={true} variant="addable" title="Background" isSet={t15} onAdd={addFill} onRemove={t16} classSuggestions={bgSuggestions} cssProperty="backgroundColor" onSelectClass={linkToken} action={t23}>{t24}</InspectorSection>;
    $[77] = addFill;
    $[78] = bgSuggestions;
    $[79] = linkToken;
    $[80] = t15;
    $[81] = t16;
    $[82] = t23;
    $[83] = t24;
    $[84] = t25;
  } else t25 = $[84];
  return t25;
}
/** The Tailwind-class row: a bordered card with the resolved-color swatch, the
*  class name, and an unlink icon. Clicking the card re-picks the class. */
function _temp0$4(e_1) {
  return e_1.preventDefault();
}
function _temp9$5(fill) {
  return !isEmptyImage(fill);
}
function _temp8$5(f_11) {
  return f_11.id;
}
function _temp7$7(f_10) {
  return !isEmptyImage(f_10);
}
function _temp6$11(f_6) {
  return f_6.id;
}
function _temp5$13(f_3) {
  return f_3.id;
}
function _temp4$16(c) {
  return c.startsWith("bg-");
}
function _temp3$19(f_1) {
  return !isEmptyImage(f_1);
}
function _temp2$30(f_0, i_0) {
  return {
    ...f_0,
    id: i_0 + 1
  };
}
function _temp$40(f, i) {
  return {
    ...f,
    id: i + 1
  };
}
function TokenRow(t0) {
  const $ = (0, import_compiler_runtime.c)(25);
  const {
    token,
    color,
    suggestions,
    open,
    onOpenChange,
    onPick,
    onUnlink
  } = t0;
  let t1;
  if ($[0] !== color) {
    t1 = <span className="size-4 shrink-0 rounded-xs border border-ed-border" style={{
      backgroundColor: color
    }} />;
    $[0] = color;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== token) {
    t2 = <Text$4 size="3xs" weight="medium" variant="primary" className="flex-1 truncate text-left">{token}</Text$4>;
    $[2] = token;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== t1 || $[5] !== t2) {
    t3 = <PopoverTrigger asChild={true}>{<InspectorControlAction className="min-w-0 flex-1 justify-start gap-2 px-1.5">{t1}{t2}</InspectorControlAction>}</PopoverTrigger>;
    $[4] = t1;
    $[5] = t2;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = <UnlinkIcon />;
    $[7] = t4;
  } else t4 = $[7];
  let t5;
  if ($[8] !== onUnlink) {
    t5 = <InspectorControlAction aria-label="Unlink class" title="Unlink class" onClick={onUnlink}>{t4}</InspectorControlAction>;
    $[8] = onUnlink;
    $[9] = t5;
  } else t5 = $[9];
  let t6;
  if ($[10] !== open || $[11] !== t3 || $[12] !== t5) {
    t6 = <PopoverAnchor asChild={true}>{<InspectorControlShell active={open}>{t3}{t5}</InspectorControlShell>}</PopoverAnchor>;
    $[10] = open;
    $[11] = t3;
    $[12] = t5;
    $[13] = t6;
  } else t6 = $[13];
  let t7;
  if ($[14] !== onOpenChange) {
    t7 = () => onOpenChange(false);
    $[14] = onOpenChange;
    $[15] = t7;
  } else t7 = $[15];
  let t8;
  if ($[16] !== onPick || $[17] !== suggestions || $[18] !== t7) {
    t8 = <PopoverContent align="end" className="w-64 p-0" onOpenAutoFocus={_temp1$4}>{<ClassPickerContent suggestions={suggestions} cssProperty="backgroundColor" onSelect={onPick} onClose={t7} />}</PopoverContent>;
    $[16] = onPick;
    $[17] = suggestions;
    $[18] = t7;
    $[19] = t8;
  } else t8 = $[19];
  let t9;
  if ($[20] !== onOpenChange || $[21] !== open || $[22] !== t6 || $[23] !== t8) {
    t9 = <Popover open={open} onOpenChange={onOpenChange} modal={false}>{t6}{t8}</Popover>;
    $[20] = onOpenChange;
    $[21] = open;
    $[22] = t6;
    $[23] = t8;
    $[24] = t9;
  } else t9 = $[24];
  return t9;
}
function _temp1$4(e) {
  return e.preventDefault();
}
function BlendDropdown(t0) {
  const $ = (0, import_compiler_runtime.c)(12);
  const { t } = useTranslation("editor");
  const {
    value,
    onChange
  } = t0;
  const t1 = t(`styles.${value}`);
  let t2;
  if (true) {
    t2 = <span className="truncate">{t1}</span>;
    $[0] = t1;
    $[1] = t2;
  } else t2 = $[1];
  let t3;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = <CaretDownIcon className="size-3 shrink-0" />;
    $[2] = t3;
  } else t3 = $[2];
  let t4;
  if ($[3] !== t2) {
    t4 = <DropdownMenuTrigger asChild={true}>{<InspectorControlAction aria-label="Blend mode" className="w-[88px] justify-between gap-1 px-2 capitalize">{t2}{t3}</InspectorControlAction>}</DropdownMenuTrigger>;
    $[3] = t2;
    $[4] = t4;
  } else t4 = $[4];
  let t5;
  if (true) {
    t5 = BLEND_MODES.map(m => <DropdownMenuItem key={m} onSelect={() => onChange(m)} className="text-[12px] capitalize">{t(`styles.${m}`)}</DropdownMenuItem>);
    $[5] = onChange;
    $[6] = t5;
  } else t5 = $[6];
  let t6;
  if ($[7] !== t5) {
    t6 = <DropdownMenuContent align="end" className="min-w-[120px]">{t5}</DropdownMenuContent>;
    $[7] = t5;
    $[8] = t6;
  } else t6 = $[8];
  let t7;
  if ($[9] !== t4 || $[10] !== t6) {
    t7 = <DropdownMenu>{t4}{t6}</DropdownMenu>;
    $[9] = t4;
    $[10] = t6;
    $[11] = t7;
  } else t7 = $[11];
  return t7;
}
function RemoveButton(t0) {
  const $ = (0, import_compiler_runtime.c)(3);
  const {
    onClick
  } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <MinusIcon />;
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== onClick) {
    t2 = <IconBtn label="Remove fill" onClick={onClick}>{t1}</IconBtn>;
    $[1] = onClick;
    $[2] = t2;
  } else t2 = $[2];
  return t2;
}

export { BackgroundSection, TokenRow };
