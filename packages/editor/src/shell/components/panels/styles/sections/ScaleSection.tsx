/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/sections/ScaleSection.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { linearFromTransform } from "../../../../../canvas/utils/transformMatrix";
import { useActiveTool } from "../../../../../shared/contexts/ActiveToolContext";
import { getTransformScales, multiplyTransformScale, removeScaleAnchorTransform, removeTransformScale } from "../../../../../shared/utils/scaleTransform";
import { resolveVisibleElement$1 } from "../../../../../shared/utils/visibleElement";
import { useStyleOps } from "../StyleOpsContext";
import { DimensionInput } from "../inputs/DimensionInput";
import { LayoutValueInput } from "../inputs/LayoutValueInput";
import { IconBtn, InspectorRailRow } from "../primitives";
import { InspectorSection } from "./InspectorSection";
import { getParentId } from "@bingo/compiler";
import { LockAspectRatioIcon, PlusIcon, ScaleIcon } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function measure(element, live = false) {
  const raw = document.querySelector(`[data-element-id="${CSS.escape(element.id)}"]`);
  const node = raw ? resolveVisibleElement$1(raw) : null;
  const computed = node ? window.getComputedStyle(node) : null;
  const transform = (live ? node?.style.transform : void 0) || element.styles?.transform || computed?.transform || "";
  const matrix = linearFromTransform(computed?.transform);
  const scales = getTransformScales(transform);
  return {
    id: element.id,
    transform,
    scale: scales.x,
    scaleY: scales.y,
    width: (node?.offsetWidth || parseFloat(String(element.styles?.width)) || 0) * Math.hypot(matrix.a, matrix.b),
    height: (node?.offsetHeight || parseFloat(String(element.styles?.height)) || 0) * Math.hypot(matrix.c, matrix.d)
  };
}
function ScaleSection(t0) {
  const $ = (0, import_compiler_runtime.c)(109);
  const { t } = useTranslation("editor");
  const {
    elements,
    onApply
  } = t0;
  const {
    activeTool,
    scaleFocusVersion,
    setActiveTool,
    scaleAspectLocked,
    setScaleAspectLocked
  } = useActiveTool();
  const {
    readOnly,
    store
  } = useStyleOps();
  const sectionRef = (0, import_react.useRef)(null);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = [];
    $[0] = t1;
  } else t1 = $[0];
  const [measurements, setMeasurements] = (0, import_react.useState)(t1);
  let t2;
  if ($[1] !== elements) {
    t2 = elements.map(_temp$46).join(",");
    $[1] = elements;
    $[2] = t2;
  } else t2 = $[2];
  const selectionKey = t2;
  let t3;
  if ($[3] !== elements) {
    t3 = new Set(elements.map(_temp2$36));
    $[3] = elements;
    $[4] = t3;
  } else t3 = $[4];
  const selectedIds = t3;
  let t4;
  if ($[5] !== elements || $[6] !== selectedIds || $[7] !== store) {
    let t5;
    if ($[9] !== selectedIds || $[10] !== store) {
      t5 = element_1 => {
        let parent = getParentId(store, element_1.id);
        while (parent && parent !== "ROOT") {
          if (selectedIds.has(parent)) return false;
          parent = getParentId(store, parent);
        }
        return true;
      };
      $[9] = selectedIds;
      $[10] = store;
      $[11] = t5;
    } else t5 = $[11];
    t4 = elements.filter(t5);
    $[5] = elements;
    $[6] = selectedIds;
    $[7] = store;
    $[8] = t4;
  } else t4 = $[8];
  const roots = t4;
  let t5;
  if ($[12] !== roots) {
    t5 = () => {
      let frame = null;
      const scheduleMeasure = () => {
        if (frame !== null) return;
        frame = requestAnimationFrame(() => {
          frame = null;
          setMeasurements(roots.map(_temp3$23));
        });
      };
      const observer = new MutationObserver(scheduleMeasure);
      for (const element_3 of roots) {
        const raw = document.querySelector(`[data-element-id="${CSS.escape(element_3.id)}"]`);
        const node = raw ? resolveVisibleElement$1(raw) : null;
        if (node) observer.observe(node, {
          attributes: true,
          attributeFilter: ["style"]
        });
      }
      scheduleMeasure();
      return () => {
        observer.disconnect();
        if (frame !== null) cancelAnimationFrame(frame);
      };
    };
    $[12] = roots;
    $[13] = t5;
  } else t5 = $[13];
  let t6;
  if ($[14] !== roots || $[15] !== store) {
    t6 = [roots, store];
    $[14] = roots;
    $[15] = store;
    $[16] = t6;
  } else t6 = $[16];
  (0, import_react.useEffect)(t5, t6);
  let t7;
  if ($[17] !== activeTool) {
    t7 = () => {
      if (activeTool !== "scale") return;
      sectionRef.current?.scrollIntoView({
        block: "nearest"
      });
    };
    $[17] = activeTool;
    $[18] = t7;
  } else t7 = $[18];
  let t8;
  if ($[19] !== activeTool || $[20] !== scaleFocusVersion || $[21] !== selectionKey) {
    t8 = [activeTool, scaleFocusVersion, selectionKey];
    $[19] = activeTool;
    $[20] = scaleFocusVersion;
    $[21] = selectionKey;
    $[22] = t8;
  } else t8 = $[22];
  (0, import_react.useEffect)(t7, t8);
  let t9;
  if ($[23] !== measurements[0]) {
    t9 = key => {
      const first = measurements[0]?.[key];
      return first === void 0 ? "" : String(Number(first.toFixed(3)));
    };
    $[23] = measurements[0];
    $[24] = t9;
  } else t9 = $[24];
  const value = t9;
  let t10;
  if ($[25] !== measurements) {
    t10 = key_0 => measurements.some(m => Math.abs(m[key_0] - measurements[0][key_0]) > .001 || key_0 === "scale" && Math.abs(m.scale - m.scaleY) > .001);
    $[25] = measurements;
    $[26] = t10;
  } else t10 = $[26];
  const mixed = t10;
  let t11;
  if ($[27] !== onApply || $[28] !== readOnly || $[29] !== roots || $[30] !== scaleAspectLocked) {
    t11 = (key_1, input) => {
      const next = Number(input.replace(/px$/, ""));
      if (readOnly || !Number.isFinite(next) || next <= 0) return;
      const transforms = new Map();
      for (const element_4 of roots) {
        const current = measure(element_4);
        if (current[key_1] <= 0 || current.scaleY <= 0) continue;
        const ratio = next / current[key_1];
        const x = key_1 === "height" && !scaleAspectLocked ? 1 : ratio;
        const y = key_1 === "scale" ? next / current.scaleY : key_1 === "width" && !scaleAspectLocked ? 1 : ratio;
        transforms.set(element_4.id, multiplyTransformScale(current.transform, x, y));
      }
      onApply(transforms);
    };
    $[27] = onApply;
    $[28] = readOnly;
    $[29] = roots;
    $[30] = scaleAspectLocked;
    $[31] = t11;
  } else t11 = $[31];
  const apply = t11;
  let t12;
  if ($[32] !== activeTool || $[33] !== measurements || $[34] !== roots) {
    t12 = activeTool === "scale" || roots.some(_temp4$17) || measurements.some(_temp5$14);
    $[32] = activeTool;
    $[33] = measurements;
    $[34] = roots;
    $[35] = t12;
  } else t12 = $[35];
  const isSet = t12;
  let t13;
  if ($[36] !== onApply || $[37] !== readOnly || $[38] !== roots) {
    t13 = () => {
      if (readOnly) return;
      onApply(new Map(roots.map(_temp6$12)));
    };
    $[36] = onApply;
    $[37] = readOnly;
    $[38] = roots;
    $[39] = t13;
  } else t13 = $[39];
  const addScale = t13;
  let t14;
  if ($[40] !== activeTool || $[41] !== onApply || $[42] !== readOnly || $[43] !== roots || $[44] !== setActiveTool) {
    t14 = () => {
      if (readOnly) return;
      onApply(new Map(roots.map(_temp7$8)));
      if (activeTool === "scale") setActiveTool("move");
    };
    $[40] = activeTool;
    $[41] = onApply;
    $[42] = readOnly;
    $[43] = roots;
    $[44] = setActiveTool;
    $[45] = t14;
  } else t14 = $[45];
  const t15 = readOnly ? void 0 : t14;
  let t16;
  if ($[46] === Symbol.for("react.memo_cache_sentinel")) {
    t16 = <PlusIcon />;
    $[46] = t16;
  } else t16 = $[46];
  let t17;
  if ($[47] !== addScale || $[48] !== readOnly) {
    t17 = <IconBtn label="Add scale" disabled={readOnly} onClick={addScale}>{t16}</IconBtn>;
    $[47] = addScale;
    $[48] = readOnly;
    $[49] = t17;
  } else t17 = $[49];
  const t18 = scaleAspectLocked ? "Unlock aspect ratio" : "Lock aspect ratio";
  let t19;
  if ($[50] !== scaleAspectLocked || $[51] !== setScaleAspectLocked) {
    t19 = () => setScaleAspectLocked(!scaleAspectLocked);
    $[50] = scaleAspectLocked;
    $[51] = setScaleAspectLocked;
    $[52] = t19;
  } else t19 = $[52];
  let t20;
  if ($[53] === Symbol.for("react.memo_cache_sentinel")) {
    t20 = <LockAspectRatioIcon />;
    $[53] = t20;
  } else t20 = $[53];
  let t21;
  if ($[54] !== readOnly || $[55] !== scaleAspectLocked || $[56] !== t18 || $[57] !== t19) {
    t21 = <IconBtn label={t18} active={scaleAspectLocked} disabled={readOnly} onClick={t19}>{t20}</IconBtn>;
    $[54] = readOnly;
    $[55] = scaleAspectLocked;
    $[56] = t18;
    $[57] = t19;
    $[58] = t21;
  } else t21 = $[58];
  let t22;
  if ($[59] === Symbol.for("react.memo_cache_sentinel")) {
    t22 = <ScaleIcon />;
    $[59] = t22;
  } else t22 = $[59];
  const t23 = value("scale");
  let t24;
  if ($[60] !== mixed) {
    t24 = mixed("scale");
    $[60] = mixed;
    $[61] = t24;
  } else t24 = $[61];
  let t25;
  if ($[62] !== apply) {
    t25 = v => apply("scale", v);
    $[62] = apply;
    $[63] = t25;
  } else t25 = $[63];
  let t26;
  if ($[64] !== readOnly || $[65] !== t23 || $[66] !== t24 || $[67] !== t25) {
    t26 = <LayoutValueInput icon={t22} ariaLabel="Scale factor" tooltipLabel="Scale factor" value={t23} unit="" suffix="x" inlineSuffix={true} min={.01} scrubStep={.5} scrubPrecision={1} disabled={readOnly} isMixedValue={t24} onChange={t25} />;
    $[64] = readOnly;
    $[65] = t23;
    $[66] = t24;
    $[67] = t25;
    $[68] = t26;
  } else t26 = $[68];
  let t27;
  if ($[69] !== scaleAspectLocked) {
    t27 = scaleAspectLocked && <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 bg-ed-muted" />;
    $[69] = scaleAspectLocked;
    $[70] = t27;
  } else t27 = $[70];
  const t28 = value("width");
  let t29;
  if ($[71] !== mixed) {
    t29 = mixed("width");
    $[71] = mixed;
    $[72] = t29;
  } else t29 = $[72];
  let t30;
  if ($[73] !== apply) {
    t30 = v_0 => apply("width", v_0);
    $[73] = apply;
    $[74] = t30;
  } else t30 = $[74];
  let t31;
  if ($[75] !== readOnly || $[76] !== t28 || $[77] !== t29 || $[78] !== t30) {
    t31 = <DimensionInput label="W" ariaLabel="Scaled width" value={t28} fixedPixels={true} min={.01} disabled={readOnly} isMixedValue={t29} onChange={t30} />;
    $[75] = readOnly;
    $[76] = t28;
    $[77] = t29;
    $[78] = t30;
    $[79] = t31;
  } else t31 = $[79];
  const t32 = value("height");
  let t33;
  if ($[80] !== mixed) {
    t33 = mixed("height");
    $[80] = mixed;
    $[81] = t33;
  } else t33 = $[81];
  let t34;
  if ($[82] !== apply) {
    t34 = v_1 => apply("height", v_1);
    $[82] = apply;
    $[83] = t34;
  } else t34 = $[83];
  let t35;
  if ($[84] !== readOnly || $[85] !== t32 || $[86] !== t33 || $[87] !== t34) {
    t35 = <DimensionInput label="H" ariaLabel="Scaled height" value={t32} fixedPixels={true} min={.01} disabled={readOnly} isMixedValue={t33} onChange={t34} />;
    $[84] = readOnly;
    $[85] = t32;
    $[86] = t33;
    $[87] = t34;
    $[88] = t35;
  } else t35 = $[88];
  let t36;
  if ($[89] !== t27 || $[90] !== t31 || $[91] !== t35) {
    t36 = <div className="relative col-span-2 grid min-w-0 grid-cols-2 gap-2">{t27}{t31}{t35}</div>;
    $[89] = t27;
    $[90] = t31;
    $[91] = t35;
    $[92] = t36;
  } else t36 = $[92];
  let t37;
  if ($[93] !== t26 || $[94] !== t36) {
    t37 = <div className="grid min-w-0 grid-cols-3 gap-2">{t26}{t36}</div>;
    $[93] = t26;
    $[94] = t36;
    $[95] = t37;
  } else t37 = $[95];
  let t38;
  if ($[96] !== t21 || $[97] !== t37) {
    t38 = <InspectorRailRow action={t21}>{t37}</InspectorRailRow>;
    $[96] = t21;
    $[97] = t37;
    $[98] = t38;
  } else t38 = $[98];
  let t39;
  if ($[99] !== readOnly || $[100] !== t38) {
    t39 = <fieldset disabled={readOnly} className="min-w-0 space-y-2">{t38}</fieldset>;
    $[99] = readOnly;
    $[100] = t38;
    $[101] = t39;
  } else t39 = $[101];
  let t40;
  if (true) {
    t40 = <div ref={sectionRef} tabIndex={-1} aria-label={t("styles.scale")} data-scale-section={true} className="outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ed-ring">{<InspectorSection key={selectionKey} title="Scale" reserveActionRail={true} variant="addable" isSet={isSet} onAdd={addScale} onRemove={t15} optimisticOpenOnAdd={false} collapsedAction={t17}>{t39}</InspectorSection>}</div>;
    $[102] = addScale;
    $[103] = isSet;
    $[104] = selectionKey;
    $[105] = t15;
    $[106] = t17;
    $[107] = t39;
    $[108] = t40;
  } else t40 = $[108];
  return t40;
}
function _temp7$8(element_7) {
  const base = removeScaleAnchorTransform(measure(element_7).transform, element_7.scaleAnchorTransform);
  return [element_7.id, removeTransformScale(base)];
}
function _temp6$12(element_6) {
  const {
    transform: transform_0
  } = measure(element_6);
  return [element_6.id, `${transform_0 === "none" ? "" : transform_0} scale(1)`.trim()];
}
function _temp5$14(t0) {
  const {
    scale,
    scaleY,
    transform
  } = t0;
  return Math.abs(scale - 1) > 1e-6 || Math.abs(scaleY - 1) > 1e-6 || /\bscale\(\s*1(?:\.0*)?\s*\)/.test(transform);
}
function _temp4$17(element_5) {
  return element_5.scaleAnchorTransform || element_5.scalePivot;
}
function _temp3$23(element_2) {
  return measure(element_2, true);
}
function _temp2$36(element_0) {
  return element_0.id;
}
function _temp$46(element) {
  return element.id;
}

export { ScaleSection };
