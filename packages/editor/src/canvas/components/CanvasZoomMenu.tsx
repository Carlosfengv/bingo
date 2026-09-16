/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/CanvasZoomMenu.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { LOCAL_SHORTCUTS } from "../../shared/shortcuts/catalog";
import { isTypingTarget, matchesShortcut } from "../../shared/shortcuts/matchShortcut";
import { getPixelGridEnabled, setPixelGridEnabled, subscribePixelGridEnabled } from "../../shared/state/canvasDisplayPreferences";
import { InspectorControlInput, InspectorControlShell } from "../../shell/components/panels/styles/primitives";
import { driveCamera, getCamera, getCameraScale, notifyUserCameraGesture, subscribeCameraScale } from "../../shell/utils/chatShortcuts";
import { getCanvasSpaceRect } from "../utils/domGeometry";
import { CANVAS_ZOOM_STEP, MIN_CANVAS_SCALE, cameraToFit, zoomAtCenter } from "../utils/zoom";
import { getRootIds } from "@bingo/compiler";
import { Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@bingo/ui";
import { CaretDown as s$12 } from "@phosphor-icons/react/dist/icons/CaretDown";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var keepFieldFocus = event => event.preventDefault();
var zoomMenuItemPointerProps = {
  onPointerMove: keepFieldFocus,
  onPointerLeave: keepFieldFocus,
  onMouseDown: keepFieldFocus,
  className: "hover:bg-ed-accent hover:text-ed-accent-foreground"
};
function CanvasZoomMenu(t0) {
  const $ = (0, import_compiler_runtime.c)(87);
  const { t } = useTranslation("editor");
  const {
    store,
    selectedElementIds,
    viewportRef,
    commentsHidden,
    onCommentsHiddenChange
  } = t0;
  const scale = (0, import_react.useSyncExternalStore)(subscribeCameraScale, getCameraScale, _temp$72);
  const pixelGridEnabled = (0, import_react.useSyncExternalStore)(subscribePixelGridEnabled, getPixelGridEnabled, _temp2$51);
  const [open, setOpen] = (0, import_react.useState)(false);
  const [draft, setDraft] = (0, import_react.useState)(null);
  const inputRef = (0, import_react.useRef)(null);
  const menuRef = (0, import_react.useRef)(null);
  let t1;
  if ($[0] !== scale) {
    t1 = Math.round(scale * 100);
    $[0] = scale;
    $[1] = t1;
  } else t1 = $[1];
  const percentage = t1;
  let t2;
  if ($[2] !== viewportRef) {
    t2 = nextScale => {
      const viewport = viewportRef.current;
      if (!viewport || !Number.isFinite(nextScale)) return;
      driveCamera(zoomAtCenter(getCamera(), nextScale, viewport.clientWidth, viewport.clientHeight));
      notifyUserCameraGesture();
    };
    $[2] = viewportRef;
    $[3] = t2;
  } else t2 = $[3];
  const setScale = t2;
  let t3;
  if ($[4] !== viewportRef) {
    t3 = ids => {
      const viewport_0 = viewportRef.current;
      if (!viewport_0) return;
      const camera = cameraToFit(Array.from(ids, getCanvasSpaceRect).filter(_temp3$34), viewport_0.clientWidth, viewport_0.clientHeight);
      if (!camera) return;
      driveCamera(camera);
      notifyUserCameraGesture();
    };
    $[4] = viewportRef;
    $[5] = t3;
  } else t3 = $[5];
  const fit = t3;
  let t4;
  if ($[6] !== fit || $[7] !== selectedElementIds || $[8] !== store) {
    t4 = event => {
      if (event.defaultPrevented || isTypingTarget(event)) return;
      if (matchesShortcut(event, LOCAL_SHORTCUTS.canvas.zoomFit)) {
        event.preventDefault();
        fit(getRootIds(store));
      } else if (matchesShortcut(event, LOCAL_SHORTCUTS.canvas.zoomSelection)) {
        event.preventDefault();
        fit(selectedElementIds);
      }
    };
    $[6] = fit;
    $[7] = selectedElementIds;
    $[8] = store;
    $[9] = t4;
  } else t4 = $[9];
  const handleFitKey = (0, import_react.useEffectEvent)(t4);
  let t5;
  if ($[10] !== handleFitKey) {
    t5 = () => {
      window.addEventListener("keydown", handleFitKey);
      return () => window.removeEventListener("keydown", handleFitKey);
    };
    $[10] = handleFitKey;
    $[11] = t5;
  } else t5 = $[11];
  let t6;
  if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = [];
    $[12] = t6;
  } else t6 = $[12];
  (0, import_react.useEffect)(t5, t6);
  let t7;
  if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = next => {
      setOpen(next);
      setDraft(null);
    };
    $[13] = t7;
  } else t7 = $[13];
  let t8;
  if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = {
      "aria-hidden": true
    };
    $[14] = t8;
  } else t8 = $[14];
  const t9 = t("canvas.zoomStatus", { percent: percentage });
  let t10;
  if ($[15] !== percentage || $[16] !== t9) {
    t10 = <DropdownMenuTrigger asChild={true}>{<Button variant="ghost" size="xs" className="tabular-nums" RightIcon={s$12} rightIconSize={12} rightIconClassName="size-[12px]" rightIconProps={t8} aria-label={t9}>{percentage}%</Button>}</DropdownMenuTrigger>;
    $[15] = percentage;
    $[16] = t9;
    $[17] = t10;
  } else t10 = $[17];
  let t11;
  let t12;
  if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
    t11 = event_0 => {
      if (event_0.target === event_0.currentTarget) queueMicrotask(() => inputRef.current?.focus());
    };
    t12 = event_1 => {
      const firstItem = menuRef.current?.querySelector("[role=\"menuitem\"]:not([data-disabled])");
      if (event_1.key === "ArrowUp" && event_1.target === firstItem) {
        event_1.preventDefault();
        event_1.stopPropagation();
        inputRef.current?.focus();
      }
    };
    $[18] = t11;
    $[19] = t12;
  } else {
    t11 = $[18];
    t12 = $[19];
  }
  let t13;
  if ($[20] !== draft || $[21] !== percentage || $[22] !== setScale) {
    t13 = event_2 => {
      event_2.preventDefault();
      const value = (draft ?? String(percentage)).trim().replace(/%$/, "").trim();
      if (!value || !Number.isFinite(Number(value))) return;
      setScale(Number(value) / 100);
      setOpen(false);
      setDraft(null);
    };
    $[20] = draft;
    $[21] = percentage;
    $[22] = setScale;
    $[23] = t13;
  } else t13 = $[23];
  const t14 = draft ?? `${percentage}%`;
  let t15;
  let t16;
  if ($[24] === Symbol.for("react.memo_cache_sentinel")) {
    t15 = event_3 => setDraft(event_3.target.value);
    t16 = event_4 => {
      if (event_4.nativeEvent.isComposing) return;
      if (event_4.key === "Escape") return;
      event_4.stopPropagation();
      if (event_4.key === "ArrowDown" || event_4.key === "ArrowUp" || event_4.key === "Tab") {
        event_4.preventDefault();
        const items = menuRef.current?.querySelectorAll("[role=\"menuitem\"]:not([data-disabled])");
        (event_4.key === "ArrowUp" || event_4.key === "Tab" && event_4.shiftKey ? items?.[items.length - 1] : items?.[0])?.focus();
      }
    };
    $[24] = t15;
    $[25] = t16;
  } else {
    t15 = $[24];
    t16 = $[25];
  }
  let t17;
  if (true) {
    t17 = <InspectorControlShell>{<InspectorControlInput ref={inputRef} aria-label={t("canvas.zoomPercentage")} className="px-2 tabular-nums" inputMode="decimal" value={t14} onChange={t15} onKeyDown={t16} />}</InspectorControlShell>;
    $[26] = t14;
    $[27] = t17;
  } else t17 = $[27];
  let t18;
  if ($[28] !== t13 || $[29] !== t17) {
    t18 = <form className="p-1.5" onSubmit={t13}>{t17}</form>;
    $[28] = t13;
    $[29] = t17;
    $[30] = t18;
  } else t18 = $[30];
  let t19;
  if ($[31] === Symbol.for("react.memo_cache_sentinel")) {
    t19 = <DropdownMenuSeparator />;
    $[31] = t19;
  } else t19 = $[31];
  const t20 = scale >= 256;
  let t21;
  if ($[32] !== setScale) {
    t21 = () => setScale(getCameraScale() * CANVAS_ZOOM_STEP);
    $[32] = setScale;
    $[33] = t21;
  } else t21 = $[33];
  let t22;
  if ($[34] === Symbol.for("react.memo_cache_sentinel")) {
    t22 = <DropdownMenuShortcut>{LOCAL_SHORTCUTS.canvas.zoomIn.keyLabel}</DropdownMenuShortcut>;
    $[34] = t22;
  } else t22 = $[34];
  let t23;
  if (true) {
    t23 = <DropdownMenuItem {...zoomMenuItemPointerProps} disabled={t20} onSelect={t21}>{t("canvas.zoomIn")} {t22}</DropdownMenuItem>;
    $[35] = t20;
    $[36] = t21;
    $[37] = t23;
  } else t23 = $[37];
  const t24 = scale <= MIN_CANVAS_SCALE;
  let t25;
  if ($[38] !== setScale) {
    t25 = () => setScale(getCameraScale() / CANVAS_ZOOM_STEP);
    $[38] = setScale;
    $[39] = t25;
  } else t25 = $[39];
  let t26;
  if ($[40] === Symbol.for("react.memo_cache_sentinel")) {
    t26 = <DropdownMenuShortcut>{LOCAL_SHORTCUTS.canvas.zoomOut.keyLabel}</DropdownMenuShortcut>;
    $[40] = t26;
  } else t26 = $[40];
  let t27;
  if (true) {
    t27 = <DropdownMenuItem {...zoomMenuItemPointerProps} disabled={t24} onSelect={t25}>{t("canvas.zoomOut")} {t26}</DropdownMenuItem>;
    $[41] = t24;
    $[42] = t25;
    $[43] = t27;
  } else t27 = $[43];
  let t28;
  if ($[44] !== store) {
    t28 = getRootIds(store);
    $[44] = store;
    $[45] = t28;
  } else t28 = $[45];
  const t29 = t28.length === 0;
  let t30;
  if ($[46] !== fit || $[47] !== store) {
    t30 = () => fit(getRootIds(store));
    $[46] = fit;
    $[47] = store;
    $[48] = t30;
  } else t30 = $[48];
  let t31;
  if ($[49] === Symbol.for("react.memo_cache_sentinel")) {
    t31 = <DropdownMenuShortcut>{LOCAL_SHORTCUTS.canvas.zoomFit.keyLabel}</DropdownMenuShortcut>;
    $[49] = t31;
  } else t31 = $[49];
  let t32;
  if (true) {
    t32 = <DropdownMenuItem {...zoomMenuItemPointerProps} disabled={t29} onSelect={t30}>{t("canvas.zoomToFit")} {t31}</DropdownMenuItem>;
    $[50] = t29;
    $[51] = t30;
    $[52] = t32;
  } else t32 = $[52];
  const t33 = selectedElementIds.size === 0;
  let t34;
  if ($[53] !== fit || $[54] !== selectedElementIds) {
    t34 = () => fit(selectedElementIds);
    $[53] = fit;
    $[54] = selectedElementIds;
    $[55] = t34;
  } else t34 = $[55];
  let t35;
  if ($[56] === Symbol.for("react.memo_cache_sentinel")) {
    t35 = <DropdownMenuShortcut>{LOCAL_SHORTCUTS.canvas.zoomSelection.keyLabel}</DropdownMenuShortcut>;
    $[56] = t35;
  } else t35 = $[56];
  let t36;
  if (true) {
    t36 = <DropdownMenuItem {...zoomMenuItemPointerProps} disabled={t33} onSelect={t34}>{t("canvas.zoomToSelection")} {t35}</DropdownMenuItem>;
    $[57] = t33;
    $[58] = t34;
    $[59] = t36;
  } else t36 = $[59];
  let t37;
  let t38;
  if ($[60] === Symbol.for("react.memo_cache_sentinel")) {
    t37 = <DropdownMenuSeparator />;
    t38 = [50, 100, 200];
    $[60] = t37;
    $[61] = t38;
  } else {
    t37 = $[60];
    t38 = $[61];
  }
  let t39;
  if (true) {
    t39 = t38.map(value_0 => (0, import_react.createElement)(DropdownMenuItem, {
      ...zoomMenuItemPointerProps,
      key: value_0,
      onSelect: () => setScale(value_0 / 100)
    }, t("canvas.zoomToPercent", { percent: value_0 }), value_0 === 100 && <DropdownMenuShortcut>{LOCAL_SHORTCUTS.canvas.zoomActual.keyLabel}</DropdownMenuShortcut>));
    $[62] = setScale;
    $[63] = t39;
  } else t39 = $[63];
  let t40;
  if ($[64] === Symbol.for("react.memo_cache_sentinel")) {
    t40 = <DropdownMenuSeparator />;
    $[64] = t40;
  } else t40 = $[64];
  const t41 = !commentsHidden;
  let t42;
  if ($[65] !== onCommentsHiddenChange) {
    t42 = checked => onCommentsHiddenChange(checked !== true);
    $[65] = onCommentsHiddenChange;
    $[66] = t42;
  } else t42 = $[66];
  let t43;
  if (true) {
    t43 = <DropdownMenuCheckboxItem {...zoomMenuItemPointerProps} checked={t41} onCheckedChange={t42} onSelect={_temp4$28}>{t("canvas.comments")}</DropdownMenuCheckboxItem>;
    $[67] = t41;
    $[68] = t42;
    $[69] = t43;
  } else t43 = $[69];
  let t44;
  if (true) {
    t44 = <DropdownMenuCheckboxItem {...zoomMenuItemPointerProps} checked={pixelGridEnabled} onCheckedChange={_temp5$23} onSelect={_temp6$20}>{t("canvas.pixelGrid")}</DropdownMenuCheckboxItem>;
    $[70] = pixelGridEnabled;
    $[71] = t44;
  } else t44 = $[71];
  let t45;
  let t46;
  if (true) {
    t45 = <DropdownMenuSeparator />;
    t46 = <DropdownMenuItem {...zoomMenuItemPointerProps} onSelect={_temp7$14}>{t("canvas.recenter")}</DropdownMenuItem>;
    $[72] = t45;
    $[73] = t46;
  } else {
    t45 = $[72];
    t46 = $[73];
  }
  let t47;
  if (true) {
    t47 = <DropdownMenuContent ref={menuRef} align="end" className="w-56" aria-label={t("canvas.zoomMenu")} onFocusCapture={t11} onKeyDownCapture={t12}>{t18}{t19}{t23}{t27}{t32}{t36}{t37}{t39}{t40}{t43}{t44}{t45}{t46}</DropdownMenuContent>;
    $[74] = t18;
    $[75] = t23;
    $[76] = t27;
    $[77] = t32;
    $[78] = t36;
    $[79] = t39;
    $[80] = t43;
    $[81] = t44;
    $[82] = t47;
  } else t47 = $[82];
  let t48;
  if ($[83] !== open || $[84] !== t10 || $[85] !== t47) {
    t48 = <DropdownMenu open={open} onOpenChange={t7}>{t10}{t47}</DropdownMenu>;
    $[83] = open;
    $[84] = t10;
    $[85] = t47;
    $[86] = t48;
  } else t48 = $[86];
  return t48;
}
function _temp7$14() {
  driveCamera({
    scale: 1,
    positionX: 0,
    positionY: 0
  });
  notifyUserCameraGesture();
}
function _temp6$20(event_6) {
  return event_6.preventDefault();
}
function _temp5$23(checked_0) {
  return setPixelGridEnabled(checked_0 === true);
}
function _temp4$28(event_5) {
  return event_5.preventDefault();
}
function _temp3$34(rect) {
  return rect !== null;
}
function _temp2$51() {
  return true;
}
function _temp$72() {
  return 1;
}

export { CanvasZoomMenu };
