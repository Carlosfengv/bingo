import { useVariableGeometryVersion, useVariableRenderStore } from "../../shared/theme/VariableContext";
/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/Canvas.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

import { useStableCanvasTreeProps } from "../hooks/useStableCanvasTreeProps";
import { CanvasSelectionContext } from "../lib/CanvasSelectionContext";
import { CanvasPerformanceToolbar } from "./CanvasPerformanceToolbar";
import { commitCanvasSelection } from "../lib/canvasPerformance";
import { isInsertTool, useActiveTool } from "../../shared/contexts/ActiveToolContext";
import { useAssetResolver } from "../../shared/contexts/AssetContext";
import { useUploadImage } from "../../shared/hooks/useUploadImage";
import { LOCAL_SHORTCUTS } from "../../shared/shortcuts/catalog";
import { isTypingTarget, matchesShortcut } from "../../shared/shortcuts/matchShortcut";
import { publishHover, subscribeHover } from "../../shared/state/hoverChannel";
import { createImageElement, getImageFromDropEvent, getPendingPanelDragElement, isCanvasInsertDrag, isCanvasInsertDragType, looksLikeHTML } from "../../shared/utils/clipboard";
import { resolveDropTarget } from "../../shared/utils/dropPlan";
import { applyOperationsToStore, createMoveOperation, createSetStylesOperation } from "../../shared/utils/operations";
import { isDrawableTool } from "../../shared/utils/toolElements";
import { getCamera, isCameraDriving, notifyUserCameraGesture, publishCamera, registerCameraDriver, sameCamera, subscribeCamera } from "../../shell/utils/chatShortcuts";
import { findContainerAt } from "../hooks/drawParent";
import { useCanvasDraw } from "../hooks/useCanvasDraw";
import { useCanvasMarquee } from "../hooks/useCanvasMarquee";
import { useDndCanvas } from "../hooks/useDndCanvas";
import { usePotentialParentOverlay } from "../hooks/usePotentialParentOverlay";
import { useResizing } from "../hooks/useResizing";
import { isRelativeFlowPosition, positionStylesForParent } from "../utils/absolutePositioning";
import { canAdoptElement } from "../utils/adoptionGuard";
import { getElementComputedMargins, getElementRect$1 } from "../utils/collisionUtils";
import { computeEdgeDistances, getAbsoluteContainingBox, getElementPaddingBox, isFlowLayoutElement } from "../utils/domGeometry";
import { mapScreenPoint, previewZoomDrift } from "../utils/dragFrame";
import { dragPreviewBoxSize, withDragPreviewSize } from "../utils/dragPreviewGeometry";
import { createCanvasRenderCache } from "../utils/renderCache";
import { collectAdoptedChildren, renderElement } from "../utils/renderElement";
import { collectSnapLines, visibleSnapRects } from "../utils/snapping";
import { CANVAS_ZOOM_STEP, MIN_CANVAS_SCALE, clampCanvasScale, zoomScaleForWheel } from "../utils/zoom";
import { AgentFollowFrame } from "./AgentFollowFrame";
import { AiLockOverlays, HoverOverlay, ROOT_LABEL_MIN_SCALE, RootLabels, SelectionOverlay, useOverlayGeoms } from "./CanvasOverlays";
import { CanvasPixelGrid } from "./CanvasPixelGrid";
import { CanvasToolbar } from "./CanvasToolbar";
import { ComponentEditingModeBar } from "./ComponentEditingModeBar";
import { ElementErrorBoundary } from "./ErrorBoundary";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { canAcceptChild, getById, getChildren$2, getParentId, getRootIds, hasChildren$1, resolveTextOwner } from "@bingo/compiler";
import { useTranslation } from "@bingo/i18n";
import { Button, Text$4, XIcon } from "@bingo/ui";
import { DiamondsFour as i$4 } from "@phosphor-icons/react/dist/icons/DiamondsFour";
import * as import_react from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import * as import_compiler_runtime from "react/compiler-runtime";
import * as import_jsx_runtime from "react/jsx-runtime";
import { toast } from "sonner";

