/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/PagePanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useClassesForProperty } from "../../hooks/useClassSuggestions";
import { ColorRow } from "./styles/inputs/ColorRow";
import { TokenRow } from "./styles/sections/BackgroundSection";
import { InspectorSection } from "./styles/sections/InspectorSection";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Fallback shown (and painted) when the page has no explicit color — the
* canvas area's default. Resolved to a concrete color for display by ColorRow. */
var DEFAULT_PAGE_BACKGROUND = "var(--ed-canvas-background)";
/** Page settings shown in the right inspector when nothing is selected.
* The background field mirrors an element's base background fill: a library
* pick links the token (TokenRow with unlink), otherwise it's a plain ColorRow. */
function PagePanel(t0) {
  const $ = (0, import_compiler_runtime.c)(22);
  const {
    backgroundColor,
    backgroundToken,
    onChangeBackground,
    disabled: t1
  } = t0;
  const disabled = t1 === void 0 ? false : t1;
  const bgSuggestions = useClassesForProperty("backgroundColor");
  const [pickerOpen, setPickerOpen] = import_react.useState(false);
  let t2;
  if ($[0] !== bgSuggestions || $[1] !== onChangeBackground) {
    t2 = cls => {
      const s = bgSuggestions.find(x => x.className === cls);
      if (s) onChangeBackground(s.rawValue ?? s.value, cls);
    };
    $[0] = bgSuggestions;
    $[1] = onChangeBackground;
    $[2] = t2;
  } else t2 = $[2];
  const pickToken = t2;
  let t3;
  if ($[3] !== backgroundColor || $[4] !== backgroundToken || $[5] !== bgSuggestions || $[6] !== onChangeBackground) {
    t3 = () => {
      const s_0 = backgroundToken ? bgSuggestions.find(x_0 => x_0.className === backgroundToken) : void 0;
      onChangeBackground(s_0?.value ?? backgroundColor ?? DEFAULT_PAGE_BACKGROUND, void 0);
    };
    $[3] = backgroundColor;
    $[4] = backgroundToken;
    $[5] = bgSuggestions;
    $[6] = onChangeBackground;
    $[7] = t3;
  } else t3 = $[7];
  const unlink = t3;
  const t4 = disabled ? "pointer-events-none shrink-0 opacity-50" : "shrink-0";
  const t5 = disabled || void 0;
  const t6 = disabled || void 0;
  const t7 = disabled || void 0;
  let t8;
  if ($[8] !== backgroundColor || $[9] !== backgroundToken || $[10] !== bgSuggestions || $[11] !== onChangeBackground || $[12] !== pickToken || $[13] !== pickerOpen || $[14] !== unlink) {
    t8 = <InspectorSection title="Background">{backgroundToken ? <TokenRow token={backgroundToken} color={backgroundColor ?? DEFAULT_PAGE_BACKGROUND} suggestions={bgSuggestions} open={pickerOpen} onOpenChange={setPickerOpen} onPick={pickToken} onUnlink={unlink} /> : <ColorRow label="Background" hideLabel={true} value={backgroundColor ?? DEFAULT_PAGE_BACKGROUND} cssProperty="backgroundColor" onChange={v => onChangeBackground(v, void 0)} onSelectClass={pickToken} />}</InspectorSection>;
    $[8] = backgroundColor;
    $[9] = backgroundToken;
    $[10] = bgSuggestions;
    $[11] = onChangeBackground;
    $[12] = pickToken;
    $[13] = pickerOpen;
    $[14] = unlink;
    $[15] = t8;
  } else t8 = $[15];
  let t9;
  if ($[16] !== t4 || $[17] !== t5 || $[18] !== t6 || $[19] !== t7 || $[20] !== t8) {
    t9 = <div className={t4} data-text-edit-safe="true" aria-disabled={t5} aria-busy={t6} inert={t7}>{t8}</div>;
    $[16] = t4;
    $[17] = t5;
    $[18] = t6;
    $[19] = t7;
    $[20] = t8;
    $[21] = t9;
  } else t9 = $[21];
  return t9;
}
var PAGE_ROW_HEIGHT = 26;
var PAGE_ROW_GAP = 2;
var LAYERS_MIN_HEIGHT = 80;
var RESIZE_HANDLE_HEIGHT = 1;
function getPagesPanelSizes(pageCount, sidebarHeight, preferredHeight) {
  const contentHeight = 48 + pageCount * PAGE_ROW_HEIGHT + Math.max(0, pageCount - 1) * PAGE_ROW_GAP;
  const availableHeight = sidebarHeight > 0 ? Math.max(40, sidebarHeight - LAYERS_MIN_HEIGHT - RESIZE_HANDLE_HEIGHT) : contentHeight;
  const maxHeight = Math.min(contentHeight, availableHeight);
  const minHeight = Math.min(maxHeight, 74);
  return {
    minHeight,
    maxHeight,
    height: Math.max(minHeight, Math.min(preferredHeight ?? contentHeight, maxHeight))
  };
}

export { PagePanel, getPagesPanelSizes };
