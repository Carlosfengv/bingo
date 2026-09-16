/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/WebviewEditPanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useWebviewEditState, webviewEditStore } from "../../../shared/state/webviewEditStore";
import { StylesPanelTabs } from "./StylesPanelTabs";
import { ensureV2 } from "@bingo/compiler";
import { CodeIcon, LightningIcon, ScrollArea, Tooltip, TooltipContent, TooltipTrigger } from "@bingo/ui";
import { ArrowCounterClockwise as i$7 } from "@phosphor-icons/react/dist/icons/ArrowCounterClockwise";
import { CursorClick as m$6 } from "@phosphor-icons/react/dist/icons/CursorClick";
import { useTranslation } from "@bingo/i18n";
import { Panel, PanelGroup as PanelGroup$1, PanelResizeHandle } from "react-resizable-panels";
import * as import_compiler_runtime from "react/compiler-runtime";
import * as import_jsx_runtime from "react/jsx-runtime";

/**
* WebviewEditPanel — right-sidebar controls + change list for a live-webview
* edit session. The webview itself renders on the canvas (WebviewRenderer);
* all of its chrome lives here so the canvas frame stays clean.
*
* Reads/drives the shared webviewEditStore. Shows:
*   - mode controls (Interactive / Refresh)
*   - the current selection + its tier badge (Direct edit vs Requires AI)
*   - the categorized change list (deterministic vs AI)
*/
var LIVE_ID = "live-tweak";
/** Common device viewport presets for the webview size. */
var SIZE_PRESETS = [{
  name: "iPhone",
  w: 390,
  h: 844
}, {
  name: "iPad",
  w: 834,
  h: 1112
}, {
  name: "Laptop",
  w: 1280,
  h: 800
}, {
  name: "MacBook Pro 14\"",
  w: 1512,
  h: 982
}, {
  name: "Desktop",
  w: 1920,
  h: 1080
}];
function Pill(t0) {
  const $ = (0, import_compiler_runtime.c)(10);
  const {
    active,
    onClick,
    tip,
    children
  } = t0;
  const t1 = active ? "bg-ed-foreground text-ed-background border-transparent" : "border-ed-border text-ed-foreground hover:bg-ed-accent";
  let t2;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = {
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      height: 26,
      padding: "0 8px",
      borderRadius: 7,
      borderWidth: 1,
      borderStyle: "solid",
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 500,
      whiteSpace: "nowrap"
    };
    $[0] = t2;
  } else t2 = $[0];
  let t3;
  if ($[1] !== children || $[2] !== onClick || $[3] !== t1) {
    t3 = <TooltipTrigger asChild={true}>{<button onClick={onClick} className={t1} style={t2}>{children}</button>}</TooltipTrigger>;
    $[1] = children;
    $[2] = onClick;
    $[3] = t1;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] !== tip) {
    t4 = <TooltipContent side="bottom">{tip}</TooltipContent>;
    $[5] = tip;
    $[6] = t4;
  } else t4 = $[6];
  let t5;
  if ($[7] !== t3 || $[8] !== t4) {
    t5 = <Tooltip>{t3}{t4}</Tooltip>;
    $[7] = t3;
    $[8] = t4;
    $[9] = t5;
  } else t5 = $[9];
  return t5;
}
/**
* The real Styles panel, reused for a LIVE element. Builds a synthetic store
* from the selection and routes the panel's class/style outputs to deterministic
* source edits. This is a SEPARATE instance from the canvas one — same component,
* different inputs — so canvas styling behavior is untouched.
*/
function LiveStylesPanel(t0) {
  const $ = (0, import_compiler_runtime.c)(5);
  const {
    selection
  } = t0;
  const t1 = selection.tag || "div";
  let t2;
  if ($[0] !== selection.className || $[1] !== t1) {
    t2 = ensureV2([{
      id: LIVE_ID,
      type: "html",
      tag: t1,
      props: {
        className: selection.className
      },
      styles: {},
      children: []
    }]);
    $[0] = selection.className;
    $[1] = t1;
    $[2] = t2;
  } else t2 = $[2];
  const store = t2;
  let t3;
  if ($[3] !== store) {
    t3 = <StylesPanelTabs selectedElementId={LIVE_ID} store={store} onUpdateElementStyles={_temp$30} onUpdateElementProps={_temp2$22} />;
    $[3] = store;
    $[4] = t3;
  } else t3 = $[4];
  return t3;
}
function _temp2$22(_id_0, props) {
  if (typeof props.className === "string") webviewEditStore.getActions()?.applyClassName(props.className);
}
function _temp$30(_id, styles) {
  const out = {};
  for (const [k, v] of Object.entries(styles)) if (v != null) out[k] = String(v);
  if (Object.keys(out).length) webviewEditStore.getActions()?.applyStyles(out);
}
function TierBadge(t0) {
  const $ = (0, import_compiler_runtime.c)(3);
  const { t } = useTranslation("editor");
  const {
    tier
  } = t0;
  if (tier === "direct") {
    let t1;
    if (true) {
      t1 = <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{
        background: "rgba(34,197,94,0.12)",
        color: "#16a34a"
      }}>{<CodeIcon width={12} height={12} />} {t("webview.directEdit")}</span>;
      $[0] = t1;
    } else t1 = $[0];
    return t1;
  }
  if (tier === "ai") {
    let t1;
    if (true) {
      t1 = <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{
        background: "rgba(168,85,247,0.12)",
        color: "#9333ea"
      }}>{<LightningIcon width={12} height={12} />} {t("webview.requiresAi")}</span>;
      $[1] = t1;
    } else t1 = $[1];
    return t1;
  }
  let t1;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-ed-muted-foreground" style={{
      background: "var(--ed-accent, rgba(0,0,0,0.06))"
    }}>…</span>;
    $[2] = t1;
  } else t1 = $[2];
  return t1;
}
function WebviewEditPanel(t0) {
  const $ = (0, import_compiler_runtime.c)(84);
  const { t } = useTranslation("editor");
  let t1;
  if ($[0] !== t0) {
    t1 = t0 === void 0 ? {} : t0;
    $[0] = t0;
    $[1] = t1;
  } else t1 = $[1];
  const {
    onNavigate
  } = t1;
  const s = useWebviewEditState();
  let t2;
  if ($[2] !== onNavigate || $[3] !== s.webviewUrl) {
    t2 = url => {
      const next = url.trim();
      if (!next || next === s.webviewUrl) return;
      if (onNavigate) onNavigate(next);else webviewEditStore.getActions()?.navigate(next);
    };
    $[2] = onNavigate;
    $[3] = s.webviewUrl;
    $[4] = t2;
  } else t2 = $[4];
  const goTo = t2;
  let t3;
  if ($[5] !== s.changes) {
    t3 = s.changes.filter(_temp3$13);
    $[5] = s.changes;
    $[6] = t3;
  } else t3 = $[6];
  const direct = t3;
  let t4;
  if ($[7] !== s.changes) {
    t4 = s.changes.filter(_temp4$12);
    $[7] = s.changes;
    $[8] = t4;
  } else t4 = $[8];
  const ai = t4;
  let t5;
  if (true) {
    t5 = <div className="text-[10px] uppercase tracking-wide text-ed-muted-foreground mb-1.5">{t("webview.actions")}</div>;
    $[9] = t5;
  } else t5 = $[9];
  let t6;
  if ($[10] !== s.interactive) {
    t6 = () => webviewEditStore.setInteractive(!s.interactive);
    $[10] = s.interactive;
    $[11] = t6;
  } else t6 = $[11];
  const t7 = s.interactive ? "fill" : "regular";
  let t8;
  if ($[12] !== t7) {
    t8 = (0, import_jsx_runtime.jsx)(m$6, {
      size: 13,
      weight: t7
    });
    $[12] = t7;
    $[13] = t8;
  } else t8 = $[13];
  let t9;
  if (true) {
    t9 = <div className="px-3 py-2 border-b border-ed-border shrink-0">{t5}{<div className="flex flex-wrap items-center gap-1.5">{<Pill active={s.interactive} onClick={t6} tip={t("webview.interactiveHint")}>{t8} {t("webview.interactive")}</Pill>}</div>}</div>;
    $[14] = s.interactive;
    $[15] = t6;
    $[16] = t8;
    $[17] = t9;
  } else t9 = $[17];
  let t10;
  if (true) {
    t10 = <span className="text-[11px] text-ed-muted-foreground w-[28px]">{t("webview.url")}</span>;
    $[18] = t10;
  } else t10 = $[18];
  let t11;
  let t12;
  if ($[19] !== goTo) {
    t11 = e => {
      if (!e.nativeEvent.isComposing && e.key === "Enter") goTo(e.target.value);
    };
    t12 = e_0 => goTo(e_0.target.value);
    $[19] = goTo;
    $[20] = t11;
    $[21] = t12;
  } else {
    t11 = $[20];
    t12 = $[21];
  }
  let t13;
  if ($[22] !== s.webviewUrl || $[23] !== t11 || $[24] !== t12) {
    t13 = <input key={s.webviewUrl} defaultValue={s.webviewUrl} className="flex-1 px-2 py-1 rounded-md border border-ed-border bg-ed-background text-[11px]" onKeyDown={t11} onBlur={t12} />;
    $[22] = s.webviewUrl;
    $[23] = t11;
    $[24] = t12;
    $[25] = t13;
  } else t13 = $[25];
  let t14;
  if (true) {
    t14 = <Tooltip content={t("webview.reload")}>{<button type="button" aria-label={t("webview.reload")} onClick={_temp5$9} className="border-ed-border text-ed-muted-foreground hover:bg-ed-accent hover:text-ed-foreground" style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        borderRadius: 7,
        borderWidth: 1,
        borderStyle: "solid",
        cursor: "pointer"
      }}>{(0, import_jsx_runtime.jsx)(i$7, {
          size: 14
        })}</button>}</Tooltip>;
    $[26] = t14;
  } else t14 = $[26];
  let t15;
  if ($[27] !== t13) {
    t15 = <div className="flex items-center gap-1.5">{t10}{t13}{t14}</div>;
    $[27] = t13;
    $[28] = t15;
  } else t15 = $[28];
  let t16;
  if (true) {
    t16 = <span className="text-[11px] text-ed-muted-foreground w-[28px]">{t("webview.size")}</span>;
    $[29] = t16;
  } else t16 = $[29];
  const t17 = s.webviewWidth || "";
  const t18 = "w" + s.webviewWidth;
  let t19;
  if ($[30] !== s.webviewHeight || $[31] !== s.webviewWidth) {
    t19 = e_1 => webviewEditStore.getActions()?.setSize(Number(e_1.target.value) || s.webviewWidth, s.webviewHeight);
    $[30] = s.webviewHeight;
    $[31] = s.webviewWidth;
    $[32] = t19;
  } else t19 = $[32];
  let t20;
  if ($[33] !== t17 || $[34] !== t18 || $[35] !== t19) {
    t20 = <input key={t18} type="number" defaultValue={t17} className="flex-1 min-w-0 px-2 py-1 rounded-md border border-ed-border bg-ed-background text-[11px]" onBlur={t19} />;
    $[33] = t17;
    $[34] = t18;
    $[35] = t19;
    $[36] = t20;
  } else t20 = $[36];
  let t21;
  if ($[37] === Symbol.for("react.memo_cache_sentinel")) {
    t21 = <span className="text-[11px] text-ed-muted-foreground">×</span>;
    $[37] = t21;
  } else t21 = $[37];
  const t22 = s.webviewHeight || "";
  const t23 = "h" + s.webviewHeight;
  let t24;
  if ($[38] !== s.webviewHeight || $[39] !== s.webviewWidth) {
    t24 = e_2 => webviewEditStore.getActions()?.setSize(s.webviewWidth, Number(e_2.target.value) || s.webviewHeight);
    $[38] = s.webviewHeight;
    $[39] = s.webviewWidth;
    $[40] = t24;
  } else t24 = $[40];
  let t25;
  if ($[41] !== t22 || $[42] !== t23 || $[43] !== t24) {
    t25 = <input key={t23} type="number" defaultValue={t22} className="flex-1 min-w-0 px-2 py-1 rounded-md border border-ed-border bg-ed-background text-[11px]" onBlur={t24} />;
    $[41] = t22;
    $[42] = t23;
    $[43] = t24;
    $[44] = t25;
  } else t25 = $[44];
  let t26;
  if ($[45] !== t20 || $[46] !== t25) {
    t26 = <div className="flex items-center gap-1.5">{t16}{t20}{t21}{t25}</div>;
    $[45] = t20;
    $[46] = t25;
    $[47] = t26;
  } else t26 = $[47];
  let t27;
  if ($[48] === Symbol.for("react.memo_cache_sentinel")) {
    t27 = <span className="text-[11px] text-ed-muted-foreground w-[28px]" />;
    $[48] = t27;
  } else t27 = $[48];
  let t28;
  if ($[49] !== s.webviewHeight || $[50] !== s.webviewWidth) {
    t28 = SIZE_PRESETS.find(p => p.w === s.webviewWidth && p.h === s.webviewHeight)?.name ?? "";
    $[49] = s.webviewHeight;
    $[50] = s.webviewWidth;
    $[51] = t28;
  } else t28 = $[51];
  let t29;
  let t30;
  if (true) {
    t29 = <option value="">{t("webview.preset")}</option>;
    t30 = SIZE_PRESETS.map(preset => <option key={preset.name} value={preset.name}>{preset.name === "Laptop" ? t("webview.laptop") : preset.name === "Desktop" ? t("webview.desktop") : preset.name}</option>);
    $[52] = t29;
    $[53] = t30;
  } else {
    t29 = $[52];
    t30 = $[53];
  }
  let t31;
  if (true) {
    t31 = <div className="flex items-center gap-1.5">{t27}{<select value={t28} onChange={_temp6$7} className="flex-1 min-w-0 px-1.5 py-1 rounded-md border border-ed-border bg-ed-background text-[11px]">{t29}{t30}</select>}</div>;
    $[54] = t28;
    $[55] = t31;
  } else t31 = $[55];
  let t32;
  if ($[56] !== t15 || $[57] !== t26 || $[58] !== t31) {
    t32 = <div className="px-3 py-2 border-b border-ed-border shrink-0 flex flex-col gap-1.5">{t15}{t26}{t31}</div>;
    $[56] = t15;
    $[57] = t26;
    $[58] = t31;
    $[59] = t32;
  } else t32 = $[59];
  let t33;
  if (true) {
    t33 = s.mode === "edit" && <div className="px-3 py-2.5 border-b border-ed-border shrink-0">{!s.selection ? <div className="text-[12px] text-ed-muted-foreground">{t("webview.selectElement")}</div> : <div className="flex flex-col gap-1.5">{<div className="flex items-center justify-between gap-2">{<span className="text-[13px] font-semibold">{`<${s.selection.tag}>`}</span>}{<TierBadge tier={s.selection.tier} />}</div>}{<span className="text-[11px] text-ed-muted-foreground truncate">{s.selection.src ? `${s.selection.src.filePath.split("/").slice(-1)[0]}:${s.selection.src.lineNumber}` : t(s.selection.resolveState === "failed" ? "webview.sourceNotFound" : "webview.resolvingSource")}</span>}{s.selection.resolveState === "failed" && <span className="text-[11px]" style={{
          color: "#d97706"
        }}>{t("webview.sourceUnsupported")}</span>}{s.selection.tier === "ai" && <span className="text-[11px] text-ed-muted-foreground">{t("webview.aiStyleHint")}</span>}{s.selection.resolveState === "resolved" && s.selection.tier !== "ai" && s.selection.text != null && <div className="mt-1.5">{<span className="text-[12px] text-ed-muted-foreground">{t("webview.text")}</span>}{<input key={s.selection.text ?? ""} defaultValue={s.selection.text} className="w-full mt-1 px-2 py-1.5 rounded-md border border-ed-border bg-ed-background text-[12px]" onKeyDown={_temp8$3} onBlur={e_5 => {
            if (e_5.target.value !== s.selection.text) webviewEditStore.getActions()?.commitText(e_5.target.value);
          }} />}</div>}</div>}</div>;
    $[60] = s.mode;
    $[61] = s.selection;
    $[62] = t33;
  } else t33 = $[62];
  let t34;
  if (true) {
    t34 = s.syncing && <div className="px-3 py-2 border-b border-ed-border shrink-0 text-[12px] flex items-center gap-2" style={{
      color: "#2563eb"
    }}>{<span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />}{t("webview.syncing")}</div>;
    $[63] = s.syncing;
    $[64] = t34;
  } else t34 = $[64];
  let t35;
  if ($[65] !== s.status || $[66] !== s.syncing) {
    t35 = s.status && !s.syncing && <div className="px-3 py-2 border-b border-ed-border shrink-0 text-[12px]" style={{
      color: "#d97706"
    }}>{s.status}</div>;
    $[65] = s.status;
    $[66] = s.syncing;
    $[67] = t35;
  } else t35 = $[67];
  let t36;
  if (true) {
    t36 = s.changes.some(_temp9$3) && <div className="px-3 py-2 border-b border-ed-border shrink-0">{<button onClick={_temp0$2} className="w-full bg-ed-foreground text-ed-background hover:opacity-90" style={{
        height: 32,
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600
      }}>{t("webview.saveCount", { count: s.changes.filter(_temp1$2).length })}</button>}{<div className="text-[10px] text-ed-muted-foreground mt-1 text-center">{t("webview.saveHint")}</div>}</div>;
    $[68] = s.changes;
    $[69] = t36;
  } else t36 = $[69];
  let t37;
  if ($[70] !== ai || $[71] !== direct || $[72] !== s.changes.length || $[73] !== s.mode || $[74] !== s.selection) {
    t37 = s.mode === "edit" && (s.selection && s.selection.tier !== "ai" && s.selection.resolveState === "resolved" ? <PanelGroup$1 direction="vertical" autoSaveId="webview-changes-styles" className="flex-1 min-h-0">{<Panel defaultSize={30} minSize={10}>{<ChangesList direct={direct} ai={ai} count={s.changes.length} />}</Panel>}{<PanelResizeHandle className="h-px bg-ed-border cursor-row-resize" />}{<Panel defaultSize={70} minSize={20}>{<ScrollArea className="h-full">{<LiveStylesPanel selection={s.selection} />}</ScrollArea>}</Panel>}</PanelGroup$1> : <div className="flex-1 min-h-0">{<ChangesList direct={direct} ai={ai} count={s.changes.length} />}</div>);
    $[70] = ai;
    $[71] = direct;
    $[72] = s.changes.length;
    $[73] = s.mode;
    $[74] = s.selection;
    $[75] = t37;
  } else t37 = $[75];
  let t38;
  if ($[76] !== t32 || $[77] !== t33 || $[78] !== t34 || $[79] !== t35 || $[80] !== t36 || $[81] !== t37 || $[82] !== t9) {
    t38 = <div className="h-full flex flex-col overflow-hidden text-ed-foreground">{t9}{t32}{t33}{t34}{t35}{t36}{t37}</div>;
    $[76] = t32;
    $[77] = t33;
    $[78] = t34;
    $[79] = t35;
    $[80] = t36;
    $[81] = t37;
    $[82] = t9;
    $[83] = t38;
  } else t38 = $[83];
  return t38;
}
function _temp1$2(c_1) {
  return !c_1.saved;
}
function _temp0$2() {
  return webviewEditStore.getActions()?.saveToCode();
}
function _temp9$3(c_2) {
  return !c_2.saved;
}
function _temp8$3(e_4) {
  if (!e_4.nativeEvent.isComposing && e_4.key === "Enter") webviewEditStore.getActions()?.commitText(e_4.target.value);
}
function _temp7$4(p_1) {
  return <option key={p_1.name} value={p_1.name}>{p_1.name}</option>;
}
function _temp6$7(e_3) {
  const p_0 = SIZE_PRESETS.find(x => x.name === e_3.target.value);
  if (p_0) webviewEditStore.getActions()?.setSize(p_0.w, p_0.h);
}
function _temp5$9() {
  return webviewEditStore.requestRefresh();
}
function _temp4$12(c_0) {
  return c_0.tier === "ai";
}
function _temp3$13(c) {
  return c.tier === "direct";
}
function ChangesList(t0) {
  const $ = (0, import_compiler_runtime.c)(12);
  const { t } = useTranslation("editor");
  const {
    direct,
    ai,
    count
  } = t0;
  let t1;
  if (true) {
    t1 = <span className="text-[12px] font-medium">{t("webview.changes")}</span>;
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if (true) {
    t2 = count > 0 && <button className="text-[11px] text-ed-muted-foreground hover:text-ed-foreground" onClick={_temp10$2}>{t("webview.clear")}</button>;
    $[1] = count;
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if ($[3] !== t2) {
    t3 = <div className="flex items-center justify-between mb-2">{t1}{t2}</div>;
    $[3] = t2;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if (true) {
    t4 = count === 0 ? <div className="text-[12px] text-ed-muted-foreground">{t("webview.noChanges")}</div> : <div className="flex flex-col gap-3">{<ChangeGroup title={t("webview.directGroup")} tier="direct" changes={direct} />}{<ChangeGroup title={t("webview.aiGroup")} tier="ai" changes={ai} />}</div>;
    $[5] = ai;
    $[6] = count;
    $[7] = direct;
    $[8] = t4;
  } else t4 = $[8];
  let t5;
  if ($[9] !== t3 || $[10] !== t4) {
    t5 = <ScrollArea className="h-full" viewportClassName="p-3">{t3}{t4}</ScrollArea>;
    $[9] = t3;
    $[10] = t4;
    $[11] = t5;
  } else t5 = $[11];
  return t5;
}
function _temp10$2() {
  return webviewEditStore.getActions()?.discardChanges();
}
function ChangeGroup(t0) {
  const $ = (0, import_compiler_runtime.c)(14);
  const {
    title,
    tier,
    changes
  } = t0;
  if (changes.length === 0) return null;
  let t1;
  if ($[0] !== tier) {
    t1 = <TierBadge tier={tier} />;
    $[0] = tier;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== title) {
    t2 = <span className="text-[11px] text-ed-muted-foreground">{title}</span>;
    $[2] = title;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== t1 || $[5] !== t2) {
    t3 = <div className="flex items-center gap-2 mb-1.5">{t1}{t2}</div>;
    $[4] = t1;
    $[5] = t2;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== changes) {
    t4 = changes.map(c => <ChangeRow key={c.id} change={c} />);
    $[7] = changes;
    $[8] = t4;
  } else t4 = $[8];
  let t5;
  if ($[9] !== t4) {
    t5 = <div className="flex flex-col gap-1">{t4}</div>;
    $[9] = t4;
    $[10] = t5;
  } else t5 = $[10];
  let t6;
  if ($[11] !== t3 || $[12] !== t5) {
    t6 = <div>{t3}{t5}</div>;
    $[11] = t3;
    $[12] = t5;
    $[13] = t6;
  } else t6 = $[13];
  return t6;
}
function ChangeRow({ change: c }) {
  const { t } = useTranslation("editor");
  return <div className="rounded-md border border-ed-border px-2.5 py-1.5">{<div className="flex items-center justify-between gap-2">{<span className="text-[12px] font-medium truncate">{c.label}</span>}{<span className="text-[10px] text-ed-muted-foreground">{t(c.saved ? "webview.saved" : "webview.staged")}</span>}</div>}{<div className="text-[11px] text-ed-muted-foreground">{c.property}: {<span className="line-through">{c.before || "∅"}</span>} → {c.after}</div>}</div>;
}

export { WebviewEditPanel };
