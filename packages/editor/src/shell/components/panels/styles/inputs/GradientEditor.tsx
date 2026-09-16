/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/GradientEditor.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { alphaPct, buildColor, clamp$1, rgbHex6 } from "../../../../utils/colorMath";
import { IconBtn, InspectorControlInput, InspectorControlShell, blurInspectorInputOnEnter } from "../primitives";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { ActiveClassChip } from "./parts/ActiveClassChip";
import { InspectorDropdown } from "./parts/InspectorDropdown";
import { MinusIcon, PlusIcon, Popover, PopoverTrigger, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Gradient editor for the fill picker: a gradient-type dropdown (Linear /
* Radial / Angular; Diamond is shown but disabled — no CSS equivalent), a
* preview bar with draggable stop handles, and a Stops list where each stop has
* a position (drag the handle), a color swatch, a hex input and an alpha
* percentage. Edits serialize back to a gradient {@link Fill} via onChange.
*/
var GRADIENT_TYPES = [{
  type: "linear",
  label: "Linear"
}, {
  type: "radial",
  label: "Radial"
}, {
  type: "angular",
  label: "Angular"
}];
/** Left→right preview of the stops, regardless of gradient type/angle. */
function barCss(stops) {
  return `linear-gradient(to right, ${stops.slice().sort((a, b) => a.pos - b.pos).map(st => `${st.color} ${Math.round(st.pos)}%`).join(", ")})`;
}
function GradientEditor(t0) {
  const $ = (0, import_compiler_runtime.c)(83);
  const { t } = useTranslation("editor");
  const {
    fill,
    onChange,
    suggestions: t1,
    cssProperty,
    className
  } = t0;
  let t2;
  if ($[0] !== t1) {
    t2 = t1 === void 0 ? [] : t1;
    $[0] = t1;
    $[1] = t2;
  } else t2 = $[1];
  const suggestions = t2;
  const barRef = import_react.useRef(null);
  const [selected, setSelected] = import_react.useState(0);
  const [openStop, setOpenStop] = import_react.useState(null);
  const [draft, setDraft] = import_react.useState(null);
  const stops = fill.stops;
  const sel = Math.min(selected, stops.length - 1);
  let t3;
  if ($[2] !== suggestions) {
    t3 = color => suggestions.find(s => s.value === color || s.rawValue === color)?.className;
    $[2] = suggestions;
    $[3] = t3;
  } else t3 = $[3];
  const classForColor = t3;
  let t4;
  if ($[4] !== fill.angle || $[5] !== fill.type || $[6] !== onChange || $[7] !== stops) {
    t4 = next => onChange({
      kind: "gradient",
      type: fill.type,
      angle: fill.angle,
      stops,
      ...next
    });
    $[4] = fill.angle;
    $[5] = fill.type;
    $[6] = onChange;
    $[7] = stops;
    $[8] = t4;
  } else t4 = $[8];
  const emit = t4;
  let t5;
  if ($[9] !== emit || $[10] !== stops) {
    t5 = (i, patch) => emit({
      stops: stops.map((s_0, idx) => idx === i ? {
        ...s_0,
        ...patch
      } : s_0)
    });
    $[9] = emit;
    $[10] = stops;
    $[11] = t5;
  } else t5 = $[11];
  const setStop = t5;
  let t10;
  let t11;
  let t6;
  let t7;
  let t8;
  let t9;
  if ($[12] !== classForColor || $[13] !== className || $[14] !== cssProperty || $[15] !== draft || $[16] !== emit || $[17] !== fill.angle || $[18] !== fill.type || $[19] !== onChange || $[20] !== openStop || $[21] !== sel || $[22] !== setStop || $[23] !== stops || $[24] !== suggestions) {
    const posFromClientX = clientX => {
      const r = barRef.current?.getBoundingClientRect();
      if (!r) return 0;
      return clamp$1((clientX - r.left) / r.width * 100, 0, 100);
    };
    const startDrag = i_0 => e => {
      e.stopPropagation();
      setSelected(i_0);
      const move = ev => setStop(i_0, {
        pos: Math.round(posFromClientX(ev.clientX))
      });
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    let t12;
    if ($[31] !== fill.angle || $[32] !== fill.type || $[33] !== onChange || $[34] !== sel || $[35] !== stops) {
      t12 = () => {
        const next_0 = [...stops, {
          color: stops[sel]?.color ?? "#ffffff",
          pos: 50
        }];
        onChange({
          kind: "gradient",
          type: fill.type,
          angle: fill.angle,
          stops: next_0
        });
        setSelected(next_0.length - 1);
      };
      $[31] = fill.angle;
      $[32] = fill.type;
      $[33] = onChange;
      $[34] = sel;
      $[35] = stops;
      $[36] = t12;
    } else t12 = $[36];
    const addStop = t12;
    let t13;
    if ($[37] !== fill.angle || $[38] !== fill.type || $[39] !== onChange || $[40] !== stops) {
      t13 = i_1 => {
        if (stops.length <= 2) return;
        const next_1 = stops.filter((_, idx_0) => idx_0 !== i_1);
        onChange({
          kind: "gradient",
          type: fill.type,
          angle: fill.angle,
          stops: next_1
        });
        setSelected(s_1 => Math.max(0, Math.min(s_1, next_1.length - 1)));
      };
      $[37] = fill.angle;
      $[38] = fill.type;
      $[39] = onChange;
      $[40] = stops;
      $[41] = t13;
    } else t13 = $[41];
    const removeStop = t13;
    let t14;
    if ($[42] !== fill.type) {
      t14 = GRADIENT_TYPES.find(t => t.type === fill.type)?.label ?? "Linear";
      $[42] = fill.type;
      $[43] = t14;
    } else t14 = $[43];
    const currentTypeLabel = t14;
    const ordered = stops.map(_temp$43).sort(_temp2$33);
    if ($[44] !== className) {
      t8 = cn$2("flex flex-col gap-3", className);
      $[44] = className;
      $[45] = t8;
    } else t8 = $[45];
    const t15 = fill.type;
    let t16;
    if ($[46] === Symbol.for("react.memo_cache_sentinel")) {
      t16 = GRADIENT_TYPES.map(_temp3$21);
      $[46] = t16;
    } else t16 = $[46];
    let t17;
    if ($[47] !== emit) {
      t17 = value => emit({
        type: value
      });
      $[47] = emit;
      $[48] = t17;
    } else t17 = $[48];
    if ($[49] !== currentTypeLabel || $[50] !== fill.type || $[51] !== t17) {
      t9 = <div className="flex items-center gap-1.5">{<InspectorDropdown label="Gradient type" value={currentTypeLabel} className="flex-1" triggerClassName="font-medium" selectedValue={t15} options={t16} onValueChange={t17} />}</div>;
      $[49] = currentTypeLabel;
      $[50] = fill.type;
      $[51] = t17;
      $[52] = t9;
    } else t9 = $[52];
    let t18;
    if ($[53] !== stops) {
      t18 = barCss(stops);
      $[53] = stops;
      $[54] = t18;
    } else t18 = $[54];
    let t19;
    if ($[55] !== t18) {
      t19 = {
        height: 14,
        background: t18
      };
      $[55] = t18;
      $[56] = t19;
    } else t19 = $[56];
    const t20 = stops.map((s_3, i_3) => <div key={i_3} onPointerDown={startDrag(i_3)} aria-label={t("styles.stopNumber", { number: i_3 + 1 })} className="absolute -translate-x-1/2 rounded-full" style={{
      top: -4,
      left: `${s_3.pos}%`,
      width: 22,
      height: 22,
      border: i_3 === sel ? "3px solid rgba(59,130,246,0.8)" : "3px solid #fff",
      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      background: `#${rgbHex6(s_3.color)}`,
      zIndex: i_3 === sel ? 2 : 1
    }} />);
    if ($[57] !== t19 || $[58] !== t20) {
      t10 = <div ref={barRef} className="relative rounded-full mx-3" style={t19}>{t20}</div>;
      $[57] = t19;
      $[58] = t20;
      $[59] = t10;
    } else t10 = $[59];
    let t21;
    if (true) {
      t21 = <span className="text-[12px] font-medium text-ed-foreground">{t("styles.stops")}</span>;
      $[60] = t21;
    } else t21 = $[60];
    let t22;
    if ($[61] === Symbol.for("react.memo_cache_sentinel")) {
      t22 = <PlusIcon />;
      $[61] = t22;
    } else t22 = $[61];
    if ($[62] !== addStop) {
      t11 = <div className="flex items-center justify-between">{t21}{<IconBtn label="Add stop" onClick={addStop}>{t22}</IconBtn>}</div>;
      $[62] = addStop;
      $[63] = t11;
    } else t11 = $[63];
    t6 = "flex flex-col gap-1";
    let t23;
    if (true) {
      t23 = t24 => {
        const {
          s: s_4,
          i: i_4
        } = t24;
        return <div key={i_4} onPointerDown={() => setSelected(i_4)} className={cn$2("flex items-center gap-1.5 rounded px-1.5 py-1", i_4 === sel && "bg-ed-muted/50")}>{<span className="w-7 text-right text-[12px] font-medium text-ed-foreground">{Math.round(s_4.pos)}%</span>}{<Popover open={openStop === i_4} onOpenChange={o => setOpenStop(o ? i_4 : null)} modal={false}>{<PopoverTrigger asChild={true}>{<button type="button" aria-label={t("styles.stopColor", { number: i_4 + 1 })} onClick={() => setSelected(i_4)} className="shrink-0 rounded border border-ed-border" style={{
                width: 22,
                height: 22,
                backgroundColor: `#${rgbHex6(s_4.color)}`
              }} />}</PopoverTrigger>}{<ColorPickerPopover value={s_4.color} resolvedSolid={s_4.color} onChange={v => setStop(i_4, {
              color: v
            })} allowedKinds={["solid"]} suggestions={suggestions} cssProperty={cssProperty} onSelectClass={cls => {
              const sug = suggestions.find(x => x.className === cls);
              if (sug) setStop(i_4, {
                color: sug.value
              });
              setOpenStop(null);
            }} onClose={() => setOpenStop(null)} />}</Popover>}{classForColor(s_4.color) ? <InspectorControlShell className="flex-1">{<ActiveClassChip sourceClass={classForColor(s_4.color)} fieldTooltip={`Stop ${i_4 + 1} color`} value={s_4.color} onClear={() => setStop(i_4, {
              color: `#${rgbHex6(s_4.color)}`
            })} clearTitle={t("styles.removeClass")} clearStopsPropagation={false} className="h-full" />}</InspectorControlShell> : <InspectorControlShell className="flex-1">{<InspectorControlInput tooltip={t("styles.stopColor", { number: i_4 + 1 })} value={draft?.i === i_4 && draft.kind === "hex" ? draft.v : rgbHex6(s_4.color)} onChange={e_0 => setDraft({
              i: i_4,
              kind: "hex",
              v: e_0.target.value
            })} onBlur={() => {
              if (draft?.i === i_4 && draft.kind === "hex") {
                setStop(i_4, {
                  color: buildColor(draft.v, alphaPct(s_4.color))
                });
                setDraft(null);
              }
            }} onKeyDown={blurInspectorInputOnEnter} className="font-mono font-medium" />}</InspectorControlShell>}{<InspectorControlShell className="w-15.5 shrink-0">{<InspectorControlInput tooltip={`Stop ${i_4 + 1} opacity`} inputMode="numeric" value={draft?.i === i_4 && draft.kind === "alpha" ? draft.v : String(alphaPct(s_4.color))} onChange={e_1 => setDraft({
              i: i_4,
              kind: "alpha",
              v: e_1.target.value.replace(/[^\d]/g, "").slice(0, 3)
            })} onBlur={() => {
              if (draft?.i === i_4 && draft.kind === "alpha") {
                setStop(i_4, {
                  color: buildColor(rgbHex6(s_4.color), parseInt(draft.v, 10) || 0)
                });
                setDraft(null);
              }
            }} onKeyDown={blurInspectorInputOnEnter} aria-label={t("styles.stopOpacityNumber", { number: i_4 + 1 })} style={{
              textAlign: "right"
            }} className="px-1 text-right font-mono font-medium" />}{<span className="pr-1 text-[10px] text-ed-foreground">%</span>}</InspectorControlShell>}{<IconBtn label="Remove stop" onClick={() => removeStop(i_4)} disabled={stops.length <= 2}>{<MinusIcon />}</IconBtn>}</div>;
      };
      $[64] = classForColor;
      $[65] = cssProperty;
      $[66] = draft;
      $[67] = openStop;
      $[68] = removeStop;
      $[69] = sel;
      $[70] = setStop;
      $[71] = stops.length;
      $[72] = suggestions;
      $[73] = t23;
    } else t23 = $[73];
    t7 = ordered.map(t23);
    $[12] = classForColor;
    $[13] = className;
    $[14] = cssProperty;
    $[15] = draft;
    $[16] = emit;
    $[17] = fill.angle;
    $[18] = fill.type;
    $[19] = onChange;
    $[20] = openStop;
    $[21] = sel;
    $[22] = setStop;
    $[23] = stops;
    $[24] = suggestions;
    $[25] = t10;
    $[26] = t11;
    $[27] = t6;
    $[28] = t7;
    $[29] = t8;
    $[30] = t9;
  } else {
    t10 = $[25];
    t11 = $[26];
    t6 = $[27];
    t7 = $[28];
    t8 = $[29];
    t9 = $[30];
  }
  let t12;
  if ($[74] !== t6 || $[75] !== t7) {
    t12 = <div className={t6}>{t7}</div>;
    $[74] = t6;
    $[75] = t7;
    $[76] = t12;
  } else t12 = $[76];
  let t13;
  if ($[77] !== t10 || $[78] !== t11 || $[79] !== t12 || $[80] !== t8 || $[81] !== t9) {
    t13 = <div className={t8}>{t9}{t10}{t11}{t12}</div>;
    $[77] = t10;
    $[78] = t11;
    $[79] = t12;
    $[80] = t8;
    $[81] = t9;
    $[82] = t13;
  } else t13 = $[82];
  return t13;
}
function _temp3$21(type) {
  return {
    value: type.type,
    label: type.label
  };
}
function _temp2$33(a, b) {
  return a.s.pos - b.s.pos;
}
function _temp$43(s_2, i_2) {
  return {
    s: s_2,
    i: i_2
  };
}

export { GradientEditor };
