/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/CapturedPageRenderer.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getRememberedRoot, setRememberedRoot } from "../../shared/lib/projectRootStore";
import { describeOperation, squashOperations, useOperationLog } from "../../shared/utils/captureStore";
import { detectRepoRootFromCapture } from "../utils/fiberExtract";
import { renderElement } from "../utils/renderElement";
import { useDraggable } from "@dnd-kit/core";
import { getChildren$2, storeSubtreeToLegacyNested, walk } from "@bingo/compiler";
import { Button, Dialog, DialogContent, Text$4 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* CapturedPageRenderer — renders a captured page element in the Edit frame
* with a browser-chrome toolbar and a changes sidebar.
*/
/** POSIX `/foo` or Windows `C:\foo` / `C:/foo`. */
function isAbsolutePath(p) {
  if (!p) return false;
  if (p.startsWith("/")) return true;
  return /^[a-zA-Z]:[\\/]/.test(p);
}
function CapturedPageRenderer({
  element,
  store,
  options
}) {
  const { t } = useTranslation("editor");
  const sourceUrl = element.props?.["data-source-url"] || "";
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging
  } = useDraggable({
    id: element.id
  });
  const componentNames = (0, import_react.useMemo)(() => {
    const names = new Set();
    walk(store, element.id, descendantId => {
      const el = store.byId.get(descendantId);
      if (!el) return;
      if (el.type === "component") names.add(el.componentName);else if (el.type === "html") {
        const name = el.props?.["data-component"];
        if (name && name !== "CapturedPage") names.add(name);
      }
    });
    if (element.props?.["data-component"] && element.props["data-component"] !== "CapturedPage") names.add(element.props["data-component"]);
    return names;
  }, [store, element.id, element.props]);
  const ops = useOperationLog(element.id);
  const descriptions = (0, import_react.useMemo)(() => {
    return squashOperations(ops, store).map(op => describeOperation(op, store)).filter(d => !d.canvasOnly);
  }, [ops, store]);
  const legacyChildren = storeSubtreeToLegacyNested(store, element.id).children ?? [];
  const astCount = descriptions.filter(d_0 => d_0.method === "ast").length;
  const aiCount = descriptions.length - astCount;
  const [isPreparing, setIsPreparing] = (0, import_react.useState)(false);
  const [showAllowPathPrompt, setShowAllowPathPrompt] = (0, import_react.useState)(false);
  const projectId = options.projectId;
  const [manualRoot, setManualRoot] = (0, import_react.useState)(() => projectId ? getRememberedRoot(projectId, sourceUrl) : null);
  const [pendingManualInput, setPendingManualInput] = (0, import_react.useState)("");
  const isElectron = typeof window !== "undefined" && Boolean(window.api?.invoke);
  const handlePickFolder = async () => {
    try {
      const picked = (await window.api?.invoke?.("pick_folder"))?.path;
      if (typeof picked === "string" && isAbsolutePath(picked)) setPendingManualInput(picked);
    } catch {}
  };
  const treeRoot = element.props?.["data-detected-repo-root"] || detectRepoRootFromCapture(legacyChildren);
  const opFilePaths = descriptions.map(d_1 => d_1.sourceInfo?.filePath).filter(p => !!p);
  const autoDetectedRepoRoot = treeRoot || (opFilePaths.length === 0 ? null : detectRepoRootFromCapture(opFilePaths.map(p_0 => ({
    sourceInfo: {
      filePath: p_0
    }
  }))));
  const detectedRepoRoot = autoDetectedRepoRoot || manualRoot;
  const proceedWithSave = async rootForSave => {
    if (!options.onSaveToCode) return;
    setIsPreparing(true);
    try {
      const names = [...componentNames];
      await options.onSaveToCode("", descriptions, sourceUrl, names, element.id, rootForSave ?? void 0);
    } finally {
      setIsPreparing(false);
    }
  };
  const handleSaveToCode = async () => {
    if (!options.onSaveToCode || isPreparing) return;
    const allowedPaths = options.allowedPaths || [];
    const covered = p_1 => allowedPaths.some(a => p_1 === a || p_1.startsWith(a + "/"));
    if (!detectedRepoRoot || (autoDetectedRepoRoot ? !covered(autoDetectedRepoRoot) : false)) {
      setPendingManualInput(autoDetectedRepoRoot ?? "");
      setShowAllowPathPrompt(true);
      return;
    }
    await proceedWithSave(detectedRepoRoot);
  };
  const handleSubmitManualRoot = () => {
    const path = pendingManualInput.trim();
    if (!isAbsolutePath(path)) return;
    if (path !== autoDetectedRepoRoot && projectId) {
      setRememberedRoot(projectId, sourceUrl, path);
      setManualRoot(path);
    }
    options.onAddAllowedPath?.(path);
    setShowAllowPathPrompt(false);
    proceedWithSave(path);
  };
  const childOptions = {
    ...options,
    _currentParentId: element.id,
    _inCapturedPage: true
  };
  const renderedChildren = getChildren$2(store, element.id).map(childId => renderElement(childId, store, childOptions));
  const contentWidth = element.styles?.width || 800;
  const contentHeight = element.styles?.minHeight || 600;
  return <div ref={setNodeRef} data-element-id={element.id} style={{
    position: "relative",
    opacity: isDragging ? .5 : 1,
    fontSize: 14,
    lineHeight: 1.6
  }} {...attributes}>{<div className="flex items-center justify-center" style={{
      height: 18,
      cursor: "grab"
    }} onClick={e => {
      e.stopPropagation();
      options.onSelectElement?.(element.id);
    }} {...listeners}>{<div className="bg-border" style={{
        width: 36,
        height: 4,
        borderRadius: 999
      }} />}</div>}{<div style={{
      display: "flex",
      gap: 8
    }}>{<div className="bg-background border-border border" style={{
        width: contentWidth,
        minHeight: contentHeight,
        overflow: "auto",
        flexShrink: 0,
        borderRadius: 15
      }} onClick={e_0 => {
        if (e_0.target === e_0.currentTarget) {
          e_0.stopPropagation();
          options.onSelectElement?.(element.id);
        }
      }}>{renderedChildren}</div>}{<ChangesSidebar descriptions={descriptions} astCount={astCount} aiCount={aiCount} isPreparing={isPreparing} onSaveToCode={options.onSaveToCode ? handleSaveToCode : void 0} />}</div>}{<Dialog open={showAllowPathPrompt} onOpenChange={setShowAllowPathPrompt}>{<DialogContent className="!max-w-[480px] rounded-2xl p-6 gap-4">{<div className="flex flex-col gap-2">{<Text$4 as="h2" size="lg" weight="semibold">{t(autoDetectedRepoRoot ? "canvas.confirmProjectRoot" : "canvas.selectProjectRoot")}</Text$4>}{<Text$4 size="sm" variant="secondary">{t(autoDetectedRepoRoot ? "canvas.confirmProjectRootDescription" : "canvas.selectProjectRootDescription")}</Text$4>}</div>}{<div className="flex gap-2">{<input type="text" autoFocus={true} value={pendingManualInput} onChange={e_1 => setPendingManualInput(e_1.target.value)} onKeyDown={e_2 => {
            if (!e_2.nativeEvent.isComposing && e_2.key === "Enter" && isAbsolutePath(pendingManualInput.trim())) handleSubmitManualRoot();
          }} placeholder="/Users/you/code/your-project" className="flex-1 min-w-0 px-3 py-2 rounded-md bg-ed-background border border-ed-border text-sm font-mono outline-none focus:border-ed-primary" />}{isElectron && <Button variant="outline" onClick={handlePickFolder}>{t("canvas.browse")}</Button>}</div>}{<div className="flex gap-2 justify-end">{<Button variant="outline" onClick={() => setShowAllowPathPrompt(false)}>{t("common:actions.cancel")}</Button>}{<Button onClick={handleSubmitManualRoot} disabled={!isAbsolutePath(pendingManualInput.trim())}>{t(autoDetectedRepoRoot && pendingManualInput.trim() === autoDetectedRepoRoot ? "canvas.addPathContinue" : "canvas.useProjectRoot")}</Button>}</div>}</DialogContent>}</Dialog>}</div>;
}
function ChangesSidebar(t0) {
  const $ = (0, import_compiler_runtime.c)(29);
  const { t } = useTranslation("editor");
  const {
    descriptions,
    astCount,
    aiCount,
    isPreparing,
    onSaveToCode
  } = t0;
  const changes = descriptions;
  const canSave = !isPreparing && changes.length > 0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = {
      width: 340,
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      borderRadius: 15,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      alignSelf: "stretch"
    };
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  let t3;
  if (true) {
    t2 = {
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      paddingTop: 12
    };
    t3 = <span className="text-base font-semibold text-foreground">{t("canvas.changes")}</span>;
    $[1] = t2;
    $[2] = t3;
  } else {
    t2 = $[1];
    t3 = $[2];
  }
  let t4;
  if ($[3] !== changes.length) {
    t4 = changes.length > 0 && <span className="bg-muted text-muted-foreground text-xs font-medium" style={{
      minWidth: 22,
      height: 22,
      padding: "0 7px",
      borderRadius: 999,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }}>{changes.length}</span>;
    $[3] = changes.length;
    $[4] = t4;
  } else t4 = $[4];
  let t5;
  if ($[5] !== t4) {
    t5 = <div className="border-b border-border" style={t2}>{t3}{t4}</div>;
    $[5] = t4;
    $[6] = t5;
  } else t5 = $[6];
  let t6;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = {
      flex: 1,
      overflowY: "auto",
      padding: "8px 0"
    };
    $[7] = t6;
  } else t6 = $[7];
  let t7;
  if (true) {
    t7 = changes.length === 0 ? <div className="text-muted-foreground" style={{
      padding: "24px 16px",
      textAlign: "center",
      fontSize: 13
    }}>{t("canvas.noChanges")}</div> : changes.map((d, i) => <ChangeItem key={i} description={d} />);
    $[8] = changes;
    $[9] = t7;
  } else t7 = $[9];
  let t8;
  if ($[10] !== t7) {
    t8 = <div style={t6}>{t7}</div>;
    $[10] = t7;
    $[11] = t8;
  } else t8 = $[11];
  let t9;
  if (true) {
    t9 = changes.length > 0 && <div className="border-t border-border" style={{
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      gap: 14
    }}>{astCount > 0 && <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6
      }}>{<MethodBadge method="ast" />}{<span className="text-xs text-muted-foreground">{t("canvas.sourceKnownCount", { count: astCount })}</span>}</div>}{aiCount > 0 && <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6
      }}>{<MethodBadge method="ai" />}{<span className="text-xs text-muted-foreground">{t("canvas.needsAiCount", { count: aiCount })}</span>}</div>}</div>;
    $[12] = aiCount;
    $[13] = astCount;
    $[14] = changes.length;
    $[15] = t9;
  } else t9 = $[15];
  let t10;
  if (true) {
    t10 = astCount === 0 && aiCount >= 3 && <div className="border-t border-border text-muted-foreground" style={{
      padding: "8px 16px",
      fontSize: 11,
      lineHeight: 1.4
    }}>{t("canvas.noSourcePaths")}</div>;
    $[16] = aiCount;
    $[17] = astCount;
    $[18] = t10;
  } else t10 = $[18];
  let t11;
  if (true) {
    t11 = onSaveToCode && <div style={{
      padding: 12
    }}>{<Button onClick={e => {
        e.stopPropagation();
        onSaveToCode();
      }} disabled={!canSave} className="w-full" loading={isPreparing}>{t(isPreparing ? "canvas.preparing" : "canvas.saveToCode")}</Button>}</div>;
    $[19] = canSave;
    $[20] = isPreparing;
    $[21] = onSaveToCode;
    $[22] = t11;
  } else t11 = $[22];
  let t12;
  if ($[23] !== t10 || $[24] !== t11 || $[25] !== t5 || $[26] !== t8 || $[27] !== t9) {
    t12 = <div className="bg-background border border-border overflow-hidden" style={t1}>{t5}{t8}{t9}{t10}{t11}</div>;
    $[23] = t10;
    $[24] = t11;
    $[25] = t5;
    $[26] = t8;
    $[27] = t9;
    $[28] = t12;
  } else t12 = $[28];
  return t12;
}
function _temp$65(d, i) {
  return <ChangeItem key={i} description={d} />;
}
function ChangeItem(t0) {
  const $ = (0, import_compiler_runtime.c)(14);
  const { t } = useTranslation("editor");
  const {
    description
  } = t0;
  const changeKey = { set_text: "changeText", set_props: "changeProps", set_styles: "changeStyles", insert: "insertElement", remove: "removeElement", move: "moveElement", replace: "replaceElement", rename: "renameElement" }[description.op?.type] ?? "updateElement";
  let label = t(`canvas.${changeKey}`, { component: description.componentName });
  if (label.length > 80) label = label.slice(0, 80) + "…";
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = {
      padding: "10px 16px",
      display: "flex",
      gap: 12,
      alignItems: "flex-start"
    };
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== description.method) {
    t2 = <MethodBadge method={description.method} />;
    $[1] = description.method;
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 0,
      flex: 1
    };
    $[3] = t3;
  } else t3 = $[3];
  let t4;
  if ($[4] !== description.componentName) {
    t4 = <span className="text-sm font-semibold text-foreground block truncate min-w-0">{description.componentName}</span>;
    $[4] = description.componentName;
    $[5] = t4;
  } else t4 = $[5];
  let t5;
  if ($[6] !== label) {
    t5 = <span className="text-xs text-muted-foreground leading-snug block truncate min-w-0">{label}</span>;
    $[6] = label;
    $[7] = t5;
  } else t5 = $[7];
  let t6;
  if ($[8] !== t4 || $[9] !== t5) {
    t6 = <div style={t3}>{t4}{t5}</div>;
    $[8] = t4;
    $[9] = t5;
    $[10] = t6;
  } else t6 = $[10];
  let t7;
  if ($[11] !== t2 || $[12] !== t6) {
    t7 = <div style={t1}>{t2}{t6}</div>;
    $[11] = t2;
    $[12] = t6;
    $[13] = t7;
  } else t7 = $[13];
  return t7;
}
function MethodBadge(t0) {
  const $ = (0, import_compiler_runtime.c)(4);
  const {
    method
  } = t0;
  const t1 = method === "ast" ? "bg-muted text-muted-foreground" : "bg-foreground/10 text-foreground";
  let t2;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = {
      minWidth: 28,
      height: 20,
      padding: "0 6px",
      borderRadius: 4,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.05em"
    };
    $[0] = t2;
  } else t2 = $[0];
  const t3 = method === "ast" ? "AST" : "AI";
  let t4;
  if ($[1] !== t1 || $[2] !== t3) {
    t4 = <span className={t1} style={t2}>{t3}</span>;
    $[1] = t1;
    $[2] = t3;
    $[3] = t4;
  } else t4 = $[3];
  return t4;
}

export { CapturedPageRenderer };
