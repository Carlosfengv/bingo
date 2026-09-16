/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/WebviewRenderer.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useWebviewEditState, webviewEditStore } from "../../shared/state/webviewEditStore";
import { startLog } from "../../shared/utils/captureStore";
import { ScrubSessionContext } from "../../shared/utils/useScrub";
import { getCameraScale, subscribeCameraScale } from "../../shell/utils/chatShortcuts";
import { captureFromIframe, captureFromWebview, detectRepoRootFromCapture, getTargetFingerprint, markWebviewArtifactStale } from "../utils/fiberExtract";
import { useDraggable } from "@dnd-kit/core";
import { GlobeIcon } from "@bingo/ui";
import * as import_react from "react";
import { useTranslation } from "@bingo/i18n";
import { toast } from "sonner";

/**
* WebviewRenderer - Embeds a live URL (e.g., localhost:3000) on the canvas.
*
* In Electron: renders a <webview> tag (own session, real browser cookies).
* On the web: falls back to an <iframe>.
*
* Includes a "Capture" button that extracts the DOM tree (enriched with React
* Fiber data) and places it as FEElements on the canvas.
*/
var ELECTRON_WEBVIEW_TAG = "webview";
/** True when running inside Electron renderer (webviewTag enabled in main). */
var isElectron = typeof navigator !== "undefined" && /Electron\//i.test(navigator.userAgent);
/**
* Build the self-contained JS we inject into the guest document to drive
* Inspect mode. `enable=false` returns a teardown snippet that calls the
* cleanup the enable-pass stashed on `window.__bingoInspectCleanup`.
*
* The inspector reads the React fiber off the hovered DOM node, climbs to the
* nearest named component, and draws a highlight + a `Component  file:line`
* label. Component name comes from `fiber.type` (works on any React build);
* the source file comes from `_debugSource`, which only exists on dev builds
* (React <= 18). On a production or React-19 guest the name still resolves but
* the file may be absent — we show "(no React source)" in that case.
*/
function buildInspectorScript(enable) {
  if (!enable) return `(function(){try{if(window.__bingoInspectCleanup){window.__bingoInspectCleanup();window.__bingoInspectCleanup=null;}}catch(e){}})()`;
  return `(function(){
  try {
    if (window.__bingoInspectCleanup) { window.__bingoInspectCleanup(); window.__bingoInspectCleanup = null; }
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border:1px solid #6366f1;background:rgba(99,102,241,0.12);border-radius:2px;display:none;';
    var label = document.createElement('div');
    label.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;background:#1f2328;color:#fff;font:500 11px -apple-system,system-ui,sans-serif;padding:3px 7px;border-radius:5px;white-space:nowrap;display:none;box-shadow:0 2px 8px rgba(0,0,0,.3);';
    document.body.appendChild(box); document.body.appendChild(label);
    function getFiber(node){ for (var k in node){ if (k.indexOf('__reactFiber$')===0 || k.indexOf('__reactInternalInstance$')===0) return node[k]; } return null; }
    function compName(t){ if (!t || typeof t === 'string') return null; return t.displayName || t.name || (t.render && (t.render.displayName||t.render.name)) || null; }
    function resolve(node){
      var f = getFiber(node), name = null, src = null;
      while (f){
        if (!name){ var n = compName(f.type); if (n){ name = n; if (f._debugSource) src = f._debugSource; } }
        if (!src && name && f._debugSource) src = f._debugSource;
        if (name && src) break;
        f = f.return;
      }
      return { name: name, src: src };
    }
    var raf = 0;
    function onMove(e){
      if (raf) return;
      raf = requestAnimationFrame(function(){
        raf = 0;
        var el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el === box || el === label) return;
        var r = el.getBoundingClientRect();
        box.style.display='block'; box.style.left=r.left+'px'; box.style.top=r.top+'px';
        box.style.width=r.width+'px'; box.style.height=r.height+'px';
        var info = resolve(el);
        var tag = el.tagName ? el.tagName.toLowerCase() : '';
        var text;
        if (info.name){
          var file = info.src ? String(info.src.fileName||'').split('/').slice(-2).join('/') : '';
          text = info.name + (file ? '   ' + file + (info.src.lineNumber ? (':'+info.src.lineNumber) : '') : '');
        } else { text = tag + '   (no React source)'; }
        label.textContent = text; label.style.display='block';
        var ly = r.top - 22; if (ly < 2) ly = r.top + 4;
        label.style.left = Math.max(2, r.left) + 'px'; label.style.top = ly + 'px';
      });
    }
    function onLeave(){ box.style.display='none'; label.style.display='none'; }
    // Click an element to open its source in the bottom bar. Stash it so the
    // host can fingerprint + resolve it the same way Edit does (one resolver).
    function onClick(e){
      var el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el === box || el === label) return;
      e.preventDefault(); e.stopPropagation();
      window.__bingoEditTarget = el;
      console.log('__BINGO_INSPECT_CLICK');
    }
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseleave', onLeave, true);
    document.addEventListener('click', onClick, true);
    window.__bingoInspectCleanup = function(){
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseleave', onLeave, true);
      document.removeEventListener('click', onClick, true);
      if (raf) cancelAnimationFrame(raf);
      box.remove(); label.remove();
    };
  } catch(e){ /* guest not ready */ }
})()`;
}
/**
* Editor-mode guest script. On click it selects the element, reads its source
* location from the React fiber (`_debugSource`), and emits the selection to
* the host via `console.log('__BINGO_EDIT_SELECT ...')` (the webview surfaces it as
* a `console-message` event — works without a guest preload). It also exposes
* `window.__bingoEditPreview*` so the host can apply OPTIMISTIC visual changes
* (inline style) instantly, before the deterministic source write commits.
*/
function buildEditorScript(enable) {
  if (!enable) return `(function(){try{if(window.__bingoEditCleanup){window.__bingoEditCleanup();window.__bingoEditCleanup=null;}}catch(e){}})()`;
  return `(function(){
  try {
    if (window.__bingoEditCleanup) { window.__bingoEditCleanup(); window.__bingoEditCleanup = null; }
    var hov = document.createElement('div');
    hov.style.cssText='position:fixed;z-index:2147483640;pointer-events:none;border:1px dashed #6366f1;border-radius:2px;display:none;';
    var sel = document.createElement('div');
    sel.style.cssText='position:fixed;z-index:2147483641;pointer-events:none;border:2px solid #6366f1;border-radius:2px;box-shadow:0 0 0 3px rgba(99,102,241,.2);display:none;';
    document.body.appendChild(hov); document.body.appendChild(sel);
    function place(box, el){ var r=el.getBoundingClientRect(); box.style.display='block'; box.style.left=r.left+'px'; box.style.top=r.top+'px'; box.style.width=r.width+'px'; box.style.height=r.height+'px'; }
    var raf=0;
    function onMove(e){ if(raf)return; raf=requestAnimationFrame(function(){ raf=0; var el=document.elementFromPoint(e.clientX,e.clientY); if(!el||el===hov||el===sel)return; place(hov,el); }); }
    function onClick(e){
      e.preventDefault(); e.stopPropagation();
      var el=e.target; if(!el||el===hov||el===sel) return;
      window.__bingoEditTarget=el; place(sel,el);
      // Source location is resolved on the HOST via the capture pipeline
      // (source maps), not here — raw _debugSource is unreliable.
      var payload={ tag:(el.tagName||'').toLowerCase(), className:(el.getAttribute&&el.getAttribute('class'))||'', text:(el.children&&el.children.length===0)?el.textContent:null };
      console.log('__BINGO_EDIT_SELECT '+JSON.stringify(payload));
    }
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    // Track previewed elements + their original class/style/text so CLEAR can
    // restore them after Save — then the screen shows only the live HMR'd source.
    window.__bingoPreviewed = window.__bingoPreviewed || [];
    function stash(el){ if(!el.__bingoOrig){ el.__bingoOrig={ style:el.getAttribute('style'), cls:el.getAttribute('class'), text:null }; window.__bingoPreviewed.push(el); } }
    window.__bingoEditPreviewSpacing=function(axis,val){ var el=window.__bingoEditTarget; if(!el)return; stash(el); var rem=(Number(val)*0.25)+'rem'; if(axis==='y'){el.style.paddingTop=rem;el.style.paddingBottom=rem;} else {el.style.paddingLeft=rem;el.style.paddingRight=rem;} place(sel,el); };
    window.__bingoEditPreviewText=function(t){ var el=window.__bingoEditTarget; if(el){ stash(el); if(el.__bingoOrig.text===null) el.__bingoOrig.text=el.textContent; el.textContent=t; place(sel,el); } };
    window.__bingoEditPreviewClassName=function(c){ var el=window.__bingoEditTarget; if(el){ stash(el); el.setAttribute('class', c); place(sel,el); } };
    window.__bingoEditPreviewStyle=function(s){ var el=window.__bingoEditTarget; if(!el)return; stash(el); try{ var o=(typeof s==='string')?JSON.parse(s):s; for(var k in o){ el.style[k]=o[k]; } }catch(e){} place(sel,el); };
    window.__bingoClearPreviews=function(){ (window.__bingoPreviewed||[]).forEach(function(el){ var o=el.__bingoOrig; if(!o)return; if(o.style===null)el.removeAttribute('style'); else el.setAttribute('style',o.style); if(o.cls===null)el.removeAttribute('class'); else el.setAttribute('class',o.cls); if(o.text!==null)el.textContent=o.text; delete el.__bingoOrig; }); window.__bingoPreviewed=[]; sel.style.display='none'; };
    // After SAVE, the preview already shows the saved value, so drop the stash
    // WITHOUT restoring (restoring would flash the old value). HMR will re-render
    // the same value moments later. Differs from Clear, which reverts.
    window.__bingoFinalizePreviews=function(){ (window.__bingoPreviewed||[]).forEach(function(el){ delete el.__bingoOrig; }); window.__bingoPreviewed=[]; sel.style.display='none'; };
    // Resolve once the live app actually re-renders (first real DOM mutation that
    // isn't our own overlay), or after a timeout. Lets the host show "syncing".
    window.__bingoWatchSync=function(timeoutMs){ return new Promise(function(resolve){ var done=false; function fin(r){ if(done)return; done=true; try{obs.disconnect();}catch(e){} clearTimeout(tm); resolve(r); } var obs; try{ obs=new MutationObserver(function(muts){ for(var i=0;i<muts.length;i++){ var t=muts[i].target; if(t===sel||t===hov||(sel.contains&&sel.contains(t))||(hov.contains&&hov.contains(t)))continue; fin('hmr'); return; } }); obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,characterData:true}); }catch(e){ resolve('no-observe'); return; } var tm=setTimeout(function(){ fin('timeout'); }, timeoutMs||4000); }); };
    window.__bingoEditCleanup=function(){ document.removeEventListener('mousemove',onMove,true); document.removeEventListener('click',onClick,true); if(raf)cancelAnimationFrame(raf); if(window.__bingoClearPreviews)window.__bingoClearPreviews(); hov.remove(); sel.remove(); window.__bingoEditTarget=null; window.__bingoEditPreviewSpacing=null; window.__bingoEditPreviewText=null; window.__bingoEditPreviewClassName=null; window.__bingoEditPreviewStyle=null; window.__bingoClearPreviews=null; window.__bingoFinalizePreviews=null; window.__bingoWatchSync=null; };
  } catch(e){ /* guest not ready */ }
})()`;
}
function WebviewRenderer({
  element,
  options
}) {
  const { t } = useTranslation("editor");
  const embedRef = (0, import_react.useRef)(null);
  const wrapperRef = (0, import_react.useRef)(null);
  const selectSeqRef = (0, import_react.useRef)(0);
  const [isResizing, setIsResizing] = (0, import_react.useState)(null);
  const [resizeStart, setResizeStart] = (0, import_react.useState)(null);
  const [captureStatus, setCaptureStatus] = (0, import_react.useState)(null);
  const [pendingAllowPath, setPendingAllowPath] = (0, import_react.useState)(null);
  const [, setEditStatus] = (0, import_react.useState)(null);
  const ws = useWebviewEditState();
  const interactionEnabled = ws.interactive;
  const inspectEnabled = ws.mode === "inspect";
  const editModeEnabled = ws.mode === "edit";
  const setSelected = webviewEditStore.setSelection;
  const {
    inert = false
  } = options;
  const canvasScale = (0, import_react.useSyncExternalStore)(subscribeCameraScale, getCameraScale, getCameraScale);
  const session = (0, import_react.useContext)(ScrubSessionContext);
  const inverseScale = 1 / canvasScale;
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging
  } = useDraggable({
    id: element.id
  });
  const setNodeRef = node => {
    setDraggableRef(node);
    wrapperRef.current = node;
  };
  const handleCapture = async (mode = "html") => {
    const embed = embedRef.current;
    if (!embed) {
      setCaptureStatus(t("canvas.captureUnavailable"));
      return;
    }
    const knownComponents = mode === "components" && options.components ? Object.keys(options.components) : [];
    let currentSourceUrl = element.src;
    let result = null;
    if (isElectron) {
      const wv = embed;
      try {
        if (typeof wv.getURL === "function") currentSourceUrl = wv.getURL() || element.src;
      } catch {}
      try {
        result = await captureFromWebview(wv, {
          knownComponents
        });
      } catch (err) {
        console.error("[WebviewCapture] executeJavaScript threw:", err);
        setCaptureStatus(t("canvas.captureFailed"));
        setTimeout(() => setCaptureStatus(null), 3e3);
        return;
      }
    } else {
      const iframe = embed;
      let doc = null;
      try {
        doc = iframe.contentDocument;
        if (doc?.location?.href) currentSourceUrl = doc.location.href;
      } catch {
        setCaptureStatus(t("canvas.captureCrossOrigin"));
        return;
      }
      if (!doc) {
        setCaptureStatus(t("canvas.captureNoDocument"));
        return;
      }
      result = await captureFromIframe(doc, {
        knownComponents
      });
    }
    if (!result || result.elements.length === 0) {
      setCaptureStatus(t("canvas.captureNoReact"));
      setTimeout(() => setCaptureStatus(null), 5e3);
      return;
    }
    setCaptureStatus(t("canvas.capturePreparing", { count: result.elementCount }));
    if (options.onAddElement) {
      const containerId = `html-capture-${Date.now()}`;
      startLog(containerId);
      const detectedRepoRoot = result.projectRoot || detectRepoRootFromCapture(result.elements);
      const capturedRenderedWidth = element.viewportWidth + 364;
      const container = {
        id: containerId,
        type: "html",
        tag: "div",
        props: {
          "data-component": "CapturedPage",
          "data-source-url": currentSourceUrl,
          ...(detectedRepoRoot ? {
            "data-detected-repo-root": detectedRepoRoot
          } : {})
        },
        styles: {
          width: element.viewportWidth,
          minHeight: 200
        },
        children: result.elements,
        canvasPosition: {
          x: (element.canvasPosition?.x || 0) - capturedRenderedWidth - 100,
          y: element.canvasPosition?.y || 0
        }
      };
      (0, import_react.startTransition)(() => {
        options.onAddElement(container);
      });
      if (options.onAddAllowedPath && detectedRepoRoot && !(options.allowedPaths || []).some(p => detectedRepoRoot === p || detectedRepoRoot.startsWith(p + "/"))) setPendingAllowPath(detectedRepoRoot);
    }
    setTimeout(() => setCaptureStatus(null), 3e3);
  };
  (0, import_react.useEffect)(() => {
    if (!isElectron) return;
    const wv = embedRef.current;
    if (!wv || typeof wv.executeJavaScript !== "function") return;
    try {
      wv.executeJavaScript(buildInspectorScript(inspectEnabled)).catch(() => {});
    } catch {}
  }, [inspectEnabled]);
  (0, import_react.useEffect)(() => {
    if (!isElectron) return;
    const wv = embedRef.current;
    if (!wv || typeof wv.addEventListener !== "function") return;
    const reinject = () => {
      if (inspectEnabled) try {
        wv.executeJavaScript(buildInspectorScript(true)).catch(() => {});
      } catch {}
    };
    wv.addEventListener("did-finish-load", reinject);
    return () => wv.removeEventListener("did-finish-load", reinject);
  }, [inspectEnabled]);
  (0, import_react.useEffect)(() => {
    if (!isElectron || !inspectEnabled) return;
    const wv = embedRef.current;
    if (!wv || typeof wv.addEventListener !== "function") return;
    const onConsole = e => {
      if (e?.message !== "__BINGO_INSPECT_CLICK") return;
      getTargetFingerprint(wv).then(async fp => {
        if (!fp?.file) return;
        const res = await window.api?.invoke("resolve_element", {
          filePath: fp.file,
          tag: fp.tag,
          className: fp.className,
          text: fp.text
        });
        options.onOpenFile?.(res?.ok ? res.filePath : fp.file, res?.ok ? res.line : void 0);
      });
    };
    wv.addEventListener("console-message", onConsole);
    return () => wv.removeEventListener("console-message", onConsole);
  }, [inspectEnabled, options]);
  const runInGuest = (0, import_react.useCallback)(script => {
    const wv = embedRef.current;
    if (!wv || typeof wv.executeJavaScript !== "function") return;
    try {
      wv.executeJavaScript(script).catch(() => {});
    } catch {}
  }, []);
  const runInGuestAsync = (0, import_react.useCallback)(script => {
    const wv = embedRef.current;
    if (!wv || typeof wv.executeJavaScript !== "function") return Promise.resolve(null);
    try {
      return wv.executeJavaScript(script).catch(() => null);
    } catch {
      return Promise.resolve(null);
    }
  }, []);
  (0, import_react.useEffect)(() => {
    if (!isElectron) return;
    runInGuest(buildEditorScript(editModeEnabled));
    if (!editModeEnabled) setSelected(null);
  }, [editModeEnabled, runInGuest, setSelected]);
  (0, import_react.useEffect)(() => {
    if (!isElectron) return;
    const wv = embedRef.current;
    if (!wv || typeof wv.addEventListener !== "function") return;
    const reinject = () => {
      if (editModeEnabled) runInGuest(buildEditorScript(true));
    };
    wv.addEventListener("did-finish-load", reinject);
    return () => wv.removeEventListener("did-finish-load", reinject);
  }, [editModeEnabled, runInGuest]);
  (0, import_react.useEffect)(() => {
    if (!isElectron || !editModeEnabled) return;
    const wv = embedRef.current;
    if (!wv || typeof wv.addEventListener !== "function") return;
    const onConsole = e => {
      const msg = e?.message;
      if (typeof msg !== "string" || msg.indexOf("__BINGO_EDIT_SELECT ") !== 0) return;
      let payload;
      try {
        payload = JSON.parse(msg.slice(16));
      } catch {
        return;
      }
      const seq = ++selectSeqRef.current;
      webviewEditStore.setSelection({
        ...payload,
        originalClassName: payload.className,
        src: null,
        tier: "unknown",
        resolveState: "pending"
      });
      getTargetFingerprint(wv).then(async fp => {
        if (selectSeqRef.current !== seq) return;
        if (!fp?.file) {
          webviewEditStore.patchSelection({
            src: null,
            tier: "unknown",
            resolveState: "failed"
          });
          return;
        }
        const res = await window.api?.invoke("resolve_element", {
          filePath: fp.file,
          tag: fp.tag,
          className: fp.className,
          text: fp.text
        });
        if (selectSeqRef.current !== seq) return;
        if (res?.ok) {
          webviewEditStore.patchSelection({
            src: {
              filePath: res.filePath,
              lineNumber: res.line,
              columnNumber: res.column
            },
            tier: "direct",
            resolveState: "resolved"
          });
          setEditStatus(null);
        } else {
          webviewEditStore.patchSelection({
            src: null,
            tier: "unknown",
            resolveState: "failed"
          });
          setEditStatus(res?.reason === "not-found" ? t("webview.resolveNotFound") : t("webview.resolveFailed", { reason: res?.reason || t("shell.unknownError") }));
        }
      });
    };
    wv.addEventListener("console-message", onConsole);
    return () => wv.removeEventListener("console-message", onConsole);
  }, [editModeEnabled]);
  const stageEdit = (0, import_react.useCallback)((edit, after) => {
    const sel = webviewEditStore.getState().selection;
    if (!sel) return;
    const src = sel.src;
    const fingerprint = sel.originalClassName ?? sel.className;
    const label = src ? `<${sel.tag}> ${src.filePath.split("/").slice(-1)[0]}` : `<${sel.tag}>`;
    const property = edit.kind === "text" ? "text" : edit.kind === "style-merge" ? "style" : "className";
    const before = edit.kind === "text" ? sel.text ?? "" : edit.kind === "style-merge" ? "" : fingerprint;
    if (edit.kind === "text") webviewEditStore.patchSelection({
      text: after
    });else if (edit.kind !== "style-merge") webviewEditStore.patchSelection({
      className: after
    });
    webviewEditStore.recordChange({
      id: `${fingerprint}:${property}`,
      label,
      filePath: src?.filePath ?? "",
      line: src?.lineNumber ?? 0,
      column: src?.columnNumber,
      tag: sel.tag,
      matchClass: fingerprint,
      property,
      before,
      after,
      edit,
      tier: sel.tier === "ai" ? "ai" : "direct",
      saved: false
    });
  }, []);
  const commitText = (0, import_react.useCallback)(text => {
    runInGuest(`window.__bingoEditPreviewText && window.__bingoEditPreviewText(${JSON.stringify(text)})`);
    stageEdit({
      kind: "text",
      value: text
    }, text);
  }, [runInGuest, stageEdit]);
  const applyClassName = (0, import_react.useCallback)(className => {
    runInGuest(`window.__bingoEditPreviewClassName && window.__bingoEditPreviewClassName(${JSON.stringify(className)})`);
    stageEdit({
      kind: "className-set",
      value: className
    }, className);
  }, [runInGuest, stageEdit]);
  const applyStyles = (0, import_react.useCallback)(styles => {
    runInGuest(`window.__bingoEditPreviewStyle && window.__bingoEditPreviewStyle(${JSON.stringify(styles)})`);
    const desc = Object.entries(styles).map(([k, v]) => `${k}: ${v}`).join(", ");
    stageEdit({
      kind: "style-merge",
      styles
    }, desc);
  }, [runInGuest, stageEdit]);
  const saveToCode = (0, import_react.useCallback)(async () => {
    const api = window.api;
    const changes = webviewEditStore.getState().changes.filter(c => !c.saved).sort((a, b) => (a.property === "text" ? -1 : 1) - (b.property === "text" ? -1 : 1));
    if (!changes.length) return;
    setEditStatus(t("webview.savingChanges"));
    let okCount = 0;
    let unresolved = 0;
    for (const c of changes) {
      if (c.tier !== "direct" || !c.edit) continue;
      if (!c.filePath) {
        unresolved++;
        continue;
      }
      const res = await api?.invoke("edit_source", {
        filePath: c.filePath,
        line: c.line,
        column: c.column,
        tag: c.tag,
        className: c.matchClass,
        edit: c.edit
      });
      if (res?.ok) {
        webviewEditStore.setChangeSaved(c.id, true);
        okCount++;
      } else if (res?.reason === "not-literal") webviewEditStore.recordChange({
        ...c,
        tier: "ai",
        saved: false
      });else setEditStatus(t("webview.saveChangeFailed", { label: c.label, reason: res?.reason || t("shell.unknownError") }));
    }
    const aiCount = webviewEditStore.getState().changes.filter(c => !c.saved && c.tier === "ai").length;
    if (okCount > 0) {
      runInGuest("window.__bingoFinalizePreviews && window.__bingoFinalizePreviews()");
      webviewEditStore.setSelection(null);
      webviewEditStore.clearSavedChanges();
      webviewEditStore.setStatus(null);
      const savedMessage = t("webview.savedChanges", { count: okCount });
      const pendingMessage = aiCount ? t("webview.pendingAssistant", { count: aiCount }) : "";
      toast.success([savedMessage, pendingMessage].filter(Boolean).join(" "));
      webviewEditStore.setSyncing(true);
      runInGuestAsync("(window.__bingoWatchSync ? window.__bingoWatchSync(5000) : Promise.resolve(\"no-watch\"))").finally(() => webviewEditStore.setSyncing(false));
    } else if (unresolved > 0) webviewEditStore.setStatus(t("webview.saveUnresolved", { count: unresolved }));else webviewEditStore.setStatus(aiCount ? t("webview.nothingSavedWithAssistant", { count: aiCount }) : t("webview.nothingSaved"));
  }, [runInGuest, runInGuestAsync, t]);
  const isSelected = !options.isDragPreview && (options.selectedElementIds?.has(element.id) ?? false);
  (0, import_react.useEffect)(() => {
    if (options.isDragPreview) return;
    const {
      droppedChanges
    } = webviewEditStore.setActiveWebview(element.id, isSelected);
    if (droppedChanges > 0) toast.warning(t("webview.discardedChanges", { count: droppedChanges }));
  }, [isSelected, element.id, options.isDragPreview, t]);
  (0, import_react.useEffect)(() => {
    if (options.isDragPreview) return;
    return () => {
      webviewEditStore.setActiveWebview(element.id, false);
    };
  }, [element.id, options.isDragPreview]);
  (0, import_react.useEffect)(() => {
    if (!isSelected) return;
    const w = typeof element.styles?.width === "number" ? element.styles.width : element.viewportWidth;
    const h = typeof element.styles?.height === "number" ? element.styles.height : element.viewportHeight || 600;
    webviewEditStore.setWebviewInfo(element.src, w, h);
  }, [isSelected, element.src, element.styles?.width, element.styles?.height, element.viewportWidth, element.viewportHeight]);
  const setSize = (0, import_react.useCallback)((width, height) => {
    options.onResizeViewport?.(element.id, Math.max(200, width), Math.max(200, height));
  }, [options, element.id]);
  const navigate = (0, import_react.useCallback)(url => {
    const embed = embedRef.current;
    if (embed) try {
      embed.src = url;
    } catch {}
  }, []);
  const discardChanges = (0, import_react.useCallback)(() => {
    runInGuest("window.__bingoClearPreviews && window.__bingoClearPreviews()");
    webviewEditStore.clearChanges();
    webviewEditStore.setSelection(null);
    webviewEditStore.setStatus(null);
  }, [runInGuest]);
  (0, import_react.useEffect)(() => {
    if (!isSelected) return;
    webviewEditStore.setActions({
      commitText,
      applyClassName,
      applyStyles,
      saveToCode,
      discardChanges,
      setSize,
      navigate
    });
    return () => webviewEditStore.setActions(null);
  }, [isSelected, commitText, applyClassName, applyStyles, saveToCode, discardChanges, setSize, navigate]);
  const seenRefreshRef = (0, import_react.useRef)(ws.refreshNonce);
  const seenCaptureRef = (0, import_react.useRef)(ws.captureNonce);
  (0, import_react.useEffect)(() => {
    if (ws.refreshNonce === seenRefreshRef.current) return;
    seenRefreshRef.current = ws.refreshNonce;
    const embed = embedRef.current;
    if (isElectron && typeof embed?.reload === "function") try {
      embed.reload();
    } catch {} else if (embed) try {
      embed.src = embed.src;
    } catch {}
  }, [ws.refreshNonce]);
  (0, import_react.useEffect)(() => {
    if (ws.captureNonce === seenCaptureRef.current) return;
    seenCaptureRef.current = ws.captureNonce;
    handleCapture(ws.captureMode);
  }, [ws.captureNonce]);
  const handleResizeMouseDown = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    session.onStart();
    setIsResizing(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: typeof element.styles?.width === "number" ? element.styles.width : element.viewportWidth,
      height: typeof element.styles?.height === "number" ? element.styles.height : element.viewportHeight || 600
    });
  };
  (0, import_react.useEffect)(() => {
    if (!isResizing || !resizeStart) return;
    const handleMouseMove = e => {
      const deltaX = (e.clientX - resizeStart.x) / canvasScale;
      const deltaY = (e.clientY - resizeStart.y) / canvasScale;
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      if (isResizing === "e" || isResizing === "se") newWidth = Math.max(200, resizeStart.width + deltaX);
      if (isResizing === "s" || isResizing === "se") newHeight = Math.max(200, resizeStart.height + deltaY);
      options.onResizeViewport?.(element.id, Math.round(newWidth), Math.round(newHeight));
    };
    const handleMouseUp = () => {
      setIsResizing(null);
      setResizeStart(null);
      session.onEnd();
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizeStart, element.id, options, canvasScale, session]);
  (0, import_react.useEffect)(() => {
    if (isElectron) return;
    const iframe = embedRef.current;
    if (!iframe) return;
    const onLoad = () => {
      try {
        const iframeDoc = iframe.contentDocument;
        const iframeWin = iframe.contentWindow;
        if (!iframeDoc || !iframeWin) return;
        iframeDoc.documentElement.style.overscrollBehavior = "none";
        const handleWheel = e => {
          e.preventDefault();
          e.stopPropagation();
          if (e.ctrlKey || e.metaKey) {
            const box = iframe.getBoundingClientRect();
            const sx = iframe.clientWidth ? box.width / iframe.clientWidth : 1;
            const sy = iframe.clientHeight ? box.height / iframe.clientHeight : 1;
            options.onViewportZoom?.(e.deltaY, box.left + e.clientX * sx, box.top + e.clientY * sy);
          } else options.onViewportPan?.(e.deltaX, e.deltaY);
        };
        iframeDoc.addEventListener("wheel", handleWheel, {
          passive: false,
          capture: true
        });
        iframeWin.addEventListener("wheel", handleWheel, {
          passive: false,
          capture: true
        });
      } catch {}
    };
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [options, options.onViewportPan, options.onViewportZoom]);
  (0, import_react.useEffect)(() => {
    if (!isElectron) return;
    const wv = embedRef.current;
    if (!wv || typeof wv.addEventListener !== "function") return;
    const invalidate = () => markWebviewArtifactStale(wv);
    const onFail = e => {
      if (e?.errorCode === -3) return;
      console.error(`[WebviewRenderer] load failed: ${e?.errorCode} ${e?.errorDescription} url=${e?.validatedURL}`);
    };
    wv.addEventListener("did-navigate", invalidate);
    wv.addEventListener("did-start-loading", invalidate);
    wv.addEventListener("did-frame-navigate", invalidate);
    wv.addEventListener("did-fail-load", onFail);
    return () => {
      wv.removeEventListener("did-navigate", invalidate);
      wv.removeEventListener("did-start-loading", invalidate);
      wv.removeEventListener("did-frame-navigate", invalidate);
      wv.removeEventListener("did-fail-load", onFail);
    };
  }, []);
  (0, import_react.useEffect)(() => {
    if (!pendingAllowPath) return;
    const t = setTimeout(() => setPendingAllowPath(null), 3e4);
    return () => clearTimeout(t);
  }, [pendingAllowPath]);
  const {
    viewportWidth,
    viewportHeight,
    src,
    styles
  } = element;
  const styleW = typeof styles?.width === "number" ? styles.width : void 0;
  const styleH = typeof styles?.height === "number" ? styles.height : void 0;
  const effWidth = styleW ?? viewportWidth;
  const frameHeight = styleH ?? (viewportHeight || 600);
  let displayUrl = src;
  try {
    const url = new URL(src);
    displayUrl = `${url.origin}${url.pathname}`;
  } catch {}
  const resizeHandleWidth = 8 * inverseScale;
  const toolbarHeight = 56;
  const contentPadding = 8;
  return <div ref={setNodeRef} data-element-id={element.id} className="shadow-2xl/7 border border-border bg-sidebar" style={{
    ...styles,
    position: "relative",
    width: effWidth + 16,
    height: frameHeight + toolbarHeight + contentPadding,
    opacity: isDragging ? .5 : 1,
    touchAction: "none",
    overflow: "hidden",
    borderRadius: 24,
    fontSize: 14,
    lineHeight: 1.6
  }} onClick={e => {
    if (e.target === e.currentTarget) options.onSelectElement?.(element.id, e.shiftKey);
  }} onMouseOver={e => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      options.onHoverElement?.(element.id);
    }
  }} onMouseLeave={e => {
    e.stopPropagation();
    options.onHoverElement?.(null);
  }} {...attributes}>{<div className="flex items-center gap-2.5 px-3 py-2" style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      justifyContent: "space-between",
      cursor: "grab"
    }} onClick={e => {
      e.stopPropagation();
      options.onSelectElement?.(element.id, e.shiftKey);
    }} {...listeners}>{<div style={{
        width: 169
      }} className="flex gap-1.5 mr-1">{<div style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "#ff5f57"
        }} />}{<div style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "#febc2e"
        }} />}{<div style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "#28c840"
        }} />}</div>}{<div className="shadow-lg/4" style={{
        width: 400,
        height: 40,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "#ffffff",
        borderRadius: 999,
        paddingLeft: 14,
        paddingRight: 14,
        fontSize: 12,
        color: "#1f2328"
      }}>{<GlobeIcon width={14} height={14} style={{
          color: "#656d76",
          flexShrink: 0
        }} />}{<span style={{
          flex: 1,
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}>{displayUrl}</span>}</div>}{<div style={{
        width: 169
      }} className="shrink-0" />}</div>}{<div style={{
      padding: "0 8px 8px",
      position: "relative"
    }}>{captureStatus && <div style={{
        position: "absolute",
        bottom: 18,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.8)",
        color: "#fff",
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 11,
        zIndex: 20,
        whiteSpace: "nowrap"
      }}>{captureStatus}</div>}{pendingAllowPath && <div style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "12px 16px",
        zIndex: 21,
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        maxWidth: "90%",
        fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        fontSize: 13
      }} onClick={e => e.stopPropagation()}>{<span style={{
          flex: 1
        }}>{t("canvas.allowEditPath", { path: pendingAllowPath })}</span>}{<button onClick={e => {
          e.stopPropagation();
          options.onAddAllowedPath?.(pendingAllowPath);
          setPendingAllowPath(null);
        }} style={{
          background: "#1f2328",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "6px 12px",
          cursor: "pointer",
          fontWeight: 500
        }}>{t("canvas.allow")}</button>}{<button onClick={e => {
          e.stopPropagation();
          setPendingAllowPath(null);
        }} style={{
          background: "#f3f4f6",
          color: "#374151",
          border: "none",
          borderRadius: 6,
          padding: "6px 12px",
          cursor: "pointer"
        }}>{t("canvas.skip")}</button>}</div>}{<div className="bg-background border-border border" style={{
        width: effWidth,
        height: frameHeight,
        overflow: "hidden",
        position: "relative",
        borderRadius: 15
      }}>{isElectron ? import_react.createElement(ELECTRON_WEBVIEW_TAG, {
          ref: embedRef,
          src,
          allowpopups: "true",
          style: {
            width: "100%",
            height: "100%",
            border: "none",
            display: "inline-flex"
          }
        }) : <iframe ref={embedRef} src={src} style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block"
        }} />}{!interactionEnabled && !editModeEnabled && !inspectEnabled && <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "transparent",
          cursor: "default"
        }} onClick={e => {
          e.stopPropagation();
          options.onSelectElement?.(element.id, e.shiftKey);
        }} />}</div>}</div>}{!inert && <>{<div style={{
        position: "absolute",
        right: -resizeHandleWidth / 2,
        top: 0,
        width: resizeHandleWidth,
        height: "100%",
        cursor: "ew-resize"
      }} onMouseDown={e => handleResizeMouseDown(e, "e")} />}{<div style={{
        position: "absolute",
        left: 0,
        bottom: -resizeHandleWidth / 2,
        width: "100%",
        height: resizeHandleWidth,
        cursor: "ns-resize"
      }} onMouseDown={e => handleResizeMouseDown(e, "s")} />}{<div style={{
        position: "absolute",
        right: -resizeHandleWidth / 2,
        bottom: -resizeHandleWidth / 2,
        width: resizeHandleWidth * 1.5,
        height: resizeHandleWidth * 1.5,
        cursor: "nwse-resize",
        background: "transparent"
      }} onMouseDown={e => handleResizeMouseDown(e, "se")} />}</>}</div>;
}

export { WebviewRenderer };
