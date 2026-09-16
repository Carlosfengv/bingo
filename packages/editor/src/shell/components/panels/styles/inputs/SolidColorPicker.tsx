/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/SolidColorPicker.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { clamp$1, colorToHsva, hslToRgb, hsvaToHex, hsvaToRgba, hueHex, parseColorToRgba, rgbaToHsl, rgbaToHsva, sameColor } from "../../../../utils/colorMath";
import { IconBtn, InspectorControlInput, InspectorControlShell, blurInspectorInputOnEnter } from "../primitives";
import { InspectorDropdown } from "./parts/InspectorDropdown";
import { EyedropperIcon, Tooltip, TooltipContent, TooltipTrigger, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Custom solid-color picker: a saturation/value square, a hue
* bar and an alpha bar — each pointer-draggable — plus an eyedropper, a
* Hex/RGB/CSS/HSL/HSB format dropdown, the value input and an alpha-percent
* input. Works
* in HSVA internally (see colorMath) and emits hex on every edit so hue is
* preserved through grayscale/alpha changes.
*/
var FORMATS = ["hex", "rgb", "css", "hsl", "hsb"];
var FORMAT_LABEL = {
  hex: "Hex",
  rgb: "RGB",
  css: "CSS",
  hsl: "HSL",
  hsb: "HSB"
};
function formatColorDraft(format, rgba, hsva, opaqueHex) {
  if (format === "rgb") return `${rgba.r}, ${rgba.g}, ${rgba.b}`;
  if (format === "css") return hsva.a < 1 ? `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${+hsva.a.toFixed(2)})` : opaqueHex;
  if (format === "hsl") {
    const {
      h,
      s,
      l
    } = rgbaToHsl(rgba);
    return `${h}, ${s}%, ${l}%`;
  }
  if (format === "hsb") return `${Math.round(hsva.h)}, ${Math.round(hsva.s)}%, ${Math.round(hsva.v)}%`;
  return opaqueHex.slice(1).toUpperCase();
}
/** Pointer-drag a track, reporting the cursor as 0–1 ratios on each move. */
function useTrackDrag(onMove) {
  const $ = (0, import_compiler_runtime.c)(6);
  const ref = import_react.useRef(null);
  const fireMove = import_react.useEffectEvent(onMove);
  const startRef = import_react.useRef(null);
  const [dragging, setDragging] = import_react.useState(false);
  let t0;
  if ($[0] !== dragging || $[1] !== fireMove) {
    t0 = () => {
      if (!dragging) return;
      const el = ref.current;
      const start = startRef.current;
      if (!el || !start) return;
      const fire = (clientX, clientY) => {
        const r = el.getBoundingClientRect();
        fireMove(clamp$1((clientX - r.left) / r.width, 0, 1), clamp$1((clientY - r.top) / r.height, 0, 1));
      };
      fire(start.x, start.y);
      const move = ev => fire(ev.clientX, ev.clientY);
      const up = () => setDragging(false);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      return () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
    };
    $[0] = dragging;
    $[1] = fireMove;
    $[2] = t0;
  } else t0 = $[2];
  let t1;
  if ($[3] !== dragging) {
    t1 = [dragging];
    $[3] = dragging;
    $[4] = t1;
  } else t1 = $[4];
  import_react.useLayoutEffect(t0, t1);
  let t2;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    const onPointerDown = e => {
      e.preventDefault();
      if (!ref.current) return;
      startRef.current = {
        x: e.clientX,
        y: e.clientY
      };
      setDragging(true);
    };
    t2 = [ref, onPointerDown];
    $[5] = t2;
  } else t2 = $[5];
  return t2;
}
function SolidColorPicker(t0) {
  const $ = (0, import_compiler_runtime.c)(105);
  const { t } = useTranslation("editor");
  const {
    color,
    onChange,
    className
  } = t0;
  let t1;
  if ($[0] !== color) {
    t1 = () => colorToHsva(color);
    $[0] = color;
    $[1] = t1;
  } else t1 = $[1];
  const [hsva, setHsva] = import_react.useState(t1);
  const hsvaRef = import_react.useRef(hsva);
  const cacheRef = import_react.useRef(color);
  const [format, setFormat] = import_react.useState("hex");
  const [draft, setDraft] = import_react.useState(null);
  const [alphaDraft, setAlphaDraft] = import_react.useState(null);
  let t2;
  let t3;
  if ($[2] !== color) {
    t2 = () => {
      if (!sameColor(color, cacheRef.current)) {
        const next = colorToHsva(color);
        hsvaRef.current = next;
        setHsva(next);
        cacheRef.current = color;
      }
    };
    t3 = [color];
    $[2] = color;
    $[3] = t2;
    $[4] = t3;
  } else {
    t2 = $[3];
    t3 = $[4];
  }
  import_react.useEffect(t2, t3);
  let t4;
  if ($[5] !== onChange) {
    t4 = next_0 => {
      hsvaRef.current = next_0;
      setHsva(next_0);
      const out = hsvaToHex(next_0);
      cacheRef.current = out;
      onChange(out);
    };
    $[5] = onChange;
    $[6] = t4;
  } else t4 = $[6];
  const emit = t4;
  let t5;
  if ($[7] !== emit) {
    t5 = p => emit({
      ...hsvaRef.current,
      ...p
    });
    $[7] = emit;
    $[8] = t5;
  } else t5 = $[8];
  const patch = t5;
  let t6;
  if ($[9] !== patch) {
    t6 = (x, y) => patch({
      s: x * 100,
      v: (1 - y) * 100
    });
    $[9] = patch;
    $[10] = t6;
  } else t6 = $[10];
  const [svRef, onSvPointerDown] = useTrackDrag(t6);
  let t7;
  if ($[11] !== patch) {
    t7 = x_0 => patch({
      h: x_0 * 360
    });
    $[11] = patch;
    $[12] = t7;
  } else t7 = $[12];
  const [hueRef, onHuePointerDown] = useTrackDrag(t7);
  let t8;
  if ($[13] !== patch) {
    t8 = x_1 => patch({
      a: x_1
    });
    $[13] = patch;
    $[14] = t8;
  } else t8 = $[14];
  const [alphaRef, onAlphaPointerDown] = useTrackDrag(t8);
  let opaqueHex;
  let t9;
  if ($[15] !== format || $[16] !== hsva) {
    const rgba = hsvaToRgba(hsva);
    opaqueHex = hsvaToHex({
      ...hsva,
      a: 1
    });
    t9 = formatColorDraft(format, rgba, hsva, opaqueHex);
    $[15] = format;
    $[16] = hsva;
    $[17] = opaqueHex;
    $[18] = t9;
  } else {
    opaqueHex = $[17];
    t9 = $[18];
  }
  const formatted = t9;
  let t10;
  if ($[19] !== emit || $[20] !== format || $[21] !== hsva.a) {
    t10 = raw => {
      const t = raw.trim();
      if (format === "hex") {
        const rgb = parseColorToRgba(t.startsWith("#") ? t : `#${t}`);
        if (rgb) emit(rgbaToHsva({
          ...rgb,
          a: hsva.a
        }));
      } else if (format === "css") {
        const rgb_0 = parseColorToRgba(t);
        if (rgb_0) emit(rgbaToHsva(rgb_0));
      } else {
        const n = t.split(/[,\s/%]+/).filter(Boolean).map(Number);
        if (n.length >= 3 && n.every(_temp$42)) {
          if (format === "hsb") emit({
            h: n[0],
            s: n[1],
            v: n[2],
            a: hsva.a
          });else {
            const rgb_1 = format === "rgb" ? {
              r: n[0],
              g: n[1],
              b: n[2]
            } : hslToRgb(n[0], n[1], n[2]);
            emit(rgbaToHsva({
              ...rgb_1,
              a: hsva.a
            }));
          }
        }
      }
      setDraft(null);
    };
    $[19] = emit;
    $[20] = format;
    $[21] = hsva.a;
    $[22] = t10;
  } else t10 = $[22];
  const commitValue = t10;
  const eyeDropperSupported = typeof window !== "undefined" && !!window.EyeDropper;
  let t11;
  if ($[23] !== emit || $[24] !== hsva.a) {
    t11 = () => {
      if (!window.EyeDropper) return;
      new window.EyeDropper().open().then(r => {
        const rgb_2 = parseColorToRgba(r.sRGBHex);
        if (rgb_2) emit(rgbaToHsva({
          ...rgb_2,
          a: hsva.a
        }));
      }).catch(_temp2$32);
    };
    $[23] = emit;
    $[24] = hsva.a;
    $[25] = t11;
  } else t11 = $[25];
  const pickWithEyedropper = t11;
  let t12;
  if ($[26] !== className) {
    t12 = cn$2("flex flex-col gap-3", className);
    $[26] = className;
    $[27] = t12;
  } else t12 = $[27];
  let t13;
  if ($[28] !== hsva.h) {
    t13 = hueHex(hsva.h);
    $[28] = hsva.h;
    $[29] = t13;
  } else t13 = $[29];
  const t14 = `linear-gradient(to bottom, rgba(0,0,0,0), #000), linear-gradient(to right, #fff, ${t13})`;
  let t15;
  if ($[30] !== t14) {
    t15 = {
      height: 220,
      background: t14
    };
    $[30] = t14;
    $[31] = t15;
  } else t15 = $[31];
  const t16 = `${hsva.s}%`;
  const t17 = `${100 - hsva.v}%`;
  let t18;
  if ($[32] !== opaqueHex || $[33] !== t16 || $[34] !== t17) {
    t18 = <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none" style={{
      width: 18,
      height: 18,
      border: "3px solid #fff",
      left: t16,
      top: t17,
      boxShadow: "0 0 4px rgba(0,0,0,0.4)",
      background: opaqueHex
    }} />;
    $[32] = opaqueHex;
    $[33] = t16;
    $[34] = t17;
    $[35] = t18;
  } else t18 = $[35];
  let t19;
  if ($[36] !== onSvPointerDown || $[37] !== svRef || $[38] !== t15 || $[39] !== t18) {
    t19 = <div ref={svRef} onPointerDown={onSvPointerDown} className="relative w-full rounded-lg overflow-hidden cursor-crosshair touch-none" style={t15}>{t18}</div>;
    $[36] = onSvPointerDown;
    $[37] = svRef;
    $[38] = t15;
    $[39] = t18;
    $[40] = t19;
  } else t19 = $[40];
  let t20;
  if (true) {
    t20 = eyeDropperSupported && <Tooltip>{<TooltipTrigger asChild={true}>{<IconBtn label="Sample color" onClick={pickWithEyedropper}>{<EyedropperIcon />}</IconBtn>}</TooltipTrigger>}{<TooltipContent>{t("styles.sampleColor")}</TooltipContent>}</Tooltip>;
    $[41] = pickWithEyedropper;
    $[42] = t20;
  } else t20 = $[42];
  let t21;
  if ($[43] === Symbol.for("react.memo_cache_sentinel")) {
    t21 = {
      height: 14,
      background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
    };
    $[43] = t21;
  } else t21 = $[43];
  const t22 = `${hsva.h / 360 * 100}%`;
  let t23;
  if ($[44] !== hsva.h) {
    t23 = hueHex(hsva.h);
    $[44] = hsva.h;
    $[45] = t23;
  } else t23 = $[45];
  let t24;
  if ($[46] !== t22 || $[47] !== t23) {
    t24 = <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none" style={{
      width: 22,
      height: 22,
      border: "3px solid #fff",
      left: t22,
      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      background: t23
    }} />;
    $[46] = t22;
    $[47] = t23;
    $[48] = t24;
  } else t24 = $[48];
  let t25;
  if ($[49] !== hueRef || $[50] !== onHuePointerDown || $[51] !== t24) {
    t25 = <div ref={hueRef} onPointerDown={onHuePointerDown} className="relative rounded-full touch-none" style={t21}>{t24}</div>;
    $[49] = hueRef;
    $[50] = onHuePointerDown;
    $[51] = t24;
    $[52] = t25;
  } else t25 = $[52];
  let t26;
  if ($[53] === Symbol.for("react.memo_cache_sentinel")) {
    t26 = {
      height: 14,
      backgroundImage: "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%)",
      backgroundSize: "8px 8px"
    };
    $[53] = t26;
  } else t26 = $[53];
  const t27 = `linear-gradient(to right, rgba(0,0,0,0), ${opaqueHex})`;
  let t28;
  if ($[54] !== t27) {
    t28 = <div className="absolute inset-0 rounded-full" style={{
      background: t27
    }} />;
    $[54] = t27;
    $[55] = t28;
  } else t28 = $[55];
  const t29 = `${hsva.a * 100}%`;
  let t30;
  if ($[56] !== opaqueHex || $[57] !== t29) {
    t30 = <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none" style={{
      width: 22,
      height: 22,
      border: "3px solid #fff",
      left: t29,
      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      background: opaqueHex,
      zIndex: 1
    }} />;
    $[56] = opaqueHex;
    $[57] = t29;
    $[58] = t30;
  } else t30 = $[58];
  let t31;
  if ($[59] !== alphaRef || $[60] !== onAlphaPointerDown || $[61] !== t28 || $[62] !== t30) {
    t31 = <div ref={alphaRef} onPointerDown={onAlphaPointerDown} className="relative rounded-full touch-none" style={t26}>{t28}{t30}</div>;
    $[59] = alphaRef;
    $[60] = onAlphaPointerDown;
    $[61] = t28;
    $[62] = t30;
    $[63] = t31;
  } else t31 = $[63];
  let t32;
  if ($[64] !== t25 || $[65] !== t31) {
    t32 = <div className="flex flex-1 flex-col gap-3">{t25}{t31}</div>;
    $[64] = t25;
    $[65] = t31;
    $[66] = t32;
  } else t32 = $[66];
  let t33;
  if ($[67] !== t20 || $[68] !== t32) {
    t33 = <div className="flex items-center gap-2">{t20}{t32}</div>;
    $[67] = t20;
    $[68] = t32;
    $[69] = t33;
  } else t33 = $[69];
  const t34 = FORMAT_LABEL[format];
  let t35;
  let t36;
  if ($[70] === Symbol.for("react.memo_cache_sentinel")) {
    t35 = FORMATS.map(_temp3$20);
    t36 = value => {
      setFormat(value);
      setDraft(null);
    };
    $[70] = t35;
    $[71] = t36;
  } else {
    t35 = $[70];
    t36 = $[71];
  }
  let t37;
  if ($[72] !== format || $[73] !== t34) {
    t37 = <InspectorDropdown label="Color format" value={t34} triggerClassName="font-medium" selectedValue={format} options={t35} onValueChange={t36} />;
    $[72] = format;
    $[73] = t34;
    $[74] = t37;
  } else t37 = $[74];
  const t38 = draft ?? formatted;
  let t39;
  if ($[75] === Symbol.for("react.memo_cache_sentinel")) {
    t39 = e => setDraft(e.target.value);
    $[75] = t39;
  } else t39 = $[75];
  let t40;
  if ($[76] !== commitValue || $[77] !== draft) {
    t40 = () => draft !== null && commitValue(draft);
    $[76] = commitValue;
    $[77] = draft;
    $[78] = t40;
  } else t40 = $[78];
  let t41;
  if ($[79] !== t38 || $[80] !== t40) {
    t41 = <InspectorControlShell className="flex-1">{<InspectorControlInput tooltip="Color value" value={t38} onChange={t39} onBlur={t40} onKeyDown={blurInspectorInputOnEnter} className="font-mono font-medium" />}</InspectorControlShell>;
    $[79] = t38;
    $[80] = t40;
    $[81] = t41;
  } else t41 = $[81];
  let t42;
  if ($[82] !== alphaDraft || $[83] !== hsva.a) {
    t42 = alphaDraft ?? String(Math.round(hsva.a * 100));
    $[82] = alphaDraft;
    $[83] = hsva.a;
    $[84] = t42;
  } else t42 = $[84];
  let t43;
  if ($[85] === Symbol.for("react.memo_cache_sentinel")) {
    t43 = e_0 => setAlphaDraft(e_0.target.value.replace(/[^\d]/g, "").slice(0, 3));
    $[85] = t43;
  } else t43 = $[85];
  let t44;
  if ($[86] !== alphaDraft || $[87] !== patch) {
    t44 = () => {
      if (alphaDraft !== null) {
        patch({
          a: clamp$1(parseInt(alphaDraft, 10) || 0, 0, 100) / 100
        });
        setAlphaDraft(null);
      }
    };
    $[86] = alphaDraft;
    $[87] = patch;
    $[88] = t44;
  } else t44 = $[88];
  let t45;
  if ($[89] === Symbol.for("react.memo_cache_sentinel")) {
    t45 = {
      textAlign: "right"
    };
    $[89] = t45;
  } else t45 = $[89];
  let t46;
  if (true) {
    t46 = <InspectorControlInput tooltip={t("styles.opacity")} inputMode="numeric" value={t42} onChange={t43} onBlur={t44} onKeyDown={blurInspectorInputOnEnter} aria-label={t("styles.opacityPercent")} style={t45} className="px-1 font-mono font-medium" />;
    $[90] = t42;
    $[91] = t44;
    $[92] = t46;
  } else t46 = $[92];
  let t47;
  if ($[93] === Symbol.for("react.memo_cache_sentinel")) {
    t47 = <span className="shrink-0 pr-1 text-[10px] text-ed-foreground">%</span>;
    $[93] = t47;
  } else t47 = $[93];
  let t48;
  if ($[94] !== t46) {
    t48 = <InspectorControlShell className="w-18 shrink-0">{t46}{t47}</InspectorControlShell>;
    $[94] = t46;
    $[95] = t48;
  } else t48 = $[95];
  let t49;
  if ($[96] !== t37 || $[97] !== t41 || $[98] !== t48) {
    t49 = <div className="flex items-center gap-2">{t37}{t41}{t48}</div>;
    $[96] = t37;
    $[97] = t41;
    $[98] = t48;
    $[99] = t49;
  } else t49 = $[99];
  let t50;
  if ($[100] !== t12 || $[101] !== t19 || $[102] !== t33 || $[103] !== t49) {
    t50 = <div className={t12}>{t19}{t33}{t49}</div>;
    $[100] = t12;
    $[101] = t19;
    $[102] = t33;
    $[103] = t49;
    $[104] = t50;
  } else t50 = $[104];
  return t50;
}
function _temp3$20(nextFormat) {
  return {
    value: nextFormat,
    label: FORMAT_LABEL[nextFormat]
  };
}
function _temp2$32() {}
function _temp$42(x_2) {
  return !Number.isNaN(x_2);
}

export { SolidColorPicker };