var GUIDE_COLOR = "var(--guide)";
var CAMERA_COMMIT_MS = 150;
/** Pointer travel that turns a press into a drag — shared by the dnd sensor
*  and the click-descent guard so the two can't drift apart. */
var DRAG_ACTIVATION_DISTANCE = 5;
var DRAG_EDGE_PAN_ZONE = 64;
var DRAG_EDGE_PAN_MAX_SPEED = 900;
function getDragEdgePanVelocity(position, start, end) {
  const beforeStartEdge = start + DRAG_EDGE_PAN_ZONE - position;
  if (beforeStartEdge > 0) {
    const strength = Math.min(beforeStartEdge / DRAG_EDGE_PAN_ZONE, 1);
    return DRAG_EDGE_PAN_MAX_SPEED * strength * strength;
  }
  const afterEndEdge = position - (end - DRAG_EDGE_PAN_ZONE);
  if (afterEndEdge > 0) {
    const strength = Math.min(afterEndEdge / DRAG_EDGE_PAN_ZONE, 1);
    return -900 * strength * strength;
  }
  return 0;
}
var COMMENT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 256 256'%3E%3Cpath d='M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Z' fill='%23111111'/%3E%3C/svg%3E") 4 20, auto`;
var isSpacePressedGlobal = false;
var isPanToolActiveGlobal = false;
var isDragSuppressedGlobal = false;
function getApprovalTarget(approval, t) {
  const args = approval.args || {};
  if (args.file_path) return String(args.file_path);
  if (args.project_path) return String(args.project_path);
  if (Array.isArray(args.files)) {
    const first = args.files[0]?.file_path;
    return first ? `${first}${args.files.length > 1 ? ` +${args.files.length - 1}` : ""}` : t("canvas.fileCount", { count: args.files.length });
  }
  return t("canvas.project");
}
function getApprovalDelta(approval) {
  const args = approval.args || {};
  if (typeof args.content === "string") return {
    additions: args.content.split("\n").length,
    deletions: 0
  };
  if (Array.isArray(args.files)) return {
    additions: args.files.reduce((sum, file) => {
      return sum + (typeof file?.content === "string" ? file.content.split("\n").length : 0);
    }, 0),
    deletions: 0
  };
  if (typeof args.old_string === "string" || typeof args.new_string === "string") return {
    additions: typeof args.new_string === "string" ? args.new_string.split("\n").length : 0,
    deletions: typeof args.old_string === "string" ? args.old_string.split("\n").length : 0
  };
  return null;
}
function ExternalMcpApprovalPrompt(t0) {
  const $ = (0, import_compiler_runtime.c)(36);
  const { t } = useTranslation("editor");
  const {
    approvals,
    onResolve
  } = t0;
  if (approvals.length === 0) return null;
  const approval = approvals[0];
  let t1;
  if (true) {
    t1 = getApprovalTarget(approval, t);
    $[0] = approval;
    $[1] = t1;
  } else t1 = $[1];
  const target = t1;
  let t2;
  if ($[2] !== approval) {
    t2 = getApprovalDelta(approval);
    $[2] = approval;
    $[3] = t2;
  } else t2 = $[3];
  const delta = t2;
  let t3;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = {
      width: 393.58527122193954,
      gap: "32px",
      padding: "12px",
      display: "flex",
      flexDirection: "column"
    };
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  let t5;
  let t6;
  if (true) {
    t4 = {
      display: "flex",
      flexDirection: "column",
      gap: "4px"
    };
    t5 = <Text$4 size="sm" weight="medium" variant="primary">{t("canvas.approvalTitle")}</Text$4>;
    t6 = {
      display: "flex",
      flexDirection: "column",
      gap: "0px"
    };
    $[5] = t4;
    $[6] = t5;
    $[7] = t6;
  } else {
    t4 = $[5];
    t5 = $[6];
    t6 = $[7];
  }
  let t7;
  if ($[8] !== target) {
    t7 = <Text$4 size="xs" weight="regular" variant="tertiary" className="font-mono truncate">{target}</Text$4>;
    $[8] = target;
    $[9] = t7;
  } else t7 = $[9];
  let t8;
  if ($[10] !== approval.toolName || $[11] !== delta) {
    t8 = <Text$4 size="2xs" weight="regular" variant="tertiary" className="font-mono">{delta ? <>{<span className="text-emerald-500">+{delta.additions}</span>}{delta.deletions > 0 && <span className="text-rose-400">-{delta.deletions}</span>}</> : <span>{approval.toolName}</span>}</Text$4>;
    $[10] = approval.toolName;
    $[11] = delta;
    $[12] = t8;
  } else t8 = $[12];
  let t9;
  if ($[13] !== t7 || $[14] !== t8) {
    t9 = <div style={t4}>{t5}{<div style={t6}>{t7}{t8}</div>}</div>;
    $[13] = t7;
    $[14] = t8;
    $[15] = t9;
  } else t9 = $[15];
  let t10;
  if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
    t10 = {
      display: "flex",
      flexDirection: "row",
      gap: "8px",
      width: "100%",
      alignItems: "center",
      justifyContent: "space-between"
    };
    $[16] = t10;
  } else t10 = $[16];
  let t11;
  if (true) {
    t11 = <Button variant="secondary" size="sm" onClick={() => onResolve(approval.approvalId, false)}>{t("canvas.reject")}</Button>;
    $[17] = approval.approvalId;
    $[18] = onResolve;
    $[19] = t11;
  } else t11 = $[19];
  let t12;
  if ($[20] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = {
      gap: 8,
      display: "flex",
      alignItems: "center",
      flexShrink: 0
    };
    $[20] = t12;
  } else t12 = $[20];
  let t13;
  if (true) {
    t13 = <Button variant="secondary" size="sm" onClick={() => onResolve(approval.approvalId, true, {
      autoApproveFileEdits: true
    })}>{t("canvas.allowSession")}</Button>;
    $[21] = approval.approvalId;
    $[22] = onResolve;
    $[23] = t13;
  } else t13 = $[23];
  let t14;
  if (true) {
    t14 = <Button variant="outline" size="sm" onClick={() => onResolve(approval.approvalId, true)}>{t("canvas.approve")}</Button>;
    $[24] = approval.approvalId;
    $[25] = onResolve;
    $[26] = t14;
  } else t14 = $[26];
  let t15;
  if ($[27] !== t13 || $[28] !== t14) {
    t15 = <div style={t12}>{t13}{t14}</div>;
    $[27] = t13;
    $[28] = t14;
    $[29] = t15;
  } else t15 = $[29];
  let t16;
  if ($[30] !== t11 || $[31] !== t15) {
    t16 = <div style={t10}>{t11}{t15}</div>;
    $[30] = t11;
    $[31] = t15;
    $[32] = t16;
  } else t16 = $[32];
  let t17;
  if ($[33] !== t16 || $[34] !== t9) {
    t17 = <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">{<div style={t3} className="bg-card shadow-lg border border-border py-0 rounded-lg">{t9}{t16}</div>}</div>;
    $[33] = t16;
    $[34] = t9;
    $[35] = t17;
  } else t17 = $[35];
  return t17;
}
function PasteStyleCleanPrompt(t0) {
  const $ = (0, import_compiler_runtime.c)(23);
  const { t } = useTranslation("editor");
  const {
    nodeCount,
    onApply,
    onDismiss
  } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = {
      width: 360,
      gap: "12px",
      padding: "12px",
      display: "flex",
      flexDirection: "column"
    };
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  let t3;
  if (true) {
    t2 = {
      display: "flex",
      flexDirection: "column",
      gap: "2px"
    };
    t3 = <Text$4 size="sm" weight="medium" variant="primary">{t("canvas.matchingClasses")}</Text$4>;
    $[1] = t2;
    $[2] = t3;
  } else {
    t2 = $[1];
    t3 = $[2];
  }
  let t5;
  if (true) {
    t5 = <div style={t2}>{t3}{<Text$4 size="xs" weight="regular" variant="tertiary">{t("canvas.pastedStylePrompt", { count: nodeCount })}</Text$4>}</div>;
    $[3] = nodeCount;
    $[5] = t5;
  } else t5 = $[5];
  let t6;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = {
      display: "flex",
      flexDirection: "row",
      gap: "8px",
      alignItems: "center",
      justifyContent: "space-between"
    };
    $[6] = t6;
  } else t6 = $[6];
  let t7;
  if (true) {
    t7 = <Button variant="ghost" size="sm" onClick={onDismiss}>{t("canvas.keepStyles")}</Button>;
    $[7] = onDismiss;
    $[8] = t7;
  } else t7 = $[8];
  let t8;
  if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = {
      gap: 8,
      display: "flex",
      alignItems: "center",
      flexShrink: 0
    };
    $[9] = t8;
  } else t8 = $[9];
  let t9;
  if (true) {
    t9 = <Button variant="secondary" size="sm" onClick={() => onApply("class")}>{t("canvas.removeClassStyles")}</Button>;
    $[10] = onApply;
    $[11] = t9;
  } else t9 = $[11];
  let t10;
  if (true) {
    t10 = <Button variant="outline" size="sm" onClick={() => onApply("all")}>{t("canvas.removeAllInline")}</Button>;
    $[12] = onApply;
    $[13] = t10;
  } else t10 = $[13];
  let t11;
  if ($[14] !== t10 || $[15] !== t9) {
    t11 = <div style={t8}>{t9}{t10}</div>;
    $[14] = t10;
    $[15] = t9;
    $[16] = t11;
  } else t11 = $[16];
  let t12;
  if ($[17] !== t11 || $[18] !== t7) {
    t12 = <div style={t6}>{t7}{t11}</div>;
    $[17] = t11;
    $[18] = t7;
    $[19] = t12;
  } else t12 = $[19];
  let t13;
  if ($[20] !== t12 || $[21] !== t5) {
    t13 = <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">{<div style={t1} className="bg-card shadow-lg border border-border rounded-lg">{t5}{t12}</div>}</div>;
    $[20] = t12;
    $[21] = t5;
    $[22] = t13;
  } else t13 = $[22];
  return t13;
}
var PanAwarePointerSensor = class extends PointerSensor {
  static {
    this.activators = [{
      eventName: "onPointerDown",
      handler: ({
        nativeEvent: event
      }) => {
        if (isSpacePressedGlobal || isPanToolActiveGlobal || isDragSuppressedGlobal) return false;
        const target = event.target;
        if (target) {
          const tag = target.tagName;
          if (tag === "TEXTAREA" || tag === "INPUT" || target.isContentEditable) return false;
        }
        if (event.button !== 0 || event.isPrimary === false) return false;
        return true;
      }
    }];
  }
};
/** Keep visual subtrees independent from selection and event callback identity. */
function CanvasRootTrees(props) {
  const stable = useStableCanvasTreeProps(props);
  const store = useVariableRenderStore(props.store, true, props.variableCssUsage);
  const liveStoreRef = import_react.useRef(store);
  const drilledParentIdRef = import_react.useRef(props.drilledParentId);
  import_react.useLayoutEffect(() => {
    liveStoreRef.current = store;
    drilledParentIdRef.current = props.drilledParentId;
  }, [store, props.drilledParentId]);
  const cache = import_react.useMemo(createCanvasRenderCache, []);
  const { panMode, commentMode, readOnly, selectElement, throttledHoverElement,
    components, componentIndex, componentsRevision, iconLibraries, onEditText,
    editingTextId, editingTextBounds, setEditingTextBounds, onStartEditTextProp,
    onStopEditTextProp, onActivateTextEditor, onDeactivateTextEditor, onTextSelectionChange,
    selectedElementIdsRef, selectionMode, selectionModeRef, canvasScale, onResizeElement,
    onViewportZoom, onViewportPan, assetResolver, onFixWithAI, onAddElement,
    onUpdateElementProps, onSaveToCode, onOpenFile, allowedPaths, onAddAllowedPath,
    interactiveParentIds, interactiveParentIdsRef } = stable;
  const handlers = import_react.useMemo(() => ({
    onStartEditText: readOnly || panMode ? undefined : (id, bounds) => {
      setEditingTextBounds(bounds);
      onStartEditTextProp?.(id);
      selectElement(resolveTextOwner(liveStoreRef.current, id));
    },
    onStopEditText: readOnly ? undefined : () => {
      setEditingTextBounds(null);
      onStopEditTextProp?.();
    },
    onResizeViewport: readOnly ? undefined : (id, width, height) => onResizeElement(id, { width, height }),
    onSetMediaSource: readOnly ? undefined : (id, src) => {
      const element = getById(liveStoreRef.current, id);
      const nextProps = { ...(element?.props ?? {}), src };
      if (element?.tag === "video") nextProps.controls = true;
      onUpdateElementProps?.(id, nextProps);
    },
  }), [readOnly, panMode, setEditingTextBounds, onStartEditTextProp, selectElement, onStopEditTextProp, onResizeElement, onUpdateElementProps]);
  const options = import_react.useMemo(() => ({
    ...handlers,
    inert: panMode,
    onSelectElement: commentMode || panMode ? undefined : selectElement,
    onHoverElement: commentMode || panMode ? undefined : throttledHoverElement,
    components, componentIndex, componentsRevision, iconLibraries,
    onEditText: readOnly ? undefined : onEditText,
    editingTextId: readOnly ? null : editingTextId,
    editingTextBounds: readOnly ? null : editingTextBounds,
    onActivateTextEditor: readOnly ? undefined : onActivateTextEditor,
    onDeactivateTextEditor: readOnly ? undefined : onDeactivateTextEditor,
    onTextSelectionChange: readOnly ? undefined : onTextSelectionChange,
    selectedElementIdsRef, selectionMode, selectionModeRef, canvasScale,
    onViewportZoom, onViewportPan, assetResolver, onFixWithAI, onAddElement,
    onSaveToCode, onOpenFile, allowedPaths, onAddAllowedPath,
    interactiveParentIdsRef, liveStoreRef, drilledParentIdRef, renderCache: cache,
  }), [panMode, commentMode, readOnly, selectElement, throttledHoverElement,
    components, componentIndex, componentsRevision, iconLibraries, onEditText,
    editingTextId, editingTextBounds, setEditingTextBounds, onStartEditTextProp,
    onStopEditTextProp, onActivateTextEditor, onDeactivateTextEditor, onTextSelectionChange,
    selectedElementIdsRef, selectionMode, selectionModeRef, canvasScale, onResizeElement,
    onViewportZoom, onViewportPan, assetResolver, onFixWithAI, onAddElement,
    onUpdateElementProps, onSaveToCode, onOpenFile, allowedPaths, onAddAllowedPath,
    interactiveParentIdsRef, cache, handlers]);
  const renderOptions = import_react.useMemo(() => ({ ...options, interactiveParentIds }), [options, interactiveParentIds]);
  cache.prepare(store, renderOptions);
  return <CanvasSelectionContext.Provider value={props.selectedElementIds}>
    {getRootIds(store).map(rootId => {
      const element = getById(store, rootId);
      if (!element) return null;
      return <div key={rootId} data-canvas-root-id={rootId} className="absolute" style={{
        top: element.canvasPosition?.y ?? 20,
        left: element.canvasPosition?.x ?? 20,
        opacity: props.draggedIds.has(rootId) ? 0 : 1,
      }}><ElementErrorBoundary elementId={rootId} silent={rootId.startsWith("el-draw-")} resetKey={`${rootId}:${store.byId.size}`}>
        {renderElement(rootId, store, renderOptions)}
      </ElementErrorBoundary></div>;
    })}
  </CanvasSelectionContext.Provider>;
}
function Canvas(t0) {
  const $ = (0, import_compiler_runtime.c)(473);
  const { t } = useTranslation("editor");
  const {
    store,
    setStore,
    selectedElementIds,
    onSelectElement,
    onSelectElements,
    onResizeElement,
    onEditText,
    editingTextId,
    onStartEditText: onStartEditTextProp,
    onStopEditText: onStopEditTextProp,
    onActivateTextEditor,
    onDeactivateTextEditor,
    onTextSelectionChange,
    components: t1,
    componentIndex: t2,
    componentsRevision: t3,
    iconLibraries: t4,
    editingFile: t5,
    onCloseEdit,
    onAddElement,
    onDropElement,
    canvasRefProp,
    viewportRefProp,
    onStopFollowingAgent,
    readOnly: t6,
    backgroundColor,
    initialTransform,
    onUpdateElementStyles,
    onUpdateElementProps,
    onFixWithAI,
    onSaveToCode,
    onOpenFile,
    allowedPaths,
    onAddAllowedPath,
    commentOverlay,
    commentMode: t7,
    onCommentClick,
    showCommentTools: t8,
    onToggleCommentMode,
    showResolvedComments: t9,
    onShowResolvedChange,
    onPickPreviewPreset,
    onOpenMoreHtml,
    externalMcpApprovals: t10,
    onExternalMcpApproval,
    pasteStyleSuggestion,
    onApplyPasteStyleClean,
    onDismissPasteStyleClean,
    componentEditMode,
    interactiveParentIds,
    interactiveParentIdsRef,
    drilledParentId,
    elementLocks,
    onPushOperations,
    onStartAltDrag,
    onAltDragAborted
  } = t0;
  let t11;
  if ($[0] !== t1) {
    t11 = t1 === void 0 ? {} : t1;
    $[0] = t1;
    $[1] = t11;
  } else t11 = $[1];
  const components = t11;
  let t12;
  if ($[2] !== t2) {
    t12 = t2 === void 0 ? {} : t2;
    $[2] = t2;
    $[3] = t12;
  } else t12 = $[3];
  const componentIndex = t12;
  const componentsRevision = t3 === void 0 ? 0 : t3;
  const variableGeometry = useVariableGeometryVersion(store, componentsRevision, components, componentIndex);
  const variableGeometryVersion = variableGeometry.version;
  let t13;
  if ($[4] !== t4) {
    t13 = t4 === void 0 ? {} : t4;
    $[4] = t4;
    $[5] = t13;
  } else t13 = $[5];
  const iconLibraries = t13;
  const editingFile = t5 === void 0 ? null : t5;
  const readOnly = t6 === void 0 ? false : t6;
  const commentMode = t7 === void 0 ? false : t7;
  const showCommentTools = t8 === void 0 ? false : t8;
  const showResolvedComments = t9 === void 0 ? false : t9;
  let t14;
  if ($[6] !== t10) {
    t14 = t10 === void 0 ? [] : t10;
    $[6] = t10;
    $[7] = t14;
  } else t14 = $[7];
  const externalMcpApprovals = t14;
  const assetResolver = useAssetResolver();
  const uploadImage = useUploadImage();
  const {
    activeTool,
    setActiveTool,
    scaleAspectLocked
  } = useActiveTool();
  const internalCanvasRef = (0, import_react.useRef)(null);
  const zoomGestureAtRef = (0, import_react.useRef)(0);
  const canvasRef = canvasRefProp || internalCanvasRef;
  const altKeyDownRef = (0, import_react.useRef)(false);
  const pointerDownAtRef = (0, import_react.useRef)(null);
  let t15;
  let t16;
  if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
    t15 = () => {
      const update = e => {
        altKeyDownRef.current = e.altKey;
      };
      const down = e_0 => {
        update(e_0);
        pointerDownAtRef.current = {
          x: e_0.clientX,
          y: e_0.clientY
        };
      };
      window.addEventListener("pointermove", update, {
        capture: true,
        passive: true
      });
      window.addEventListener("pointerdown", down, {
        capture: true,
        passive: true
      });
      return () => {
        window.removeEventListener("pointermove", update, true);
        window.removeEventListener("pointerdown", down, true);
      };
    };
    t16 = [];
    $[8] = t15;
    $[9] = t16;
  } else {
    t15 = $[8];
    t16 = $[9];
  }
  (0, import_react.useEffect)(t15, t16);
  let t17;
  if ($[10] !== onSelectElement) {
    t17 = (id, t18, click) => {
      const addToSelection = t18 === void 0 ? false : t18;
      const down_0 = pointerDownAtRef.current;
      const dragged = !!click && !!down_0 && Math.hypot(click.x - down_0.x, click.y - down_0.y) > DRAG_ACTIVATION_DISTANCE;
      onSelectElement(id, addToSelection, altKeyDownRef.current, dragged ? void 0 : click);
    };
    $[10] = onSelectElement;
    $[11] = t17;
  } else t17 = $[11];
  const selectElement = t17;
  const internalViewportRef = (0, import_react.useRef)(null);
  const viewportRef = viewportRefProp || internalViewportRef;
  const hoverSetterRef = (0, import_react.useRef)(null);
  const [resizing, setResizing] = (0, import_react.useState)(null);
  const [zoom, setZoom] = (0, import_react.useState)(initialTransform?.scale ?? 1);
  const t18 = initialTransform?.scale ?? 1;
  const t19 = initialTransform?.positionX ?? 0;
  const t20 = initialTransform?.positionY ?? 0;
  let t21;
  if ($[12] !== t18 || $[13] !== t19 || $[14] !== t20) {
    t21 = {
      scale: t18,
      positionX: t19,
      positionY: t20
    };
    $[12] = t18;
    $[13] = t19;
    $[14] = t20;
    $[15] = t21;
  } else t21 = $[15];
  const [transformState, setTransformState] = (0, import_react.useState)(t21);
  const [spacePressed, setSpacePressed] = (0, import_react.useState)(false);
  const panMode = spacePressed || activeTool === "pan";
  const [editingTextBounds, setEditingTextBounds] = (0, import_react.useState)(null);
  const selectionModeRef = (0, import_react.useRef)("topmost");
  const panTimeoutRef = (0, import_react.useRef)(null);
  const selectionOverlayRef = (0, import_react.useRef)(null);
  const isPanningRef = (0, import_react.useRef)(false);
  const isDraggingRef = (0, import_react.useRef)(false);
  const transformRef = (0, import_react.useRef)(null);
  const lastMousePosRef = (0, import_react.useRef)(null);
  const zoomTowardClientRef = (0, import_react.useRef)(null);
  let t22;
  if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
    t22 = () => {
      const wrapper = selectionOverlayRef.current;
      const live = transformRef.current?.instance.transformState;
      if (!wrapper || !live) return;
      for (const node of wrapper.querySelectorAll("[data-ov-base]")) {
        const raw = node.dataset.ovBase;
        if (!raw) continue;
        const p = raw.split(",");
        const baseScale = +p[4];
        if (!baseScale) continue;
        const k = live.scale / baseScale;
        const tx = live.positionX - k * +p[5];
        const ty = live.positionY - k * +p[6];
        node.style.left = `${k * +p[0] + tx}px`;
        node.style.top = `${k * +p[1] + ty}px`;
        if (+p[2]) node.style.width = `${k * +p[2]}px`;
        if (+p[3]) node.style.height = `${k * +p[3]}px`;
      }
      const hideRootLabel = live.scale <= ROOT_LABEL_MIN_SCALE;
      for (const node_0 of wrapper.querySelectorAll("[data-root-label-id]")) node_0.style.opacity = hideRootLabel ? "0" : "1";
    };
    $[16] = t22;
  } else t22 = $[16];
  const syncOverlayToLiveTransform = t22;
  let t23;
  if ($[17] !== onSelectElement) {
    t23 = id_0 => onSelectElement(id_0);
    $[17] = onSelectElement;
    $[18] = t23;
  } else t23 = $[18];
  let t24;
  if ($[19] !== store) {
    t24 = (hostId, child) => {
      const host = getById(store, hostId);
      return !!host && canAcceptChild(host, child);
    };
    $[19] = store;
    $[20] = t24;
  } else t24 = $[20];
  let t25;
  if ($[21] !== editingTextId || $[22] !== elementLocks || $[23] !== store) {
    t25 = (drawnRect, parentId, scale) => {
      const siblingIds = parentId === null ? getRootIds(store) : getChildren$2(store, parentId);
      if (siblingIds.length === 0) return [];
      const editingOwnerId = editingTextId ? resolveTextOwner(store, editingTextId) : null;
      const candidates = [];
      const guard = {
        editingTextId,
        editingOwnerId,
        isLocked: id_1 => !!elementLocks?.has(id_1)
      };
      for (const id_2 of siblingIds) {
        const el = getById(store, id_2);
        if (!el || !canAdoptElement(el, guard)) continue;
        const rect = getElementRect$1(id_2);
        if (!rect) continue;
        const {
          marginLeft,
          marginTop
        } = getElementComputedMargins(id_2);
        candidates.push({
          id: id_2,
          rect: {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          },
          marginLeft,
          marginTop
        });
      }
      return collectAdoptedChildren(drawnRect, candidates, scale);
    };
    $[21] = editingTextId;
    $[22] = elementLocks;
    $[23] = store;
    $[24] = t25;
  } else t25 = $[24];
  const {
    drawMounted,
    drawOverlayRef,
    drawBadgeRef,
    startDraw
  } = useCanvasDraw({
    canvasRef,
    viewportRef,
    transformRef,
    onAddElement,
    setActiveTool,
    onSelectElement: t23,
    suppressNextClick: () => {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    },
    canHostChild: t24,
    collectAdoptions: t25
  });
  let t26;
  if ($[25] === Symbol.for("react.memo_cache_sentinel")) {
    t26 = next => {
      setZoom(next.scale);
      setTransformState(prev => sameCamera(prev, next) ? prev : next);
    };
    $[25] = t26;
  } else t26 = $[25];
  const commitCamera = t26;
  let t27;
  let t28;
  if ($[26] === Symbol.for("react.memo_cache_sentinel")) {
    t27 = () => registerCameraDriver((next_0, durationMs) => {
      const transform = transformRef.current;
      if (!transform) {
        publishCamera(next_0);
        return;
      }
      transform.setTransform(next_0.positionX, next_0.positionY, next_0.scale, durationMs);
      if (durationMs <= 0) publishCamera(next_0);
    });
    t28 = [];
    $[26] = t27;
    $[27] = t28;
  } else {
    t27 = $[26];
    t28 = $[27];
  }
  (0, import_react.useEffect)(t27, t28);
  let t29;
  if ($[28] === Symbol.for("react.memo_cache_sentinel")) {
    t29 = () => {
      const pos = lastMousePosRef.current;
      if (!pos) return;
      const elementUnderMouse = document.elementFromPoint(pos.x, pos.y);
      if (!elementUnderMouse) return;
      elementUnderMouse.dispatchEvent(new MouseEvent("mouseover", {
        bubbles: true,
        cancelable: true,
        clientX: pos.x,
        clientY: pos.y
      }));
    };
    $[28] = t29;
  } else t29 = $[28];
  const rehoverAtPointer = t29;
  let t30;
  if ($[29] !== commitCamera || $[30] !== rehoverAtPointer) {
    t30 = next_1 => {
      if (isDraggingRef.current) {
        if (panTimeoutRef.current) {
          clearTimeout(panTimeoutRef.current);
          panTimeoutRef.current = null;
        }
        isPanningRef.current = false;
        commitCamera(next_1);
        return;
      }
      if (panTimeoutRef.current) clearTimeout(panTimeoutRef.current);
      panTimeoutRef.current = setTimeout(() => {
        isPanningRef.current = false;
        syncOverlayToLiveTransform();
        rehoverAtPointer();
      }, CAMERA_COMMIT_MS);
    };
    $[29] = commitCamera;
    $[30] = rehoverAtPointer;
    $[31] = t30;
  } else t30 = $[31];
  const scheduleCameraCommit = t30;
  const updateCommentPinPositions = _temp4$22;
  let t31;
  if ($[32] !== scheduleCameraCommit) {
    t31 = camera => {
      isPanningRef.current = true;
      updateCommentPinPositions(camera.scale, camera.positionX, camera.positionY);
      syncOverlayToLiveTransform();
      scheduleCameraCommit(camera);
    };
    $[32] = scheduleCameraCommit;
    $[33] = t31;
  } else t31 = $[33];
  const onLiveCamera = (0, import_react.useEffectEvent)(t31);
  let t32;
  if ($[34] !== onLiveCamera) {
    t32 = () => subscribeCamera(camera_0 => {
      onLiveCamera(camera_0);
    });
    $[34] = onLiveCamera;
    $[35] = t32;
  } else t32 = $[35];
  let t33;
  if ($[36] === Symbol.for("react.memo_cache_sentinel")) {
    t33 = [];
    $[36] = t33;
  } else t33 = $[36];
  (0, import_react.useEffect)(t32, t33);
  let t34;
  if ($[37] !== canvasRef || $[38] !== viewportRef.current) {
    t34 = () => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const pinScroll = e_1 => {
        const node_1 = e_1.target;
        const content = canvasRef.current;
        if (!content || !(node_1 instanceof HTMLElement) || !node_1.contains(content)) return;
        if (node_1.scrollLeft !== 0) node_1.scrollLeft = 0;
        if (node_1.scrollTop !== 0) node_1.scrollTop = 0;
      };
      viewport.addEventListener("scroll", pinScroll, {
        capture: true,
        passive: true
      });
      return () => viewport.removeEventListener("scroll", pinScroll, {
        capture: true
      });
    };
    $[37] = canvasRef;
    $[38] = viewportRef.current;
    $[39] = t34;
  } else t34 = $[39];
  let t35;
  if ($[40] !== canvasRef || $[41] !== viewportRef) {
    t35 = [viewportRef, canvasRef];
    $[40] = canvasRef;
    $[41] = viewportRef;
    $[42] = t35;
  } else t35 = $[42];
  (0, import_react.useEffect)(t34, t35);
  let t36;
  if ($[43] !== initialTransform?.positionX || $[44] !== initialTransform?.positionY || $[45] !== initialTransform?.scale) {
    t36 = () => {
      publishCamera({
        scale: initialTransform?.scale ?? 1,
        positionX: initialTransform?.positionX ?? 0,
        positionY: initialTransform?.positionY ?? 0
      });
    };
    $[43] = initialTransform?.positionX;
    $[44] = initialTransform?.positionY;
    $[45] = initialTransform?.scale;
    $[46] = t36;
  } else t36 = $[46];
  const publishInitialCamera = (0, import_react.useEffectEvent)(t36);
  let t37;
  if ($[47] !== publishInitialCamera) {
    t37 = () => {
      publishInitialCamera();
    };
    $[47] = publishInitialCamera;
    $[48] = t37;
  } else t37 = $[48];
  let t38;
  if ($[49] === Symbol.for("react.memo_cache_sentinel")) {
    t38 = [];
    $[49] = t38;
  } else t38 = $[49];
  (0, import_react.useLayoutEffect)(t37, t38);
  let t39;
  if ($[50] === Symbol.for("react.memo_cache_sentinel")) {
    const getLiveCamera = () => {
      const live_0 = transformRef.current?.instance.transformState;
      return live_0 ? {
        scale: live_0.scale,
        positionX: live_0.positionX,
        positionY: live_0.positionY
      } : getCamera();
    };
    t39 = (clientX, clientY, viewportRect) => {
      const {
        scale: scale_1,
        positionX: positionX_0,
        positionY: positionY_0
      } = getLiveCamera();
      return {
        x: (clientX - viewportRect.left - positionX_0) / scale_1,
        y: (clientY - viewportRect.top - positionY_0) / scale_1
      };
    };
    $[50] = t39;
  } else t39 = $[50];
  const viewportPointToCanvas = t39;
  const lastHoverIdRef = (0, import_react.useRef)(null);
  const isResizingRef = (0, import_react.useRef)(false);
  let t40;
  if ($[51] !== onSelectElements) {
    t40 = {
      onSelectElements
    };
    $[51] = onSelectElements;
    $[52] = t40;
  } else t40 = $[52];
  const {
    marqueeRef,
    marqueeOverlayRef,
    marqueeHoverContainerRef,
    marqueeMounted,
    suppressClickRef: t41,
    startMarquee
  } = useCanvasMarquee(t40);
  const suppressClickRef = t41;
  let t42;
  if ($[53] !== marqueeRef) {
    t42 = id_3 => {
      if (isPanningRef.current) return;
      if (marqueeRef.current?.active) return;
      if (isResizingRef.current) return;
      if (lastHoverIdRef.current === id_3) return;
      publishHover(id_3, "canvas");
    };
    $[53] = marqueeRef;
    $[54] = t42;
  } else t42 = $[54];
  const throttledHoverElement = t42;
  let t43;
  let t44;
  if ($[55] === Symbol.for("react.memo_cache_sentinel")) {
    t43 = () => {
      const unsubscribe = subscribeHover(id_4 => {
        lastHoverIdRef.current = id_4;
        hoverSetterRef.current?.(id_4);
      });
      return () => {
        unsubscribe();
        publishHover(null, "canvas");
      };
    };
    t44 = [];
    $[55] = t43;
    $[56] = t44;
  } else {
    t43 = $[55];
    t44 = $[56];
  }
  (0, import_react.useEffect)(t43, t44);
  let t45;
  let t46;
  if ($[57] !== resizing) {
    t45 = () => {
      isResizingRef.current = !!resizing;
      publishHover(null, "canvas");
    };
    t46 = [resizing];
    $[57] = resizing;
    $[58] = t45;
    $[59] = t46;
  } else {
    t45 = $[58];
    t46 = $[59];
  }
  (0, import_react.useEffect)(t45, t46);
  let t47;
  if ($[60] !== viewportRef.current) {
    t47 = () => {
      const viewport_0 = viewportRef.current;
      if (!viewport_0) return;
      let safariGestureActive = false;
      let safariGestureBaseScale = 1;
      const applyTransform = (newScale, newX, newY) => {
        if (!transformRef.current) return;
        transformRef.current.setTransform(newX, newY, newScale, 0);
        publishCamera({
          scale: newScale,
          positionX: newX,
          positionY: newY
        });
      };
      const zoomTowardClient = (newScale_0, clientX_0, clientY_0) => {
        if (!transformRef.current) return;
        const state = transformRef.current.instance.transformState;
        const clamped = clampCanvasScale(newScale_0);
        const rect_0 = viewport_0.getBoundingClientRect();
        const mouseX = clientX_0 - rect_0.left;
        const mouseY = clientY_0 - rect_0.top;
        const scaleChange = clamped / state.scale;
        const newX_0 = mouseX - (mouseX - state.positionX) * scaleChange;
        const newY_0 = mouseY - (mouseY - state.positionY) * scaleChange;
        applyTransform(clamped, newX_0, newY_0);
      };
      zoomTowardClientRef.current = zoomTowardClient;
      const handleWheel = e_2 => {
        if (!transformRef.current) return;
        if (!e_2.target?.closest?.("[data-canvas-viewport], [data-drag-overlay]")) return;
        if (safariGestureActive && (e_2.ctrlKey || e_2.metaKey)) {
          e_2.preventDefault();
          return;
        }
        const state_0 = transformRef.current.instance.transformState;
        const isPinchOrCtrlZoom = e_2.ctrlKey || e_2.metaKey;
        e_2.preventDefault();
        if (isPinchOrCtrlZoom) {
          zoomGestureAtRef.current = performance.now();
          zoomTowardClient(zoomScaleForWheel(state_0.scale, e_2.deltaY), e_2.clientX, e_2.clientY);
        } else {
          const newX_1 = state_0.positionX - e_2.deltaX * 1;
          const newY_1 = state_0.positionY - e_2.deltaY * 1;
          applyTransform(state_0.scale, newX_1, newY_1);
        }
        notifyUserCameraGesture();
      };
      const handleGestureStart = e_3 => {
        e_3.preventDefault();
        if (!transformRef.current) return;
        safariGestureActive = true;
        safariGestureBaseScale = transformRef.current.instance.transformState.scale;
      };
      const handleGestureChange = e_4 => {
        e_4.preventDefault();
        const ge = e_4;
        if (!Number.isFinite(ge.scale)) return;
        zoomTowardClient(safariGestureBaseScale * ge.scale, ge.clientX, ge.clientY);
        notifyUserCameraGesture();
      };
      const handleGestureEnd = e_5 => {
        e_5.preventDefault();
        safariGestureActive = false;
      };
      const handleZoomKey = e_6 => {
        if (isTypingTarget(e_6) || !transformRef.current) return;
        const S = LOCAL_SHORTCUTS.canvas;
        const inward = matchesShortcut(e_6, S.zoomIn);
        const outward = matchesShortcut(e_6, S.zoomOut);
        const actual = matchesShortcut(e_6, S.zoomActual);
        if (!inward && !outward && !actual) return;
        e_6.preventDefault();
        const rect_1 = viewport_0.getBoundingClientRect();
        const at = lastMousePosRef.current ?? {
          x: rect_1.left + rect_1.width / 2,
          y: rect_1.top + rect_1.height / 2
        };
        const {
          scale: scale_2
        } = transformRef.current.instance.transformState;
        zoomTowardClient(actual ? 1 : scale_2 * (inward ? CANVAS_ZOOM_STEP : 1 / CANVAS_ZOOM_STEP), at.x, at.y);
        notifyUserCameraGesture();
      };
      window.addEventListener("wheel", handleWheel, {
        passive: false
      });
      window.addEventListener("keydown", handleZoomKey, {
        passive: false
      });
      viewport_0.addEventListener("gesturestart", handleGestureStart, {
        passive: false
      });
      viewport_0.addEventListener("gesturechange", handleGestureChange, {
        passive: false
      });
      viewport_0.addEventListener("gestureend", handleGestureEnd, {
        passive: false
      });
      return () => {
        zoomTowardClientRef.current = null;
        if (panTimeoutRef.current) clearTimeout(panTimeoutRef.current);
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("keydown", handleZoomKey);
        viewport_0.removeEventListener("gesturestart", handleGestureStart);
        viewport_0.removeEventListener("gesturechange", handleGestureChange);
        viewport_0.removeEventListener("gestureend", handleGestureEnd);
      };
    };
    $[60] = viewportRef.current;
    $[61] = t47;
  } else t47 = $[61];
  let t48;
  if ($[62] !== viewportRef) {
    t48 = [viewportRef];
    $[62] = viewportRef;
    $[63] = t48;
  } else t48 = $[63];
  (0, import_react.useEffect)(t47, t48);
  let t49;
  if ($[64] === Symbol.for("react.memo_cache_sentinel")) {
    t49 = [];
    $[64] = t49;
  } else t49 = $[64];
  (0, import_react.useEffect)(_temp6$16, t49);
  let t50;
  if ($[65] === Symbol.for("react.memo_cache_sentinel")) {
    t50 = [];
    $[65] = t50;
  } else t50 = $[65];
  (0, import_react.useEffect)(_temp7$12, t50);
  let t51;
  if ($[66] === Symbol.for("react.memo_cache_sentinel")) {
    t51 = {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE
      }
    };
    $[66] = t51;
  } else t51 = $[66];
  const sensors = useSensors(useSensor(PanAwarePointerSensor, t51));
  const measure = _temp8$8;
  let t52;
  if ($[67] === Symbol.for("react.memo_cache_sentinel")) {
    t52 = {
      draggable: {
        measure
      },
      droppable: {
        measure
      },
      dragOverlay: {
        measure
      }
    };
    $[67] = t52;
  } else t52 = $[67];
  const measuringConfig = t52;
  let t53;
  if ($[68] !== selectElement) {
    t53 = id_5 => selectElement(id_5, false);
    $[68] = selectElement;
    $[69] = t53;
  } else t53 = $[69];
  let t54;
  if ($[70] !== onPushOperations || $[71] !== setStore || $[72] !== store) {
    t54 = (draggedId, targetId, position) => {
      const {
        parentId: toParentId,
        index: toIndex
      } = resolveDropTarget(store, targetId, position);
      const ops = [];
      let cursor = store;
      const dragged_0 = getById(cursor, draggedId);
      if (toParentId && isFlowLayoutElement(toParentId) && dragged_0 && !isRelativeFlowPosition(dragged_0.styles)) {
        const styleOp = createSetStylesOperation(cursor, draggedId, positionStylesForParent(dragged_0.styles, true));
        if (styleOp) {
          ops.push(styleOp);
          cursor = applyOperationsToStore(cursor, [styleOp]);
        }
      }
      const moveOp = createMoveOperation(cursor, draggedId, toParentId, toIndex);
      if (moveOp) {
        ops.push(moveOp);
        cursor = applyOperationsToStore(cursor, [moveOp]);
      }
      if (ops.length > 0) {
        setStore(cursor);
        onPushOperations?.(ops);
      }
    };
    $[70] = onPushOperations;
    $[71] = setStore;
    $[72] = store;
    $[73] = t54;
  } else t54 = $[73];
  let t55;
  if ($[74] !== onAltDragAborted || $[75] !== onPushOperations || $[76] !== onStartAltDrag || $[77] !== selectedElementIds || $[78] !== setStore || $[79] !== store || $[80] !== t53 || $[81] !== t54) {
    t55 = {
      store,
      setStore,
      onSelectElement: t53,
      onDragElement: t54,
      selectedElementIds,
      hoverElementIdRef: lastHoverIdRef,
      onPushOperations,
      onStartAltDrag,
      onAltDragAborted,
      altKeyDownRef,
      zoomGestureAtRef
    };
    $[74] = onAltDragAborted;
    $[75] = onPushOperations;
    $[76] = onStartAltDrag;
    $[77] = selectedElementIds;
    $[78] = setStore;
    $[79] = store;
    $[80] = t53;
    $[81] = t54;
    $[82] = t55;
  } else t55 = $[82];
  const {
    activeId,
    activeElement,
    activeElements,
    draggedIds,
    overId,
    dropSlot,
    isDragging,
    dragOverlayOffset,
    dragStartAnchor,
    dragStartRects,
    snapOffset,
    snapGuides,
    spacingMeasures,
    spacingGuides,
    dragPreviewRect,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel
  } = useDndCanvas(t55);
  let t56;
  if ($[83] !== commitCamera || $[84] !== handleDragStart) {
    t56 = event => {
      commitCamera(getCamera());
      handleDragStart(event);
    };
    $[83] = commitCamera;
    $[84] = handleDragStart;
    $[85] = t56;
  } else t56 = $[85];
  const onCanvasDragStart = t56;
  let t57;
  if ($[86] !== isDragging) {
    t57 = () => {
      isDraggingRef.current = isDragging;
    };
    $[86] = isDragging;
    $[87] = t57;
  } else t57 = $[87];
  (0, import_react.useLayoutEffect)(t57);
  const [insertDropParentId, setInsertDropParentId] = (0, import_react.useState)(null);
  const lastInsertProbeRef = (0, import_react.useRef)(null);
  let t58;
  if ($[88] !== store) {
    const resolveInsertDropParent = (clientX_1, clientY_1) => {
      const child_0 = getPendingPanelDragElement();
      if (!child_0) return null;
      return findContainerAt(clientX_1, clientY_1, child_0, (hostId_0, candidate) => {
        const parent = getById(store, hostId_0);
        return !!parent && hasChildren$1(parent) && canAcceptChild(parent, candidate);
      })?.getAttribute("data-element-id") ?? null;
    };
    t58 = (clientX_2, clientY_2) => {
      const x = Math.round(clientX_2);
      const y = Math.round(clientY_2);
      const last = lastInsertProbeRef.current;
      if (last && last.x === x && last.y === y) return;
      const id_6 = resolveInsertDropParent(clientX_2, clientY_2);
      lastInsertProbeRef.current = {
        x,
        y,
        id: id_6
      };
      setInsertDropParentId(prev_0 => prev_0 === id_6 ? prev_0 : id_6);
    };
    $[88] = store;
    $[89] = t58;
  } else t58 = $[89];
  const probeInsertDropParent = t58;
  let t59;
  if ($[90] === Symbol.for("react.memo_cache_sentinel")) {
    t59 = () => {
      lastInsertProbeRef.current = null;
      setInsertDropParentId(_temp9$7);
    };
    $[90] = t59;
  } else t59 = $[90];
  const clearInsertDropParent = t59;
  let t60;
  let t61;
  if ($[91] !== insertDropParentId) {
    t60 = () => {
      if (!insertDropParentId) return;
      const onDragEnd = () => clearInsertDropParent();
      window.addEventListener("dragend", onDragEnd);
      return () => window.removeEventListener("dragend", onDragEnd);
    };
    t61 = [insertDropParentId];
    $[91] = insertDropParentId;
    $[92] = t60;
    $[93] = t61;
  } else {
    t60 = $[92];
    t61 = $[93];
  }
  (0, import_react.useEffect)(t60, t61);
  const potentialParentId = overId ?? insertDropParentId;
  const dropSlotRect = dropSlot?.position === "inside" ? dropSlot.indicatorRect : null;
  let t62;
  if ($[94] !== store || $[95] !== viewportRef.current) {
    t62 = id_7 => {
      const parentKey = getParentId(store, id_7);
      const parentId_0 = parentKey === "ROOT" || parentKey === null ? null : parentKey;
      const siblingIds_0 = (parentId_0 === null ? getRootIds(store) : getChildren$2(store, parentId_0)).filter(s => s !== id_7);
      const targets = [];
      for (const sid of siblingIds_0) {
        const r = getElementRect$1(sid);
        if (r) targets.push({
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height
        });
      }
      const box = parentId_0 ? getElementPaddingBox(parentId_0, getCamera().scale) ?? void 0 : void 0;
      const viewport_1 = viewportRef.current?.getBoundingClientRect();
      return collectSnapLines(viewport_1 ? visibleSnapRects(targets, viewport_1) : targets, box, viewport_1);
    };
    $[94] = store;
    $[95] = viewportRef.current;
    $[96] = t62;
  } else t62 = $[96];
  const getResizeSnapTargets = t62;
  const t63 = activeTool === "scale";
  let t64;
  if ($[97] !== setActiveTool) {
    t64 = () => setActiveTool("move");
    $[97] = setActiveTool;
    $[98] = t64;
  } else t64 = $[98];
  let t65;
  if ($[99] !== onPushOperations || $[100] !== setStore || $[101] !== store) {
    t65 = changes => {
      const ops_0 = changes.flatMap(t66 => {
        const {
          id: id_8,
          styles,
          pivot
        } = t66;
        const op = getById(store, id_8) && createSetStylesOperation(store, id_8, styles, null, pivot);
        return op ? [op] : [];
      });
      if (ops_0.length) {
        setStore(applyOperationsToStore(store, ops_0));
        onPushOperations?.(ops_0);
      }
    };
    $[99] = onPushOperations;
    $[100] = setStore;
    $[101] = store;
    $[102] = t65;
  } else t65 = $[102];
  let t66;
  if ($[103] !== getResizeSnapTargets || $[104] !== onResizeElement || $[105] !== resizing || $[106] !== scaleAspectLocked || $[107] !== selectedElementIds || $[108] !== store || $[109] !== t63 || $[110] !== t64 || $[111] !== t65) {
    t66 = {
      resizing,
      setResizing,
      onResizeElement,
      scaleMode: t63,
      scaleAspectLocked,
      onCancelScale: t64,
      store,
      onScaleElements: t65,
      getSnapTargets: getResizeSnapTargets,
      selectedElementIds
    };
    $[103] = getResizeSnapTargets;
    $[104] = onResizeElement;
    $[105] = resizing;
    $[106] = scaleAspectLocked;
    $[107] = selectedElementIds;
    $[108] = store;
    $[109] = t63;
    $[110] = t64;
    $[111] = t65;
    $[112] = t66;
  } else t66 = $[112];
  const {
    handleResizeStart,
    resizeSnapGuides,
    resizePreviewRectRef
  } = useResizing(t66);
  const t67 = !!resizing;
  const t68 = {
    canvasRef,
    store,
    selectedElementIds,
    // This revision includes actual runtime and stylesheet changes. Unrelated
    // component rebuilds must not remeasure an entirely HTML canvas.
    componentsRevision: variableGeometryVersion,
    variableGeometry,
    isDragging,
    isResizing: t67,
    variableGeometryVersion
  };
  const {
    geomByIdRef,
    geomVersion
  } = useOverlayGeoms(t68);
  import_react.useLayoutEffect(() => {
    commitCanvasSelection(selectedElementIds, viewportRef.current);
  }, [selectedElementIds, geomVersion, viewportRef]);
  let t69;
  if ($[120] !== dragStartAnchor || $[121] !== transformState.positionX || $[122] !== transformState.positionY || $[123] !== zoom) {
    t69 = dragStartAnchor && {
      start: dragStartAnchor.frame,
      live: {
        ...dragStartAnchor.frame,
        scale: zoom,
        panX: transformState.positionX,
        panY: transformState.positionY
      }
    };
    $[120] = dragStartAnchor;
    $[121] = transformState.positionX;
    $[122] = transformState.positionY;
    $[123] = zoom;
    $[124] = t69;
  } else t69 = $[124];
  const dragGuideFrames = t69;
  const onDragCameraMove = (0, import_react.useEffectEvent)(handleDragMove);
  let t70;
  if ($[125] === Symbol.for("react.memo_cache_sentinel")) {
    t70 = (deltaY, clientX_3, clientY_3) => {
      const zoom_0 = zoomTowardClientRef.current;
      if (!zoom_0 || !transformRef.current) return;
      const {
        scale: scale_3
      } = transformRef.current.instance.transformState;
      zoom_0(zoomScaleForWheel(scale_3, deltaY), clientX_3, clientY_3);
    };
    $[125] = t70;
  } else t70 = $[125];
  const onViewportZoom = t70;
  let t71;
  if ($[126] === Symbol.for("react.memo_cache_sentinel")) {
    t71 = (deltaX, deltaY_0) => {
      if (!transformRef.current) return;
      const state_1 = transformRef.current.instance.transformState;
      const next_2 = {
        scale: state_1.scale,
        positionX: state_1.positionX - deltaX,
        positionY: state_1.positionY - deltaY_0
      };
      transformRef.current.setTransform(next_2.positionX, next_2.positionY, next_2.scale, 0);
      publishCamera(next_2);
      notifyUserCameraGesture();
    };
    $[126] = t71;
  } else t71 = $[126];
  const onViewportPan = t71;
  let t72;
  if ($[127] !== isDragging || $[128] !== onDragCameraMove) {
    t72 = () => {
      if (!isDragging) return;
      onDragCameraMove({
        delta: {
          x: 0,
          y: 0
        }
      });
    };
    $[127] = isDragging;
    $[128] = onDragCameraMove;
    $[129] = t72;
  } else t72 = $[129];
  let t73;
  if ($[130] !== isDragging || $[131] !== transformState.positionX || $[132] !== transformState.positionY || $[133] !== zoom) {
    t73 = [isDragging, zoom, transformState.positionX, transformState.positionY];
    $[130] = isDragging;
    $[131] = transformState.positionX;
    $[132] = transformState.positionY;
    $[133] = zoom;
    $[134] = t73;
  } else t73 = $[134];
  (0, import_react.useEffect)(t72, t73);
  let t74;
  if ($[135] !== isDragging || $[136] !== viewportRef.current) {
    t74 = () => {
      if (!isDragging) return;
      let frameId = 0;
      let previousTime = performance.now();
      const panAtCanvasEdge = now => {
        const pointer = lastMousePosRef.current;
        const viewport_2 = viewportRef.current;
        const transform_0 = transformRef.current;
        const elapsedSeconds = Math.min((now - previousTime) / 1e3, .05);
        previousTime = now;
        if (pointer && viewport_2 && transform_0) {
          const rect_2 = viewport_2.getBoundingClientRect();
          const velocityX = getDragEdgePanVelocity(pointer.x, rect_2.left, rect_2.right);
          const velocityY = getDragEdgePanVelocity(pointer.y, rect_2.top, rect_2.bottom);
          if (velocityX !== 0 || velocityY !== 0) {
            const state_2 = transform_0.instance.transformState;
            transform_0.setTransform(state_2.positionX + velocityX * elapsedSeconds, state_2.positionY + velocityY * elapsedSeconds, state_2.scale, 0);
          }
        }
        frameId = requestAnimationFrame(panAtCanvasEdge);
      };
      frameId = requestAnimationFrame(panAtCanvasEdge);
      return () => cancelAnimationFrame(frameId);
    };
    $[135] = isDragging;
    $[136] = viewportRef.current;
    $[137] = t74;
  } else t74 = $[137];
  let t75;
  if ($[138] !== isDragging || $[139] !== viewportRef) {
    t75 = [isDragging, viewportRef];
    $[138] = isDragging;
    $[139] = viewportRef;
    $[140] = t75;
  } else t75 = $[140];
  (0, import_react.useEffect)(t74, t75);
  const dragStartScale = dragStartAnchor?.frame.scale ?? zoom;
  let t76;
  if ($[141] !== snapOffset.x || $[142] !== snapOffset.y) {
    t76 = [t77 => {
      const {
        transform: transform_1
      } = t77;
      return {
        ...transform_1,
        x: transform_1.x + snapOffset.x,
        y: transform_1.y + snapOffset.y
      };
    }];
    $[141] = snapOffset.x;
    $[142] = snapOffset.y;
    $[143] = t76;
  } else t76 = $[143];
  const snapModifiers = t76;
  const guideZoomRatio = dragGuideFrames ? zoom / dragStartScale : 1;
  let t77;
  if ($[144] !== dragGuideFrames) {
    t77 = (x_0, y_0) => dragGuideFrames ? mapScreenPoint({
      x: x_0,
      y: y_0
    }, dragGuideFrames.start, dragGuideFrames.live) : {
      x: x_0,
      y: y_0
    };
    $[144] = dragGuideFrames;
    $[145] = t77;
  } else t77 = $[145];
  const mapGuidePoint = t77;
  let t78;
  if ($[146] !== canvasRef || $[147] !== dropSlotRect || $[148] !== potentialParentId || $[149] !== transformState) {
    t78 = {
      canvasRef,
      potentialParentId,
      dropSlotRect,
      transform: transformState
    };
    $[146] = canvasRef;
    $[147] = dropSlotRect;
    $[148] = potentialParentId;
    $[149] = transformState;
    $[150] = t78;
  } else t78 = $[150];
  const {
    renderPotentialParentOverlay
  } = usePotentialParentOverlay(t78);
  let t79;
  let t80;
  if ($[151] !== rehoverAtPointer) {
    t79 = () => {
      const applyCmdPressed = pressed => {
        const next_3 = pressed ? "deepest" : "topmost";
        if (selectionModeRef.current === next_3) return;
        selectionModeRef.current = next_3;
        rehoverAtPointer();
      };
      const handleKeyDown = e_8 => {
        if (e_8.metaKey || e_8.ctrlKey) applyCmdPressed(true);
      };
      const handleKeyUp = e_9 => {
        if (!e_9.metaKey && !e_9.ctrlKey) applyCmdPressed(false);
      };
      const handleMouseMove = e_10 => {
        lastMousePosRef.current = {
          x: e_10.clientX,
          y: e_10.clientY
        };
        applyCmdPressed(e_10.metaKey || e_10.ctrlKey);
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      window.addEventListener("mousemove", handleMouseMove);
      const handleBlur = () => applyCmdPressed(false);
      window.addEventListener("blur", handleBlur);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("blur", handleBlur);
      };
    };
    t80 = [rehoverAtPointer];
    $[151] = rehoverAtPointer;
    $[152] = t79;
    $[153] = t80;
  } else {
    t79 = $[152];
    t80 = $[153];
  }
  (0, import_react.useEffect)(t79, t80);
  let t81;
  let t82;
  if ($[154] === Symbol.for("react.memo_cache_sentinel")) {
    t81 = () => {
      const handleKeyDown_0 = e_11 => {
        if (e_11.code === "Space") {
          const target_1 = e_11.target;
          if (target_1.tagName === "INPUT" || target_1.tagName === "TEXTAREA" || target_1.isContentEditable) return;
          e_11.preventDefault();
          setSpacePressed(true);
          isSpacePressedGlobal = true;
        }
      };
      const handleKeyUp_0 = e_12 => {
        if (e_12.code === "Space") {
          setSpacePressed(false);
          isSpacePressedGlobal = false;
        }
      };
      const handleBlur_0 = () => {
        setSpacePressed(false);
        isSpacePressedGlobal = false;
      };
      window.addEventListener("keydown", handleKeyDown_0);
      window.addEventListener("keyup", handleKeyUp_0);
      window.addEventListener("blur", handleBlur_0);
      return () => {
        window.removeEventListener("keydown", handleKeyDown_0);
        window.removeEventListener("keyup", handleKeyUp_0);
        window.removeEventListener("blur", handleBlur_0);
      };
    };
    t82 = [];
    $[154] = t81;
    $[155] = t82;
  } else {
    t81 = $[154];
    t82 = $[155];
  }
  (0, import_react.useEffect)(t81, t82);
  let t83;
  let t84;
  if ($[156] !== activeTool) {
    t83 = () => {
      isPanToolActiveGlobal = activeTool === "pan";
      return _temp0$6;
    };
    t84 = [activeTool];
    $[156] = activeTool;
    $[157] = t83;
    $[158] = t84;
  } else {
    t83 = $[157];
    t84 = $[158];
  }
  (0, import_react.useEffect)(t83, t84);
  let t85;
  let t86;
  if ($[159] !== activeTool || $[160] !== commentMode || $[161] !== readOnly) {
    t85 = () => {
      isDragSuppressedGlobal = readOnly || commentMode || isDrawableTool(activeTool);
      return _temp1$6;
    };
    t86 = [readOnly, commentMode, activeTool];
    $[159] = activeTool;
    $[160] = commentMode;
    $[161] = readOnly;
    $[162] = t85;
    $[163] = t86;
  } else {
    t85 = $[162];
    t86 = $[163];
  }
  (0, import_react.useEffect)(t85, t86);
  let t87;
  let t88;
  if ($[164] !== activeTool || $[165] !== readOnly || $[166] !== setActiveTool) {
    t87 = () => {
      if (readOnly) return;
      const tools = LOCAL_SHORTCUTS.canvas;
      const handler = e_13 => {
        if (isTypingTarget(e_13)) return;
        if (e_13.metaKey || e_13.ctrlKey || e_13.altKey) return;
        if (matchesShortcut(e_13, tools.toolGrid)) setActiveTool("grid");else if (matchesShortcut(e_13, tools.toolImage)) setActiveTool("image");else if (matchesShortcut(e_13, tools.toolVideo)) setActiveTool("video");else if (matchesShortcut(e_13, tools.toolMove)) setActiveTool("move");else if (matchesShortcut(e_13, tools.toolScale)) {
          e_13.preventDefault();
          setActiveTool("scale");
        } else if (matchesShortcut(e_13, tools.toolPan)) setActiveTool("pan");else if (matchesShortcut(e_13, tools.toolFrame)) setActiveTool("frame");else if (matchesShortcut(e_13, tools.toolToggleStack)) setActiveTool(activeTool === "stack-h" ? "stack-v" : "stack-h");else if (matchesShortcut(e_13, tools.toolText)) setActiveTool("text");else if (matchesShortcut(e_13, tools.toolEscapeToMove)) {
          if (activeTool === "scale") {
            e_13.preventDefault();
            e_13.stopImmediatePropagation();
          }
          if (isInsertTool(activeTool) || activeTool === "pan" || activeTool === "scale") setActiveTool("move");
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    };
    t88 = [readOnly, activeTool, setActiveTool];
    $[164] = activeTool;
    $[165] = readOnly;
    $[166] = setActiveTool;
    $[167] = t87;
    $[168] = t88;
  } else {
    t87 = $[167];
    t88 = $[168];
  }
  (0, import_react.useEffect)(t87, t88);
  const getComponentNameFromPath = _temp10$5;
  let t89;
  if ($[169] !== editingFile) {
    t89 = editingFile ? getComponentNameFromPath(editingFile) : null;
    $[169] = editingFile;
    $[170] = t89;
  } else t89 = $[170];
  const componentName = t89;
  let t90;
  if ($[171] === Symbol.for("react.memo_cache_sentinel")) {
    t90 = {
      width: "100%",
      height: "100%",
      clipPath: "inset(0)"
    };
    $[171] = t90;
  } else t90 = $[171];
  let t91;
  if (true) {
    t91 = editingFile && <div className="flex items-center justify-between px-4 py-2 border-b border-ed-border bg-ed-accent/50">{<div className="flex items-center gap-2">{<Text$4 size="sm" weight="medium" variant="secondary">{t("shell.editing")}</Text$4>}{<div className="flex items-center gap-1.5">{(0, import_jsx_runtime.jsx)(i$4, {
            size: 14,
            weight: "fill",
            className: "text-ed-canvas-component"
          })}{<Text$4 size="sm" weight="medium">{componentName}</Text$4>}</div>}</div>}{<button onClick={onCloseEdit} className="p-1 hover:bg-ed-accent rounded">{<XIcon width={16} height={16} className="text-ed-muted-foreground" />}</button>}</div>;
    $[172] = componentName;
    $[173] = editingFile;
    $[174] = onCloseEdit;
    $[175] = t91;
  } else t91 = $[175];
  let t92;
  if ($[176] !== commentMode) {
    t92 = commentMode && <style>{`[data-comment-mode], [data-comment-mode] * { cursor: ${COMMENT_CURSOR} !important; } [data-overlay-container] * { cursor: auto !important; }`}</style>;
    $[176] = commentMode;
    $[177] = t92;
  } else t92 = $[177];
  let t93;
  if ($[178] !== activeTool) {
    t93 = isInsertTool(activeTool) && <style>{"[data-draw-tool], [data-draw-tool] * { cursor: crosshair !important; }"}</style>;
    $[178] = activeTool;
    $[179] = t93;
  } else t93 = $[179];
  const t94 = readOnly ? void 0 : onCanvasDragStart;
  const t95 = readOnly ? void 0 : handleDragMove;
  const t96 = readOnly ? void 0 : handleDragEnd;
  const t97 = readOnly ? void 0 : handleDragCancel;
  let t98;
  if ($[180] !== commentMode) {
    t98 = commentMode ? {
      "data-comment-mode": ""
    } : {};
    $[180] = commentMode;
    $[181] = t98;
  } else t98 = $[181];
  let t99;
  if ($[182] !== activeTool) {
    t99 = isInsertTool(activeTool) ? {
      "data-draw-tool": ""
    } : {};
    $[182] = activeTool;
    $[183] = t99;
  } else t99 = $[183];
  const t100 = panMode ? "grab" : isInsertTool(activeTool) ? "crosshair" : commentMode ? void 0 : "default";
  let t101;
  if ($[184] !== backgroundColor || $[185] !== t100) {
    t101 = {
      cursor: t100,
      touchAction: "none",
      overscrollBehavior: "none",
      backgroundColor
    };
    $[184] = backgroundColor;
    $[185] = t100;
    $[186] = t101;
  } else t101 = $[186];
  let t102;
  if ($[187] !== probeInsertDropParent || $[188] !== readOnly) {
    t102 = e_14 => {
      e_14.preventDefault();
      e_14.stopPropagation();
      if (readOnly) return;
      if (isCanvasInsertDragType(e_14.dataTransfer)) probeInsertDropParent(e_14.clientX, e_14.clientY);
    };
    $[187] = probeInsertDropParent;
    $[188] = readOnly;
    $[189] = t102;
  } else t102 = $[189];
  let t103;
  if ($[190] === Symbol.for("react.memo_cache_sentinel")) {
    t103 = e_15 => {
      if (e_15.currentTarget.contains(e_15.relatedTarget)) return;
      clearInsertDropParent();
    };
    $[190] = t103;
  } else t103 = $[190];
  let t104;
  if ($[191] !== onAddElement || $[192] !== onDropElement || $[193] !== readOnly || $[194] !== uploadImage || $[195] !== viewportPointToCanvas || $[196] !== viewportRef.current) {
    t104 = async e_16 => {
      e_16.preventDefault();
      e_16.stopPropagation();
      clearInsertDropParent();
      if (readOnly) return;
      const droppedText = e_16.dataTransfer.getData("text/plain");
      const isInsertDrag = isCanvasInsertDrag(e_16.dataTransfer);
      const isHtmlOrJsx = droppedText && looksLikeHTML(droppedText);
      const hasMediaFile = Array.from(e_16.dataTransfer.files).some(_temp11$4);
      if ((isInsertDrag || isHtmlOrJsx || hasMediaFile) && onDropElement) {
        const viewportRect_0 = viewportRef.current?.getBoundingClientRect();
        if (viewportRect_0) await onDropElement(e_16.dataTransfer, viewportPointToCanvas(e_16.clientX, e_16.clientY, viewportRect_0), {
          clientX: e_16.clientX,
          clientY: e_16.clientY
        });else await onDropElement(e_16.dataTransfer);
        return;
      }
      if (!onAddElement) return;
      const result = await getImageFromDropEvent(e_16, readOnly ? void 0 : uploadImage);
      if (result.error) {
        toast.error(t("canvas.addImageFailed"), result.errorMessage ? { description: result.errorMessage } : void 0);
        return;
      }
      if (result.src) {
        const viewportRect_1 = viewportRef.current?.getBoundingClientRect();
        if (viewportRect_1) onAddElement(createImageElement(result.src, viewportPointToCanvas(e_16.clientX, e_16.clientY, viewportRect_1)));
      }
    };
    $[191] = onAddElement;
    $[192] = onDropElement;
    $[193] = readOnly;
    $[194] = uploadImage;
    $[195] = viewportPointToCanvas;
    $[196] = viewportRef.current;
    $[197] = t104;
  } else t104 = $[197];
  let t105;
  if ($[198] !== activeTool || $[199] !== canvasRef || $[200] !== commentMode || $[201] !== panMode || $[202] !== readOnly || $[203] !== selectedElementIds || $[204] !== startDraw || $[205] !== startMarquee || $[206] !== store || $[207] !== viewportRef.current) {
    t105 = commentMode || readOnly ? void 0 : e_17 => {
      if (e_17.button !== 0 || panMode) return;
      if (isDrawableTool(activeTool)) {
        startDraw(e_17, activeTool);
        return;
      }
      if (activeTool !== "move") return;
      const target_2 = e_17.target;
      if (target_2.closest("[data-element-id]")) return;
      if (target_2.closest("[data-overlay-interactive]")) return;
      const viewport_3 = viewportRef.current;
      if (!viewport_3) return;
      startMarquee(e_17.nativeEvent, {
        store,
        canvasEl: canvasRef.current,
        viewportRect: viewport_3.getBoundingClientRect(),
        selectedElementIds
      });
    };
    $[198] = activeTool;
    $[199] = canvasRef;
    $[200] = commentMode;
    $[201] = panMode;
    $[202] = readOnly;
    $[203] = selectedElementIds;
    $[204] = startDraw;
    $[205] = startMarquee;
    $[206] = store;
    $[207] = viewportRef.current;
    $[208] = t105;
  } else t105 = $[208];
  const t106 = initialTransform?.scale ?? 1;
  const t107 = initialTransform?.positionX ?? 0;
  const t108 = initialTransform?.positionY ?? 0;
  let t109;
  let t110;
  if ($[209] === Symbol.for("react.memo_cache_sentinel")) {
    t109 = {
      disabled: true
    };
    t110 = {
      step: 5,
      disabled: false
    };
    $[209] = t109;
    $[210] = t110;
  } else {
    t109 = $[209];
    t110 = $[210];
  }
  let t111;
  if ($[211] !== panMode) {
    t111 = {
      disabled: false,
      velocityDisabled: true,
      allowLeftClickPan: panMode,
      allowRightClickPan: false,
      allowMiddleClickPan: true
    };
    $[211] = panMode;
    $[212] = t111;
  } else t111 = $[212];
  let t112;
  let t113;
  if ($[213] === Symbol.for("react.memo_cache_sentinel")) {
    t112 = {
      disabled: true
    };
    t113 = () => {
      isPanningRef.current = true;
      if (panTimeoutRef.current) {
        clearTimeout(panTimeoutRef.current);
        panTimeoutRef.current = null;
      }
      if (!isCameraDriving()) notifyUserCameraGesture();
    };
    $[213] = t112;
    $[214] = t113;
  } else {
    t112 = $[213];
    t113 = $[214];
  }
  let t114;
  if ($[215] !== rehoverAtPointer || $[216] !== scheduleCameraCommit) {
    t114 = () => {
      const s_0 = transformRef.current?.instance.transformState;
      if (s_0) scheduleCameraCommit({
        scale: s_0.scale,
        positionX: s_0.positionX,
        positionY: s_0.positionY
      });else isPanningRef.current = false;
      syncOverlayToLiveTransform();
      rehoverAtPointer();
    };
    $[215] = rehoverAtPointer;
    $[216] = scheduleCameraCommit;
    $[217] = t114;
  } else t114 = $[217];
  let t115;
  let t116;
  if ($[218] === Symbol.for("react.memo_cache_sentinel")) {
    t115 = {
      width: "100%",
      height: "100%"
    };
    t116 = {
      width: "100%",
      height: "100%"
    };
    $[218] = t115;
    $[219] = t116;
  } else {
    t115 = $[218];
    t116 = $[219];
  }
  let t117;
  if ($[220] !== commentMode || $[221] !== onCommentClick || $[222] !== viewportPointToCanvas || $[223] !== viewportRef.current) {
    t117 = commentMode && onCommentClick ? e_18 => {
      e_18.stopPropagation();
      const rect_3 = viewportRef.current?.getBoundingClientRect();
      if (rect_3) {
        const {
          x: x_1,
          y: y_1
        } = viewportPointToCanvas(e_18.clientX, e_18.clientY, rect_3);
        const screenX = e_18.clientX - rect_3.left;
        const screenY = e_18.clientY - rect_3.top;
        onCommentClick(Math.round(x_1), Math.round(y_1), screenX, screenY);
      }
    } : void 0;
    $[220] = commentMode;
    $[221] = onCommentClick;
    $[222] = viewportPointToCanvas;
    $[223] = viewportRef.current;
    $[224] = t117;
  } else t117 = $[224];
  let t118;
  if ($[225] !== commentMode || $[226] !== panMode || $[227] !== selectElement || $[228] !== suppressClickRef) {
    t118 = !commentMode && !panMode ? e_19 => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      const target_3 = e_19.target;
      const clickedElement = target_3.closest("[data-element-id]");
      const insideTextEditor = !!target_3.closest(".ProseMirror");
      if (!clickedElement && !insideTextEditor) selectElement(null);
    } : void 0;
    $[225] = commentMode;
    $[226] = panMode;
    $[227] = selectElement;
    $[228] = suppressClickRef;
    $[229] = t118;
  } else t118 = $[229];
  let t119;
  if ($[230] !== t117 || $[231] !== t118) {
    t119 = {
      onClickCapture: t117,
      onClick: t118
    };
    $[230] = t117;
    $[231] = t118;
    $[232] = t119;
  } else t119 = $[232];
  let t120;
  if ($[233] === Symbol.for("react.memo_cache_sentinel")) {
    t120 = {
      minWidth: "4000px",
      minHeight: "4000px",
      width: "max-content",
      height: "max-content"
    };
    $[233] = t120;
  } else t120 = $[233];
  let t121;
  if ($[234] !== commentMode || $[235] !== panMode || $[236] !== selectElement || $[237] !== suppressClickRef) {
    t121 = commentMode || panMode ? void 0 : e_21 => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        e_21.stopPropagation();
        return;
      }
      e_21.stopPropagation();
      const target_5 = e_21.target;
      const clickedElement_0 = target_5.closest("[data-element-id]");
      const insideTextEditor_0 = !!target_5.closest(".ProseMirror");
      if (!clickedElement_0 && !insideTextEditor_0) selectElement(null);
    };
    $[234] = commentMode;
    $[235] = panMode;
    $[236] = selectElement;
    $[237] = suppressClickRef;
    $[238] = t121;
  } else t121 = $[238];
  let t122;
  if ($[239] !== throttledHoverElement) {
    t122 = e_22 => {
      if (e_22.target === e_22.currentTarget) throttledHoverElement(null);
    };
    $[239] = throttledHoverElement;
    $[240] = t122;
  } else t122 = $[240];
  let t123;
  if ($[472] !== variableGeometry.styles || $[241] !== allowedPaths || $[242] !== assetResolver || $[243] !== commentMode || $[244] !== componentIndex || $[245] !== components || $[246] !== componentsRevision || $[247] !== draggedIds || $[248] !== drilledParentId || $[249] !== editingTextBounds || $[250] !== editingTextId || $[251] !== iconLibraries || $[252] !== interactiveParentIds || $[253] !== interactiveParentIdsRef || $[254] !== onActivateTextEditor || $[255] !== onAddAllowedPath || $[256] !== onAddElement || $[257] !== onDeactivateTextEditor || $[258] !== onEditText || $[259] !== onFixWithAI || $[260] !== onOpenFile || $[261] !== onResizeElement || $[262] !== onSaveToCode || $[263] !== onStartEditTextProp || $[264] !== onStopEditTextProp || $[265] !== onTextSelectionChange || $[266] !== onUpdateElementProps || $[267] !== panMode || $[268] !== readOnly || $[269] !== selectElement || $[270] !== selectedElementIds || $[271] !== store || $[272] !== throttledHoverElement) {
    $[472] = variableGeometry.styles;
    t123 = <CanvasRootTrees store={store} variableCssUsage={variableGeometry.styles} draggedIds={draggedIds} panMode={panMode} commentMode={commentMode} readOnly={readOnly} selectElement={selectElement} throttledHoverElement={throttledHoverElement} components={components} componentIndex={componentIndex} componentsRevision={componentsRevision} iconLibraries={iconLibraries} onEditText={onEditText} editingTextId={editingTextId} editingTextBounds={editingTextBounds} setEditingTextBounds={setEditingTextBounds} onStartEditTextProp={onStartEditTextProp} onStopEditTextProp={onStopEditTextProp} onActivateTextEditor={onActivateTextEditor} onDeactivateTextEditor={onDeactivateTextEditor} onTextSelectionChange={onTextSelectionChange} selectedElementIds={selectedElementIds} selectionMode="topmost" selectionModeRef={selectionModeRef} canvasScale={1} onResizeElement={onResizeElement} onViewportZoom={onViewportZoom} onViewportPan={onViewportPan} assetResolver={assetResolver} onFixWithAI={onFixWithAI} onAddElement={onAddElement} onUpdateElementProps={onUpdateElementProps} onSaveToCode={onSaveToCode} onOpenFile={onOpenFile} allowedPaths={allowedPaths} onAddAllowedPath={onAddAllowedPath} interactiveParentIds={interactiveParentIds} interactiveParentIdsRef={interactiveParentIdsRef} drilledParentId={drilledParentId} />;
    $[241] = allowedPaths;
    $[242] = assetResolver;
    $[243] = commentMode;
    $[244] = componentIndex;
    $[245] = components;
    $[246] = componentsRevision;
    $[247] = draggedIds;
    $[248] = drilledParentId;
    $[249] = editingTextBounds;
    $[250] = editingTextId;
    $[251] = iconLibraries;
    $[252] = interactiveParentIds;
    $[253] = interactiveParentIdsRef;
    $[254] = onActivateTextEditor;
    $[255] = onAddAllowedPath;
    $[256] = onAddElement;
    $[257] = onDeactivateTextEditor;
    $[258] = onEditText;
    $[259] = onFixWithAI;
    $[260] = onOpenFile;
    $[261] = onResizeElement;
    $[262] = onSaveToCode;
    $[263] = onStartEditTextProp;
    $[264] = onStopEditTextProp;
    $[265] = onTextSelectionChange;
    $[266] = onUpdateElementProps;
    $[267] = panMode;
    $[268] = readOnly;
    $[269] = selectElement;
    $[270] = selectedElementIds;
    $[271] = store;
    $[272] = throttledHoverElement;
    $[273] = t123;
  } else t123 = $[273];
  let t124;
  if ($[274] !== canvasRef || $[275] !== t121 || $[276] !== t122 || $[277] !== t123) {
    t124 = <div data-canvas-content={true} style={t120} ref={canvasRef} onClickCapture={_temp15$2} onClick={t121} onMouseOver={t122}>{t123}</div>;
    $[274] = canvasRef;
    $[275] = t121;
    $[276] = t122;
    $[277] = t123;
    $[278] = t124;
  } else t124 = $[278];
  let t125;
  if ($[279] !== t119 || $[280] !== t124) {
    t125 = <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full" wrapperStyle={t115} contentStyle={t116} wrapperProps={t119}>{t124}</TransformComponent>;
    $[279] = t119;
    $[280] = t124;
    $[281] = t125;
  } else t125 = $[281];
  let t126;
  if ($[282] !== t106 || $[283] !== t107 || $[284] !== t108 || $[285] !== t111 || $[286] !== t114 || $[287] !== t125) {
    t126 = <TransformWrapper ref={transformRef} initialScale={t106} initialPositionX={t107} initialPositionY={t108} minScale={MIN_CANVAS_SCALE} maxScale={256} limitToBounds={false} centerOnInit={false} wheel={t109} pinch={t110} panning={t111} doubleClick={t112} onPanningStart={t113} onPanning={_temp12$2} onPanningStop={t114} onZoom={_temp13$2} onTransformed={_temp14$2}>{t125}</TransformWrapper>;
    $[282] = t106;
    $[283] = t107;
    $[284] = t108;
    $[285] = t111;
    $[286] = t114;
    $[287] = t125;
    $[288] = t126;
  } else t126 = $[288];
  let t127;
  if ($[289] === Symbol.for("react.memo_cache_sentinel")) {
    t127 = <CanvasPixelGrid />;
    $[289] = t127;
  } else t127 = $[289];
  let t128;
  if ($[290] !== onStopFollowingAgent) {
    t128 = onStopFollowingAgent && <AgentFollowFrame onStop={onStopFollowingAgent} />;
    $[290] = onStopFollowingAgent;
    $[291] = t128;
  } else t128 = $[291];
  let t129;
  if ($[292] !== commentMode || $[293] !== componentEditMode || $[294] !== editingFile || $[295] !== externalMcpApprovals || $[296] !== onApplyPasteStyleClean || $[297] !== onDismissPasteStyleClean || $[298] !== onExternalMcpApproval || $[299] !== onOpenMoreHtml || $[300] !== onPickPreviewPreset || $[301] !== onShowResolvedChange || $[302] !== onToggleCommentMode || $[303] !== pasteStyleSuggestion || $[304] !== showCommentTools || $[305] !== showResolvedComments) {
    t129 = !editingFile && <>{onExternalMcpApproval && <ExternalMcpApprovalPrompt approvals={externalMcpApprovals} onResolve={onExternalMcpApproval} />}{pasteStyleSuggestion && onApplyPasteStyleClean && <PasteStyleCleanPrompt nodeCount={pasteStyleSuggestion.nodeCount} onApply={onApplyPasteStyleClean} onDismiss={onDismissPasteStyleClean} />}{<div data-canvas-bottom-chrome={true} className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2">{componentEditMode && <ComponentEditingModeBar componentName={componentEditMode.componentName} filePath={componentEditMode.filePath} isPreparing={componentEditMode.isPreparing} onSave={componentEditMode.onSave} onCancel={componentEditMode.onCancel} />}{<CanvasToolbar showCommentTools={showCommentTools} commentMode={commentMode} onToggleCommentMode={onToggleCommentMode} showResolvedComments={showResolvedComments} onShowResolvedChange={onShowResolvedChange} onPickPreviewPreset={onPickPreviewPreset} onOpenMoreHtml={onOpenMoreHtml} />}</div>}</>;
    $[292] = commentMode;
    $[293] = componentEditMode;
    $[294] = editingFile;
    $[295] = externalMcpApprovals;
    $[296] = onApplyPasteStyleClean;
    $[297] = onDismissPasteStyleClean;
    $[298] = onExternalMcpApproval;
    $[299] = onOpenMoreHtml;
    $[300] = onPickPreviewPreset;
    $[301] = onShowResolvedChange;
    $[302] = onToggleCommentMode;
    $[303] = pasteStyleSuggestion;
    $[304] = showCommentTools;
    $[305] = showResolvedComments;
    $[306] = t129;
  } else t129 = $[306];
  let t130;
  if ($[307] !== marqueeHoverContainerRef || $[308] !== marqueeMounted || $[309] !== marqueeOverlayRef) {
    t130 = marqueeMounted && <>{<div ref={marqueeHoverContainerRef} className="absolute inset-0 pointer-events-none" />}{<div ref={marqueeOverlayRef} style={{
        position: "absolute",
        border: "1px solid var(--ed-canvas-selection)",
        backgroundColor: "color-mix(in srgb, var(--ed-canvas-selection) 10%, transparent)",
        pointerEvents: "none"
      }} />}</>;
    $[307] = marqueeHoverContainerRef;
    $[308] = marqueeMounted;
    $[309] = marqueeOverlayRef;
    $[310] = t130;
  } else t130 = $[310];
  let t131;
  if ($[311] !== drawBadgeRef || $[312] !== drawMounted || $[313] !== drawOverlayRef) {
    t131 = drawMounted && <div ref={drawOverlayRef} style={{
      position: "absolute",
      border: "1px solid var(--ed-canvas-selection)",
      backgroundColor: "color-mix(in srgb, var(--ed-canvas-selection) 10%, transparent)",
      pointerEvents: "none"
    }}>{<div ref={drawBadgeRef} style={{
        position: "absolute",
        top: "100%",
        left: "50%",
        transform: "translate(-50%, 6px)",
        display: "none",
        padding: "1px 6px",
        borderRadius: 4,
        background: "var(--ed-canvas-selection)",
        color: "#fff",
        fontSize: 11,
        lineHeight: "16px",
        fontWeight: 500,
        whiteSpace: "nowrap"
      }} />}</div>;
    $[311] = drawBadgeRef;
    $[312] = drawMounted;
    $[313] = drawOverlayRef;
    $[314] = t131;
  } else t131 = $[314];
  let t132;
  if ($[315] === Symbol.for("react.memo_cache_sentinel")) {
    t132 = {
      position: "absolute",
      inset: 0
    };
    $[315] = t132;
  } else t132 = $[315];
  let t133;
  if ($[316] !== activeTool || $[317] !== canvasRef || $[318] !== commentMode || $[319] !== geomByIdRef || $[320] !== geomVersion || $[321] !== handleResizeStart || $[322] !== isDragging || $[323] !== onUpdateElementProps || $[324] !== onUpdateElementStyles || $[325] !== panMode || $[326] !== readOnly || $[327] !== resizePreviewRectRef || $[328] !== selectElement || $[329] !== selectedElementIds || $[330] !== store) {
    t133 = !isDragging && !commentMode && !isInsertTool(activeTool) && <SelectionOverlay store={store} selectedElementIds={selectedElementIds} overlayMode={true} noInteract={panMode || readOnly} geomByIdRef={geomByIdRef} geomVersion={geomVersion} resizePreviewRectRef={resizePreviewRectRef} handleResizeStart={readOnly ? _temp16$1 : handleResizeStart} canvasRef={canvasRef} onSelectElement={selectElement} onUpdateElementStyles={onUpdateElementStyles} onUpdateElementProps={onUpdateElementProps} />;
    $[316] = activeTool;
    $[317] = canvasRef;
    $[318] = commentMode;
    $[319] = geomByIdRef;
    $[320] = geomVersion;
    $[321] = handleResizeStart;
    $[322] = isDragging;
    $[323] = onUpdateElementProps;
    $[324] = onUpdateElementStyles;
    $[325] = panMode;
    $[326] = readOnly;
    $[327] = resizePreviewRectRef;
    $[328] = selectElement;
    $[329] = selectedElementIds;
    $[330] = store;
    $[331] = t133;
  } else t133 = $[331];
  let t134;
  if ($[332] !== activeTool || $[333] !== commentMode || $[334] !== geomByIdRef || $[335] !== geomVersion || $[336] !== isDragging || $[337] !== panMode || $[338] !== readOnly || $[339] !== resizing || $[340] !== selectElement || $[341] !== selectedElementIds || $[342] !== store || $[343] !== throttledHoverElement) {
    t134 = !isDragging && !commentMode && !isInsertTool(activeTool) && <RootLabels store={store} selectedElementIds={selectedElementIds} isResizing={!!resizing} overlayMode={true} noInteract={panMode || readOnly} geomByIdRef={geomByIdRef} geomVersion={geomVersion} onSelectElement={selectElement} onHoverElement={throttledHoverElement} />;
    $[332] = activeTool;
    $[333] = commentMode;
    $[334] = geomByIdRef;
    $[335] = geomVersion;
    $[336] = isDragging;
    $[337] = panMode;
    $[338] = readOnly;
    $[339] = resizing;
    $[340] = selectElement;
    $[341] = selectedElementIds;
    $[342] = store;
    $[343] = throttledHoverElement;
    $[344] = t134;
  } else t134 = $[344];
  let t135;
  if ($[345] !== resizing) {
    t135 = !!resizing && <svg data-aspect-guide-id={resizing.id} className="absolute pointer-events-none text-ed-canvas-selection" style={{
      left: 0,
      top: 0,
      display: "none",
      overflow: "visible",
      transformOrigin: "center center"
    }}>{<line data-aspect-guide-line={true} x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}</svg>;
    $[345] = resizing;
    $[346] = t135;
  } else t135 = $[346];
  let t136;
  bb0: {
    let t137;
    if ($[347] !== isDragging || $[348] !== resizeSnapGuides || $[349] !== resizing || $[350] !== snapGuides) {
      t137 = isDragging ? snapGuides : resizing ? resizeSnapGuides : [];
      $[347] = isDragging;
      $[348] = resizeSnapGuides;
      $[349] = resizing;
      $[350] = snapGuides;
      $[351] = t137;
    } else t137 = $[351];
    const guides = t137;
    if (guides.length === 0) {
      t136 = null;
      break bb0;
    }
    let t138;
    if ($[352] === Symbol.for("react.memo_cache_sentinel")) {
      t138 = document.querySelector("[data-overlay-container]")?.getBoundingClientRect();
      $[352] = t138;
    } else t138 = $[352];
    const overlayRect = t138;
    if (!overlayRect) {
      t136 = null;
      break bb0;
    }
    let t139;
    if ($[353] !== guides || $[354] !== isDragging || $[355] !== mapGuidePoint || $[356] !== overlayRect) {
      let t140;
      if ($[358] !== isDragging || $[359] !== mapGuidePoint || $[360] !== overlayRect) {
        t140 = (g, i) => {
          const vertical = g.axis === "v";
          const a = isDragging ? mapGuidePoint(vertical ? g.pos : g.spanStart, vertical ? g.spanStart : g.pos) : {
            x: vertical ? g.pos : g.spanStart,
            y: vertical ? g.spanStart : g.pos
          };
          const b = isDragging ? mapGuidePoint(vertical ? g.pos : g.spanEnd, vertical ? g.spanEnd : g.pos) : {
            x: vertical ? g.pos : g.spanEnd,
            y: vertical ? g.spanEnd : g.pos
          };
          const common = {
            position: "absolute",
            backgroundColor: GUIDE_COLOR,
            pointerEvents: "none",
            zIndex: 60
          };
          const style_0 = vertical ? {
            ...common,
            left: a.x - overlayRect.left,
            top: Math.min(a.y, b.y) - overlayRect.top,
            width: 1,
            height: Math.abs(b.y - a.y)
          } : {
            ...common,
            left: Math.min(a.x, b.x) - overlayRect.left,
            top: a.y - overlayRect.top,
            width: Math.abs(b.x - a.x),
            height: 1
          };
          return <div key={`snap-${i}`} data-snap-guide={g.axis} style={style_0} />;
        };
        $[358] = isDragging;
        $[359] = mapGuidePoint;
        $[360] = overlayRect;
        $[361] = t140;
      } else t140 = $[361];
      t139 = guides.map(t140);
      $[353] = guides;
      $[354] = isDragging;
      $[355] = mapGuidePoint;
      $[356] = overlayRect;
      $[357] = t139;
    } else t139 = $[357];
    let t140;
    if ($[362] !== t139) {
      t140 = <>{t139}</>;
      $[362] = t139;
      $[363] = t140;
    } else t140 = $[363];
    t136 = t140;
  }
  let t137;
  if ($[364] !== activeId || $[365] !== dragPreviewRect || $[366] !== guideZoomRatio || $[367] !== isDragging || $[368] !== mapGuidePoint || $[369] !== zoom) {
    bb1: {
      let t138;
      if ($[371] === Symbol.for("react.memo_cache_sentinel")) {
        t138 = document.querySelector("[data-overlay-container]")?.getBoundingClientRect();
        $[371] = t138;
      } else t138 = $[371];
      const overlayRect_0 = t138;
      if (!overlayRect_0) {
        t137 = null;
        break bb1;
      }
      let rect_4 = null;
      let measureId = null;
      if (isDragging && dragPreviewRect && activeId) {
        const tl = mapGuidePoint(dragPreviewRect.left, dragPreviewRect.top);
        rect_4 = {
          left: tl.x,
          top: tl.y,
          width: dragPreviewRect.width * guideZoomRatio,
          height: dragPreviewRect.height * guideZoomRatio
        };
        measureId = activeId;
      }
      if (!rect_4 || !measureId) {
        t137 = null;
        break bb1;
      }
      const box_0 = getAbsoluteContainingBox(measureId, zoom);
      if (!box_0) {
        t137 = null;
        break bb1;
      }
      const m = computeEdgeDistances(rect_4, box_0);
      const line = _temp17$1;
      let t139;
      if ($[372] === Symbol.for("react.memo_cache_sentinel")) {
        t139 = (text, x_2, y_2, key) => <div key={key} style={{
          position: "absolute",
          left: x_2 - overlayRect_0.left,
          top: y_2 - overlayRect_0.top,
          transform: "translate(-50%, -50%)",
          background: GUIDE_COLOR,
          color: "white",
          fontSize: 10,
          lineHeight: "14px",
          padding: "0 4px",
          borderRadius: 3,
          pointerEvents: "none",
          zIndex: 61,
          whiteSpace: "nowrap"
        }}>{text}</div>;
        $[372] = t139;
      } else t139 = $[372];
      const label = t139;
      const h = m.horizontal;
      const v = m.vertical;
      const hx1 = Math.min(h.x1, h.x2);
      const hx2 = Math.max(h.x1, h.x2);
      const vy1 = Math.min(v.y1, v.y2);
      const vy2 = Math.max(v.y1, v.y2);
      const t140 = hx1 - overlayRect_0.left;
      const t141 = h.y - overlayRect_0.top;
      const t142 = Math.max(hx2 - hx1, 1);
      let t143;
      if ($[373] !== t140 || $[374] !== t141 || $[375] !== t142) {
        t143 = <div className="bingo-guide-measure" data-axis="x" style={line({
          left: t140,
          top: t141,
          width: t142,
          height: 1
        })} />;
        $[373] = t140;
        $[374] = t141;
        $[375] = t142;
        $[376] = t143;
      } else t143 = $[376];
      const t144 = label(`${Math.round(Math.abs(h.distance) / zoom)}`, (h.x1 + h.x2) / 2, h.y, "mh");
      const t145 = v.x - overlayRect_0.left;
      const t146 = vy1 - overlayRect_0.top;
      const t147 = Math.max(vy2 - vy1, 1);
      let t148;
      if ($[377] !== t145 || $[378] !== t146 || $[379] !== t147) {
        t148 = <div className="bingo-guide-measure" data-axis="y" style={line({
          left: t145,
          top: t146,
          width: 1,
          height: t147
        })} />;
        $[377] = t145;
        $[378] = t146;
        $[379] = t147;
        $[380] = t148;
      } else t148 = $[380];
      t137 = <>{t143}{t144}{t148}{label(`${Math.round(Math.abs(v.distance) / zoom)}`, v.x, (v.y1 + v.y2) / 2, "mv")}</>;
    }
    $[364] = activeId;
    $[365] = dragPreviewRect;
    $[366] = guideZoomRatio;
    $[367] = isDragging;
    $[368] = mapGuidePoint;
    $[369] = zoom;
    $[370] = t137;
  } else t137 = $[370];
  let t138;
  if ($[381] !== dragStartScale || $[382] !== isDragging || $[383] !== mapGuidePoint || $[384] !== spacingGuides || $[385] !== spacingMeasures) {
    t138 = isDragging && (spacingMeasures.length > 0 || spacingGuides.length > 0) && (() => {
      const overlayRect_1 = document.querySelector("[data-overlay-container]")?.getBoundingClientRect();
      if (!overlayRect_1) return null;
      const seg = (g_0, i_0, kind) => {
        const horizontal = g_0.axis === "x";
        const a_0 = mapGuidePoint(horizontal ? g_0.start : g_0.pos, horizontal ? g_0.pos : g_0.start);
        const b_0 = mapGuidePoint(horizontal ? g_0.end : g_0.pos, horizontal ? g_0.pos : g_0.end);
        const lo = horizontal ? Math.min(a_0.x, b_0.x) : Math.min(a_0.y, b_0.y);
        const len = Math.max(Math.abs(horizontal ? b_0.x - a_0.x : b_0.y - a_0.y), 1);
        const pos_0 = horizontal ? a_0.y : a_0.x;
        const lineStyle = horizontal ? {
          position: "absolute",
          backgroundColor: GUIDE_COLOR,
          pointerEvents: "none",
          zIndex: 60,
          left: lo - overlayRect_1.left,
          top: pos_0 - overlayRect_1.top,
          width: len,
          height: 1
        } : {
          position: "absolute",
          backgroundColor: GUIDE_COLOR,
          pointerEvents: "none",
          zIndex: 60,
          left: pos_0 - overlayRect_1.left,
          top: lo - overlayRect_1.top,
          width: 1,
          height: len
        };
        const cx_0 = horizontal ? lo + len / 2 : pos_0;
        const cy_0 = horizontal ? pos_0 : lo + len / 2;
        return <>{<div className="bingo-guide-measure" data-spacing-guide={kind} data-axis={horizontal ? "x" : "y"} style={lineStyle} />}{<div style={{
            position: "absolute",
            left: cx_0 - overlayRect_1.left,
            top: cy_0 - overlayRect_1.top,
            transform: "translate(-50%, -50%)",
            background: GUIDE_COLOR,
            color: "white",
            fontSize: 10,
            lineHeight: "14px",
            padding: "0 4px",
            borderRadius: 3,
            pointerEvents: "none",
            zIndex: 61,
            whiteSpace: "nowrap"
          }}>{Math.round(g_0.gap / dragStartScale)}</div>}</>;
      };
      return <>{(spacingGuides.length > 0 ? spacingGuides : spacingMeasures).map((g_1, i_1) => seg(g_1, i_1, spacingGuides.length > 0 ? "g" : "m"))}</>;
    })();
    $[381] = dragStartScale;
    $[382] = isDragging;
    $[383] = mapGuidePoint;
    $[384] = spacingGuides;
    $[385] = spacingMeasures;
    $[386] = t138;
  } else t138 = $[386];
  let t139;
  if ($[387] !== elementLocks || $[388] !== geomByIdRef || $[389] !== geomVersion || $[390] !== store) {
    t139 = elementLocks && elementLocks.size > 0 && <AiLockOverlays elementLocks={elementLocks} store={store} geomByIdRef={geomByIdRef} geomVersion={geomVersion} />;
    $[387] = elementLocks;
    $[388] = geomByIdRef;
    $[389] = geomVersion;
    $[390] = store;
    $[391] = t139;
  } else t139 = $[391];
  let t140;
  if ($[392] !== activeTool || $[393] !== canvasRef || $[394] !== commentMode || $[395] !== geomByIdRef || $[396] !== isDragging || $[397] !== panMode || $[398] !== readOnly || $[399] !== selectElement || $[400] !== selectedElementIds || $[401] !== store || $[402] !== throttledHoverElement || $[403] !== transformState) {
    t140 = !isDragging && !commentMode && !panMode && !isInsertTool(activeTool) && <HoverOverlay hoverSetterRef={hoverSetterRef} store={store} selectedElementIds={selectedElementIds} transform={transformState} canvasRef={canvasRef} onSelectElement={selectElement} onHoverElement={throttledHoverElement} readOnly={readOnly} geomByIdRef={geomByIdRef} />;
    $[392] = activeTool;
    $[393] = canvasRef;
    $[394] = commentMode;
    $[395] = geomByIdRef;
    $[396] = isDragging;
    $[397] = panMode;
    $[398] = readOnly;
    $[399] = selectElement;
    $[400] = selectedElementIds;
    $[401] = store;
    $[402] = throttledHoverElement;
    $[403] = transformState;
    $[404] = t140;
  } else t140 = $[404];
  let t141;
  if ($[405] !== t133 || $[406] !== t134 || $[407] !== t135 || $[408] !== t136 || $[409] !== t137 || $[410] !== t138 || $[411] !== t139 || $[412] !== t140) {
    t141 = <div ref={selectionOverlayRef} style={t132}>{t133}{t134}{t135}{t136}{t137}{t138}{t139}{t140}</div>;
    $[405] = t133;
    $[406] = t134;
    $[407] = t135;
    $[408] = t136;
    $[409] = t137;
    $[410] = t138;
    $[411] = t139;
    $[412] = t140;
    $[413] = t141;
  } else t141 = $[413];
  let t142;
  if ($[414] !== insertDropParentId || $[415] !== isDragging || $[416] !== renderPotentialParentOverlay) {
    t142 = (isDragging || insertDropParentId) && renderPotentialParentOverlay();
    $[414] = insertDropParentId;
    $[415] = isDragging;
    $[416] = renderPotentialParentOverlay;
    $[417] = t142;
  } else t142 = $[417];
  let t143;
  if ($[418] !== commentOverlay) {
    t143 = typeof commentOverlay === "function" ? commentOverlay(getCamera()) : commentOverlay;
    $[418] = commentOverlay;
    $[419] = t143;
  } else t143 = $[419];
  let t144;
  if ($[420] !== t130 || $[421] !== t131 || $[422] !== t141 || $[423] !== t142 || $[424] !== t143) {
    t144 = <div className="absolute inset-0 pointer-events-none" data-overlay-container={true}>{t130}{t131}{t141}{t142}{t143}</div>;
    $[420] = t130;
    $[421] = t131;
    $[422] = t141;
    $[423] = t142;
    $[424] = t143;
    $[425] = t144;
  } else t144 = $[425];
  let t145;
  if ($[470] !== store.byId.size || $[471] !== selectedElementIds.size || $[426] !== t101 || $[427] !== t102 || $[428] !== t104 || $[429] !== t105 || $[430] !== t126 || $[431] !== t128 || $[432] !== t129 || $[433] !== t144 || $[434] !== t98 || $[435] !== t99 || $[436] !== viewportRef) {
    t145 = <div ref={viewportRef} className="flex-1 relative overflow-hidden bg-ed-canvas-background" data-canvas-viewport="" {...t98} {...t99} style={t101} onDragOver={t102} onDragLeave={t103} onDrop={t104} onPointerDown={t105}>{t126}{t127}{t128}{t129}{t144}<CanvasPerformanceToolbar viewportRef={viewportRef} nodeCount={store.byId.size} selectedCount={selectedElementIds.size} /></div>;
    $[470] = store.byId.size;
    $[471] = selectedElementIds.size;
    $[426] = t101;
    $[427] = t102;
    $[428] = t104;
    $[429] = t105;
    $[430] = t126;
    $[431] = t128;
    $[432] = t129;
    $[433] = t144;
    $[434] = t98;
    $[435] = t99;
    $[436] = viewportRef;
    $[437] = t145;
  } else t145 = $[437];
  let t146;
  if ($[438] === Symbol.for("react.memo_cache_sentinel")) {
    t146 = {
      width: "auto",
      height: "auto",
      overflow: "visible",
      pointerEvents: "none"
    };
    $[438] = t146;
  } else t146 = $[438];
  let t147;
  if ($[439] !== activeElement || $[440] !== activeElements || $[441] !== activeId || $[442] !== assetResolver || $[443] !== componentIndex || $[444] !== components || $[445] !== componentsRevision || $[446] !== dragOverlayOffset || $[447] !== dragStartAnchor || $[448] !== dragStartRects || $[449] !== dragStartScale || $[450] !== iconLibraries || $[451] !== store || $[452] !== zoom) {
    t147 = activeElements.length > 0 && activeElement && (() => {
      const startScale = dragStartScale;
      const activeStartRect = activeId ? dragStartRects.get(activeId) : void 0;
      const zoomDrift = activeStartRect && dragStartAnchor ? previewZoomDrift(activeStartRect, {
        x: dragStartAnchor.pointerX,
        y: dragStartAnchor.pointerY
      }, startScale, zoom) : {
        x: 0,
        y: 0
      };
      const previewOutline = <div aria-hidden={true} data-drag-preview-outline="" style={{
        position: "absolute",
        inset: 0,
        outline: `${1 / zoom}px solid var(--ed-canvas-selection)`,
        pointerEvents: "none"
      }} />;
      const previewOptions = {
        isDragPreview: true,
        components,
        componentIndex,
        componentsRevision,
        iconLibraries,
        assetResolver
      };
      return <div className="bingo-canvas" data-drag-overlay="" style={{
        transform: `translate(${dragOverlayOffset.x + zoomDrift.x}px, ${dragOverlayOffset.y + zoomDrift.y}px) scale(${zoom})`,
        transformOrigin: "top left",
        pointerEvents: "none"
      }}>{activeElements.length === 1 ? <div style={{
          position: "relative",
          ...dragPreviewBoxSize(activeStartRect, startScale)
        }}>{renderElement(withDragPreviewSize(activeElements[0], activeStartRect, startScale), store, previewOptions)}{previewOutline}</div> : <div style={{
          position: "relative"
        }}>{activeElements.map(el_1 => {
            const thisRect = dragStartRects.get(el_1.id);
            const isActive = el_1.id === activeId;
            const offsetX = activeStartRect && thisRect ? (thisRect.left - activeStartRect.left) / startScale : 0;
            const offsetY = activeStartRect && thisRect ? (thisRect.top - activeStartRect.top) / startScale : 0;
            return <div key={el_1.id} style={{
              position: isActive ? "relative" : "absolute",
              left: isActive ? 0 : offsetX,
              top: isActive ? 0 : offsetY,
              ...dragPreviewBoxSize(thisRect, startScale)
            }}>{renderElement(withDragPreviewSize(el_1, thisRect, startScale), store, previewOptions)}{previewOutline}</div>;
          })}</div>}</div>;
    })();
    $[439] = activeElement;
    $[440] = activeElements;
    $[441] = activeId;
    $[442] = assetResolver;
    $[443] = componentIndex;
    $[444] = components;
    $[445] = componentsRevision;
    $[446] = dragOverlayOffset;
    $[447] = dragStartAnchor;
    $[448] = dragStartRects;
    $[449] = dragStartScale;
    $[450] = iconLibraries;
    $[451] = store;
    $[452] = zoom;
    $[453] = t147;
  } else t147 = $[453];
  let t148;
  if ($[454] !== snapModifiers || $[455] !== t147) {
    t148 = <DragOverlay zIndex={40} dropAnimation={null} modifiers={snapModifiers} style={t146}>{t147}</DragOverlay>;
    $[454] = snapModifiers;
    $[455] = t147;
    $[456] = t148;
  } else t148 = $[456];
  let t149;
  if ($[457] !== sensors || $[458] !== t145 || $[459] !== t148 || $[460] !== t94 || $[461] !== t95 || $[462] !== t96 || $[463] !== t97) {
    t149 = <DndContext id="dnd-canvas" sensors={sensors} measuring={measuringConfig} onDragStart={t94} onDragMove={t95} onDragEnd={t96} onDragCancel={t97}>{t145}{t148}</DndContext>;
    $[457] = sensors;
    $[458] = t145;
    $[459] = t148;
    $[460] = t94;
    $[461] = t95;
    $[462] = t96;
    $[463] = t97;
    $[464] = t149;
  } else t149 = $[464];
  let t150;
  if ($[465] !== t149 || $[466] !== t91 || $[467] !== t92 || $[468] !== t93) {
    t150 = <div className="w-full h-full relative overflow-hidden flex flex-col" style={t90}>{t91}{t92}{t93}{t149}</div>;
    $[465] = t149;
    $[466] = t91;
    $[467] = t92;
    $[468] = t93;
    $[469] = t150;
  } else t150 = $[469];
  return t150;
}
function _temp17$1(s_1) {
  return {
    position: "absolute",
    backgroundColor: GUIDE_COLOR,
    pointerEvents: "none",
    zIndex: 59,
    ...s_1
  };
}
function _temp16$1() {}
function _temp15$2(e_20) {
  if (e_20.target.closest("a[href]")) {
    e_20.preventDefault();
    return;
  }
}
function _temp14$2(_ref, state_5) {
  return publishCamera(state_5);
}
function _temp13$2(t0) {
  const {
    state: state_4
  } = t0;
  return publishCamera(state_4);
}
function _temp12$2(t0) {
  const {
    state: state_3
  } = t0;
  return publishCamera(state_3);
}
function _temp11$4(f) {
  return f.type.startsWith("image/") || f.type.startsWith("video/");
}
function _temp10$5(path) {
  return (path.split("/").pop() || "").replace(/\.tsx?$/, "");
}
function _temp1$6() {
  isDragSuppressedGlobal = false;
}
function _temp0$6() {
  isPanToolActiveGlobal = false;
}
function _temp9$7(prev_1) {
  return prev_1 === null ? prev_1 : null;
}
function _temp8$8(node_2) {
  let el_0 = node_2;
  let style = window.getComputedStyle(el_0);
  while (style.display === "contents" && el_0.firstElementChild) {
    el_0 = el_0.firstElementChild;
    style = window.getComputedStyle(el_0);
  }
  return el_0.getBoundingClientRect();
}
function _temp7$12() {
  const originalBodyOverscroll = document.body.style.overscrollBehavior;
  const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;
  document.body.style.overscrollBehavior = "none";
  document.documentElement.style.overscrollBehavior = "none";
  return () => {
    document.body.style.overscrollBehavior = originalBodyOverscroll;
    document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
  };
}
function _temp6$16() {
  const blockHorizontalSwipe = _temp5$19;
  window.addEventListener("wheel", blockHorizontalSwipe, {
    passive: false,
    capture: true
  });
  return () => {
    window.removeEventListener("wheel", blockHorizontalSwipe, {
      capture: true
    });
  };
}
function _temp5$19(e_7) {
  if (Math.abs(e_7.deltaX) > Math.abs(e_7.deltaY) && Math.abs(e_7.deltaX) > 5) {
    const markedRegion = (e_7.target instanceof Element ? e_7.target : null)?.closest("[data-horizontal-scroll]");
    const scrollRegion = markedRegion?.matches("[data-slot=\"scroll-area-viewport\"]") ? markedRegion : markedRegion?.querySelector("[data-slot=\"scroll-area-viewport\"]") ?? markedRegion;
    if (scrollRegion) {
      const maxScrollLeft = scrollRegion.scrollWidth - scrollRegion.clientWidth;
      if (e_7.deltaX < 0 ? scrollRegion.scrollLeft > 0 : scrollRegion.scrollLeft < maxScrollLeft) return;
    }
    e_7.preventDefault();
  }
}
function _temp4$22(scale_0, positionX, positionY) {
  const pins = document.querySelectorAll("[data-comment-canvas-x]");
  for (const pin of pins) {
    const cx = parseFloat(pin.dataset.commentCanvasX);
    const cy = parseFloat(pin.dataset.commentCanvasY);
    if (isNaN(cx) || isNaN(cy)) continue;
    pin.style.left = `${cx * scale_0 + positionX}px`;
    pin.style.top = `${cy * scale_0 + positionY}px`;
  }
}

export { Canvas };
