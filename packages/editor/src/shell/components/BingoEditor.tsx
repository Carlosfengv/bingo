/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/BingoEditor.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { __vitePreload as __bingo_vitePreload } from "../../../../../src/renderer/vite-preload-helper";
import { useBackendOptional } from "../../backends/BackendContext";
import { isPlanLimitReason } from "../../backends/planLimits";
import { Canvas } from "../../canvas/components/Canvas";
import { CanvasLayout } from "../../canvas/components/CanvasLayout";
import { CanvasZoomMenu } from "../../canvas/components/CanvasZoomMenu";
import { CommentPins } from "../../canvas/components/CommentPins";
import { findContainerAt } from "../../canvas/hooks/drawParent";
import { useCanvasPersistence } from "../../canvas/hooks/useCanvasPersistence";
import { captureCanvasPreview } from "../../canvas/lib/canvasPreview";
import { stripPropSynthesizedChildren } from "../../canvas/lib/capture/fiber";
import { stripCanvasInvalidPosition } from "../../canvas/lib/capture/styles";
import { copyToFigma } from "../../canvas/lib/figmaExport";
import { isRelativeFlowPosition, positionStylesForParent } from "../../canvas/utils/absolutePositioning";
import { VariableLibraryProvider, VariableEditorProvider, useVariableSnapshot } from "../../shared/theme/VariableContext";
import { VariableManager } from "../../shared/theme/VariableManager";
import { VariablesButton } from "../../shared/theme/VariableControls";
import { captureComponentInstance, clearComponentEditSession, editSessionFromElement, findEditRootId$1, findEditSessionsInStore, getComponentEditSession, rendersThroughWebgl, stashComponentEditSession } from "../../canvas/utils/captureComponentInstance";
import { getElementRect$1 } from "../../canvas/utils/collisionUtils";
import { getCanvasSpaceRect, isFlowLayoutElement } from "../../canvas/utils/domGeometry";
import { applyFigmaImagePatchesToStore } from "../../canvas/utils/figma";
import { cameraToFitRect } from "../../canvas/utils/fitCamera";
import { cameraToFitFollowRect, componentNamesForWritePath, followRectForTarget, followTargetIds, instanceIdsForComponentNames, liveCanvasComponentNames, unionFollowRects } from "../../canvas/utils/followAiCamera";
import { resolvePointerTarget } from "../../canvas/utils/pointerTarget";
import { isDescendClick, resolveDescendTarget, sameSelection } from "../../canvas/utils/selection";
import { ActiveToolProvider } from "../../shared/contexts/ActiveToolContext";
import { AssetProvider } from "../../shared/contexts/AssetContext";
import { EditorModeProvider } from "../../shared/contexts/EditorModeContext";
import { useUploadImage } from "../../shared/hooks/useUploadImage";
import { readCamera, writeCamera } from "../../shared/lib/cameraStore";
import { isCodeEditorTarget, isTypingTarget } from "../../shared/shortcuts/matchShortcut";
import { useGlobalShortcut } from "../../shared/shortcuts/useGlobalShortcut";
import { getAiWriteTarget } from "../../shared/state/aiWriteTarget";
import { clearLog, describeOperation, ensureLog, getOperations, popOperation, recordOperation, squashOperations, startLog } from "../../shared/utils/captureStore";
import { COMPOSITION_DRAG_MIME, copyElementToClipboard, createCompositionDragPayload, createImageElement, createVideoElement, fileToUrl, htmlToJsx, isCanvasInsertDrag, looksLikeHTML, readElementFromClipboard } from "../../shared/utils/clipboard";
import { planDropMoves } from "../../shared/utils/dropPlan";
import { cloneElementWithNewIds } from "../../shared/utils/elementCloning";
import { expandLinkedMapOps } from "../../shared/utils/expandLinkedMapOps";
import { normalizeFlexShrinkOps } from "../../shared/utils/flexShrink";
import { normalizeFlowLayoutChildrenOps } from "../../shared/utils/flowLayoutChildren";
import { buildFrameAdoptionOps, frameSlotAmongAdoptees } from "../../shared/utils/frameAdoptionOps";
import { generatePrefixedId } from "../../shared/utils/idUtils";
import { applyOperationsToStore, createInsertOperation, createMoveOperation, createRemoveOperation, createReplaceOperation, createSetNameOperation, createSetPositionOperation, createSetPropsOperation, createSetStylesOperation, createSetTextOperation, invertOperations } from "../../shared/utils/operations";
import { groupElementsByTarget, resolveMultiPasteTargets } from "../../shared/utils/pasteTargets";
import { planSelectionReorder } from "../../shared/utils/reorderSelection";
import { ScrubSessionContext } from "../../shared/utils/useScrub";
import { resolveVisibleElement$1 } from "../../shared/utils/visibleElement";
import { ARROW_KEYS, CHAT_COLORS, EMPTY_STORE, TEXT_RUN_STYLE_KEYS } from "../constants";
import { measuredRootBounds, occupiedRootBoxes, rootContentSettled } from "../hooks/rootBoxes";
import { useBackendActions } from "../hooks/useBackendActions";
import { useCanvasToolHandler } from "../hooks/useCanvasToolHandler";
import { isHumanCanvasCommit, useTabHistory } from "../hooks/useHistory";
import { usePromptContextInsertion } from "../hooks/usePromptContextInsertion";
import { ChatPersistence } from "../utils/chatPersistence";
import { createVersionedSaveQueue } from "../utils/versionedSaveQueue";
import { driveCamera, getCamera, isAddToPromptShortcut, publishCamera, subscribeCamera, subscribeUserCameraGesture } from "../utils/chatShortcuts";
import { lastChatWorkTarget, outermostChatWorkIds } from "../utils/chatWorkTarget";
import { collectFontFamilies, ensureFontsLoaded } from "../utils/fontLoader";
import { normalizeTextRuns } from "../utils/normalizeTextRuns";
import { buildClassPropertyMap, computeCleanedStyles, pasteHasResolvingClasses } from "../utils/pasteClassStyles";
import { isInlineTypographyEdit } from "../utils/tailwindClasses";
import { ChatArchiveView } from "./ArchivedChatsPanel";
import { BottomBar } from "./BottomBar";
import { ChatConversations } from "./ChatConversations";
import { ChatPanel } from "./ChatPanel";
import { CommentComposer } from "./CommentComposer";
import { CommentThread } from "./CommentThread";
import { CreateComponentModal } from "./CreateComponentModal";
import { LeftSidebarV2 } from "./LeftSidebarV2";
import { PreviewWindow } from "./PreviewWindow";
import { ProtoPlayer } from "./ProtoPlayer";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { AgentsSidebarTabV2 } from "./panels/AgentsSidebarTabV2";
import { AssetsPanel } from "./panels/AssetsPanel";
import { AssetsSidebarTabV2 } from "./panels/AssetsSidebarTabV2";
import { IconsPanel } from "./panels/IconsPanel";
import { InsertPanel } from "./panels/InsertPanel";
import { LayersPanel } from "./panels/LayersPanel";
import { PagePanel } from "./panels/PagePanel";
import { PagesPanel } from "./panels/PagesPanel";
import { PagesSidebarTabV2 } from "./panels/PagesSidebarTabV2";
import { ElementHeader, PropsPanel } from "./panels/PropsPanel";
import { SkillsPanel } from "./panels/SkillsPanel";
import { StylesPanelTabs } from "./panels/StylesPanelTabs";
import { WebviewEditPanel } from "./panels/WebviewEditPanel";
import { buildFigmaImageStylePatches, canAcceptChild, convertFigmaClipboardHtmlSync, emptyStore, ensureV2, generateCompleteFile, generateJSX, getById, getChildren$2, getDescendantIds, getIndex, getParentId, getRootIds, hasChildren$1, isCompositionFile, isDescendant, isFigmaClipboardHtml, isTextOwner, parseJSX, resolveTextOwner, sanitizeElementProps, storeSubtreeToLegacyNested, toWire } from "@bingo/compiler";
import { ContextMenu$1, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger, ScrollArea, SparkleIcon, Tabs, TabsContent, TabsList, TabsTrigger, Toaster, Tooltip } from "@bingo/ui";
import { FigmaLogo as g$3 } from "@phosphor-icons/react/dist/icons/FigmaLogo";
import * as import_react from "react";
import { useTranslation } from "@bingo/i18n";
import { Panel, PanelGroup as PanelGroup$1, PanelResizeHandle } from "react-resizable-panels";
import * as import_compiler_runtime from "react/compiler-runtime";
import * as import_jsx_runtime from "react/jsx-runtime";
import { toast } from "sonner";

var useSearchParamsCompat = () => {
  const [params] = (0, import_react.useState)(_temp$12);
  return params;
};
var nudgedCoord = (start, prop, delta) => start + (prop === "left" || prop === "top" ? delta : -delta);
/** Count "elements" in a CanvasData shape returned by the server. The wire
*  may be StoreWireV2 (count `byId` keys minus the implicit ROOT slot) or
*  legacy nested (array length of top-level entries). */
/** Top-level element count of a stored canvas payload (legacy nested array or v2 store). */
function countCanvasRoots(payload) {
  if (Array.isArray(payload)) return payload.length;
  return payload ? getRootIds(ensureV2(payload)).length : 0;
}
function countCanvasElements(payload) {
  if (!payload) return 0;
  if (Array.isArray(payload)) return payload.length;
  if (typeof payload === "object") {
    const obj = payload;
    if (obj.schemaVersion === 2 && obj.byId && typeof obj.byId === "object") return Object.keys(obj.byId).length;
    if (Array.isArray(obj.elements)) return obj.elements.length;
  }
  return 0;
}
var FOLLOW_AI_STORAGE_KEY = "bingo-follow-ai";
var FOLLOW_AI_TICK_MS = 200;
var FOLLOW_AI_CAMERA_MS = 220;
/** Consecutive frames the content bounds must hold still before the fit commits. */
var FIT_STABLE_FRAMES = 2;
/** Safety valve — reveal rather than hold the canvas back if content never settles. */
var FIT_SETTLE_TIMEOUT_MS = 2500;
/** How long to keep watching for a late resize after an unsettled fit. */
var LATE_REFIT_WINDOW_MS = 15e3;
var LATE_REFIT_POLL_MS = 250;
/** Animated, so a correction reads as intentional rather than as a glitch. */
var LATE_REFIT_MS = 220;
/** Bounds must move by more than this for a correction to be worth the motion. */
var LATE_REFIT_MIN_DELTA = 8;
function readFollowAiPreference() {
  try {
    return localStorage.getItem(FOLLOW_AI_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeFollowAiPreference(on) {
  try {
    localStorage.setItem(FOLLOW_AI_STORAGE_KEY, on ? "1" : "0");
  } catch {}
}
function resolveInitialActivePageId(initialPages, projectPath) {
  try {
    const savedPage = localStorage.getItem(`bingo-active-page:${projectPath ?? "local"}`);
    if (savedPage && initialPages?.some(p => p.id === savedPage)) return savedPage;
  } catch {}
  if (initialPages && initialPages.length > 0) return initialPages[0].id;
  return "canvas-1";
}
function buildInitialTabs(initialPages, initialActivePageId, initialElements) {
  if (initialPages && initialPages.length > 0) return initialPages.map(p => {
    const isActive = p.id === initialActivePageId;
    const normalized = p.elements ?? [];
    const hasElements = countCanvasElements(normalized) > 0;
    const elements = isActive || hasElements ? normalized : [];
    const store = ensureV2(elements);
    const loaded = isActive || !!hasElements;
    return {
      id: p.id,
      name: p.name,
      canvasId: p.id,
      canvasPath: `.bingo/canvases/${p.id}/`,
      store,
      loaded,
      lastSavedState: loaded ? JSON.stringify({
        elements
      }) : void 0,
      backgroundColor: p.backgroundColor,
      backgroundToken: p.backgroundToken
    };
  });
  const elements = initialElements ?? [];
  return [{
    id: "canvas-1",
    name: "Page 1",
    canvasId: "canvas-1",
    canvasPath: ".bingo/canvases/canvas-1/",
    store: ensureV2(elements),
    loaded: true,
    lastSavedState: JSON.stringify({
      elements
    })
  }];
}
function findFocusedComponentEditSession(store, selectedElementIds) {
  for (const id of selectedElementIds) {
    const rootId = findEditRootId$1(store, id);
    if (!rootId) continue;
    return getComponentEditSession(rootId) ?? findEditSessionsInStore(store).find(s => s.containerId === rootId) ?? null;
  }
  return null;
}
/** Read a video file's intrinsic dimensions via a detached <video> metadata load.
*  Returns null if the file can't be decoded (caller keeps a default size). */
function getVideoDimensions(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}
/** Drop out-of-flow positioning from an element about to become a canvas root.
*  Roots are placed by canvasPosition inside an unsized wrapper, so a root
*  `position: absolute` (common in markup copied from a web page, where the
*  browser inlines the source's computed styles) takes it out of flow, collapses
*  the wrapper to 0x0, and any `max-width: %` then resolves to 0 — the element
*  pastes in invisible. Nested absolutes are untouched; they're valid. */
function stripRootPositioning(element) {
  if (element.styles) stripCanvasInvalidPosition(element.styles, true);
}
function inferSelectionLayoutDirection(rects) {
  if (rects.length < 2) return "row";
  const centers = rects.map(rect => ({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  }));
  const minX = Math.min(...centers.map(center => center.x));
  const maxX = Math.max(...centers.map(center => center.x));
  const minY = Math.min(...centers.map(center => center.y));
  return Math.max(...centers.map(center => center.y)) - minY > maxX - minX ? "column" : "row";
}
function sortIdsByLayoutDirection(ids, rectsById, direction) {
  return [...ids].sort((a, b) => {
    const rectA = rectsById.get(a);
    const rectB = rectsById.get(b);
    if (!rectA || !rectB) return ids.indexOf(a) - ids.indexOf(b);
    const primaryDelta = direction === "column" ? rectA.top - rectB.top : rectA.left - rectB.left;
    if (Math.abs(primaryDelta) > 1) return primaryDelta;
    return direction === "column" ? rectA.left - rectB.left : rectA.top - rectB.top;
  });
}
async function readSourceFileForBottomBar(readFileRaw, filePath) {
  let content = "";
  if (readFileRaw) {
    const raw = await readFileRaw(filePath);
    if (raw) content = raw;
  }
  if (!content) {
    const invoke = window.api?.invoke;
    if (typeof invoke === "function") {
      const res = await invoke("read_source", {
        filePath
      });
      if (res && res.ok) content = res.content;
    }
  }
  return content;
}
async function loadSystemSkillMarkdown(name) {
  const api = window.api;
  if (!api) return void 0;
  const skills = await api.invoke("get_system_skills");
  if (!Array.isArray(skills)) return void 0;
  const baseline = skills.find(s => s.name === name);
  if (!baseline) return void 0;
  const skillMd = baseline.files.find(f => f.path === "SKILL.md");
  if (skillMd) return skillMd.content;
  const first = baseline.files[0];
  if (first) return first.content;
  return "";
}
function titleFromFirstUserMessage(messages) {
  const firstUserMsg = messages.find(m => m.role === "user");
  if (!firstUserMsg?.content) return null;
  const cleanContent = firstUserMsg.content.replace(/\[@[^\]]*\]/g, "").replace(/\n\[References\][\s\S]*/g, "").trim();
  if (!cleanContent) return null;
  return cleanContent.slice(0, 50) + (cleanContent.length > 50 ? "..." : "");
}
function chatTabsFromList(list) {
  return list.map(item => {
    const messages = Array.isArray(item.messages) ? item.messages : [];
    return {
      id: item.id,
      title: item.title ?? titleFromFirstUserMessage(messages),
      createdAt: item.createdAt || item.updatedAt || (new Date()).toISOString(),
      messages
    };
  });
}
function persistMissingChatTitles(list, updateChatTitle) {
  for (const item of list) {
    if (item.title) continue;
    const title = titleFromFirstUserMessage(Array.isArray(item.messages) ? item.messages : []);
    if (title) updateChatTitle(item.id, title);
  }
}
/** Save-to-code screenshot. Same toPng options as the previous inline capture. */
async function captureSaveToCodeScreenshot(el) {
  const {
    toPng
  } = await __bingo_vitePreload(async () => {
    const {
      toPng
    } = await import("html-to-image");
    return {
      toPng
    };
  }, [], import.meta.url);
  return toPng(el, {
    cacheBust: true,
    pixelRatio: 1,
    width: Math.min(el.scrollWidth, 1600),
    height: Math.min(el.scrollHeight, 1200),
    includeQueryParams: true
  });
}
/** Top-level element count at which a page counts as having a real design on it. */
var POPULATED_PAGE_ROOT_COUNT = 5;
/** Minimum gap between two canvas_edited emits; edits in between are batched into `edits`. */
var CANVAS_EDIT_THROTTLE_MS = 3e5;
var BingoEditorInner = ({
  components,
  componentIndex,
  iconLibraries = {},
  allIconLibraries = iconLibraries,
  readOnly = false,
  initialElements,
  initialPages,
  assetResolver,
  onComponentCreated,
  onCanvasSaved,
  onActivity,
  compilePreview,
  projectPath,
  webBaseUrl,
  allowedPaths,
  onAddAllowedPath,
  onRemoveAllowedPath,
  onClearAllowedPaths,
  isElectron,
  externalMcpApprovals,
  onExternalMcpApproval,
  onOpenProjectSettings,
  onPlanLimit,
  onFeedback,
  onAddShadcnComponents,
  externalChatDraft,
  focusChatOnMount,
  enableCssEditor = false,
  scanLoading = false,
  onRequestPropsScan,
  onEnsureComponentNames,
  serverDrivenFileRefresh = false,
  componentsRevision = 0,
  onProjectFilesEdited,
  enableComponentEditV2 = false,
  enableWebviewTweak = false,
  enableSkillCustomization = false,
  enableSidebarV2 = false,
  projectName = "Bingo",
  projectIconUrl,
  onProjectIconClick,
  skillOverrides = {},
  onUpdateSkillOverrides,
  leftHeader,
  rightHeader,
  canvasAlert,
  protoMode = false,
  gitPanel,
  figmaImageResolver,
  onFileChangedRef,
  openPreviewRef,
  openBrowserPreviewRef,
  onSelectionChange,
  onCopySelectionLink,
  comments: commentsProp = [],
  commentReplies: commentRepliesProp = [],
  currentUserId = null,
  onCreateComment,
  onCreateReply,
  onResolveComment,
  onUnresolveComment,
  onDeleteComment,
  onEditComment,
  onToggleReaction,
  onMoveComment,
  onActiveCommentChange,
  showCommentTools = false,
  commentModeActive,
  onCommentModeChange,
  showResolvedComments: showResolvedProp,
  onShowResolvedChange,
  commentsHidden: commentsHiddenProp,
  onCommentsHiddenChange,
  fonts
}) => {
  const { t, i18n } = useTranslation("editor");
  const uploadImage = useUploadImage();
  const searchParams = useSearchParamsCompat();
  const elementParam = searchParams?.get("element") ?? null;
  const pageParam = searchParams?.get("page") ?? null;
  const commentParam = searchParams?.get("comment") ?? null;
  const [selectedElementIds, setSelectionState] = (0, import_react.useState)(new Set());
  const setSelectedElementIds = import_react.useCallback(update => {
    setSelectionState(previous => {
      const next = typeof update === "function" ? update(previous) : update;
      return sameSelection(previous, next) ? previous : next;
    });
  }, []);
  const [pendingElementToCenter, setPendingElementToCenter] = (0, import_react.useState)(null);
  const [pendingChatWorkTarget, setPendingChatWorkTarget] = (0, import_react.useState)(null);
  const [chatTabs, setChatTabs] = (0, import_react.useState)([]);
  const [chatsLoading, setChatsLoading] = (0, import_react.useState)(true);
  const [visibleChatIndex, setVisibleChatIndex] = (0, import_react.useState)(0);
  const [chatHistoryOpen, setChatHistoryOpen] = (0, import_react.useState)(false);
  const [archiveOpen, setArchiveOpen] = (0, import_react.useState)(false);
  const [runningChatIds, setRunningChatIds] = (0, import_react.useState)(() => new Set());
  const [unreadChatIds, setUnreadChatIds] = (0, import_react.useState)(() => new Set());
  const [followAi, setFollowAi] = (0, import_react.useState)(readFollowAiPreference);
  const persistFollowAi = on => {
    setFollowAi(on);
    writeFollowAiPreference(on);
  };
  const chatTabsRef = (0, import_react.useRef)(chatTabs);
  const visibleChatIndexRef = (0, import_react.useRef)(visibleChatIndex);
  (0, import_react.useLayoutEffect)(() => {
    chatTabsRef.current = chatTabs;
    visibleChatIndexRef.current = visibleChatIndex;
  });
  const elementLocksRef = (0, import_react.useRef)(new Map());
  const claimIdToChatTabIdRef = (0, import_react.useRef)(new Map());
  const storeRef = (0, import_react.useRef)(EMPTY_STORE);
  const chatColorMap = (0, import_react.useMemo)(() => {
    const map = new Map();
    chatTabs.forEach((chat, i) => {
      map.set(chat.id, CHAT_COLORS[i % CHAT_COLORS.length]);
    });
    return map;
  }, [chatTabs]);
  const [elementLockOwners, setElementLockOwners] = (0, import_react.useState)(() => new Map());
  const publishElementLocks = () => {
    const nextOwners = new Map();
    for (const [elementId, claimId] of elementLocksRef.current) nextOwners.set(elementId, claimIdToChatTabIdRef.current.get(claimId) ?? "");
    setElementLockOwners(nextOwners);
  };
  const elementLocksWithColors = (0, import_react.useMemo)(() => {
    const next = new Map();
    for (const [elementId_0, chatTabId] of elementLockOwners) next.set(elementId_0, chatColorMap.get(chatTabId) || "#64748b");
    return next;
  }, [elementLockOwners, chatColorMap]);
  const [leftPanelTab, setLeftPanelTab] = (0, import_react.useState)(readOnly ? "layers" : "chat");
  const [sidebarV2Tab, setSidebarV2Tab] = (0, import_react.useState)("pages");
  const layersSearchRef = (0, import_react.useRef)(null);
  const pagesSidebarRef = (0, import_react.useRef)(null);
  const assetsSidebarRef = (0, import_react.useRef)(null);
  const pendingAssetsSearchRef = (0, import_react.useRef)(false);
  const leftTabsListRef = (0, import_react.useRef)(null);
  const revealChatPanel = (0, import_react.useCallback)(() => {
    setChatHistoryOpen(false);
    setArchiveOpen(false);
    setLeftPanelTab("chat");
    setSidebarV2Tab("agents");
  }, []);
  const revealInsertPanel = (0, import_react.useCallback)(() => {
    if (enableSidebarV2) {
      setSidebarV2Tab("assets");
      if (assetsSidebarRef.current) assetsSidebarRef.current.openSearch();else pendingAssetsSearchRef.current = true;
      return;
    }
    setLeftPanelTab("insert");
  }, [enableSidebarV2]);
  (0, import_react.useEffect)(() => {
    const tabsList = leftTabsListRef.current;
    if (!tabsList) return;
    const handleWheel = e => {
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        tabsList.scrollLeft += e.deltaY;
        e.preventDefault();
      }
      e.stopPropagation();
    };
    tabsList.addEventListener("wheel", handleWheel, {
      passive: false
    });
    return () => tabsList.removeEventListener("wheel", handleWheel);
  }, []);
  const [renameRequestId, setRenameRequestId] = (0, import_react.useState)(null);
  const suppressMenuCloseFocusRef = (0, import_react.useRef)(false);
  const handleRequestRename = id => {
    suppressMenuCloseFocusRef.current = true;
    setLeftPanelTab("layers");
    setSidebarV2Tab("pages");
    setRenameRequestId(id);
  };
  const [compositionRefreshKey, setCompositionRefreshKey] = (0, import_react.useState)(0);
  const [chromeHidden, setChromeHidden] = (0, import_react.useState)(false);
  const [bottomBarRevealSignal, setBottomBarRevealSignal] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => {
    const openConnections = () => {
      setChromeHidden(false);
      setBottomBarRevealSignal(signal => signal + 1);
    };
    window.addEventListener("bingo-manage-connections", openConnections);
    return () => window.removeEventListener("bingo-manage-connections", openConnections);
  }, []);
  const [previewOpen, setPreviewOpen] = (0, import_react.useState)(false);
  const [showGitPanel, setShowGitPanel] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    const handler = e_0 => {
      if (e_0.detail?.tab === "git") setShowGitPanel(prev => !prev);
    };
    window.addEventListener("bingo-switch-tab", handler);
    return () => window.removeEventListener("bingo-switch-tab", handler);
  }, []);
  (0, import_react.useEffect)(() => {
    if (!openPreviewRef) return;
    openPreviewRef.current = () => setPreviewOpen(true);
    return () => {
      openPreviewRef.current = null;
    };
  }, [openPreviewRef]);
  const [commentsHiddenInternal, setCommentsHiddenInternal] = (0, import_react.useState)(false);
  const commentsHidden = commentsHiddenProp ?? commentsHiddenInternal;
  const setCommentsHidden = onCommentsHiddenChange ?? setCommentsHiddenInternal;
  const [commentModeInternal, setCommentModeInternal] = (0, import_react.useState)(false);
  const commentMode = commentsHidden ? false : commentModeActive ?? commentModeInternal;
  const setCommentMode = onCommentModeChange ?? setCommentModeInternal;
  const showResolvedComments = showResolvedProp ?? false;
  const [activeCommentId, setActiveCommentId] = (0, import_react.useState)(null);
  const [pendingCommentPosition, setPendingCommentPosition] = (0, import_react.useState)(null);
  const effectiveProjectPath = projectPath;
  const variableRuntime = useVariableSnapshot();
  const effectiveAllowedPaths = allowedPaths;
  const effectiveOnAdd = onAddAllowedPath;
  const chatBackend = useBackendOptional();
  const [openCodeFiles, setOpenCodeFiles] = (0, import_react.useState)([]);
  const openCodeFilesRef = (0, import_react.useRef)(openCodeFiles);
  const fileReadVersionsRef = (0, import_react.useRef)(new Map());
  const beginFileRead = path => {
    const version = {};
    fileReadVersionsRef.current.set(path, version);
    return version;
  };
  (0, import_react.useLayoutEffect)(() => {
    openCodeFilesRef.current = openCodeFiles;
  });
  const [fileOpenSignal, setFileOpenSignal] = (0, import_react.useState)(null);
  const fileOpenCountRef = (0, import_react.useRef)(0);
  const openFileInBottomBar = async (filePath, options) => {
    const version = beginFileRead(filePath);
    setOpenCodeFiles(prev_0 => prev_0.some(f => f.path === filePath) ? prev_0 : [...prev_0, {
      path: filePath,
      content: "",
      componentName: options?.componentName
    }]);
    fileOpenCountRef.current += 1;
    setFileOpenSignal({
      path: filePath,
      n: fileOpenCountRef.current,
      line: options?.line
    });
    const readFileRaw = chatBackend ? chatBackend.readFileRaw : void 0;
    let content = "";
    try {
      content = await readSourceFileForBottomBar(readFileRaw, filePath);
    } catch {
      content = `// Couldn't read ${filePath}`;
    }
    if (fileReadVersionsRef.current.get(filePath) !== version) return;
    setOpenCodeFiles(prev_1 => prev_1.map(f_0 => f_0.path === filePath ? {
      ...f_0,
      content
    } : f_0));
  };
  const closeCodeFile = filePath_0 => {
    fileReadVersionsRef.current.delete(filePath_0);
    setOpenCodeFiles(prev_2 => prev_2.filter(f_1 => f_1.path !== filePath_0));
  };
  const saveCodeFile = async (filePath_1, content_0) => {
    if (!chatBackend?.writeFileRaw) throw new Error(t("bottomBar.saveUnavailable"));
    beginFileRead(filePath_1);
    await chatBackend.writeFileRaw(filePath_1, content_0);
    beginFileRead(filePath_1);
    setOpenCodeFiles(prev_3 => prev_3.map(f_2 => f_2.path === filePath_1 ? {
      ...f_2,
      content: content_0
    } : f_2));
  };
  const [openSkills, setOpenSkills] = (0, import_react.useState)([]);
  const [skillOpenSignal, setSkillOpenSignal] = (0, import_react.useState)(null);
  const skillOpenCountRef = (0, import_react.useRef)(0);
  const showSkillsTab = !!(enableSkillCustomization && isElectron && !readOnly);
  if (!showSkillsTab && leftPanelTab === "skills") setLeftPanelTab(readOnly ? "layers" : "chat");
  if (!showSkillsTab && sidebarV2Tab === "skills" || readOnly && sidebarV2Tab === "agents") setSidebarV2Tab("pages");
  (0, import_react.useEffect)(() => {
    if (sidebarV2Tab !== "assets" || !pendingAssetsSearchRef.current) return;
    pendingAssetsSearchRef.current = false;
    assetsSidebarRef.current?.openSearch();
  }, [sidebarV2Tab]);
  const openSkillInBottomBar = skill => {
    const override = skillOverrides[skill.name];
    const files = override?.files?.length ? override.files : skill.files;
    const content_1 = files.find(f_3 => f_3.path === "SKILL.md")?.content ?? files[0]?.content ?? "";
    setChromeHidden(false);
    setBottomBarRevealSignal(n => n + 1);
    setOpenSkills(prev_4 => {
      if (prev_4.find(s => s.name === skill.name)) return prev_4.map(s_0 => s_0.name === skill.name ? {
        ...s_0,
        content: content_1
      } : s_0);
      return [...prev_4, {
        name: skill.name,
        content: content_1
      }];
    });
    skillOpenCountRef.current += 1;
    setSkillOpenSignal({
      name: skill.name,
      n: skillOpenCountRef.current
    });
  };
  const closeSkill = name => {
    setOpenSkills(prev_5 => prev_5.filter(s_1 => s_1.name !== name));
  };
  const saveSkill = async (name_0, content_2) => {
    if (!onUpdateSkillOverrides) return;
    const existingFiles = skillOverrides[name_0]?.files;
    const nextFiles = existingFiles?.length ? existingFiles.map(f_4 => f_4.path === "SKILL.md" ? {
      ...f_4,
      content: content_2
    } : f_4) : [{
      path: "SKILL.md",
      content: content_2
    }];
    if (!nextFiles.some(f_5 => f_5.path === "SKILL.md")) nextFiles.push({
      path: "SKILL.md",
      content: content_2
    });
    onUpdateSkillOverrides({
      ...skillOverrides,
      [name_0]: {
        files: nextFiles,
        active: skillOverrides[name_0]?.active ?? false
      }
    });
    setOpenSkills(prev_6 => prev_6.map(s_2 => s_2.name === name_0 ? {
      ...s_2,
      content: content_2
    } : s_2));
  };
  const resetSkillOverride = name_1 => {
    if (!onUpdateSkillOverrides) return;
    const next_1 = {
      ...skillOverrides
    };
    delete next_1[name_1];
    onUpdateSkillOverrides(next_1);
    (async () => {
      let content_3;
      try {
        content_3 = await loadSystemSkillMarkdown(name_1);
      } catch {
        return;
      }
      if (content_3 === void 0) return;
      setOpenSkills(prev_7 => prev_7.map(s_3 => s_3.name === name_1 ? {
        ...s_3,
        content: content_3
      } : s_3));
    })();
  };
  const toggleSkillOverrideActive = (name_2, active) => {
    if (!onUpdateSkillOverrides) return;
    const existing_0 = skillOverrides[name_2];
    if (!active && !existing_0?.files?.length) {
      if (!existing_0) return;
      const next_2 = {
        ...skillOverrides
      };
      delete next_2[name_2];
      onUpdateSkillOverrides(next_2);
      return;
    }
    onUpdateSkillOverrides({
      ...skillOverrides,
      [name_2]: {
        files: existing_0?.files ?? [],
        active
      }
    });
  };
  const chatLoadedRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    if (chatLoadedRef.current) return;
    let cancelled = false;
    const load = async () => {
      const emptyTab = () => ({
        id: `local-${Date.now()}`,
        title: null,
        createdAt: (new Date()).toISOString(),
        messages: []
      });
      if (!chatBackend?.listChats) {
        if (!cancelled) {
          setChatTabs([emptyTab()]);
          setVisibleChatIndex(0);
          setChatsLoading(false);
          chatLoadedRef.current = true;
        }
        return;
      }
      try {
        const list = await chatBackend.listChats();
        if (cancelled) return;
        if (list.length > 0) {
          setChatTabs(chatTabsFromList(list));
          setVisibleChatIndex(0);
          if (chatBackend.updateChatTitle) persistMissingChatTitles(list, chatBackend.updateChatTitle);
        } else {
          setChatTabs([emptyTab()]);
          setVisibleChatIndex(0);
        }
        setChatsLoading(false);
        chatLoadedRef.current = true;
      } catch {
        if (!cancelled) {
          setChatTabs([emptyTab()]);
          setVisibleChatIndex(0);
          setChatsLoading(false);
          chatLoadedRef.current = true;
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [chatBackend, effectiveProjectPath]);
  const chatPersistence = (0, import_react.useMemo)(() => new ChatPersistence(chatBackend ?? null), [chatBackend]);
  const requestedChatTitles = (0, import_react.useRef)(new Set());
  const pendingChatTitles = (0, import_react.useRef)(new Set());
  const archivingChatIdsRef = (0, import_react.useRef)(new Set());
  (0, import_react.useEffect)(() => {
    const timer = setTimeout(() => {
      for (const tab_0 of chatTabs) if (tab_0.messages.length > 0) chatPersistence.save(tab_0).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [chatTabs, chatPersistence]);
  const handleNewChat = () => {
    const id_0 = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setChatTabs(prev_8 => [{
      id: id_0,
      title: null,
      createdAt: (new Date()).toISOString(),
      messages: []
    }, ...prev_8]);
    setVisibleChatIndex(0);
    revealChatPanel();
  };
  const handleSwitchChat = chatId => {
    const idx = chatTabs.findIndex(t => t.id === chatId);
    if (idx !== -1) {
      setVisibleChatIndex(idx);
      setUnreadChatIds(previous => {
        if (!previous.has(chatId)) return previous;
        const next_3 = new Set(previous);
        next_3.delete(chatId);
        return next_3;
      });
    }
  };
  const handleChatStreamStart = (0, import_react.useCallback)(chatId_0 => {
    setRunningChatIds(previous_0 => new Set(previous_0).add(chatId_0));
    setUnreadChatIds(previous_1 => {
      if (!previous_1.has(chatId_0)) return previous_1;
      const next_4 = new Set(previous_1);
      next_4.delete(chatId_0);
      return next_4;
    });
  }, []);
  const handleChatStreamFinish = (0, import_react.useCallback)(chatId_1 => {
    setRunningChatIds(previous_2 => {
      const next_5 = new Set(previous_2);
      next_5.delete(chatId_1);
      return next_5;
    });
    const visibleChat = chatTabsRef.current[visibleChatIndexRef.current];
    if (visibleChat?.id === chatId_1) {
      setFollowAi(false);
      writeFollowAiPreference(false);
    }
    if (visibleChat?.id !== chatId_1) setUnreadChatIds(previous_3 => new Set(previous_3).add(chatId_1));
  }, []);
  const applyChatMessages = (tabId, newMessages, currentTitle) => {
    const fallbackTitle = !currentTitle ? titleFromFirstUserMessage(newMessages) : null;
    setChatTabs(prev_9 => prev_9.map(t_0 => t_0.id === tabId ? {
      ...t_0,
      messages: newMessages,
      title: t_0.title ?? fallbackTitle
    } : t_0));
    const firstMessage = newMessages.find(message => message.role === "user");
    if (!currentTitle && firstMessage && chatBackend?.generateChatTitle && !requestedChatTitles.current.has(tabId)) {
      requestedChatTitles.current.add(tabId);
      pendingChatTitles.current.add(tabId);
      const fallback = titleFromFirstUserMessage(newMessages) || t("chat.newChat");
      chatBackend.generateChatTitle({
        message: firstMessage.content,
        context: firstMessage.inlineRefs?.map(ref => `${ref.type}: ${ref.displayName ?? ref.name}`) ?? []
      }).then(title => {
        if (!pendingChatTitles.current.delete(tabId)) return;
        const generatedTitle = title.trim() || fallback;
        setChatTabs(previous_4 => previous_4.map(tab_1 => tab_1.id === tabId ? {
          ...tab_1,
          title: generatedTitle,
          generatedTitle
        } : tab_1));
      }).catch(() => {
        pendingChatTitles.current.delete(tabId);
      });
    }
  };
  const handleRenameChat = (chatId_2, title_0) => {
    const tab_2 = chatTabsRef.current.find(item => item.id === chatId_2);
    const name_3 = title_0.trim().slice(0, 500);
    if (!tab_2 || !name_3) return;
    pendingChatTitles.current.delete(chatId_2);
    setChatTabs(previous_5 => previous_5.map(item_0 => item_0.id === chatId_2 ? {
      ...item_0,
      title: name_3,
      generatedTitle: void 0
    } : item_0));
    chatPersistence.rename(tab_2, name_3).catch(() => toast.error(t("shell.chatNameSaveFailed")));
  };
  const handleRestoreChat = async id_1 => {
    const restored = await chatPersistence.restore(id_1);
    setArchiveOpen(false);
    setChatHistoryOpen(false);
    const tab_3 = chatTabsFromList([restored])[0];
    setChatTabs(previous_6 => [tab_3, ...previous_6.filter(item_1 => chatPersistence.idFor(item_1.id) !== restored.id)]);
    setVisibleChatIndex(0);
  };
  const handleArchiveChat = async chatId_3 => {
    if (runningChatIds.has(chatId_3)) {
      toast.info(t("shell.stopBeforeArchive"));
      return;
    }
    if (archivingChatIdsRef.current.has(chatId_3)) return;
    const tab_4 = chatTabsRef.current.find(item_2 => item_2.id === chatId_3);
    if (!tab_4) return;
    archivingChatIdsRef.current.add(chatId_3);
    const emptyTab_0 = {
      id: `local-${crypto.randomUUID()}`,
      title: null,
      createdAt: (new Date()).toISOString(),
      messages: []
    };
    const current = chatTabsRef.current;
    const selected = current[visibleChatIndexRef.current]?.id;
    const remaining = current.filter(item_3 => item_3.id !== chatId_3);
    setChatTabs(previous_7 => {
      const next_6 = previous_7.filter(item_4 => item_4.id !== chatId_3);
      return next_6.length ? next_6 : [emptyTab_0];
    });
    setVisibleChatIndex(Math.max(0, remaining.findIndex(item_5 => item_5.id === selected)));
    setUnreadChatIds(previous_8 => {
      const next_7 = new Set(previous_8);
      next_7.delete(chatId_3);
      return next_7;
    });
    try {
      const id_2 = await chatPersistence.archive(tab_4);
      toast.success(t("shell.chatArchived"), {
        action: {
          label: t("shell.undo"),
          onClick: () => {
            handleRestoreChat(id_2).catch(() => toast.error(t("shell.restoreChatFailed")));
          }
        }
      });
    } catch (error) {
      setChatTabs(previous_9 => [tab_4, ...previous_9.filter(item_6 => item_6.id !== chatId_3 && item_6.id !== emptyTab_0.id)]);
      setVisibleChatIndex(0);
      toast.error(t("shell.archiveChatFailed"), error instanceof Error ? { description: error.message } : void 0);
    } finally {
      archivingChatIdsRef.current.delete(chatId_3);
    }
  };
  const handleArchiveAllChats = async () => {
    if (runningChatIds.size > 0) {
      toast.info(t("shell.stopBeforeArchiveAll"));
      return;
    }
    await Promise.all(chatTabsRef.current.map(tab_5 => handleArchiveChat(tab_5.id)));
    setVisibleChatIndex(0);
  };
  const hasHandledShareLinkRef = (0, import_react.useRef)(false);
  const selectedElementId = selectedElementIds.size === 1 ? Array.from(selectedElementIds)[0] : null;
  const [drilledParentId, setDrilledParentId] = (0, import_react.useState)(null);
  const selectedElementIdsRef = (0, import_react.useRef)(selectedElementIds);
  (0, import_react.useLayoutEffect)(() => {
    selectedElementIdsRef.current = selectedElementIds;
  });
  const applySelection = ids => {
    if (sameSelection(selectedElementIdsRef.current, ids)) return;
    selectedElementIdsRef.current = ids;
    setSelectedElementIds(ids);
  };
  /**
  * One level down, into whatever child sits under the cursor. Returns null
  * when there's nothing to descend into — the cursor is on the element's own
  * padding, or outside it entirely — so the caller can fall back to a plain
  * select.
  */
  const descendInto = (parentId, path) => resolveDescendTarget(storeRef.current, parentId, path);
  /**
  * A text leaf is the bottom of its branch and the only thing left to do with
  * it is type, so a descent that lands on one opens the editor rather than
  * costing another click. It is also the only way in for text that has no
  * text-like owner to hold the selection — a label inside a component — where
  * the leaf's own selection is what the editor waits on.
  */
  const editTextOnDescent = childId => {
    if (readOnly) return;
    if (getById(storeRef.current, childId)?.type === "text") setEditingTextId(childId);
  };
  const handleSelectElement = (id_3, addToSelection = false, altKey = false, click) => {
    if (altKey) return;
    if (id_3 === null) {
      applySelection(new Set());
      setDrilledParentId(null);
      return;
    }
    if (addToSelection) {
      if (click && isDescendClick(click)) for (const selectedId of selectedElementIdsRef.current) {
        const childId_0 = descendInto(selectedId, click.path);
        if (childId_0) {
          const next_8 = new Set(selectedElementIdsRef.current);
          next_8.delete(selectedId);
          next_8.add(resolveTextOwner(storeRef.current, childId_0));
          applySelection(next_8);
          setDrilledParentId(selectedId);
          editTextOnDescent(childId_0);
          return;
        }
      }
      setSelectedElementIds(prev_10 => {
        const next_9 = new Set(prev_10);
        if (next_9.has(id_3)) next_9.delete(id_3);else {
          const store = storeRef.current;
          const isDescendantOf = (childId_1, parentId_0) => {
            let currentId = childId_1;
            while (currentId) {
              const parentKey = getParentId(store, currentId);
              if (!parentKey || parentKey === "ROOT") return false;
              if (parentKey === parentId_0) return true;
              currentId = parentKey;
            }
            return false;
          };
          for (const selectedId_0 of Array.from(next_9)) {
            if (isDescendantOf(id_3, selectedId_0)) next_9.delete(selectedId_0);
            if (isDescendantOf(selectedId_0, id_3)) next_9.delete(selectedId_0);
          }
          next_9.add(id_3);
        }
        if (next_9.size === 0) next_9.add(id_3);
        return next_9;
      });
    } else {
      const current_0 = selectedElementIdsRef.current;
      if (click && isDescendClick(click) && current_0.size === 1) {
        const from = current_0.values().next().value;
        const childId_2 = descendInto(from, click.path);
        if (childId_2) {
          applySelection(new Set([resolveTextOwner(storeRef.current, childId_2)]));
          setDrilledParentId(from);
          editTextOnDescent(childId_2);
          return;
        }
      }
      applySelection(new Set([id_3]));
      const parentKey_0 = getParentId(storeRef.current, id_3);
      setDrilledParentId(parentKey_0 === "ROOT" || parentKey_0 === null ? null : parentKey_0);
    }
  };
  const handleSelectElements = ids_0 => {
    setSelectedElementIds(new Set(ids_0));
  };
  const [editingTextId, setEditingTextId] = (0, import_react.useState)(null);
  const activeTextEditorRef = (0, import_react.useRef)(null);
  const [textSelectionState, setTextSelectionState] = (0, import_react.useState)(null);
  const [showCreateComponentModal, setShowCreateComponentModal] = (0, import_react.useState)(false);
  const [canvasMenuTargetId, setCanvasMenuTargetId] = (0, import_react.useState)(null);
  const contextMenuPointRef = (0, import_react.useRef)(null);
  const canvasRef = (0, import_react.useRef)(null);
  const viewportRef = (0, import_react.useRef)(null);
  const lastPointerScreenRef = (0, import_react.useRef)({
    x: 0,
    y: 0,
    valid: false
  });
  const chatPanelRef = (0, import_react.useRef)(null);
  const handleSelectChatElement = (0, import_react.useCallback)(elementId_1 => {
    setSelectedElementIds(new Set([elementId_1]));
    setPendingElementToCenter(elementId_1);
  }, []);
  const addToPrompt = usePromptContextInsertion({
    loading: chatsLoading,
    visible: !chromeHidden && !archiveOpen && !chatHistoryOpen && (enableSidebarV2 ? sidebarV2Tab === "agents" : leftPanelTab === "chat"),
    chatCount: chatTabs.length,
    activeChatId: chatTabs[visibleChatIndex]?.id,
    panelRef: chatPanelRef,
    reveal: () => {
      setChromeHidden(false);
      revealChatPanel();
    },
    createChat: handleNewChat
  });
  const openHelpDraftInNewChat = (0, import_react.useCallback)(text => {
    revealChatPanel();
    const current_1 = chatTabsRef.current[visibleChatIndexRef.current];
    let targetId = current_1?.id;
    if (!current_1 || current_1.messages.length > 0) {
      const newId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      targetId = newId;
      setChatTabs(prev_11 => [{
        id: newId,
        title: null,
        createdAt: (new Date()).toISOString(),
        messages: []
      }, ...prev_11]);
      setVisibleChatIndex(0);
    }
    let attemptsLeft = 40;
    const trySetDraft = () => {
      const visibleTab = chatTabsRef.current[visibleChatIndexRef.current];
      if (chatPanelRef.current && visibleTab?.id === targetId) {
        chatPanelRef.current.setInputText(text);
        return;
      }
      attemptsLeft -= 1;
      if (attemptsLeft > 0) setTimeout(trySetDraft, 50);
    };
    setTimeout(trySetDraft, 0);
  }, [revealChatPanel]);
  const handledDraftIdRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (!externalChatDraft) return;
    if (handledDraftIdRef.current === externalChatDraft.id) return;
    handledDraftIdRef.current = externalChatDraft.id;
    openHelpDraftInNewChat(externalChatDraft.text);
  }, [externalChatDraft, openHelpDraftInNewChat]);
  const focusedChatOnMountRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    if (!focusChatOnMount || focusedChatOnMountRef.current) return;
    focusedChatOnMountRef.current = true;
    openHelpDraftInNewChat("");
  }, [focusChatOnMount, openHelpDraftInNewChat]);
  const handleAskAIForIconLibrary = () => {
    openHelpDraftInNewChat(t("chat.prompts.iconLibrarySetup"));
  };
  const handleImportDesignSystem = () => {
    openHelpDraftInNewChat(t("chat.prompts.importDesignSystem"));
  };
  const handleFixWithAI = (componentName, error_0) => {
    openHelpDraftInNewChat(t("chat.prompts.fixComponentError", { component: componentName, error: error_0 }));
  };
  const handleAskAIForStarterComponent = () => {
    revealChatPanel();
    chatPanelRef.current?.setInputText(t("chat.prompts.starterComponent"));
  };
  const handleAskAIForComposition = request => {
    const componentList = request.componentNames.length > 0 ? ` The scanner found these exports: ${request.componentNames.join(", ")}.` : "";
    const prompt = ["Use the bingo-compositions skill.", `Read ${request.componentFilePath} and create or update its paired composition sidecar at ${request.compositionFilePath}.`, `${componentList} Create useful, valid static JSX composition exports based on the real component API.`, "Write the composition file to the Bingo project and then stop. Bingo will validate it and add the first composition to the current canvas automatically."].join(" ");
    revealChatPanel();
    requestAnimationFrame(() => chatPanelRef.current?.sendMessage(prompt));
  };
  const handleSaveToCode = async (prompt_0, changes, sourceUrl, componentNames, capturedElementId, projectRoot) => {
    if (sourceUrl && componentNames && capturedElementId) {
      let screenshotDataUrl;
      try {
        const el = document.querySelector(`[data-element-id="${capturedElementId}"]`);
        if (el) screenshotDataUrl = await captureSaveToCodeScreenshot(el);
      } catch {}
      const editSession = getComponentEditSession(capturedElementId);
      const componentEdit = editSession ? {
        componentName: editSession.original.componentName,
        path: editSession.sourceInfo?.filePath || "",
        propsJson: JSON.stringify(editSession.original.props ?? {})
      } : void 0;
      chatPanelRef.current?.setSaveToCodePrompt(changes || [], sourceUrl, componentNames, capturedElementId, activePageIdRef.current || void 0, screenshotDataUrl, projectRoot, componentEdit);
    } else chatPanelRef.current?.setInputText(prompt_0);
    revealChatPanel();
  };
  const activePageIdRef = (0, import_react.useRef)("");
  const handleCommentClick = (canvasX, canvasY, screenX, screenY) => {
    setPendingCommentPosition({
      canvasX,
      canvasY,
      screenX,
      screenY
    });
    setActiveCommentId(null);
  };
  const handleCommentSubmit = (body, attachments) => {
    if (!pendingCommentPosition || !onCreateComment) return;
    onCreateComment({
      body,
      canvasX: Math.round(pendingCommentPosition.canvasX),
      canvasY: Math.round(pendingCommentPosition.canvasY),
      pageId: activePageIdRef.current,
      ...(attachments?.length ? {
        attachments
      } : {})
    });
    setPendingCommentPosition(null);
  };
  const handleCommentReply = body_0 => {
    if (!activeCommentId || !onCreateReply) return;
    onCreateReply({
      body: body_0,
      parentId: activeCommentId,
      pageId: activePageIdRef.current
    });
  };
  const handleSelectComment = commentId => {
    const next_10 = activeCommentId === commentId ? null : commentId;
    setActiveCommentId(next_10);
    onActiveCommentChange?.(next_10);
    setPendingCommentPosition(null);
  };
  useGlobalShortcut("exitCommentMode", () => {
    setCommentMode(false);
    setPendingCommentPosition(null);
    setActiveCommentId(null);
  }, commentMode);
  useGlobalShortcut("toggleCommentMode", e_1 => {
    if (isTypingTarget(e_1)) return;
    setCommentMode(!commentMode);
  }, showCommentTools);
  const tabTransformsRef = (0, import_react.useRef)({});
  const transformSaveTimerRef = (0, import_react.useRef)(null);
  const initialTransformClearRef = (0, import_react.useRef)(null);
  const [cameraReadyTabId, setCameraReadyTabId] = (0, import_react.useState)(null);
  const hasResolvedFirstCameraRef = (0, import_react.useRef)(false);
  const fitFrameRef = (0, import_react.useRef)(null);
  const fitGenerationRef = (0, import_react.useRef)(0);
  const fitInFlightTabIdRef = (0, import_react.useRef)(null);
  const lateRefitRef = (0, import_react.useRef)(null);
  const lateRefitTimerRef = (0, import_react.useRef)(null);
  const lateRefitUnsubRef = (0, import_react.useRef)(null);
  const [initialCanvasTransform, setInitialCanvasTransform] = (0, import_react.useState)(void 0);
  const [pageCamera, setPageCamera] = (0, import_react.useState)(void 0);
  const [transformKey, setTransformKey] = (0, import_react.useState)(0);
  const stageCanvasCamera = (camera, tabId_0) => {
    publishCamera(camera);
    tabTransformsRef.current[tabId_0] = camera;
    setInitialCanvasTransform(camera);
    setTransformKey(k => k + 1);
    if (initialTransformClearRef.current) clearTimeout(initialTransformClearRef.current);
    initialTransformClearRef.current = setTimeout(() => {
      setInitialCanvasTransform(void 0);
      initialTransformClearRef.current = null;
    }, 100);
  };
  const handleFocusElement = elementId_2 => {
    setPendingElementToCenter(elementId_2);
  };
  const [pages, setPages] = (0, import_react.useState)(() => {
    if (initialPages && initialPages.length > 0) return initialPages.map(p => ({
      id: p.id,
      name: p.name,
      elementCount: countCanvasElements(p.elements)
    }));
    return [{
      id: "canvas-1",
      name: "Page 1"
    }];
  });
  const [activeTabId, setActiveTabId] = (0, import_react.useState)(() => resolveInitialActivePageId(initialPages, projectPath));
  (0, import_react.useLayoutEffect)(() => {
    setPageCamera(tabTransformsRef.current[activeTabId]);
  }, [activeTabId]);
  const [tabs, setTabs] = (0, import_react.useState)(() => buildInitialTabs(initialPages, activeTabId, initialElements));
  const [pagesReady, setPagesReady] = (0, import_react.useState)(() => !!(initialElements || initialPages));
  const boundsKeyOf = bounds => bounds ? `${bounds.x},${bounds.y},${bounds.width},${bounds.height}` : "";
  /**
  * The canvas toolbar floats over the viewport, so padding to the raw bottom
  * edge tucks content underneath it whenever height is the binding axis.
  * Inset past whatever chrome is actually mounted.
  */
  const fitCameraFor = (bounds_0, viewport) => {
    const chrome = viewportRef.current?.querySelector("[data-canvas-bottom-chrome]")?.getBoundingClientRect();
    return cameraToFitRect(bounds_0, viewport, {
      padding: {
        top: 32,
        right: 32,
        bottom: chrome && chrome.height > 0 ? Math.max(32, viewport.bottom - chrome.top + 16) : 32,
        left: 32
      }
    });
  };
  const cancelLateRefit = () => {
    if (lateRefitTimerRef.current) clearInterval(lateRefitTimerRef.current);
    lateRefitTimerRef.current = null;
    lateRefitUnsubRef.current?.();
    lateRefitUnsubRef.current = null;
    lateRefitRef.current = null;
  };
  const lateRefitTick = startedAt => {
    if (!lateRefitRef.current) return cancelLateRefit();
    if (performance.now() - startedAt > LATE_REFIT_WINDOW_MS) return cancelLateRefit();
    const viewport_0 = viewportRef.current?.getBoundingClientRect();
    if (!viewport_0 || viewport_0.width < 8 || viewport_0.height < 8) return;
    if (!rootContentSettled()) return;
    const bounds_1 = measuredRootBounds();
    if (!bounds_1) return;
    const tabId_1 = lateRefitRef.current.tabId;
    const camera_0 = fitCameraFor(bounds_1, viewport_0);
    const live = getCamera();
    const moved = !!camera_0 && (Math.abs(camera_0.positionX - live.positionX) > LATE_REFIT_MIN_DELTA || Math.abs(camera_0.positionY - live.positionY) > LATE_REFIT_MIN_DELTA || Math.abs(camera_0.scale - live.scale) > .001);
    if (camera_0 && moved) {
      tabTransformsRef.current[tabId_1] = camera_0;
      driveCamera(camera_0, LATE_REFIT_MS);
    }
    cancelLateRefit();
  };
  const armLateRefit = () => {
    if (!lateRefitRef.current || lateRefitTimerRef.current) return;
    const startedAt_0 = performance.now();
    lateRefitUnsubRef.current = subscribeUserCameraGesture(() => cancelLateRefit());
    lateRefitTimerRef.current = setInterval(() => lateRefitTick(startedAt_0), LATE_REFIT_POLL_MS);
  };
  const cancelPendingFit = () => {
    if (fitFrameRef.current !== null) cancelAnimationFrame(fitFrameRef.current);
    fitFrameRef.current = null;
    fitInFlightTabIdRef.current = null;
    cancelLateRefit();
  };
  const markCameraReady = tabId_2 => {
    fitInFlightTabIdRef.current = null;
    hasResolvedFirstCameraRef.current = true;
    setCameraReadyTabId(tabId_2);
  };
  /**
  * Fit the canvas to the frames that exist, or restore the camera you left on
  * this page. Opening a file always fits: a stored camera can point at frames
  * that have since moved, and most opens have no stored camera at all. Only a
  * later page switch restores.
  *
  * Runs after the tab's elements land, and measures on the next frame so the
  * roots have laid out — `getCanvasSpaceRect` reads offset boxes, which are
  * valid while the canvas is hidden but zero before it has been laid out.
  */
  const resolveCameraForTab = (0, import_react.useEffectEvent)(tabId_3 => {
    const tab_6 = tabs.find(t_1 => t_1.id === tabId_3);
    if (!tab_6) return;
    cancelPendingFit();
    const generation = ++fitGenerationRef.current;
    fitInFlightTabIdRef.current = tabId_3;
    const restored_0 = hasResolvedFirstCameraRef.current ? tabTransformsRef.current[tabId_3] ?? readCamera(projectPath ?? "", tabId_3) : null;
    if (restored_0) {
      tabTransformsRef.current[tabId_3] = restored_0;
      driveCamera(restored_0, 0);
      markCameraReady(tabId_3);
      return;
    }
    if (getRootIds(tab_6.store).length === 0) {
      markCameraReady(tabId_3);
      return;
    }
    const deadline = performance.now() + FIT_SETTLE_TIMEOUT_MS;
    let lastBoundsKey = "";
    let stableFrames = 0;
    const measureAndFit = () => {
      fitFrameRef.current = null;
      if (generation !== fitGenerationRef.current) return;
      const viewport_1 = viewportRef.current?.getBoundingClientRect();
      const bounds_2 = !!viewport_1 && viewport_1.width >= 8 && viewport_1.height >= 8 ? unionFollowRects(occupiedRootBoxes(tab_6.store)) : null;
      const boundsKey = boundsKeyOf(bounds_2);
      stableFrames = boundsKey !== "" && boundsKey === lastBoundsKey ? stableFrames + 1 : 0;
      lastBoundsKey = boundsKey;
      const settled = !!bounds_2 && rootContentSettled() && stableFrames >= FIT_STABLE_FRAMES;
      if (!settled && performance.now() < deadline) {
        fitFrameRef.current = requestAnimationFrame(measureAndFit);
        return;
      }
      const camera_1 = bounds_2 && viewport_1 ? fitCameraFor(bounds_2, viewport_1) : null;
      if (!settled) lateRefitRef.current = {
        tabId: tabId_3
      };
      if (camera_1) {
        tabTransformsRef.current[tabId_3] = camera_1;
        driveCamera(camera_1, 0);
      }
      markCameraReady(tabId_3);
      armLateRefit();
    };
    fitFrameRef.current = requestAnimationFrame(measureAndFit);
  });
  (0, import_react.useEffect)(() => {
    if (cameraReadyTabId === activeTabId) return;
    if (protoMode) return;
    if (elementParam) return;
    if (activeTabId === "canvas-1" && !pagesReady) return;
    if (fitInFlightTabIdRef.current === activeTabId) return;
    if (!tabs.find(t_2 => t_2.id === activeTabId)?.loaded) return;
    resolveCameraForTab(activeTabId);
  }, [tabs, activeTabId, cameraReadyTabId, elementParam, pagesReady, protoMode]);
  (0, import_react.useEffect)(() => () => {
    if (fitFrameRef.current !== null) cancelAnimationFrame(fitFrameRef.current);
    if (lateRefitTimerRef.current) clearInterval(lateRefitTimerRef.current);
    lateRefitUnsubRef.current?.();
  }, []);
  const canvasCameraPending = !protoMode && !elementParam && cameraReadyTabId !== activeTabId;
  const [focusedComponent, setFocusedComponent] = (0, import_react.useState)();
  const activeTab = tabs.find(t_3 => t_3.id === activeTabId);
  const activePageId = activeTab?.canvasId || activeTabId;
  const pageBackgroundByCanvasRef = (0, import_react.useRef)(new Map());
  (0, import_react.useLayoutEffect)(() => {
    for (const tab_8 of tabs) if (tab_8.canvasId) pageBackgroundByCanvasRef.current.set(tab_8.canvasId, {
      color: tab_8.backgroundColor,
      token: tab_8.backgroundToken
    });
  });
  (0, import_react.useLayoutEffect)(() => {
    activePageIdRef.current = activePageId;
  });
  (0, import_react.useEffect)(() => {
    onSelectionChange?.(selectedElementId, activePageId);
  }, [selectedElementId, activePageId, onSelectionChange]);
  const copySelectionLink = async (elementId_3 = selectedElementId) => {
    if (!elementId_3 || !onCopySelectionLink) return;
    const pageId = activePageId || null;
    try {
      await onCopySelectionLink(elementId_3, pageId);
    } catch {
      toast.error(t("shell.copyLinkFailed"));
    }
  };
  const activeTabIdRef = (0, import_react.useRef)(activeTabId);
  (0, import_react.useLayoutEffect)(() => {
    activeTabIdRef.current = activeTabId;
  });
  const persistCamera = (0, import_react.useEffectEvent)(t_4 => {
    if (canvasCameraPending) return;
    tabTransformsRef.current[activeTabId] = t_4;
    if (activeTabId === "canvas-1") return;
    if (!projectPath) return;
    if (transformSaveTimerRef.current) clearTimeout(transformSaveTimerRef.current);
    transformSaveTimerRef.current = setTimeout(() => {
      writeCamera(projectPath, activeTabId, t_4);
    }, 150);
  });
  (0, import_react.useEffect)(() => {
    return subscribeCamera(t_5 => persistCamera(t_5));
  }, []);
  (0, import_react.useEffect)(() => () => {
    if (transformSaveTimerRef.current) clearTimeout(transformSaveTimerRef.current);
    if (initialTransformClearRef.current) clearTimeout(initialTransformClearRef.current);
  }, []);
  const {
    listFileVersions,
    restoreFileVersion,
    saveFile
  } = useBackendActions();
  const {
    createPage,
    deletePage,
    reorderPages,
    saveCanvas,
    savePreview,
    loadCanvas,
    listCanvases,
    createComponent
  } = useCanvasPersistence();
  const onActivityRef = (0, import_react.useRef)(onActivity);
  (0, import_react.useEffect)(() => {
    onActivityRef.current = onActivity;
  }, [onActivity]);
  const canvasEditBatchRef = (0, import_react.useRef)({
    edits: 0,
    pageId: "",
    window: null
  });
  const noteCanvasEdit = pageId_0 => {
    const batch = canvasEditBatchRef.current;
    batch.pageId = pageId_0;
    if (batch.window) {
      batch.edits += 1;
      return;
    }
    onActivityRef.current?.({
      type: "canvas_edited",
      pageId: pageId_0,
      edits: 1
    });
    const closeWindow = () => {
      if (batch.edits === 0) {
        batch.window = null;
        return;
      }
      onActivityRef.current?.({
        type: "canvas_edited",
        pageId: batch.pageId,
        edits: batch.edits
      });
      batch.edits = 0;
      batch.window = setTimeout(closeWindow, CANVAS_EDIT_THROTTLE_MS);
    };
    batch.window = setTimeout(closeWindow, CANVAS_EDIT_THROTTLE_MS);
  };
  (0, import_react.useEffect)(() => () => {
    const batch_0 = canvasEditBatchRef.current;
    if (batch_0.window) clearTimeout(batch_0.window);
  }, []);
  const populatedPageIdsRef = (0, import_react.useRef)(new Set());
  const history = useTabHistory({
    maxHistory: 50,
    normalizeOps: (storeAfter, ops) => {
      const flowPositionExtra = normalizeFlowLayoutChildrenOps(storeAfter, ops);
      const afterFlowPosition = flowPositionExtra.length > 0 ? applyOperationsToStore(storeAfter, flowPositionExtra) : storeAfter;
      const flexExtra = normalizeFlexShrinkOps(afterFlowPosition, ops);
      const mapExtra = expandLinkedMapOps(flexExtra.length > 0 ? applyOperationsToStore(afterFlowPosition, flexExtra) : afterFlowPosition, ops);
      return [...flowPositionExtra, ...flexExtra, ...mapExtra];
    },
    onOperation: (ops_0, postOpStore, direction, tabId_4, source) => {
      if (isHumanCanvasCommit(direction, source) && tabId_4) noteCanvasEdit(tabId_4);
      if (direction === "do" || direction === "redo") for (const op of ops_0) recordOperation(op, postOpStore);else if (direction === "undo") for (let i_0 = ops_0.length - 1; i_0 >= 0; i_0--) popOperation(ops_0[i_0]);
    }
  });
  const [savingComponentEditIds, setSavingComponentEditIds] = (0, import_react.useState)(() => new Set());
  const [showVersionHistory, setShowVersionHistory] = (0, import_react.useState)(false);
  const loadAllPages = (0, import_react.useEffectEvent)(async () => {
    const listResult = await listCanvases();
    if (!listResult.success) { toast.error(listResult.error || t("shell.pageSaveFailed")); return; }
    if (listResult.success && listResult.canvases && listResult.canvases.length > 0) {
      const sortedCanvases = listResult.canvases;
      setPages(sortedCanvases.map(c => ({
        id: c.id,
        name: c.name || c.id,
        elementCount: countCanvasElements(c.elements)
      })));
      for (const c_0 of sortedCanvases) if (countCanvasRoots(c_0.elements) >= POPULATED_PAGE_ROOT_COUNT) populatedPageIdsRef.current.add(c_0.id);
      let savedPage = null;
      try {
        savedPage = localStorage.getItem(`bingo-active-page:${projectPath ?? "local"}`);
      } catch {}
      const targetPageId = pageParam && sortedCanvases.some(c_2 => c_2.id === pageParam) ? pageParam : savedPage && sortedCanvases.some(c_1 => c_1.id === savedPage) ? savedPage : sortedCanvases[0].id;
      const canvasTabs = sortedCanvases.map(c_3 => {
        const isActive = c_3.id === targetPageId;
        const elements = isActive ? c_3.elements ?? [] : [];
        const store_0 = ensureV2(elements);
        return {
          id: c_3.id,
          name: c_3.name || c_3.id,
          canvasId: c_3.id,
          canvasPath: `.bingo/canvases/${c_3.id}/`,
          store: store_0,
          loaded: isActive,
          lastSavedState: isActive ? JSON.stringify({
            elements
          }) : void 0,
          backgroundColor: c_3.backgroundColor,
          backgroundToken: c_3.backgroundToken
        };
      });
      setTabs(canvasTabs);
      setActiveTabId(targetPageId);
    } else if (chatBackend) {
      const created = await createPage({
        name: "Page 1",
        sortOrder: 0,
        canvas: {
          elements: [],
          zoom: 1,
          pan: {
            x: 0,
            y: 0
          }
        }
      });
      if (created.success) {
        const newId_0 = String(created.page?.id ?? created.id);
        setPages([{
          id: newId_0,
          name: "Page 1",
          elementCount: 0
        }]);
        setTabs([{
          id: newId_0,
          name: "Page 1",
          canvasId: newId_0,
          canvasPath: `.bingo/canvases/${newId_0}/`,
          store: emptyStore(),
          loaded: true,
          lastSavedState: JSON.stringify({
            elements: []
          })
        }]);
        setActiveTabId(newId_0);
        try {
          localStorage.setItem(`bingo-active-page:${projectPath ?? "local"}`, newId_0);
        } catch {}
      } else console.error("[loadAllPages] Failed to create initial page:", created.error);
    } else {
      const result = await loadCanvas("canvas-1");
      const elements_0 = result.success && result.canvas ? result.canvas.elements ?? [] : [];
      setTabs(prev_12 => prev_12.map(tab_9 => tab_9.id === "canvas-1" ? {
        ...tab_9,
        store: ensureV2(elements_0),
        loaded: true,
        lastSavedState: JSON.stringify({
          elements: elements_0
        })
      } : tab_9));
    }
  });
  (0, import_react.useEffect)(() => {
    if (initialElements || initialPages) return;
    loadAllPages().then(() => setPagesReady(true));
  }, [initialElements, initialPages]);
  const [isPageLoading, setIsPageLoading] = (0, import_react.useState)(false);
  const pageLoadIdRef = (0, import_react.useRef)(0);
  const handleSelectPage = async pageId_1 => {
    if (pageId_1 === activePageId && tabs.some(tab => tab.canvasId === pageId_1 && tab.loaded)) return;
    const loadId = ++pageLoadIdRef.current;
    setActiveTabId(pageId_1);
    setSelectedElementIds(new Set());
    setDrilledParentId(null);
    try {
      localStorage.setItem(`bingo-active-page:${projectPath ?? "local"}`, pageId_1);
    } catch {}
    const existingTab = tabs.find(t_6 => t_6.canvasId === pageId_1);
    if (existingTab?.loaded) {
      setIsPageLoading(false);
      onEnsureComponentNames?.(liveCanvasComponentNames(existingTab.store));
      return;
    }
    setIsPageLoading(true);
    const result_0 = await loadCanvas(pageId_1);
    if (loadId !== pageLoadIdRef.current) return;
    if (!result_0.success || !result_0.canvas) {
      setIsPageLoading(false);
      toast.error(result_0.error || t("shell.pageSaveFailed"));
      return;
    }
    const newElements = result_0.success && result_0.canvas ? result_0.canvas.elements ?? [] : [];
    const newStore = ensureV2(newElements);
    setTabs(prev_13 => prev_13.map(tab_10 => tab_10.canvasId === pageId_1 ? {
      ...tab_10,
      store: newStore,
      loaded: true,
      lastSavedState: JSON.stringify({
        elements: newElements
      })
    } : tab_10));
    setIsPageLoading(false);
    onEnsureComponentNames?.(liveCanvasComponentNames(newStore));
  };
  const selectPageFromUrl = (0, import_react.useEffectEvent)(handleSelectPage);
  const handleCreatePage = async () => {
    const newName = t("pages.defaultName", { number: pages.length + 1 });
    const result_1 = await createPage({
      name: newName,
      sortOrder: pages.length,
      canvas: {
        elements: [],
        zoom: 1,
        pan: {
          x: 0,
          y: 0
        }
      }
    });
    if (!result_1.success) {
      console.error("[CreatePage] Failed:", result_1.error);
      return;
    }
    const newId_1 = String(result_1.page?.id ?? result_1.id);
    const newPage = {
      id: newId_1,
      name: newName,
      elementCount: 0
    };
    setPages(prev_14 => [...prev_14, newPage]);
    setTabs(prev_15 => [...prev_15, {
      id: newId_1,
      name: newName,
      canvasId: newId_1,
      canvasPath: `.bingo/canvases/${newId_1}/`,
      store: emptyStore(),
      loaded: true,
      lastSavedState: JSON.stringify({
        elements: []
      })
    }]);
    setActiveTabId(newId_1);
    setSelectedElementIds(new Set());
    setDrilledParentId(null);
    try {
      localStorage.setItem(`bingo-active-page:${projectPath ?? "local"}`, newId_1);
    } catch {}
  };
  const createCanvasPage = async name_4 => {
    const result_2 = await createPage({
      name: name_4,
      sortOrder: pages.length,
      canvas: {
        elements: [],
        zoom: 1,
        pan: {
          x: 0,
          y: 0
        }
      }
    });
    if (!result_2.success) return {
      success: false,
      error: result_2.error || "Failed to create page"
    };
    const newId_2 = String(result_2.page?.id ?? result_2.id);
    setPages(prev_16 => [...prev_16, {
      id: newId_2,
      name: name_4,
      elementCount: 0
    }]);
    setTabs(prev_17 => [...prev_17, {
      id: newId_2,
      name: name_4,
      canvasId: newId_2,
      canvasPath: `.bingo/canvases/${newId_2}/`,
      store: emptyStore(),
      loaded: true,
      lastSavedState: JSON.stringify({
        elements: []
      })
    }]);
    setActiveTabId(newId_2);
    setSelectedElementIds(new Set());
    setDrilledParentId(null);
    try {
      localStorage.setItem(`bingo-active-page:${projectPath ?? "local"}`, newId_2);
    } catch {}
    return {
      success: true,
      id: newId_2,
      name: name_4
    };
  };
  const handleRenamePage = async (pageId_2, newName_0) => {
    const tab = tabs.find(item => item.canvasId === pageId_2);
    if (tab && !tab.loaded) {
      const loaded = await loadCanvas(pageId_2);
      if (!loaded.success || !loaded.canvas) { toast.error(loaded.error || t("shell.pageSaveFailed")); return; }
      setTabs(current => current.map(item => item.canvasId === pageId_2 && !item.loaded
        ? { ...item, store: ensureV2(loaded.canvas.elements ?? []), loaded: true } : item));
    }
    setPages(prev_18 => prev_18.map(p_0 => p_0.id === pageId_2 ? {
      ...p_0,
      name: newName_0
    } : p_0));
    setTabs(prev_19 => prev_19.map(tab_11 => tab_11.canvasId === pageId_2 ? {
      ...tab_11,
      name: newName_0
    } : tab_11));
  };
  const handleSetPageBackground = (color, token) => {
    if (readOnly) return;
    const tab_12 = tabs.find(t_8 => t_8.canvasId === activePageId);
    if (!tab_12?.canvasId || !tab_12.loaded) return;
    pageBackgroundByCanvasRef.current.set(tab_12.canvasId, {
      color,
      token
    });
    setTabs(prev_20 => prev_20.map(t_9 => t_9.canvasId === tab_12.canvasId ? {
      ...t_9,
      backgroundColor: color,
      backgroundToken: token
    } : t_9));
  };
  const handleDeletePage = async pageId_3 => {
    if (pages.length <= 1) return;
    const newPages = pages.filter(p_2 => p_2.id !== pageId_3);
    setPages(newPages);
    setTabs(prev_21 => prev_21.filter(t_10 => t_10.canvasId !== pageId_3));
    history.clearHistory(pageId_3);
    if (pageId_3 === activePageId) {
      const nextPage = newPages[0];
      if (nextPage) {
        setActiveTabId(nextPage.id);
        try {
          localStorage.setItem(`bingo-active-page:${projectPath ?? "local"}`, nextPage.id);
        } catch {}
      }
    }
    await canvasSaveQueue.remove(pageId_3);
    deletePage(pageId_3).catch(() => {});
  };
  const handleReorderPages = reorderedPages => {
    setPages(reorderedPages);
    const order = reorderedPages.map((p_3, i_1) => ({
      id: p_3.id,
      sortOrder: i_1
    }));
    reorderPages(order).catch(() => {});
  };
  (0, import_react.useEffect)(() => {
    if (hasHandledShareLinkRef.current) return;
    if (!elementParam) return;
    if (!pagesReady) return;
    if (pageParam && pageParam !== activePageId) {
      if (pages.some(p_4 => p_4.id === pageParam)) {
        hasHandledShareLinkRef.current = true;
        selectPageFromUrl(pageParam).then(() => {
          setPendingElementToCenter(elementParam);
        });
        return;
      }
    }
    hasHandledShareLinkRef.current = true;
    setPendingElementToCenter(elementParam);
  }, [elementParam, pageParam, activePageId, pages, pagesReady]);
  const hasHandledCommentLinkRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    if (hasHandledCommentLinkRef.current) return;
    if (!commentParam) return;
    if (!pagesReady) return;
    if (pageParam && pageParam !== activePageId) {
      if (pages.some(p_5 => p_5.id === pageParam)) {
        hasHandledCommentLinkRef.current = true;
        selectPageFromUrl(pageParam).then(() => {
          setActiveCommentId(commentParam);
          onActiveCommentChange?.(commentParam);
        });
        return;
      }
    }
    hasHandledCommentLinkRef.current = true;
    setActiveCommentId(commentParam);
    onActiveCommentChange?.(commentParam);
  }, [commentParam, pageParam, activePageId, pages, pagesReady, onActiveCommentChange]);
  (0, import_react.useEffect)(() => {
    if (!pendingElementToCenter) return;
    const targetId_0 = pendingElementToCenter;
    const targetStore = tabs.find(t_11 => t_11.id === activeTabId)?.store ?? EMPTY_STORE;
    const target = getById(targetStore, targetId_0);
    const findCanvasPos = id_4 => {
      let current_2 = id_4;
      while (current_2) {
        const el_0 = getById(targetStore, current_2);
        if (el_0?.canvasPosition) return el_0.canvasPosition;
        const parentKey_1 = getParentId(targetStore, current_2);
        current_2 = parentKey_1 === "ROOT" || parentKey_1 === null ? null : parentKey_1;
      }
      return null;
    };
    const canvasPosResolved = target ? findCanvasPos(targetId_0) : null;
    const result_4 = target && canvasPosResolved ? {
      element: target,
      canvasPos: canvasPosResolved
    } : null;
    if (!result_4) return;
    setSelectedElementIds(new Set([targetId_0]));
    const {
      element,
      canvasPos
    } = result_4;
    const viewportRect = viewportRef.current?.getBoundingClientRect();
    const viewportWidth = viewportRect?.width || window.innerWidth - 520;
    let viewportHeight = viewportRect?.height || window.innerHeight - 120;
    if (viewportHeight > 1500) viewportHeight = window.innerHeight - 120;
    const rect = getCanvasSpaceRect(targetId_0);
    const scale = rect ? getCamera().scale || 1 : 1;
    const stylesWidth = element.styles?.width;
    const stylesHeight = element.styles?.height;
    const elementWidth = typeof stylesWidth === "number" ? stylesWidth : 200;
    const elementHeight = typeof stylesHeight === "number" ? stylesHeight : 200;
    const centerX = rect ? rect.x + rect.width / 2 : canvasPos.x + elementWidth / 2;
    const centerY = rect ? rect.y + rect.height / 2 : canvasPos.y + elementHeight / 2;
    const newTransform = {
      scale,
      positionX: viewportWidth / 2 - centerX * scale,
      positionY: viewportHeight / 2 - centerY * scale
    };
    stageCanvasCamera(newTransform, activeTabId);
    setPendingElementToCenter(null);
  }, [pendingElementToCenter, tabs, activeTabId]);
  const mergedComponentIndex = componentIndex;
  const openComponentFile = (componentName_0, filePath_2) => {
    const resolvedPath = filePath_2 ?? mergedComponentIndex[componentName_0]?.path;
    if (!resolvedPath) return;
    setChromeHidden(false);
    setBottomBarRevealSignal(n_0 => n_0 + 1);
    setFocusedComponent({
      name: componentName_0,
      filePath: resolvedPath
    });
    openFileInBottomBar(resolvedPath, {
      componentName: componentName_0
    });
  };
  const openNewComponentFile = (0, import_react.useCallback)(() => {
    const existingPaths = new Set([...Object.values(mergedComponentIndex).map(entry => entry.path), ...openCodeFilesRef.current.map(file => file.path)]);
    let suffix = 1;
    let componentName_1 = "NewComponent";
    let filePath_3 = `components/${componentName_1}.tsx`;
    while (existingPaths.has(filePath_3)) {
      suffix += 1;
      componentName_1 = `NewComponent${suffix}`;
      filePath_3 = `components/${componentName_1}.tsx`;
    }
    const content_4 = `export function ${componentName_1}() {\n  return <div />\n}\n`;
    setChromeHidden(false);
    setBottomBarRevealSignal(signal_0 => signal_0 + 1);
    setOpenCodeFiles(files_0 => [...files_0, {
      path: filePath_3,
      content: content_4,
      componentName: componentName_1
    }]);
    fileOpenCountRef.current += 1;
    setFileOpenSignal({
      path: filePath_3,
      n: fileOpenCountRef.current
    });
  }, [mergedComponentIndex]);
  const currentStore = activeTab?.store ?? EMPTY_STORE;
  (0, import_react.useEffect)(() => {
    storeRef.current = currentStore;
  }, [currentStore]);
  const canvasComponentNames = liveCanvasComponentNames(currentStore);
  const canvasComponentKey = canvasComponentNames.join("\0");
  const canvasComponentKeyRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (!onEnsureComponentNames) return;
    if (canvasComponentKeyRef.current === canvasComponentKey) return;
    canvasComponentKeyRef.current = canvasComponentKey;
    if (canvasComponentKey === "") return;
    onEnsureComponentNames(canvasComponentNames);
  }, [canvasComponentKey, canvasComponentNames, onEnsureComponentNames]);
  const fitCanvasTargets = (0, import_react.useEffectEvent)((targetIds, padding = "viewport") => {
    const union = unionFollowRects(outermostChatWorkIds(currentStore, targetIds).flatMap(id_5 => {
      const el_1 = getById(currentStore, id_5);
      const rect_0 = followRectForTarget({
        measured: getCanvasSpaceRect(id_5),
        canvasX: el_1?.canvasPosition?.x,
        canvasY: el_1?.canvasPosition?.y,
        styleWidth: typeof el_1?.styles?.width === "number" ? el_1.styles.width : void 0,
        styleHeight: typeof el_1?.styles?.height === "number" ? el_1.styles.height : void 0
      });
      return rect_0 ? [rect_0] : [];
    }));
    if (!union) return false;
    const viewport_2 = viewportRef.current?.getBoundingClientRect();
    if (!viewport_2 || viewport_2.width < 8 || viewport_2.height < 8) return false;
    const next_11 = cameraToFitFollowRect(union, {
      width: viewport_2.width,
      height: viewport_2.height
    }, getCamera(), padding === "fixed" ? 60 : {
      x: viewport_2.width * .1,
      y: viewport_2.height * .1
    });
    if (next_11) driveCamera(next_11, FOLLOW_AI_CAMERA_MS);
    return true;
  });
  const fitToFollowAi = (0, import_react.useEffectEvent)(() => {
    if (!followAi) return;
    const activeChat = chatTabs[visibleChatIndex];
    if (!activeChat) return;
    let targetIds_0 = followTargetIds(currentStore, elementLockOwners, activeChat.id);
    if (targetIds_0.length === 0) {
      const write = getAiWriteTarget();
      if (write?.chatId === activeChat.id) targetIds_0 = instanceIdsForComponentNames(currentStore, componentNamesForWritePath(write.path, componentIndex));
    }
    fitCanvasTargets(targetIds_0);
  });
  const turnOffFollowAi = (0, import_react.useEffectEvent)(() => persistFollowAi(false));
  (0, import_react.useEffect)(() => {
    return subscribeUserCameraGesture(() => turnOffFollowAi());
  }, []);
  const followedChatId = chatTabs[visibleChatIndex]?.id;
  const followingAi = followAi && !!followedChatId && runningChatIds.has(followedChatId);
  (0, import_react.useEffect)(() => {
    if (!followingAi) return;
    fitToFollowAi();
    const intervalId = window.setInterval(fitToFollowAi, FOLLOW_AI_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [followingAi, followedChatId]);
  const handleFocusLastChatResult = chatId_4 => {
    persistFollowAi(false);
    const chat_0 = chatTabs.find(tab_13 => tab_13.id === chatId_4);
    const orderedTabs = [...tabs.filter(tab_14 => tab_14.id === activeTabId), ...tabs.filter(tab_15 => tab_15.id !== activeTabId)];
    const target_0 = chat_0 && lastChatWorkTarget(chat_0.messages, orderedTabs, componentIndex);
    if (!target_0) {
      toast.info(t("shell.noCanvasResult"));
      return;
    }
    setPendingElementToCenter(null);
    setPendingChatWorkTarget(target_0);
    if (target_0.tabId !== activeTabId) handleSelectPage(target_0.tabId);
  };
  (0, import_react.useEffect)(() => {
    if (!pendingChatWorkTarget || pendingChatWorkTarget.tabId !== activeTabId || !activeTab?.loaded) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        fitCanvasTargets(pendingChatWorkTarget.elementIds, "fixed");
        setPendingChatWorkTarget(null);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingChatWorkTarget, activeTabId, activeTab?.loaded]);
  const reconciledTabRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (reconciledTabRef.current === activeTabId) return;
    reconciledTabRef.current = activeTabId;
    for (const session of findEditSessionsInStore(currentStore)) {
      stashComponentEditSession(session);
      ensureLog(session.containerId);
    }
  }, [currentStore, activeTabId]);
  const focusedComponentEditSession = findFocusedComponentEditSession(currentStore, selectedElementIds);
  const [previewStore, setPreviewStore] = (0, import_react.useState)(null);
  const [previewStoreTabId, setPreviewStoreTabId] = (0, import_react.useState)(activeTabId);
  if (previewStoreTabId !== activeTabId) {
    setPreviewStoreTabId(activeTabId);
    setPreviewStore(null);
  }
  const interactiveParentIds = (() => {
    const ids_2 = new Set();
    for (const rootId of getRootIds(currentStore)) if (!isTextOwner(currentStore, rootId)) ids_2.add(rootId);
    for (const selectedId_1 of selectedElementIds) {
      let currentId_0 = selectedId_1;
      while (currentId_0) {
        const parentKey_2 = getParentId(currentStore, currentId_0);
        if (!parentKey_2 || parentKey_2 === "ROOT") break;
        ids_2.add(parentKey_2);
        currentId_0 = parentKey_2;
      }
    }
    if (drilledParentId) ids_2.add(drilledParentId);
    return ids_2;
  })();
  const interactiveParentIdsRef = (0, import_react.useRef)(interactiveParentIds);
  (0, import_react.useLayoutEffect)(() => {
    interactiveParentIdsRef.current = interactiveParentIds;
  });
  const canvasContentRevisionsRef = (0, import_react.useRef)(new Map());
  const pendingCanvasOperationPersistenceRef = (0, import_react.useRef)(new Map());
  const bumpCanvasContentRevision = tabId => {
    if (!tabId) return 0;
    const next = (canvasContentRevisionsRef.current.get(tabId) ?? 0) + 1;
    canvasContentRevisionsRef.current.set(tabId, next);
    return next;
  };
  const setStore = updater => {
    const nextStore = typeof updater === "function" ? updater(storeRef.current) : updater;
    if (nextStore === storeRef.current) return;
    storeRef.current = nextStore;
    bumpCanvasContentRevision(activeTabId);
    setTabs(prev_22 => prev_22.map(tab_16 => {
      if (tab_16.id !== activeTabId) return tab_16;
      return {
        ...tab_16,
        store: nextStore
      };
    }));
  };
  const findElementTab = elementId_4 => {
    const active_0 = tabs.find(t_12 => t_12.id === activeTabId);
    if (active_0 && getById(active_0.store, elementId_4)) return {
      tabId: active_0.id,
      store: active_0.store
    };
    for (const tab_17 of tabs) {
      if (tab_17.id === activeTabId) continue;
      if (getById(tab_17.store, elementId_4)) return {
        tabId: tab_17.id,
        store: tab_17.store
      };
    }
    return null;
  };
  const setTabStoreById = (targetTabId, nextStore_0) => {
    bumpCanvasContentRevision(targetTabId);
    setTabs(prev_23 => prev_23.map(tab_18 => {
      if (tab_18.id !== targetTabId) return tab_18;
      return {
        ...tab_18,
        store: nextStore_0
      };
    }));
  };
  useCanvasToolHandler({
    projectId: projectPath,
    tabs,
    activeTabId,
    iconLibraries,
    componentIndex,
    components,
    history: (0, import_react.useMemo)(() => ({
      pushOperation: (tabId_5, store_1, ops_1) => history.pushOperation(tabId_5, store_1, ops_1, "ai"),
      recordOperations: (tabId_6, ops_2, postOpStore_0) => history.recordOperations(tabId_6, ops_2, postOpStore_0, "ai")
    }), [history]),
    setStore,
    setTabStoreById,
    findElementTab,
    storeRef,
    elementLocksRef,
    claimIdToChatTabIdRef,
    setElementLocksVersion: _fn => {
      publishElementLocks();
    },
    activeTabIdRef,
    isChatTabStreaming: chatTabId_0 => runningChatIds.has(chatTabId_0),
    createCanvasPage,
    getCanvasRevision: tabId => canvasContentRevisionsRef.current.get(tabId) ?? 0,
    onCanvasOperationCommitted: operation => {
      if (!operation?.operationId || !operation?.resolvedCanvasId || typeof operation.committedRevision !== "number") return;
      pendingCanvasOperationPersistenceRef.current.set(operation.operationId, {
        canvasId: operation.resolvedCanvasId,
        committedRevision: operation.committedRevision
      });
    }
  });
  const onDragElements = (draggedIds, targetId_1, position) => {
    if (!activeTabId) return;
    const store_2 = storeRef.current;
    const moves = planDropMoves(store_2, new Set(draggedIds), targetId_1, position);
    if (moves.length === 0) return;
    const ops_3 = [];
    let cursor = store_2;
    for (const move of moves) {
      const element_0 = getById(cursor, move.elementId);
      if (move.toParentId && isFlowLayoutElement(move.toParentId) && element_0 && !isRelativeFlowPosition(element_0.styles)) {
        const styleOp = createSetStylesOperation(cursor, move.elementId, positionStylesForParent(element_0.styles, true));
        if (styleOp) {
          ops_3.push(styleOp);
          cursor = applyOperationsToStore(cursor, [styleOp]);
        }
      }
      ops_3.push(move);
      cursor = applyOperationsToStore(cursor, [move]);
    }
    setStore(history.pushOperation(activeTabId, store_2, ops_3));
  };
  const pendingAltOpsRef = (0, import_react.useRef)(null);
  const onPushDragOperations = ops_4 => {
    if (!activeTabId || ops_4.length === 0) return;
    const allOps = pendingAltOpsRef.current ? [...pendingAltOpsRef.current, ...ops_4] : ops_4;
    pendingAltOpsRef.current = null;
    history.recordOperations(activeTabId, allOps, storeRef.current);
  };
  const onAltDragAborted = restoreSelection => {
    if (!pendingAltOpsRef.current) return;
    const inverseOps = invertOperations(pendingAltOpsRef.current);
    setStore(applyOperationsToStore(storeRef.current, inverseOps));
    pendingAltOpsRef.current = null;
    if (restoreSelection) setSelectedElementIds(new Set(restoreSelection));
  };
  const onStartAltDrag = elements_1 => {
    if (!activeTabId) return null;
    const store_3 = storeRef.current;
    const ops_5 = [];
    const cloneIds = [];
    let cursor_0 = store_3;
    for (const {
      originalId,
      canvasPos: canvasPos_0,
      lockSize
    } of elements_1) {
      const nested = storeSubtreeToLegacyNested(cursor_0, originalId);
      if (!nested) continue;
      const clone = cloneElementWithNewIds(nested, {
        x: 0,
        y: 0
      });
      if (canvasPos_0) clone.canvasPosition = canvasPos_0;
      if (lockSize) clone.styles = {
        ...(clone.styles || {}),
        width: `${lockSize.width}px`,
        height: `${lockSize.height}px`
      };
      const op_0 = createInsertOperation(clone, null, getRootIds(cursor_0).length);
      ops_5.push(op_0);
      cursor_0 = applyOperationsToStore(cursor_0, [op_0]);
      cloneIds.push(clone.id);
    }
    if (ops_5.length === 0) return null;
    pendingAltOpsRef.current = ops_5;
    setStore(applyOperationsToStore(store_3, ops_5));
    setSelectedElementIds(new Set(cloneIds));
    return cloneIds;
  };
  const onAddElement = (element_1, opts) => {
    if (!activeTabId) return;
    let targetParentId = opts?.parentId ?? null;
    if (!targetParentId && !opts?.atRoot && selectedElementId) {
      const sel = getById(storeRef.current, selectedElementId);
      if (sel && hasChildren$1(sel) && canAcceptChild(sel, element_1)) targetParentId = selectedElementId;
    }
    if (targetParentId) {
      const targetEl = getById(storeRef.current, targetParentId);
      if (!targetEl || !canAcceptChild(targetEl, element_1)) targetParentId = null;
    }
    element_1 = {
      ...element_1,
      styles: positionStylesForParent(element_1.styles, !!targetParentId && isFlowLayoutElement(targetParentId))
    };
    if (targetParentId) {
      const {
        canvasPosition: _canvasPosition,
        ...elementWithoutPosition
      } = element_1;
      const ops_6 = [];
      if (element_1.styles?.position === "absolute") {
        const parent = getById(storeRef.current, targetParentId);
        const parentPos = parent?.styles?.position;
        if (parent && parentPos !== "relative" && parentPos !== "absolute" && parentPos !== "fixed") {
          const styleOp_0 = createSetStylesOperation(storeRef.current, targetParentId, {
            ...(parent.styles || {}),
            position: "relative"
          });
          if (styleOp_0) ops_6.push(styleOp_0);
        }
      }
      const slot = frameSlotAmongAdoptees(storeRef.current, opts?.adopt, targetParentId) ?? getChildren$2(storeRef.current, targetParentId).length;
      ops_6.push(createInsertOperation(elementWithoutPosition, targetParentId, slot));
      if (opts?.adopt) ops_6.push(...buildFrameAdoptionOps(applyOperationsToStore(storeRef.current, ops_6), element_1.id, opts.adopt));
      const nextStore_1 = history.pushOperation(activeTabId, storeRef.current, ops_6);
      setStore(nextStore_1);
      if (element_1.type === "text") setEditingTextId(element_1.id);
      return;
    }
    let canvasPosition = element_1.canvasPosition ?? {
      x: 100,
      y: 100
    };
    if (!element_1.canvasPosition && viewportRef.current && canvasRef.current) {
      const viewportRect_0 = viewportRef.current.getBoundingClientRect();
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const {
        scale: scale_0
      } = getCamera();
      const screenX_0 = viewportRect_0.left + 100;
      const screenY_0 = viewportRect_0.top + 150;
      canvasPosition = {
        x: (screenX_0 - canvasRect.left) / scale_0,
        y: (screenY_0 - canvasRect.top) / scale_0
      };
    }
    const ops_7 = [createInsertOperation({
      ...element_1,
      canvasPosition
    }, null, frameSlotAmongAdoptees(storeRef.current, opts?.adopt, null) ?? getRootIds(storeRef.current).length)];
    if (opts?.adopt) ops_7.push(...buildFrameAdoptionOps(applyOperationsToStore(storeRef.current, ops_7), element_1.id, opts.adopt));
    const nextStore_2 = history.pushOperation(activeTabId, storeRef.current, ops_7);
    setStore(nextStore_2);
    if (element_1.type === "text") setEditingTextId(element_1.id);
  };
  const onResizeElement = (elementId_5, size, pos, transform, companions) => {
    if (!activeTabId) return;
    const ops_8 = [];
    let cursor_1 = storeRef.current;
    const addOps = (id_6, s_4, p_6, t_14) => {
      const element_2 = getById(cursor_1, id_6);
      if (!element_2) return;
      const newStyles = {
        ...(element_2.styles || {}),
        width: s_4.width,
        height: s_4.height,
        ...(t_14 !== void 0 ? {
          transform: t_14 || void 0
        } : {})
      };
      const styleOp_1 = createSetStylesOperation(cursor_1, id_6, newStyles);
      if (styleOp_1) {
        ops_8.push(styleOp_1);
        cursor_1 = applyOperationsToStore(cursor_1, [styleOp_1]);
      }
      if (p_6) {
        const posOp = createSetPositionOperation(cursor_1, id_6, p_6);
        if (posOp) {
          ops_8.push(posOp);
          cursor_1 = applyOperationsToStore(cursor_1, [posOp]);
        }
      }
    };
    addOps(elementId_5, size, pos, transform);
    for (const c_4 of companions ?? []) addOps(c_4.id, c_4.size, c_4.pos);
    if (ops_8.length > 0) {
      const nextStore_3 = history.pushOperation(activeTabId, storeRef.current, ops_8);
      setStore(nextStore_3);
    }
  };
  const onUndo = () => {
    if (!activeTabId) return;
    setPreviewStore(null);
    const newElements_0 = history.undo(activeTabId, storeRef.current);
    setStore(newElements_0);
  };
  const onRedo = () => {
    if (!activeTabId) return;
    setPreviewStore(null);
    const newElements_1 = history.redo(activeTabId, storeRef.current);
    setStore(newElements_1);
  };
  const onDeleteElements = elementIds => {
    if (!activeTabId || elementIds.size === 0) return;
    const ops_9 = [];
    let cursor_2 = storeRef.current;
    for (const id_7 of elementIds) {
      const op_1 = createRemoveOperation(cursor_2, id_7);
      if (op_1) {
        ops_9.push(op_1);
        cursor_2 = applyOperationsToStore(cursor_2, [op_1]);
      }
    }
    if (ops_9.length > 0) {
      const nextStore_4 = history.pushOperation(activeTabId, storeRef.current, ops_9);
      setStore(nextStore_4);
    }
    setSelectedElementIds(new Set());
  };
  const onDuplicateElements = elementIds_0 => {
    if (!activeTabId || elementIds_0.size === 0) return;
    const store_4 = storeRef.current;
    const ops_10 = [];
    const cloneIds_0 = [];
    let cursor_3 = store_4;
    for (const elementId_6 of elementIds_0) {
      if (!getById(cursor_3, elementId_6)) continue;
      const nested_0 = storeSubtreeToLegacyNested(cursor_3, elementId_6);
      if (!nested_0) continue;
      const duplicate = cloneElementWithNewIds(nested_0);
      const parentKey_3 = getParentId(cursor_3, elementId_6);
      const op_2 = createInsertOperation(duplicate, parentKey_3 === "ROOT" || parentKey_3 === null ? null : parentKey_3, getIndex(cursor_3, elementId_6) + 1);
      ops_10.push(op_2);
      cursor_3 = applyOperationsToStore(cursor_3, [op_2]);
      cloneIds_0.push(duplicate.id);
    }
    if (ops_10.length === 0) return;
    const nextStore_5 = history.pushOperation(activeTabId, store_4, ops_10);
    setStore(nextStore_5);
    setSelectedElementIds(new Set(cloneIds_0));
  };
  const showPropsTab = (selectedElementIds.size > 0 ? Array.from(selectedElementIds) : selectedElementId ? [selectedElementId] : []).some(id_8 => {
    const element_3 = getById(currentStore, id_8);
    return element_3?.type === "component" || element_3?.type === "icon" || element_3?.type === "html" || element_3?.type === "webview";
  });
  const openSelectedComponentFile = () => {
    if (!selectedElementId) return;
    const element_4 = getById(currentStore, selectedElementId);
    if (element_4?.type === "component") {
      const componentName_2 = element_4.componentName;
      const componentInfo = mergedComponentIndex[componentName_2];
      if (componentInfo?.path) openComponentFile(componentName_2, componentInfo.path);
    }
  };
  const handleCanvasContextMenu = e_2 => {
    const hit = e_2.target.closest("[data-element-id],[data-root-label-id],[data-selection-label-id],[data-hover-label-id]");
    const hitId = hit && (hit.getAttribute("data-element-id") ?? hit.getAttribute("data-root-label-id") ?? hit.getAttribute("data-selection-label-id") ?? hit.getAttribute("data-hover-label-id")) || null;
    let targetId_2 = null;
    let keepSelection = false;
    if (hitId) {
      const covering = [...selectedElementIds].find(sel_0 => sel_0 === hitId || isDescendant(currentStore, sel_0, hitId));
      if (covering) {
        targetId_2 = covering;
        keepSelection = true;
      } else targetId_2 = resolvePointerTarget(currentStore, hitId, interactiveParentIdsRef.current, drilledParentId);
    }
    if (readOnly) {
      const el_2 = targetId_2 ? getById(currentStore, targetId_2) : null;
      if (!targetId_2 || !(el_2?.type === "component" || onCopySelectionLink)) {
        e_2.preventDefault();
        return;
      }
    }
    if (targetId_2 && !keepSelection) setSelectedElementIds(new Set([targetId_2]));
    contextMenuPointRef.current = {
      x: e_2.clientX,
      y: e_2.clientY
    };
    setCanvasMenuTargetId(targetId_2);
  };
  const onEditText = (elementId_7, content_5) => {
    if (!activeTabId) return;
    const normalized = typeof content_5 === "string" ? {
      text: content_5
    } : content_5;
    const cleaned = normalizeTextRuns(storeRef.current, elementId_7, normalized);
    const op_3 = createSetTextOperation(storeRef.current, elementId_7, cleaned);
    if (op_3) {
      const newElements_2 = history.pushOperation(activeTabId, storeRef.current, op_3);
      setStore(newElements_2);
    }
  };
  const onRenameElement = (elementId_8, name_5) => {
    if (!activeTabId) return;
    const op_4 = createSetNameOperation(storeRef.current, elementId_8, name_5);
    if (op_4) setStore(history.pushOperation(activeTabId, storeRef.current, op_4));
  };
  const onUpdateElementStyles = (elementId_9, styles) => {
    if (!activeTabId) return;
    const ate = activeTextEditorRef.current;
    const editingText = !!(ate && editingTextId);
    if (editingText && ate.hasTextStyleTarget()) {
      const baseStyles = textSelectionState?.styles ?? {};
      const newAny = styles;
      const textPatch = {};
      let textChanged = false;
      for (const key of Object.keys(newAny)) if (TEXT_RUN_STYLE_KEYS.has(key)) {
        if (newAny[key] === baseStyles[key]) continue;
        textPatch[key] = newAny[key];
        textChanged = true;
      }
      for (const key_0 of Object.keys(baseStyles)) {
        if (key_0 in newAny) continue;
        if (TEXT_RUN_STYLE_KEYS.has(key_0)) {
          textPatch[key_0] = null;
          textChanged = true;
        }
      }
      if (textChanged) {
        ate.applyStyles(textPatch);
        return;
      }
      if (Object.keys(newAny).some(k_0 => TEXT_RUN_STYLE_KEYS.has(k_0))) return;
    }
    if (editingText && textSelectionState?.isFull) {
      const ownerStyles = getById(storeRef.current, elementId_9)?.styles ?? {};
      const newAny_0 = styles;
      const clearPatch = {};
      for (const key_1 of Object.keys(newAny_0)) {
        if (!TEXT_RUN_STYLE_KEYS.has(key_1)) continue;
        if (newAny_0[key_1] === ownerStyles[key_1]) continue;
        clearPatch[key_1] = null;
      }
      if (Object.keys(clearPatch).length) ate.applyStyles(clearPatch);
    }
    const op_5 = createSetStylesOperation(storeRef.current, elementId_9, styles);
    if (op_5) {
      const newElements_3 = history.pushOperation(activeTabId, storeRef.current, op_5);
      setStore(newElements_3);
    }
  };
  /** Toggle bold/italic/underline/strikethrough. While editing a text node with
  *  an active text target, dispatches to the active text editor so it
  *  applies to the highlighted run only (and uses the editor's accurate
  *  per-node toggle state). Otherwise flips the corresponding element-level
  *  style. */
  const onToggleTextFormat = (elementId_10, format) => {
    if (!activeTabId) return;
    const ate_0 = activeTextEditorRef.current;
    if (ate_0 && editingTextId && ate_0.hasTextStyleTarget()) {
      ate_0.toggleFormat(format);
      return;
    }
    const el_3 = getById(storeRef.current, elementId_10);
    if (!el_3) return;
    const styles_0 = el_3.styles ?? {};
    const next_12 = {
      ...styles_0
    };
    if (format === "bold") {
      if (styles_0.fontWeight === "bold" || styles_0.fontWeight === "700" || typeof styles_0.fontWeight === "number" && styles_0.fontWeight >= 600) delete next_12.fontWeight;else next_12.fontWeight = 700;
    } else if (format === "italic") {
      if (styles_0.fontStyle === "italic") delete next_12.fontStyle;else next_12.fontStyle = "italic";
    } else {
      const target_1 = format === "underline" ? "underline" : "line-through";
      const parts = String(styles_0.textDecoration ?? "").split(/\s+/).filter(Boolean);
      const has = parts.includes(target_1);
      const filtered = parts.filter(p_7 => p_7 !== target_1);
      if (!has) filtered.push(target_1);
      if (filtered.length === 0) delete next_12.textDecoration;else next_12.textDecoration = filtered.join(" ");
    }
    const op_6 = createSetStylesOperation(storeRef.current, elementId_10, next_12);
    if (op_6) {
      const newElements_4 = history.pushOperation(activeTabId, storeRef.current, op_6);
      setStore(newElements_4);
    }
  };
  const onUpdateElementProps = (elementId_11, props) => {
    if (!activeTabId) return;
    const ate_1 = activeTextEditorRef.current;
    const editingText_0 = !!(ate_1 && editingTextId);
    const editingTextLeaf = editingText_0 && getById(storeRef.current, elementId_11)?.type === "text";
    if (editingText_0 && (ate_1.hasTextStyleTarget() || editingTextLeaf)) {
      const baseClassName = textSelectionState?.className ?? "";
      const current_4 = getById(storeRef.current, elementId_11)?.props ?? {};
      const newAny_1 = props;
      if (!Object.keys(newAny_1).some(k_1 => k_1 !== "className" && newAny_1[k_1] !== current_4[k_1]) && typeof newAny_1.className === "string") {
        const existing_1 = baseClassName.split(/\s+/).filter(Boolean);
        const incoming = newAny_1.className.split(/\s+/).filter(Boolean);
        const added = incoming.filter(c_5 => !existing_1.includes(c_5));
        const removed = existing_1.filter(c_6 => !incoming.includes(c_6));
        if (editingTextLeaf || isInlineTypographyEdit(textSelectionState, [...added, ...removed])) {
          if (added.length) ate_1.addClassName(added.join(" "));
          if (removed.length) ate_1.removeClassName(removed.join(" "));
          return;
        }
      }
    }
    const op_7 = createSetPropsOperation(storeRef.current, elementId_11, sanitizeElementProps(props) ?? {});
    if (op_7) {
      const newElements_5 = history.pushOperation(activeTabId, storeRef.current, op_7);
      setStore(newElements_5);
    }
  };
  const onSetElementPropsTransient = (elementId_12, props_0) => {
    const op_8 = createSetPropsOperation(storeRef.current, elementId_12, sanitizeElementProps(props_0) ?? {});
    if (op_8) setStore(applyOperationsToStore(storeRef.current, [op_8]));
  };
  const strippedOwnedDomPropsRef = (0, import_react.useRef)(new Set());
  const stripStaleOwnedDomProps = (0, import_react.useEffectEvent)(() => {
    if (readOnly || !selectedElementId) return;
    const targetElement = getById(storeRef.current, selectedElementId);
    if (targetElement?.type === "html" && targetElement.props?.["data-element-id"] && !strippedOwnedDomPropsRef.current.has(selectedElementId)) {
      strippedOwnedDomPropsRef.current.add(selectedElementId);
      const cleaned_0 = sanitizeElementProps(targetElement.props) ?? {};
      onSetElementPropsTransient(selectedElementId, cleaned_0);
    }
  });
  (0, import_react.useEffect)(() => {
    stripStaleOwnedDomProps();
  }, [selectedElementId, currentStore, readOnly]);
  const onUpdateMultipleElementsProps = (elementIds_1, propsUpdater) => {
    if (!activeTabId || elementIds_1.size === 0) return;
    const operations = [];
    for (const elementId_13 of elementIds_1) {
      const element_5 = getById(storeRef.current, elementId_13);
      if (!element_5 || element_5.type === "text") continue;
      const newProps = propsUpdater(element_5.props || {});
      const op_9 = createSetPropsOperation(storeRef.current, elementId_13, newProps);
      if (op_9) operations.push(op_9);
    }
    if (operations.length > 0) {
      const newElements_6 = history.pushOperation(activeTabId, storeRef.current, operations);
      setStore(newElements_6);
    }
  };
  const onUpdateMultipleElementsStyles = (elementIds_2, stylesUpdater) => {
    if (!activeTabId || elementIds_2.size === 0) return;
    const operations_0 = [];
    for (const elementId_14 of elementIds_2) {
      const element_6 = getById(storeRef.current, elementId_14);
      if (!element_6) continue;
      const newStyles_0 = stylesUpdater(element_6.styles || {}, elementId_14);
      const op_10 = createSetStylesOperation(storeRef.current, elementId_14, newStyles_0);
      if (op_10) operations_0.push(op_10);
    }
    if (operations_0.length > 0) {
      const newElements_7 = history.pushOperation(activeTabId, storeRef.current, operations_0);
      setStore(newElements_7);
    }
  };
  const onUpdateElementPositions = positions => {
    if (!activeTabId || positions.size === 0) return;
    const operations_1 = [];
    let cursor_4 = storeRef.current;
    for (const [elementId_15, position_0] of positions) {
      const op_11 = createSetPositionOperation(cursor_4, elementId_15, position_0);
      if (!op_11) continue;
      operations_1.push(op_11);
      cursor_4 = applyOperationsToStore(cursor_4, [op_11]);
    }
    if (operations_1.length > 0) setStore(history.pushOperation(activeTabId, storeRef.current, operations_1));
  };
  const [pasteStyleSuggestion, setPasteStyleSuggestion] = (0, import_react.useState)(null);
  if (pasteStyleSuggestion && !getById(currentStore, pasteStyleSuggestion.rootId)) setPasteStyleSuggestion(null);
  const applyPasteStyleClean = mode => {
    if (!activeTabId || !pasteStyleSuggestion) return;
    const {
      rootId: rootId_0
    } = pasteStyleSuggestion;
    const classProps = buildClassPropertyMap(document);
    const ids_3 = [rootId_0, ...getDescendantIds(storeRef.current, rootId_0)];
    const operations_2 = [];
    for (const id_9 of ids_3) {
      const el_4 = getById(storeRef.current, id_9);
      const styles_1 = el_4 && el_4.styles;
      if (!styles_1 || Object.keys(styles_1).length === 0) continue;
      const className = el_4.props?.className;
      const {
        next: next_13,
        changed
      } = computeCleanedStyles(styles_1, className, classProps, mode);
      if (!changed) continue;
      const op_12 = createSetStylesOperation(storeRef.current, id_9, next_13 ?? {});
      if (op_12) operations_2.push(op_12);
    }
    if (operations_2.length > 0) setStore(history.pushOperation(activeTabId, storeRef.current, operations_2));
    setPasteStyleSuggestion(null);
  };
  const onReplaceElement = (oldElementId, newElement) => {
    if (!activeTabId) return;
    const op_13 = createReplaceOperation(storeRef.current, oldElementId, newElement);
    if (op_13) {
      const newElements_8 = history.pushOperation(activeTabId, storeRef.current, op_13);
      setStore(newElements_8);
    }
    setPreviewStore(null);
  };
  const onPreviewElement = (oldElementId_0, newElement_0) => {
    const op_14 = createReplaceOperation(storeRef.current, oldElementId_0, newElement_0);
    if (op_14) setPreviewStore(applyOperationsToStore(storeRef.current, [op_14]));
  };
  const onClearPreview = () => setPreviewStore(null);
  const onCopyElement = async elementId_16 => {
    if (!getById(storeRef.current, elementId_16)) return;
    await copyElementToClipboard(storeSubtreeToLegacyNested(storeRef.current, elementId_16));
  };
  const onCopyElements = async elementIds_3 => {
    if (elementIds_3.size === 0) return;
    const elementsToCopy = [];
    const sources = [];
    for (const id_10 of elementIds_3) {
      if (!getById(storeRef.current, id_10)) continue;
      elementsToCopy.push(storeSubtreeToLegacyNested(storeRef.current, id_10));
      const parentKey_4 = getParentId(storeRef.current, id_10);
      sources.push(parentKey_4 === "ROOT" || parentKey_4 === null ? "" : parentKey_4);
    }
    if (elementsToCopy.length === 0) return;
    const clipboardData = {
      __bingo: true,
      __multi: true,
      sources,
      elements: elementsToCopy
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(clipboardData));
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };
  const onCutElement = async elementId_17 => {
    if (!activeTabId) return;
    if (!getById(storeRef.current, elementId_17)) return;
    if (!(await copyElementToClipboard(storeSubtreeToLegacyNested(storeRef.current, elementId_17)))) return;
    const op_15 = createRemoveOperation(storeRef.current, elementId_17);
    if (op_15) {
      const newElements_9 = history.pushOperation(activeTabId, storeRef.current, op_15);
      setStore(newElements_9);
    }
    setSelectedElementIds(prev_24 => {
      const next_14 = new Set(prev_24);
      next_14.delete(elementId_17);
      return next_14;
    });
  };
  const onCutElements = async elementIds_4 => {
    if (!activeTabId || elementIds_4.size === 0) return;
    const elementsToCut = [];
    for (const id_11 of elementIds_4) {
      if (!getById(storeRef.current, id_11)) continue;
      elementsToCut.push(storeSubtreeToLegacyNested(storeRef.current, id_11));
    }
    if (elementsToCut.length === 0) return;
    const clipboardData_0 = {
      __bingo: true,
      __multi: true,
      elements: elementsToCut
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(clipboardData_0));
    } catch (err_0) {
      console.error("Failed to copy to clipboard:", err_0);
      return;
    }
    const ops_11 = [];
    let cursor_5 = storeRef.current;
    for (const id_12 of elementIds_4) {
      const op_16 = createRemoveOperation(cursor_5, id_12);
      if (op_16) {
        ops_11.push(op_16);
        cursor_5 = applyOperationsToStore(cursor_5, [op_16]);
      }
    }
    if (ops_11.length > 0) {
      const nextStore_6 = history.pushOperation(activeTabId, storeRef.current, ops_11);
      setStore(nextStore_6);
    }
    setSelectedElementIds(new Set());
  };
  const getPasteCanvasPosition = () => {
    const viewport_3 = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport_3 || !canvas) return void 0;
    const viewportRect_1 = viewport_3.getBoundingClientRect();
    const canvasRect_0 = canvas.getBoundingClientRect();
    const {
      scale: scale_1
    } = getCamera();
    const pointer = lastPointerScreenRef.current;
    const overViewport = pointer.valid && pointer.x >= viewportRect_1.left && pointer.x <= viewportRect_1.right && pointer.y >= viewportRect_1.top && pointer.y <= viewportRect_1.bottom;
    const screenX_1 = overViewport ? pointer.x : viewportRect_1.left + viewportRect_1.width / 2;
    const screenY_1 = overViewport ? pointer.y : viewportRect_1.top + viewportRect_1.height / 2;
    return {
      x: (screenX_1 - canvasRect_0.left) / scale_1,
      y: (screenY_1 - canvasRect_0.top) / scale_1
    };
  };
  const pasteIntoContainers = (containerIds, elements_2, sources_0) => {
    if (!activeTabId) return [];
    const ops_12 = [];
    const newIds = [];
    const byTarget = groupElementsByTarget(elements_2, sources_0, containerIds);
    for (const containerId of containerIds) {
      let index_0 = getChildren$2(storeRef.current, containerId).length;
      for (const el_5 of byTarget.get(containerId) ?? []) {
        const cloned = cloneElementWithNewIds(el_5);
        ops_12.push(createInsertOperation(cloned, containerId, index_0++));
        newIds.push(cloned.id);
      }
    }
    if (ops_12.length === 0) return [];
    setStore(history.pushOperation(activeTabId, storeRef.current, ops_12));
    setSelectedElementIds(new Set(newIds));
    return newIds;
  };
  const addPastedElementToCanvas = (element_7, opts_0) => {
    if (!activeTabId) return void 0;
    const droppedInto = opts_0?.parentId ?? null;
    if (!opts_0?.atRoot && !droppedInto) {
      const targets = resolveMultiPasteTargets(storeRef.current, selectedElementIds, [element_7]);
      if (targets.length > 0) return pasteIntoContainers(targets, [element_7])[0];
    }
    const pastedElement = cloneElementWithNewIds(element_7);
    let targetId_3 = droppedInto ?? (opts_0?.atRoot ? null : selectedElementId ?? null);
    if (!droppedInto && !opts_0?.atRoot && selectedElementId && selectedElementId === element_7.id) {
      const parentKey_5 = getParentId(storeRef.current, selectedElementId);
      targetId_3 = parentKey_5 === "ROOT" || parentKey_5 === null ? null : parentKey_5;
    }
    if (!targetId_3) {
      stripRootPositioning(pastedElement);
      if (!pastedElement.canvasPosition) pastedElement.canvasPosition = getPasteCanvasPosition() ?? {
        x: 20,
        y: 20
      };
      const op_17 = createInsertOperation(pastedElement, null, getRootIds(storeRef.current).length);
      const nextStore_7 = history.pushOperation(activeTabId, storeRef.current, op_17);
      setStore(nextStore_7);
    } else {
      const parent_0 = getById(storeRef.current, targetId_3);
      if (!parent_0 || !hasChildren$1(parent_0) || !canAcceptChild(parent_0, pastedElement)) {
        stripRootPositioning(pastedElement);
        pastedElement.canvasPosition = {
          x: 20,
          y: 20
        };
        const op_18 = createInsertOperation(pastedElement, null, getRootIds(storeRef.current).length);
        const nextStore_8 = history.pushOperation(activeTabId, storeRef.current, op_18);
        setStore(nextStore_8);
        return pastedElement.id;
      }
      const childrenCount = getChildren$2(storeRef.current, targetId_3).length;
      const op_19 = createInsertOperation(pastedElement, targetId_3, childrenCount);
      const nextStore_9 = history.pushOperation(activeTabId, storeRef.current, op_19);
      setStore(nextStore_9);
    }
    return pastedElement.id;
  };
  const onPasteToReplace = async selectedIds => {
    if (readOnly || !activeTabId || selectedIds.size === 0) return;
    let clipboardText = null;
    try {
      clipboardText = await navigator.clipboard.readText();
    } catch {
      return;
    }
    if (!clipboardText) return;
    let payload;
    try {
      payload = JSON.parse(clipboardText);
    } catch {
      return;
    }
    if (!payload?.__bingo) return;
    const rawSources = payload.__multi && Array.isArray(payload.elements) ? payload.elements : payload.element != null ? [payload.element] : [];
    const KNOWN_ELEMENT_TYPES = new Set(["html", "component", "text", "icon", "webview"]);
    const sources_1 = rawSources.filter(s_5 => !!s_5 && typeof s_5 === "object" && typeof s_5.type === "string" && KNOWN_ELEMENT_TYPES.has(s_5.type));
    if (sources_1.length === 0) return;
    const targets_0 = Array.from(selectedIds);
    const ops_13 = [];
    const newIds_0 = [];
    let cursor_6 = storeRef.current;
    targets_0.forEach((targetId_4, i_2) => {
      const target_2 = getById(cursor_6, targetId_4);
      if (!target_2) return;
      const parentKey_6 = getParentId(cursor_6, targetId_4);
      const parentId_2 = parentKey_6 === "ROOT" || parentKey_6 === null ? null : parentKey_6;
      const index_1 = getIndex(cursor_6, targetId_4);
      const clone_0 = cloneElementWithNewIds(sources_1[i_2 % sources_1.length], {
        x: 0,
        y: 0
      });
      if (parentId_2 === null) {
        stripRootPositioning(clone_0);
        if ("canvasPosition" in target_2 && target_2.canvasPosition) clone_0.canvasPosition = {
          ...target_2.canvasPosition
        };
      } else {
        delete clone_0.canvasPosition;
        const tStyles = "styles" in target_2 && target_2.styles || {};
        if (tStyles.position === "absolute" || tStyles.position === "fixed") {
          const inherited = {
            ...(clone_0.styles || {}),
            position: tStyles.position
          };
          for (const k_2 of ["left", "top", "right", "bottom"]) if (tStyles[k_2] !== void 0) inherited[k_2] = tStyles[k_2];
          clone_0.styles = inherited;
        }
      }
      const removeOp = createRemoveOperation(cursor_6, targetId_4);
      if (removeOp) {
        ops_13.push(removeOp);
        cursor_6 = applyOperationsToStore(cursor_6, [removeOp]);
      }
      const insertOp = createInsertOperation(clone_0, parentId_2, index_1);
      ops_13.push(insertOp);
      cursor_6 = applyOperationsToStore(cursor_6, [insertOp]);
      newIds_0.push(clone_0.id);
    });
    if (ops_13.length > 0) {
      const nextStore_10 = history.pushOperation(activeTabId, storeRef.current, ops_13);
      setStore(nextStore_10);
      setSelectedElementIds(new Set(newIds_0));
    }
  };
  const resolveCapturedComponents = (el_6, counter, opts_1) => {
    const upgradeAll = opts_1?.upgradeAllRegistry === true;
    const anyEl = el_6;
    const children = Array.isArray(anyEl.children) ? anyEl.children.map(c_7 => resolveCapturedComponents(c_7, counter, opts_1)) : void 0;
    const ci = anyEl.capturedIcon;
    if (el_6.type === "html" && ci?.iconName) {
      const libKey = Object.keys(allIconLibraries).find(k_3 => allIconLibraries[k_3]?.icons?.[ci.iconName]);
      if (libKey) {
        counter.n++;
        return {
          id: el_6.id,
          type: "icon",
          library: libKey,
          iconName: ci.iconName,
          props: ci.size ? {
            size: ci.size
          } : {},
          ...(anyEl.styles ? {
            styles: anyEl.styles
          } : {}),
          ...(el_6.canvasPosition ? {
            canvasPosition: el_6.canvasPosition
          } : {})
        };
      }
      const {
        capturedIcon: _capturedIcon,
        ...rest
      } = anyEl;
      return children ? {
        ...rest,
        children
      } : rest;
    }
    const cc = anyEl.capturedComponent;
    const dataComponent = typeof anyEl.props?.["data-component"] === "string" ? anyEl.props["data-component"] : void 0;
    const dataSlot = typeof anyEl.props?.["data-slot"] === "string" ? anyEl.props["data-slot"] : void 0;
    const bingoComponent = typeof anyEl.props?.["data-bingo-component"] === "string" ? anyEl.props["data-bingo-component"] : void 0;
    const pascal = dataSlot?.split(/[^a-zA-Z0-9]+/).filter(Boolean).map(p_8 => p_8.charAt(0).toUpperCase() + p_8.slice(1)).join("") ?? "";
    const fromSlot = upgradeAll && pascal && (components[pascal] || mergedComponentIndex[pascal]) ? pascal : void 0;
    const inReg = n_1 => !!(n_1 && (components[n_1] || mergedComponentIndex[n_1]));
    const registryName = (inReg(bingoComponent) ? bingoComponent : void 0) || (inReg(cc?.name) ? cc.name : void 0) || (inReg(dataComponent) ? dataComponent : void 0) || fromSlot || bingoComponent || cc?.name || dataComponent;
    const inRuntime = !!(registryName && components[registryName]);
    const inIndex = !!(registryName && mergedComponentIndex[registryName]);
    const canUpgrade = !!(registryName && (inRuntime || upgradeAll && inIndex));
    const liveOk = upgradeAll || cc?.liveSafe !== false;
    if (el_6.type === "html" && canUpgrade && liveOk && registryName) {
      counter.n++;
      const componentProps = cc?.props ? {
        ...cc.props
      } : {};
      if (typeof anyEl.props?.className === "string" && !componentProps.className) componentProps.className = anyEl.props.className;
      delete componentProps["data-slot"];
      delete componentProps["data-state"];
      delete componentProps["data-component"];
      delete componentProps["data-bingo-component"];
      if (typeof componentProps.id === "string" && /(^radix-|:r[0-9a-z]+:)/.test(componentProps.id)) delete componentProps.id;
      for (const k_4 of Object.keys(componentProps)) if (componentProps[k_4] === void 0) delete componentProps[k_4];
      const prunedChildren = stripPropSynthesizedChildren(children, componentProps);
      return {
        id: el_6.id,
        type: "component",
        componentName: registryName,
        props: Object.keys(componentProps).length ? componentProps : void 0,
        frozenFallback: true,
        children: prunedChildren,
        ...(el_6.canvasPosition ? {
          canvasPosition: el_6.canvasPosition
        } : {})
      };
    }
    if (cc && !upgradeAll) {
      const {
        capturedComponent: _capturedComponent,
        ...rest_0
      } = anyEl;
      return {
        ...rest_0,
        children
      };
    }
    if (cc && upgradeAll) {
      const {
        capturedComponent: _unusedCapturedComponent,
        ...rest_1
      } = anyEl;
      return {
        ...rest_1,
        children
      };
    }
    if (el_6.type === "component") {
      counter.n++;
      const compEl = anyEl;
      const cleanedProps = compEl.props ? {
        ...compEl.props
      } : void 0;
      if (cleanedProps) {
        for (const k_5 of Object.keys(cleanedProps)) if (cleanedProps[k_5] === void 0) delete cleanedProps[k_5];
      }
      return {
        ...compEl,
        props: cleanedProps && Object.keys(cleanedProps).length ? cleanedProps : void 0,
        children: stripPropSynthesizedChildren(children, cleanedProps),
        frozenFallback: true
      };
    }
    return children ? {
      ...anyEl,
      children
    } : el_6;
  };
  const handleEditComponent = async elementId_18 => {
    if (readOnly) return;
    const el_7 = getById(storeRef.current, elementId_18);
    if (!el_7 || el_7.type !== "component") return;
    const existingRoot = findEditRootId$1(storeRef.current, elementId_18);
    if (existingRoot) {
      setSelectedElementIds(new Set([existingRoot]));
      return;
    }
    const componentName_3 = el_7.componentName;
    const filePath_4 = mergedComponentIndex[componentName_3]?.path;
    if (!filePath_4) {
      toast.error(t("shell.componentFileMissing"));
      return;
    }
    if (rendersThroughWebgl(elementId_18)) {
      toast.error(t("shell.webglEditFile", { name: componentName_3 }));
      return;
    }
    if (!activeTabId) return;
    const toastId = toast.loading(t("shell.enteringComponentEdit"));
    try {
      const knownComponents = [... new Set([...Object.keys(components), ...Object.keys(mergedComponentIndex)])];
      const result_5 = await captureComponentInstance({
        elementId: elementId_18,
        store: storeRef.current,
        knownComponents,
        componentName: componentName_3,
        filePath: filePath_4
      });
      if ("error" in result_5) {
        toast.error(t("shell.enterComponentEditFailed"), {
          id: toastId,
          description: result_5.error
        });
        return;
      }
      const persisted = resolveCapturedComponents(result_5.replacement, {
        n: 0
      }, {
        upgradeAllRegistry: true
      });
      const session_0 = editSessionFromElement(persisted);
      if (!session_0) {
        toast.error(t("shell.enterComponentEditFailed"), {
          id: toastId
        });
        return;
      }
      const replaceOp = createReplaceOperation(storeRef.current, elementId_18, persisted);
      if (!replaceOp) {
        toast.error(t("shell.enterComponentEditFailed"), {
          id: toastId
        });
        return;
      }
      startLog(persisted.id);
      stashComponentEditSession(session_0);
      setStore(history.pushOperation(activeTabId, storeRef.current, replaceOp));
      setSelectedElementIds(new Set([persisted.id]));
      toast.success(t("shell.editingComponent", { name: componentName_3 }), {
        id: toastId
      });
    } catch (err_1) {
      console.error("[Edit component] failed:", err_1);
      toast.error(t("shell.enterComponentEditFailed"), {
        id: toastId
      });
    }
  };
  /** Remount the original live component instance in place of the frozen edit tree. */
  const remountComponentEditInstance = (session_1, overrides) => {
    if (!activeTabId) return;
    const {
      containerId: containerId_0
    } = session_1;
    const captureEl = getById(storeRef.current, containerId_0);
    const original = (captureEl?.type === "capture" ? captureEl.original : void 0) ?? session_1.original;
    if (!original || original.type !== "component") return;
    if (!captureEl) return;
    const restored_1 = {
      ...structuredClone(original),
      ...(overrides?.props ? {
        props: overrides.props
      } : {}),
      ...(captureEl.canvasPosition ? {
        canvasPosition: captureEl.canvasPosition
      } : original.canvasPosition ? {
        canvasPosition: original.canvasPosition
      } : {})
    };
    const op_20 = createReplaceOperation(storeRef.current, containerId_0, restored_1);
    if (op_20) {
      setStore(history.pushOperation(activeTabId, storeRef.current, op_20));
      setSelectedElementIds(new Set([restored_1.id]));
    }
    clearLog(containerId_0);
    clearComponentEditSession(containerId_0);
  };
  const handleCancelComponentEdit = () => {
    if (!focusedComponentEditSession) return;
    const captureEl_0 = getById(storeRef.current, focusedComponentEditSession.containerId);
    const original_0 = (captureEl_0?.type === "capture" ? captureEl_0.original : void 0) ?? focusedComponentEditSession.original;
    if (!original_0 || original_0.type !== "component") {
      toast.error(t("shell.cancelEditUnavailable"));
      return;
    }
    remountComponentEditInstance(focusedComponentEditSession);
  };
  const handleSaveComponentEdit = async designerNotes => {
    if (!focusedComponentEditSession) return;
    const session_2 = focusedComponentEditSession;
    const {
      containerId: containerId_1,
      original: original_1
    } = session_2;
    const componentName_4 = original_1.componentName;
    const filePath_5 = session_2.sourceInfo?.filePath || "";
    if (!filePath_5) {
      toast.error(t("shell.componentPathMissing"));
      return;
    }
    setSavingComponentEditIds(prev_25 => new Set(prev_25).add(containerId_1));
    const toastId_0 = toast.loading(t("shell.savingComponent", { name: componentName_4 }));
    const runSave = async () => {
      const subtree_1 = storeSubtreeToLegacyNested(storeRef.current, containerId_1);
      const descriptions = squashOperations(getOperations(containerId_1), storeRef.current).map(op_21 => describeOperation(op_21, storeRef.current)).filter(d => !d.canvasOnly);
      const instanceProps = original_1.props ?? {};
      const opLines = descriptions.map(d_0 => `- [${d_0.op.type}] ${d_0.summary}`).join("\n");
      const trimmedNotes = designerNotes?.trim();
      const userInstructions = [`Update the "${componentName_4}" component definition in this file (not a per-instance override).`, `The EDITED SNAPSHOT is the designer's FINAL canvas state for the UI they were looking at after interacting with a live instance — treat it as the target render for that state.`, `Preserve hooks, props API, conditionals, .map() templates, and imports; apply visual/structural edits into the existing source patterns (prefer Tailwind classes over inline styles when the file already uses them).`, Object.keys(instanceProps).length > 0 ? `Instance props at edit time: ${JSON.stringify(instanceProps)}` : null, opLines ? `Design operations (intent log):\n${opLines}` : "No discrete operations were logged — match the snapshot visually.", trimmedNotes ? `Designer instructions (follow these carefully):\n${trimmedNotes}` : null].filter(Boolean).join("\n\n");
      const previousInstanceProps = structuredClone(original_1.props ?? instanceProps);
      const instanceElementId = original_1.id;
      const result_6 = await saveFile({
        filePath: filePath_5,
        elements: [subtree_1],
        stateContext: {
          componentName: componentName_4,
          instanceProps,
          observedState: "Snapshot is a rendered branch after user interaction (e.g. a later step), not necessarily the initial render."
        },
        userInstructions,
        componentIndex: mergedComponentIndex,
        suggestInstanceProps: Boolean(trimmedNotes)
      });
      onActivityRef.current?.({
        type: "save_to_code_completed",
        componentName: componentName_4,
        withNotes: Boolean(trimmedNotes),
        success: result_6.success
      });
      if (!result_6.success) {
        toast.error(t("shell.saveComponentFailed", { name: componentName_4 }), {
          id: toastId_0,
          description: result_6.error || void 0
        });
        return;
      }
      openComponentFile(componentName_4, filePath_5);
      refreshFocusedComponentRef.current(filePath_5);
      const appliedInstanceProps = result_6.instanceProps;
      const saveTabId = activeTabId;
      toast.success(t("shell.savedComponent", { name: componentName_4 }), {
        id: toastId_0,
        duration: 8e3,
        action: {
          label: t("shell.undo"),
          onClick: async () => {
            const versionsResult = await listFileVersions(componentName_4, filePath_5);
            if (!versionsResult.success || versionsResult.versions.length === 0) {
              toast.error(t("shell.previousVersionMissing"));
              return;
            }
            const latestVersion = versionsResult.versions[0];
            const restoreResult = await restoreFileVersion(componentName_4, latestVersion.filename, filePath_5);
            if (!restoreResult.success) {
              toast.error(t("shell.revertFailed", { error: restoreResult.error }));
              return;
            }
            refreshFocusedComponentRef.current(filePath_5);
            if (appliedInstanceProps && saveTabId && getById(storeRef.current, instanceElementId)) {
              const op_22 = createSetPropsOperation(storeRef.current, instanceElementId, sanitizeElementProps(previousInstanceProps) ?? {});
              if (op_22) setStore(history.pushOperation(saveTabId, storeRef.current, op_22));
            }
            toast.success(t("shell.revertedComponent", { name: componentName_4 }));
          }
        }
      });
      remountComponentEditInstance(session_2, appliedInstanceProps ? {
        props: appliedInstanceProps
      } : void 0);
    };
    try {
      await runSave();
    } catch (err_2) {
      console.error("[Edit component] save failed:", err_2);
      toast.error(t("shell.saveComponentFailed", { name: componentName_4 }), {
        id: toastId_0,
        description: err_2 instanceof Error ? err_2.message : void 0
      });
    }
    setSavingComponentEditIds(prev_26 => {
      const next_15 = new Set(prev_26);
      next_15.delete(containerId_1);
      return next_15;
    });
  };
  const countCapturedNodes = el_8 => {
    const kids = el_8.children;
    return 1 + (Array.isArray(kids) ? kids.reduce((s_6, c_8) => s_6 + countCapturedNodes(c_8), 0) : 0);
  };
  const applyDropPosition = (element_8, position_1) => {
    if (!position_1) return;
    element_8.canvasPosition = position_1;
  };
  const pasteCapturedElement = (raw, dropPosition, opts_2) => {
    const total = countCapturedNodes(raw);
    const toastId_1 = toast.loading(t("shell.pasting"));
    const counter_1 = {
      n: 0
    };
    let resolved;
    let rootId_1;
    try {
      resolved = resolveCapturedComponents(raw, counter_1);
      applyDropPosition(resolved, dropPosition);
      rootId_1 = addPastedElementToCanvas(resolved, opts_2);
    } catch (err_3) {
      console.error("[paste] failed to insert captured element:", err_3);
      toast.error(t("shell.pasteCaptureFailed"), {
        id: toastId_1,
        duration: 3e3
      });
      return;
    }
    if ((opts_2 ? opts_2.fromChromeExt : void 0) && rootId_1 && pasteHasResolvingClasses(resolved, document)) setPasteStyleSuggestion({
      rootId: rootId_1,
      nodeCount: total
    });
    setTimeout(() => {
      const msg = counter_1.n > 0 ? t("shell.pastedElementsWithComponents", { elements: total, count: counter_1.n }) : t("shell.pastedElements", { count: total });
      toast.success(msg, {
        id: toastId_1,
        duration: 3e3
      });
    }, 450);
  };
  const onPasteElement = async (clipboardData_1, dropPosition_0, cursorClientPoint, opts_3) => {
    if (!activeTabId) return;
    const isPanelDrag = isCanvasInsertDrag(clipboardData_1);
    const atRoot = opts_3?.atRoot || isPanelDrag;
    /**
    * Parent for a panel drag: the deepest element under the cursor that can host
    * the dropped child, or null over empty canvas. A panel drop used to always
    * land at root, so dropping a button on a frame left it a sibling sitting on
    * top and you had to drag it in again (LUN-274). Same lookup drag-to-draw
    * uses, so the two agree about what can host what.
    */
    const dropParentFor = child => {
      if (!isPanelDrag || !cursorClientPoint) return null;
      return findContainerAt(cursorClientPoint.clientX, cursorClientPoint.clientY, child, (hostId, candidate) => {
        const parent_1 = getById(storeRef.current, hostId);
        return !!parent_1 && hasChildren$1(parent_1) && canAcceptChild(parent_1, candidate);
      })?.getAttribute("data-element-id") ?? null;
    };
    const insertHtmlMarkup = async markup => {
      let jsx;
      try {
        jsx = htmlToJsx(markup);
      } catch {
        return false;
      }
      if (!jsx) return false;
      let parsedStore;
      try {
        parsedStore = parseJSX(jsx, iconLibraries, componentIndex, void 0, {
          forceNewIds: true
        });
      } catch {
        return false;
      }
      const els_0 = getRootIds(parsedStore).map(id_13 => storeSubtreeToLegacyNested(parsedStore, id_13));
      if (els_0.length === 0) return false;
      if (els_0.length === 1) {
        applyDropPosition(els_0[0], dropPosition_0);
        addPastedElementToCanvas(els_0[0], {
          atRoot,
          parentId: dropParentFor(els_0[0])
        });
      } else await pasteMultipleElements(els_0, {
        atRoot,
        dropPosition: dropPosition_0,
        parentId: dropParentFor(els_0[0])
      });
      return true;
    };
    let clipboardText_0 = null;
    let clipboardHtml = null;
    let clipboardMediaFiles = [];
    if (clipboardData_1) {
      clipboardText_0 = clipboardData_1.getData("text/plain") || null;
      clipboardHtml = clipboardData_1.getData("text/html") || null;
      clipboardMediaFiles = Array.from(clipboardData_1.items).filter(i_3 => i_3.kind === "file" && (i_3.type.startsWith("image/") || i_3.type.startsWith("video/"))).map(i_4 => i_4.getAsFile()).filter(f_6 => f_6 != null);
    } else try {
      clipboardText_0 = await navigator.clipboard.readText();
    } catch {}
    if (clipboardText_0) {
      let parsed;
      try {
        parsed = JSON.parse(clipboardText_0);
      } catch {
        parsed = null;
      }
      if (parsed && parsed.__bingo && parsed.__multi && Array.isArray(parsed.elements)) {
        await pasteMultipleElements(parsed.elements, {
          atRoot,
          dropPosition: dropPosition_0,
          sources: parsed.sources,
          parentId: dropParentFor(parsed.elements[0])
        });
        return;
      }
      if (parsed && parsed.__bingo && parsed.element) {
        const fromChromeExt_0 = typeof parsed.__schema === "string";
        pasteCapturedElement(parsed.element, dropPosition_0, {
          atRoot,
          fromChromeExt: fromChromeExt_0,
          parentId: dropParentFor(parsed.element)
        });
        return;
      }
    }
    if (clipboardHtml && isFigmaClipboardHtml(clipboardHtml)) {
      let phase1;
      try {
        phase1 = convertFigmaClipboardHtmlSync(clipboardHtml);
      } catch (err_4) {
        console.error("[paste] failed to paste from Figma:", err_4);
        toast.error(t("shell.figmaPasteFailed"), {
          duration: 3e3
        });
        return;
      }
      if (phase1 && phase1.elements.length > 0) {
        const {
          elements: elements_3,
          imageHashes
        } = phase1;
        let pastedRootIds = [];
        ensureFontsLoaded(collectFontFamilies(elements_3));
        if (elements_3.length === 1) {
          applyDropPosition(elements_3[0], dropPosition_0);
          const rootId_2 = addPastedElementToCanvas(elements_3[0], {
            atRoot
          });
          if (rootId_2) pastedRootIds = [rootId_2];
        } else pastedRootIds = await pasteMultipleElements(elements_3, {
          atRoot,
          dropPosition: dropPosition_0
        });
        const needsImageLoad = imageHashes.length > 0 && figmaImageResolver && pastedRootIds.length > 0;
        const toastId_2 = needsImageLoad ? toast.loading(t("shell.loadingFigmaImages")) : toast.success(t("shell.pastedFromFigma"), {
          duration: 3e3
        });
        if (needsImageLoad && figmaImageResolver) {
          const phase1Snapshot = phase1;
          const rootsSnapshot = pastedRootIds;
          const resolveImages = figmaImageResolver;
          (async () => {
            let urls;
            try {
              urls = await resolveImages({
                fileKey: phase1Snapshot.parsed.meta.fileKey,
                imageHashes: phase1Snapshot.imageHashes
              });
            } catch (err_5) {
              console.error("[paste] failed to load Figma images:", err_5);
              toast.error(t("shell.figmaImagesFailed"), {
                id: toastId_2,
                duration: 3e3
              });
              return;
            }
            if (urls === "skip") {
              toast.success(t("shell.pastedFromFigma"), {
                id: toastId_2,
                duration: 3e3
              });
              return;
            }
            const patches = buildFigmaImageStylePatches(phase1Snapshot.parsed, phase1Snapshot.pendingImagePatches, urls);
            if (patches.length > 0) setStore(prev_27 => applyFigmaImagePatchesToStore(prev_27, rootsSnapshot, patches));
            toast.success(t("shell.pastedFromFigma"), {
              id: toastId_2,
              duration: 3e3
            });
          })();
        }
        return;
      }
    }
    if (clipboardText_0 && looksLikeHTML(clipboardText_0)) {
      let parsedStore_0;
      try {
        parsedStore_0 = parseJSX(clipboardText_0.replace(/(?<=\s)class=/g, "className=").replace(/(?<=\s)for=/g, "htmlFor="), iconLibraries, componentIndex, void 0, {
          forceNewIds: true
        });
      } catch {
        parsedStore_0 = void 0;
      }
      if (parsedStore_0) {
        const jsxElements = getRootIds(parsedStore_0).map(id_14 => storeSubtreeToLegacyNested(parsedStore_0, id_14));
        if (jsxElements.length > 0) {
          if (jsxElements.length === 1) {
            applyDropPosition(jsxElements[0], dropPosition_0);
            addPastedElementToCanvas(jsxElements[0], {
              atRoot
            });
          } else await pasteMultipleElements(jsxElements, {
            atRoot,
            dropPosition: dropPosition_0
          });
          return;
        }
      }
    }
    if (clipboardHtml && (await insertHtmlMarkup(clipboardHtml))) return;
    if (clipboardText_0 && looksLikeHTML(clipboardText_0) && (await insertHtmlMarkup(clipboardText_0))) return;
    const MEDIA_GAP = 20;
    const mediaCols = Math.ceil(Math.sqrt(clipboardMediaFiles.length));
    const mediaBase = dropPosition_0 ?? getPasteCanvasPosition() ?? {
      x: 20,
      y: 20
    };
    let mediaCol = 0,
      mediaCursorX = 0,
      mediaRowTop = 0,
      mediaRowMaxH = 0;
    for (const file_0 of clipboardMediaFiles) {
      if (file_0.type === "image/svg+xml" && (await insertHtmlMarkup(await file_0.text()))) continue;
      const isVideo = file_0.type.startsWith("video/");
      let width = 400,
        height = 300;
      if (isVideo) {
        const dims = await getVideoDimensions(file_0);
        if (dims) {
          width = dims.width;
          height = dims.height;
        }
      } else {
        let bmp;
        try {
          bmp = await createImageBitmap(file_0);
        } catch {
          bmp = void 0;
        }
        if (bmp) {
          width = bmp.width;
          height = bmp.height;
          if (typeof bmp.close === "function") bmp.close();
        }
      }
      const previewUrl = isVideo ? void 0 : URL.createObjectURL(file_0);
      const placeholder = isVideo ? createVideoElement("") : createImageElement("");
      placeholder.styles = {
        ...placeholder.styles,
        width,
        height
      };
      const baseProps = {
        ...placeholder.props
      };
      placeholder.canvasPosition = {
        x: mediaBase.x + mediaCursorX,
        y: mediaBase.y + mediaRowTop
      };
      mediaCursorX += width + MEDIA_GAP;
      mediaRowMaxH = Math.max(mediaRowMaxH, height);
      if (++mediaCol >= mediaCols) {
        mediaCol = 0;
        mediaCursorX = 0;
        mediaRowTop += mediaRowMaxH + MEDIA_GAP;
        mediaRowMaxH = 0;
      }
      const placeholderId = addPastedElementToCanvas(placeholder, {
        atRoot
      });
      const markedProps = {
        ...baseProps,
        "data-uploading": "true",
        ...(previewUrl ? {
          "data-upload-preview": previewUrl
        } : {})
      };
      if (placeholderId) setStore(prev_28 => {
        const op_23 = createSetPropsOperation(prev_28, placeholderId, markedProps);
        return op_23 ? applyOperationsToStore(prev_28, [op_23]) : prev_28;
      });
      const clearMarkers = store_5 => {
        if (!placeholderId) return store_5;
        const op_24 = createSetPropsOperation(store_5, placeholderId, baseProps);
        return op_24 ? applyOperationsToStore(store_5, [op_24]) : store_5;
      };
      const toastId_3 = toast.loading(t("shell.addingFile", { name: file_0.name || t(isVideo ? "shell.video" : "shell.image") }));
      const result_7 = await fileToUrl(file_0, readOnly ? void 0 : uploadImage);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (result_7.error || !result_7.src) {
        setStore(clearMarkers);
        if (result_7.error) toast.error(t("shell.pasteMediaFailed", { media: t(isVideo ? "shell.video" : "shell.image") }), {
          id: toastId_3,
          description: result_7.errorMessage || void 0
        });else toast.dismiss(toastId_3);
        continue;
      }
      if (placeholderId) {
        const newProps_0 = isVideo ? {
          src: result_7.src,
          controls: true
        } : {
          src: result_7.src,
          alt: t("insertDefaults.imageAlt")
        };
        const cleared = clearMarkers(storeRef.current);
        const setOp = createSetPropsOperation(cleared, placeholderId, newProps_0);
        setStore(setOp ? history.pushOperation(activeTabId, cleared, setOp) : cleared);
      }
      toast.dismiss(toastId_3);
    }
    if (clipboardMediaFiles.length > 0) return;
    const result_8 = await readElementFromClipboard(readOnly ? void 0 : uploadImage);
    if (result_8.error) {
      toast.error(t("canvas.pasteImageFailed"), result_8.errorMessage ? { description: result_8.errorMessage } : void 0);
      return;
    }
    if (result_8.element) {
      applyDropPosition(result_8.element, dropPosition_0);
      addPastedElementToCanvas(result_8.element);
    }
  };
  const pasteMultipleElements = async (elementsToPaste, opts_4) => {
    if (!activeTabId || elementsToPaste.length === 0) return [];
    const ops_15 = [];
    const newIds_1 = [];
    const pastedIds = new Set(elementsToPaste.map(el_9 => el_9.id));
    if (!opts_4?.atRoot && !opts_4?.parentId) {
      const targets_1 = resolveMultiPasteTargets(storeRef.current, selectedElementIds, elementsToPaste);
      if (targets_1.length > 0) return pasteIntoContainers(targets_1, elementsToPaste, opts_4?.sources);
    }
    let targetId_5 = opts_4?.parentId ?? (opts_4?.atRoot ? null : selectedElementId ?? null);
    if (!opts_4?.parentId && !opts_4?.atRoot && selectedElementId && pastedIds.has(selectedElementId)) {
      const parentKey_7 = getParentId(storeRef.current, selectedElementId);
      targetId_5 = parentKey_7 === "ROOT" || parentKey_7 === null ? null : parentKey_7;
    }
    const targetElement_0 = targetId_5 ? getById(storeRef.current, targetId_5) : null;
    if (!!targetElement_0 && hasChildren$1(targetElement_0) && elementsToPaste.every(el_10 => canAcceptChild(targetElement_0, el_10))) {
      const childrenCount_0 = getChildren$2(storeRef.current, targetId_5).length;
      for (const el_11 of elementsToPaste) {
        const cloned_0 = cloneElementWithNewIds(el_11);
        ops_15.push(createInsertOperation(cloned_0, targetId_5, childrenCount_0 + ops_15.length));
        newIds_1.push(cloned_0.id);
      }
    } else {
      let minX = Infinity,
        minY = Infinity;
      let hasExplicitPositions = false;
      for (const el_12 of elementsToPaste) if (el_12.canvasPosition) {
        hasExplicitPositions = true;
        minX = Math.min(minX, el_12.canvasPosition.x);
        minY = Math.min(minY, el_12.canvasPosition.y);
      }
      let basePosition = {
        x: 20,
        y: 20
      };
      if (opts_4?.dropPosition) basePosition = opts_4.dropPosition;else if (hasExplicitPositions && minX !== Infinity && minY !== Infinity) basePosition = {
        x: minX,
        y: minY
      };else basePosition = getPasteCanvasPosition() ?? basePosition;
      if (minX === Infinity) minX = 0;
      if (minY === Infinity) minY = 0;
      for (const el_13 of elementsToPaste) {
        const cloned_1 = cloneElementWithNewIds(el_13);
        stripRootPositioning(cloned_1);
        if (el_13.canvasPosition) cloned_1.canvasPosition = {
          x: basePosition.x + (el_13.canvasPosition.x - minX),
          y: basePosition.y + (el_13.canvasPosition.y - minY)
        };else cloned_1.canvasPosition = basePosition;
        ops_15.push(createInsertOperation(cloned_1, null, getRootIds(storeRef.current).length + ops_15.length));
        newIds_1.push(cloned_1.id);
      }
    }
    if (ops_15.length > 0) {
      const nextStore_11 = history.pushOperation(activeTabId, storeRef.current, ops_15);
      setStore(nextStore_11);
      setSelectedElementIds(new Set(newIds_1));
    }
    return newIds_1;
  };
  const pasteCompositionJsx = (jsx_0, elements_4) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", elements_4?.length ? createCompositionDragPayload(elements_4) : jsx_0);
    dataTransfer.setData(COMPOSITION_DRAG_MIME, "1");
    onPasteElement(dataTransfer);
  };
  const onCreateComponent = async componentName_5 => {
    if (!selectedElementId) {
      console.error("Cannot create component: no element selected");
      return;
    }
    if (!activeTab?.canvasId) {
      console.error("Cannot create component: not in a valid canvas tab");
      return;
    }
    const element_9 = getById(currentStore, selectedElementId);
    if (!element_9) {
      console.error("Selected element not found");
      return;
    }
    const elementWithSubtree = storeSubtreeToLegacyNested(currentStore, selectedElementId);
    const targetFilePath = `components/${componentName_5}.tsx`;
    const code = generateCompleteFile({
      componentName: componentName_5,
      purpose: "project",
      store: currentStore,
      rootId: selectedElementId,
      variableLibrary: variableRuntime?.library,
      variablePageModes: currentStore.variableModes ?? variableRuntime?.defaultModes,
      componentIndex,
      targetFilePath
    });
    const result_9 = await createComponent({
      componentName: componentName_5,
      code,
      sourceFilePath: targetFilePath
    });
    if (!result_9.success) {
      console.error("Failed to create component:", result_9.error);
      if (result_9.reason && isPlanLimitReason(result_9.reason)) {
        const description = result_9.error ?? t("shell.planLimitMessage");
        onPlanLimit?.({
          reason: result_9.reason,
          message: description
        });
        return;
      }
      toast.error(t("shell.createComponentFailed", { error: result_9.error }));
      return;
    }
    toast.success(t("shell.createdComponent", { name: componentName_5 }));
    if (onComponentCreated && result_9.path) await onComponentCreated(componentName_5, result_9.path, code);
    const componentElement_0 = {
      id: generatePrefixedId("component"),
      type: "component",
      componentName: componentName_5,
      props: {},
      ...(!hasChildren$1(element_9) || element_9.canvasPosition ? {
        canvasPosition: element_9.canvasPosition
      } : {})
    };
    const op_25 = createReplaceOperation(storeRef.current, selectedElementId, componentElement_0);
    if (op_25 && activeTabId) {
      const nextStore_12 = history.pushOperation(activeTabId, storeRef.current, op_25);
      setStore(nextStore_12);
    }
    setSelectedElementIds(new Set());
  };
  const wrapSelectionInContainer = opts_5 => {
    if (selectedElementIds.size === 0 || !activeTabId) return;
    const store_6 = storeRef.current;
    const selectedIds_0 = Array.from(selectedElementIds);
    const rectsById = new Map();
    for (const id_15 of selectedIds_0) {
      const rect_1 = getElementRect$1(id_15);
      if (rect_1) rectsById.set(id_15, rect_1);
    }
    if (rectsById.size === 0) return;
    const rects = Array.from(rectsById.values());
    const layoutDirection = inferSelectionLayoutDirection(rects);
    const ids_4 = sortIdsByLayoutDirection(selectedIds_0, rectsById, layoutDirection);
    const left = Math.min(...rects.map(r => r.left));
    const top = Math.min(...rects.map(r_0 => r_0.top));
    const bbox = {
      left,
      top,
      width: Math.max(...rects.map(r_1 => r_1.right)) - left,
      height: Math.max(...rects.map(r_2 => r_2.bottom)) - top
    };
    const canvasRect_1 = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect_1) return;
    const {
      scale: scale_2
    } = getCamera();
    const firstId = ids_4[0];
    const first = getById(store_6, firstId);
    if (!first) return;
    const parentKey_8 = getParentId(store_6, firstId);
    const parentId_3 = parentKey_8 === "ROOT" || parentKey_8 === null ? null : parentKey_8;
    const insertIndex = getIndex(store_6, firstId);
    if (insertIndex < 0) return;
    const container = opts_5.makeContainer({
      first,
      layoutDirection,
      bbox,
      scale: scale_2,
      canvasRect: canvasRect_1
    });
    const ops_16 = [createInsertOperation(container, parentId_3, insertIndex)];
    let target_3 = 0;
    for (const id_16 of ids_4) {
      if (opts_5.pinChild) {
        const el_14 = getById(store_6, id_16);
        const rect_2 = rectsById.get(id_16);
        if (el_14 && rect_2) {
          const styleOp_2 = createSetStylesOperation(applyOperationsToStore(store_6, ops_16), id_16, opts_5.pinChild({
            el: el_14,
            rect: rect_2,
            bbox,
            scale: scale_2
          }));
          if (styleOp_2) ops_16.push(styleOp_2);
        }
      }
      const move_0 = createMoveOperation(applyOperationsToStore(store_6, ops_16), id_16, container.id, target_3);
      if (move_0) {
        ops_16.push(move_0);
        target_3 += 1;
      }
    }
    const nextStore_13 = history.pushOperation(activeTabId, store_6, ops_16);
    setStore(nextStore_13);
    setSelectedElementIds(new Set([container.id]));
  };
  const onWrapInDiv = () => {
    wrapSelectionInContainer({
      makeContainer: ({
        first: first_0,
        layoutDirection: layoutDirection_0
      }) => ({
        id: generatePrefixedId("wrapper"),
        type: "html",
        tag: "div",
        styles: {
          display: "flex",
          flexDirection: layoutDirection_0,
          gap: "8px"
        },
        canvasPosition: first_0.canvasPosition ? {
          ...first_0.canvasPosition
        } : void 0
      })
    });
  };
  const onFrameSelection = () => {
    if (readOnly || selectedElementIds.size < 2) return;
    wrapSelectionInContainer({
      makeContainer: ({
        bbox: bbox_0,
        scale: scale_3,
        canvasRect: canvasRect_2
      }) => ({
        id: generatePrefixedId("frame"),
        type: "html",
        tag: "div",
        styles: {
          position: "relative",
          width: Math.round(bbox_0.width / scale_3),
          height: Math.round(bbox_0.height / scale_3)
        },
        canvasPosition: {
          x: (bbox_0.left - canvasRect_2.left) / scale_3,
          y: (bbox_0.top - canvasRect_2.top) / scale_3
        }
      }),
      pinChild: ({
        el: el_15,
        rect: rect_3,
        bbox: bbox_1,
        scale: scale_4
      }) => ({
        ...(el_15.styles || {}),
        position: "absolute",
        left: Math.round((rect_3.left - bbox_1.left) / scale_4),
        top: Math.round((rect_3.top - bbox_1.top) / scale_4),
        width: Math.round(rect_3.width / scale_4),
        height: Math.round(rect_3.height / scale_4)
      })
    });
  };
  const refreshOpenCodeFile = async filePath_6 => {
    const match = openCodeFilesRef.current.find(f_7 => f_7.path === filePath_6 || f_7.path.endsWith("/" + filePath_6) || filePath_6.endsWith("/" + f_7.path));
    if (!match) return;
    const readFileRaw_0 = chatBackend ? chatBackend.readFileRaw : void 0;
    if (!readFileRaw_0) return;
    const version = beginFileRead(match.path);
    let content_6;
    try {
      content_6 = await readFileRaw_0(match.path);
    } catch {
      return;
    }
    if (content_6 != null && fileReadVersionsRef.current.get(match.path) === version) setOpenCodeFiles(prev_29 => prev_29.map(f_8 => f_8.path === match.path ? {
      ...f_8,
      content: content_6
    } : f_8));
  };
  const refreshOpenCodeFileRef = (0, import_react.useRef)(refreshOpenCodeFile);
  (0, import_react.useLayoutEffect)(() => {
    refreshOpenCodeFileRef.current = refreshOpenCodeFile;
  });
  const refreshFocusedComponent = async filePath_7 => {
    if (isCompositionFile(filePath_7)) setCompositionRefreshKey(key_2 => key_2 + 1);
    refreshOpenCodeFileRef.current(filePath_7);
  };
  const refreshFocusedComponentRef = (0, import_react.useRef)(refreshFocusedComponent);
  (0, import_react.useLayoutEffect)(() => {
    refreshFocusedComponentRef.current = refreshFocusedComponent;
  });
  (0, import_react.useEffect)(() => {
    if (onFileChangedRef) {
      onFileChangedRef.current = filePath_8 => {
        refreshFocusedComponentRef.current(filePath_8);
      };
      return () => {
        onFileChangedRef.current = null;
      };
    }
  }, [onFileChangedRef]);
  const lastPreviewAtRef = (0, import_react.useRef)(0);
  const capturingPreviewRef = (0, import_react.useRef)(false);
  const previewTimerRef = (0, import_react.useRef)(null);
  const saveSnapshotRef = (0, import_react.useRef)(null);
  const saveErrorRef = (0, import_react.useRef)(null);
  const canvasSaveQueue = (0, import_react.useMemo)(() => createVersionedSaveQueue({
    delayMs: 1000,
    equal: (a, b) => a.store === b.store && a.name === b.name
      && a.backgroundColor === b.backgroundColor && a.backgroundToken === b.backgroundToken,
    save: (id, snapshot, version) => saveSnapshotRef.current(id, snapshot, version),
    onError: error => saveErrorRef.current?.(error)
  }), []);
  const schedulePreview = (canvasId, version) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(async () => {
      previewTimerRef.current = null;
      const current = () => canvasSaveQueue.isCurrent(canvasId, version)
        && activeTabIdRef.current === canvasId && !canvasSaveQueue.hasPending();
      if (!current() || capturingPreviewRef.current || Date.now() - lastPreviewAtRef.current < 3e5) return;
      capturingPreviewRef.current = true;
      try {
        const dataUrl = await captureCanvasPreview();
        // A capture can outlive a page switch or an edit. Never publish that
        // obsolete derived result as the preview of the latest saved document.
        if (dataUrl && current()) {
          await savePreview(dataUrl);
          lastPreviewAtRef.current = Date.now();
        }
      } catch { /* A thumbnail failure must not affect the document save. */ }
      finally { capturingPreviewRef.current = false; }
    }, 1000);
  };
  const persistCanvasSnapshot = async (canvasId, snapshot, version) => {
    const { store, name, tabId, revision, backgroundColor, backgroundToken } = snapshot;
    // Serialization is intentionally inside the scheduled task, not in an
    // effect on every keystroke, mode change or selection render.
    const wire = toWire(store);
    const serialized = JSON.stringify(wire);
    const camera = tabId === activeTabIdRef.current ? getCamera() : tabTransformsRef.current[tabId];
    const result = await saveCanvas({ id: canvasId, name, elements: wire, zoom: camera?.scale,
      backgroundColor, backgroundToken });
    if (!result.success) {
      for (const [operationId, pending] of pendingCanvasOperationPersistenceRef.current) {
        if (pending.canvasId !== canvasId || pending.committedRevision > revision) continue;
        window.api?.send?.("canvas_operation_persistence", { projectId: projectPath, operationId,
          resolvedCanvasId: canvasId, committedRevision: revision, persistenceState: "failed" });
      }
      throw new Error(result.error || t("shell.pageSaveFailed"));
    }
    if (canvasSaveQueue.isCurrent(canvasId, version)) {
      setTabs(current => current.map(tab => tab.id === tabId && tab.store === store
        && tab.name === name && tab.backgroundColor === backgroundColor && tab.backgroundToken === backgroundToken
        ? { ...tab, lastSavedState: serialized } : tab));
      setPages(current => current.map(page => page.id === canvasId ? { ...page, elementCount: store.byId.size } : page));
      schedulePreview(canvasId, version);
    }
    onCanvasSaved?.();
    toast.dismiss("canvas-save-error");
    for (const [operationId, pending] of pendingCanvasOperationPersistenceRef.current) {
      if (pending.canvasId !== canvasId || pending.committedRevision > revision) continue;
      window.api?.send?.("canvas_operation_persistence", { projectId: projectPath, operationId,
        resolvedCanvasId: canvasId, committedRevision: revision, persistenceState: "saved" });
      pendingCanvasOperationPersistenceRef.current.delete(operationId);
    }
  };
  (0, import_react.useLayoutEffect)(() => {
    saveSnapshotRef.current = persistCanvasSnapshot;
    saveErrorRef.current = () => toast.error(t("shell.pageSaveFailed"), { id: "canvas-save-error", duration: Infinity });
  });
  const collectCanvasSaves = (0, import_react.useEffectEvent)(() => {
    if (readOnly) return;
    for (const tab of tabs) {
      if (!tab.canvasId || !tab.loaded) continue;
      canvasSaveQueue.update(tab.canvasId, { tabId: tab.id, store: tab.store, name: tab.name,
        backgroundColor: tab.backgroundColor, backgroundToken: tab.backgroundToken,
        revision: canvasContentRevisionsRef.current.get(tab.id) ?? 0 });
    }
  });
  (0, import_react.useLayoutEffect)(() => { collectCanvasSaves(); }, [tabs, pages, readOnly]);
  (0, import_react.useEffect)(() => () => {
    canvasSaveQueue.dispose();
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
  }, [canvasSaveQueue]);
  const flushProjectCanvases = (0, import_react.useEffectEvent)(async () => {
    if (readOnly) return;
    collectCanvasSaves();
    await canvasSaveQueue.flush();
  });
  const openingBrowserPreviewRef = (0, import_react.useRef)(false);
  const openBrowserPreview = (0, import_react.useEffectEvent)(async (elementId) => {
    if (openingBrowserPreviewRef.current) return;
    openingBrowserPreviewRef.current = true;
    try {
      await flushProjectCanvases();
      await window.api.invoke("bingo:open-presentation", {
        projectId: effectiveProjectPath, pageId: activePageId,
        elementId: elementId ?? selectedElementId, locale: i18n.resolvedLanguage
      });
    } catch (error) {
      toast.error(t("preview.openFailed", { error: error?.message || String(error) }));
    } finally {
      openingBrowserPreviewRef.current = false;
    }
  });
  (0, import_react.useEffect)(() => {
    if (!openBrowserPreviewRef) return;
    openBrowserPreviewRef.current = () => openBrowserPreview();
    return () => { openBrowserPreviewRef.current = null; };
  }, [openBrowserPreviewRef]);
  (0, import_react.useEffect)(() => {
    const prepare = event => event.detail.pending.push(flushProjectCanvases());
    window.addEventListener("bingo:prepare-project-close", prepare);
    return () => window.removeEventListener("bingo:prepare-project-close", prepare);
  }, []);
  (0, import_react.useEffect)(() => {
    if (readOnly || !activeTab?.canvasId || !activeTab.loaded) return;
    const rootCount = getRootIds(activeTab.store).length;
    if (rootCount >= POPULATED_PAGE_ROOT_COUNT && !populatedPageIdsRef.current.has(activeTab.canvasId)) {
      populatedPageIdsRef.current.add(activeTab.canvasId);
      onActivityRef.current?.({ type: "page_populated", pageId: activeTab.canvasId, elementCount: rootCount });
    }
  }, [activeTab?.store, activeTab?.canvasId, activeTab?.loaded, readOnly]);
  (0, import_react.useEffect)(() => {
    if (readOnly) return;
    const handleBeforeUnload = event => {
      if (canvasSaveQueue.hasPending()) event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [readOnly, canvasSaveQueue]);
  useGlobalShortcut("focusLayersSearch", e_4 => {
    if (isCodeEditorTarget(e_4)) return;
    e_4.preventDefault();
    if (enableSidebarV2) {
      setSidebarV2Tab("pages");
      pagesSidebarRef.current?.openSearch();
      return;
    }
    setLeftPanelTab("layers");
    requestAnimationFrame(() => layersSearchRef.current?.focus());
  });
  useGlobalShortcut("togglePreviewWindow", e_5 => {
    if (isTypingTarget(e_5)) return;
    e_5.preventDefault();
    setPreviewOpen(v => !v);
  });
  useGlobalShortcut("closePreviewWindow", e_6 => {
    if (isTypingTarget(e_6)) return;
    e_6.preventDefault();
    setPreviewOpen(false);
  }, previewOpen);
  useGlobalShortcut("copySelectionLink", e_7 => {
    if (isTypingTarget(e_7)) return;
    e_7.preventDefault();
    copySelectionLink();
  }, !!selectedElementId);
  useGlobalShortcut("openComponentFile", e_8 => {
    if (isTypingTarget(e_8)) return;
    e_8.preventDefault();
    openSelectedComponentFile();
  }, !!selectedElementId);
  useGlobalShortcut("openInsertPanel", e_9 => {
    if (isTypingTarget(e_9)) return;
    e_9.preventDefault();
    revealInsertPanel();
  }, !readOnly);
  const nudgeSessionRef = (0, import_react.useRef)(null);
  const applyStore = (0, import_react.useEffectEvent)(setStore);
  const undoLatest = (0, import_react.useEffectEvent)(onUndo);
  const redoLatest = (0, import_react.useEffectEvent)(onRedo);
  const handleKeyDown = (0, import_react.useEffectEvent)(e_10 => {
    if (isAddToPromptShortcut(e_10)) {
      e_10.preventDefault();
      if (!readOnly) addToPrompt([...selectedElementIds]);
      return;
    }
    const target_4 = e_10.target;
    if (target_4.tagName === "INPUT" || target_4.tagName === "TEXTAREA" || target_4.isContentEditable) return;
    if ((e_10.metaKey || e_10.ctrlKey) && e_10.key === "\\") {
      e_10.preventDefault();
      setChromeHidden(v_0 => !v_0);
      return;
    }
    if (e_10.key === "Escape" && chromeHidden) {
      setChromeHidden(false);
      return;
    }
    if (e_10.key === "Escape") {
      if (selectedElementIds.size > 0) {
        const selectedId_2 = Array.from(selectedElementIds)[0];
        const store_7 = storeRef.current;
        const parentKey_9 = getParentId(store_7, selectedId_2);
        const parentId_4 = parentKey_9 === "ROOT" || parentKey_9 === null ? null : parentKey_9;
        if (parentId_4) {
          const grandparentKey = getParentId(store_7, parentId_4);
          const grandparentId = grandparentKey === "ROOT" || grandparentKey === null ? null : grandparentKey;
          setSelectedElementIds(new Set([parentId_4]));
          setDrilledParentId(grandparentId);
        } else {
          setSelectedElementIds(new Set());
          setDrilledParentId(null);
        }
        return;
      }
    }
    if (e_10.key === "Enter" && e_10.shiftKey && selectedElementIds.size > 0) {
      e_10.preventDefault();
      const selectedId_3 = Array.from(selectedElementIds)[0];
      const store_8 = storeRef.current;
      const parentKey_10 = getParentId(store_8, selectedId_3);
      const parentId_5 = parentKey_10 === "ROOT" || parentKey_10 === null ? null : parentKey_10;
      if (parentId_5) {
        const grandparentKey_0 = getParentId(store_8, parentId_5);
        const grandparentId_0 = grandparentKey_0 === "ROOT" || grandparentKey_0 === null ? null : grandparentKey_0;
        setSelectedElementIds(new Set([parentId_5]));
        setDrilledParentId(grandparentId_0);
      }
      return;
    }
    if ((e_10.metaKey || e_10.ctrlKey) && (e_10.key === "c" || e_10.key === "x")) {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;
    }
    if ((e_10.key === "Delete" || e_10.key === "Backspace") && selectedElementIds.size > 0) {
      e_10.preventDefault();
      onDeleteElements(selectedElementIds);
    }
    if ((e_10.metaKey || e_10.ctrlKey) && !e_10.shiftKey && e_10.key.toLowerCase() === "z") {
      e_10.preventDefault();
      undoLatest();
    }
    if ((e_10.metaKey || e_10.ctrlKey) && (e_10.shiftKey && e_10.key.toLowerCase() === "z" || e_10.key.toLowerCase() === "y")) {
      e_10.preventDefault();
      redoLatest();
    }
    if ((e_10.metaKey || e_10.ctrlKey) && e_10.key === "d" && selectedElementIds.size > 0) {
      e_10.preventDefault();
      onDuplicateElements(selectedElementIds);
    }
    if ((e_10.metaKey || e_10.ctrlKey) && !e_10.shiftKey && e_10.key === "c" && selectedElementIds.size > 0) {
      e_10.preventDefault();
      if (selectedElementIds.size === 1) onCopyElement(Array.from(selectedElementIds)[0]);else onCopyElements(selectedElementIds);
    }
    if ((e_10.metaKey || e_10.ctrlKey) && e_10.key === "x" && selectedElementIds.size > 0) {
      e_10.preventDefault();
      if (selectedElementIds.size === 1) onCutElement(Array.from(selectedElementIds)[0]);else onCutElements(selectedElementIds);
    }
    if ((e_10.metaKey || e_10.ctrlKey) && e_10.shiftKey && e_10.key.toLowerCase() === "r") {
      e_10.preventDefault();
      if (selectedElementIds.size > 0) onPasteToReplace(selectedElementIds);
    }
    if (e_10.altKey && e_10.code === "KeyK" && selectedElementId && (e_10.metaKey && !e_10.ctrlKey || e_10.ctrlKey && !e_10.metaKey)) {
      e_10.preventDefault();
      setShowCreateComponentModal(true);
    }
    if (e_10.shiftKey && e_10.key.toLowerCase() === "a" && selectedElementIds.size > 0) {
      e_10.preventDefault();
      onWrapInDiv();
    }
    if (e_10.altKey && e_10.code === "KeyG" && selectedElementIds.size >= 2 && (e_10.metaKey && !e_10.ctrlKey || e_10.ctrlKey && !e_10.metaKey)) {
      e_10.preventDefault();
      onFrameSelection();
    }
    if (ARROW_KEYS.includes(e_10.key) && selectedElementIds.size > 0 && !e_10.metaKey && !e_10.ctrlKey && !e_10.altKey && activeTabId) {
      const store_9 = storeRef.current;
      const num = v_1 => {
        const n_2 = typeof v_1 === "number" ? v_1 : parseFloat(String(v_1));
        return Number.isFinite(n_2) ? n_2 : null;
      };
      const isNudgeable = id_17 => {
        const pk = getParentId(store_9, id_17);
        if (pk === "ROOT" || pk === null) return true;
        const el_16 = getById(store_9, id_17);
        const pos_0 = el_16 && "styles" in el_16 ? el_16.styles?.position : void 0;
        return pos_0 === "absolute" || pos_0 === "fixed";
      };
      const nudgeIds = Array.from(selectedElementIds).filter(isNudgeable);
      if (nudgeIds.length > 0) {
        e_10.preventDefault();
        const step = e_10.shiftKey ? 10 : 1;
        const ddx = e_10.key === "ArrowLeft" ? -step : e_10.key === "ArrowRight" ? step : 0;
        const ddy = e_10.key === "ArrowUp" ? -step : e_10.key === "ArrowDown" ? step : 0;
        if (!nudgeSessionRef.current) {
          const targets_2 = [];
          for (const id_18 of nudgeIds) {
            const overlayNode = document.querySelector(`[data-selection-overlay-id="${CSS.escape(id_18)}"]`);
            const startOverlayLeft = overlayNode ? parseFloat(overlayNode.style.left) || 0 : 0;
            const startOverlayTop = overlayNode ? parseFloat(overlayNode.style.top) || 0 : 0;
            const labelNode = document.querySelector(`[data-selection-label-id="${CSS.escape(id_18)}"]`);
            const startLabelLeft = labelNode ? parseFloat(labelNode.style.left) || 0 : 0;
            const startLabelTop = labelNode ? parseFloat(labelNode.style.top) || 0 : 0;
            const pk_0 = getParentId(store_9, id_18);
            const isRoot = pk_0 === "ROOT" || pk_0 === null;
            const el_17 = getById(store_9, id_18);
            if (isRoot) {
              const moveNode = document.querySelector(`[data-canvas-root-id="${CSS.escape(id_18)}"]`);
              if (!moveNode) continue;
              const startCanvasPos = el_17 && "canvasPosition" in el_17 && el_17.canvasPosition ? {
                ...el_17.canvasPosition
              } : {
                x: 0,
                y: 0
              };
              targets_2.push({
                id: id_18,
                moveNode,
                overlayNode,
                startOverlayLeft,
                startOverlayTop,
                labelNode,
                startLabelLeft,
                startLabelTop,
                isRoot: true,
                startCanvasPos,
                startStyles: {},
                xProp: "left",
                xStart: startCanvasPos.x,
                yProp: "top",
                yStart: startCanvasPos.y
              });
            } else {
              const raw_0 = document.querySelector(`[data-element-id="${CSS.escape(id_18)}"]`);
              const moveNode_0 = raw_0 ? resolveVisibleElement$1(raw_0) : null;
              if (!moveNode_0) continue;
              const styles_2 = el_17 && "styles" in el_17 && el_17.styles || {};
              const xProp = num(styles_2.left) === null && num(styles_2.right) !== null ? "right" : "left";
              const yProp = num(styles_2.top) === null && num(styles_2.bottom) !== null ? "bottom" : "top";
              const xStart = num(styles_2[xProp]) ?? (xProp === "left" ? moveNode_0.offsetLeft : 0);
              const yStart = num(styles_2[yProp]) ?? (yProp === "top" ? moveNode_0.offsetTop : 0);
              targets_2.push({
                id: id_18,
                moveNode: moveNode_0,
                overlayNode,
                startOverlayLeft,
                startOverlayTop,
                labelNode,
                startLabelLeft,
                startLabelTop,
                isRoot: false,
                startCanvasPos: {
                  x: 0,
                  y: 0
                },
                startStyles: styles_2,
                xProp,
                xStart,
                yProp,
                yStart
              });
            }
          }
          nudgeSessionRef.current = {
            targets: targets_2,
            dx: 0,
            dy: 0,
            scale: getCamera().scale || 1
          };
        }
        const session_3 = nudgeSessionRef.current;
        session_3.dx += ddx;
        session_3.dy += ddy;
        const {
          dx,
          dy,
          scale: scale_5
        } = session_3;
        for (const t_15 of session_3.targets) {
          t_15.moveNode.style[t_15.xProp] = `${nudgedCoord(t_15.xStart, t_15.xProp, dx)}px`;
          t_15.moveNode.style[t_15.yProp] = `${nudgedCoord(t_15.yStart, t_15.yProp, dy)}px`;
          if (t_15.overlayNode) {
            t_15.overlayNode.style.left = `${t_15.startOverlayLeft + dx * scale_5}px`;
            t_15.overlayNode.style.top = `${t_15.startOverlayTop + dy * scale_5}px`;
          }
          if (t_15.labelNode) {
            t_15.labelNode.style.left = `${t_15.startLabelLeft + dx * scale_5}px`;
            t_15.labelNode.style.top = `${t_15.startLabelTop + dy * scale_5}px`;
          }
        }
        return;
      }
    }
    if (ARROW_KEYS.includes(e_10.key) && selectedElementIds.size > 0 && activeTabId && !e_10.metaKey && !e_10.ctrlKey && !e_10.altKey && !e_10.shiftKey) {
      const steps = planSelectionReorder(currentStore, selectedElementIds, e_10.key);
      if (steps.length === 0) return;
      e_10.preventDefault();
      const ops_17 = [];
      let cursor_7 = currentStore;
      for (const step_0 of steps) {
        const siblings = step_0.parentId === null ? getRootIds(cursor_7) : getChildren$2(cursor_7, step_0.parentId);
        const fromIndex = siblings.indexOf(step_0.id);
        if (fromIndex === -1) continue;
        const toIndex = fromIndex + step_0.offset;
        if (toIndex < 0 || toIndex >= siblings.length) continue;
        const moveOp = createMoveOperation(cursor_7, step_0.id, step_0.parentId, toIndex);
        if (!moveOp) continue;
        ops_17.push(moveOp);
        cursor_7 = applyOperationsToStore(cursor_7, [moveOp]);
      }
      if (ops_17.length > 0) applyStore(history.pushOperation(activeTabId, currentStore, ops_17));
    }
  });
  const handlePaste = (0, import_react.useEffectEvent)(e_11 => {
    const target_5 = e_11.target;
    if (target_5?.tagName === "INPUT" || target_5?.tagName === "TEXTAREA" || target_5?.isContentEditable) return;
    e_11.preventDefault();
    onPasteElement(e_11.clipboardData, getPasteCanvasPosition());
  });
  const commitNudgeSession = (0, import_react.useEffectEvent)(() => {
    const session_4 = nudgeSessionRef.current;
    if (!session_4) return;
    nudgeSessionRef.current = null;
    const tabId_7 = activeTabIdRef.current;
    if (!tabId_7 || session_4.dx === 0 && session_4.dy === 0) return;
    const {
      dx: dx_0,
      dy: dy_0
    } = session_4;
    const ops_18 = [];
    let cursor_8 = storeRef.current;
    for (const t_16 of session_4.targets) {
      if (!getById(cursor_8, t_16.id)) continue;
      if (t_16.isRoot) {
        const op_26 = createSetPositionOperation(cursor_8, t_16.id, {
          x: t_16.startCanvasPos.x + dx_0,
          y: t_16.startCanvasPos.y + dy_0
        });
        if (op_26) {
          ops_18.push(op_26);
          cursor_8 = applyOperationsToStore(cursor_8, [op_26]);
        }
      } else {
        const next_16 = {
          ...t_16.startStyles
        };
        next_16[t_16.xProp] = nudgedCoord(t_16.xStart, t_16.xProp, dx_0);
        next_16[t_16.yProp] = nudgedCoord(t_16.yStart, t_16.yProp, dy_0);
        const op_27 = createSetStylesOperation(cursor_8, t_16.id, next_16);
        if (op_27) {
          ops_18.push(op_27);
          cursor_8 = applyOperationsToStore(cursor_8, [op_27]);
        }
      }
    }
    if (ops_18.length > 0) {
      const nextStore_14 = history.pushOperation(tabId_7, storeRef.current, ops_18);
      applyStore(nextStore_14);
    }
  });
  const handleKeyUp = (0, import_react.useEffectEvent)(e_12 => {
    if (!nudgeSessionRef.current || !ARROW_KEYS.includes(e_12.key)) return;
    commitNudgeSession();
  });
  const handleNudgeBlur = (0, import_react.useEffectEvent)(() => commitNudgeSession());
  const handleVisibilityChange = (0, import_react.useEffectEvent)(() => {
    if (document.visibilityState === "hidden") commitNudgeSession();
  });
  (0, import_react.useEffect)(() => {
    if (readOnly || previewOpen) return;
    const handlePointerMove = e_13 => {
      const p_11 = lastPointerScreenRef.current;
      p_11.x = e_13.clientX;
      p_11.y = e_13.clientY;
      p_11.valid = true;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("paste", handlePaste);
    window.addEventListener("blur", handleNudgeBlur);
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", handleNudgeBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [readOnly, previewOpen]);
  const scrubSessionValue = {
    onStart: () => {
      const tabId_8 = activeTabIdRef.current;
      if (tabId_8) history.beginScrub(tabId_8);
    },
    onEnd: () => history.endScrub()
  };
  if (protoMode) return <ProtoPlayer store={currentStore} rootIds={getRootIds(currentStore)} startId={elementParam ?? void 0} pageName={pages.find(p_12 => p_12.id === activePageId)?.name} components={components} componentIndex={componentIndex} iconLibraries={iconLibraries} assetResolver={assetResolver} />;
  const renderContextMenuItems = targetId_6 => {
    const el_18 = targetId_6 ? getById(currentStore, targetId_6) : null;
    const isComponent = el_18?.type === "component";
    const isCapture = el_18?.type === "capture";
    const componentName_6 = isComponent ? el_18.componentName : null;
    const componentFilePath = componentName_6 ? mergedComponentIndex[componentName_6]?.path : void 0;
    return <>{isComponent && componentName_6 && componentFilePath && <>{enableComponentEditV2 && !readOnly && targetId_6 && <ContextMenuItem disabled={rendersThroughWebgl(targetId_6)} onSelect={() => {
          handleEditComponent(targetId_6);
        }}>{<span>{rendersThroughWebgl(targetId_6) ? t("shell.editComponentWebgl") : t("shell.editComponent")}</span>}</ContextMenuItem>}{<ContextMenuItem onSelect={() => openHelpDraftInNewChat(`Edit the ${componentName_6} component at ${componentFilePath}.`)}>{<span>{t("shell.editWithAssistant")}</span>}{<SparkleIcon width={14} height={14} className="ml-auto" />}</ContextMenuItem>}{<ContextMenuItem onSelect={() => openComponentFile(componentName_6, componentFilePath)}>{<span>{t("shell.openComponentFile")}</span>}{<ContextMenuShortcut>⌃⌥⌘K</ContextMenuShortcut>}</ContextMenuItem>}</>}{!readOnly && !isComponent && !isCapture && targetId_6 && <ContextMenuItem onSelect={() => setShowCreateComponentModal(true)}>{<span>{t("shell.createComponent")}</span>}{<ContextMenuShortcut>⌥⌘K</ContextMenuShortcut>}</ContextMenuItem>}{!readOnly && targetId_6 && <ContextMenuItem onSelect={() => {
        suppressMenuCloseFocusRef.current = true;
        const elementIds_5 = selectedElementIds.has(targetId_6) ? [...selectedElementIds] : [targetId_6];
        requestAnimationFrame(() => addToPrompt(elementIds_5));
      }}>{<span>{t("shell.addToPrompt")}</span>}{<ContextMenuShortcut>⌘L</ContextMenuShortcut>}</ContextMenuItem>}{!readOnly && targetId_6 && <ContextMenuItem onSelect={() => handleRequestRename(targetId_6)}>{<span>{t("shell.rename")}</span>}</ContextMenuItem>}{!readOnly && selectedElementIds.size >= 2 && <ContextMenuItem onSelect={() => onFrameSelection()}>{<span>{t("shell.frameSelection")}</span>}{<ContextMenuShortcut>⌥⌘G</ContextMenuShortcut>}</ContextMenuItem>}{targetId_6 && <>{<ContextMenuSeparator />}{<ContextMenuItem onSelect={() => {
          const ids_5 = selectedElementIds.size > 0 ? selectedElementIds : new Set([targetId_6]);
          if (ids_5.size <= 1) onCopyElement(Array.from(ids_5)[0]);else onCopyElements(ids_5);
        }}>{<span>{t("shell.copy")}</span>}{<ContextMenuShortcut>⌘C</ContextMenuShortcut>}</ContextMenuItem>}</>}{!readOnly && <ContextMenuItem onSelect={() => {
        const rect_4 = canvasRef.current?.getBoundingClientRect();
        const {
          scale: scale_6
        } = getCamera();
        const pt = contextMenuPointRef.current;
        const dropPosition_1 = rect_4 && pt ? {
          x: (pt.x - rect_4.left) / scale_6,
          y: (pt.y - rect_4.top) / scale_6
        } : void 0;
        onPasteElement(void 0, dropPosition_1, void 0, targetId_6 ? void 0 : {
          atRoot: true
        });
      }}>{<span>{t("shell.pasteHere")}</span>}</ContextMenuItem>}{!readOnly && targetId_6 && <ContextMenuItem onSelect={() => {
        const ids_6 = selectedElementIds.size > 0 ? selectedElementIds : new Set([targetId_6]);
        onPasteToReplace(ids_6);
      }}>{<span>{t("shell.pasteToReplace")}</span>}{<ContextMenuShortcut>⇧⌘R</ContextMenuShortcut>}</ContextMenuItem>}{targetId_6 && <>{<ContextMenuItem onSelect={async () => {
          const jsx_1 = generateJSX(currentStore, 0, { purpose: "project", rootId: targetId_6, variableLibrary: variableRuntime?.library, variablePageModes: currentStore.variableModes ?? variableRuntime?.defaultModes });
          try {
            await navigator.clipboard.writeText(jsx_1);
            toast.success(t("shell.copiedAsReact"));
          } catch {
            toast.error(t("shell.copyAsReactFailed"));
          }
        }}>{<span>{t("shell.copyAsReact")}</span>}{<ContextMenuShortcut>⇧⌘C</ContextMenuShortcut>}</ContextMenuItem>}{onCopySelectionLink && <ContextMenuItem onSelect={async () => {
          await copySelectionLink(targetId_6);
        }}>{<span>{t("shell.copySelectionLink")}</span>}{<ContextMenuShortcut>⇧⌘L</ContextMenuShortcut>}</ContextMenuItem>}{<ContextMenuItem className="gap-2" onSelect={async () => {
          const ids_7 = Array.from(selectedElementIds);
          if (ids_7.length === 0) ids_7.push(targetId_6);
          if (await copyToFigma(ids_7, getCamera().scale)) toast.success(t("shell.copiedToFigma"));else toast.error(t("shell.copyToFigmaFailed"));
        }}>{(0, import_jsx_runtime.jsx)(g$3, {
            size: 14
          })}{<span>{t("shell.copyToFigma")}</span>}</ContextMenuItem>}</>}</>;
  };
  return <><VariableEditorProvider store={currentStore} selectedIds={selectedElementIds} readOnly={readOnly || !activeTab?.loaded} onCommit={createOps => { if (!activeTabId || readOnly) return; const ops = createOps(storeRef.current); if (ops.length) setStore(history.pushOperation(activeTabId, storeRef.current, ops)); }}><VariableManager />{<Toaster />}{<EditorModeProvider>{<ActiveToolProvider>{<ScrubSessionContext.Provider value={scrubSessionValue}>{<CanvasLayout isElectron={isElectron} chromeHidden={chromeHidden} bottomBarRevealSignal={bottomBarRevealSignal} leftChildren={enableSidebarV2 ? <LeftSidebarV2 className={isElectron ? "electron-sidebar-inset" : void 0} projectName={projectName} projectIconUrl={projectIconUrl} onProjectIconClick={onProjectIconClick} onOpenProjectSettings={onOpenProjectSettings ? () => onOpenProjectSettings("general") : void 0} activeTab={sidebarV2Tab} onActiveTabChange={setSidebarV2Tab} onTabActivate={tab_20 => {
            if (tab_20 !== "agents") return;
            setArchiveOpen(false);
            setChatHistoryOpen(false);
            if (!chatsLoading && chatTabs.length === 0) handleNewChat();
          }} pages={<PagesSidebarTabV2 ref={pagesSidebarRef} pageProps={{
            pages,
            activePageId,
            isPageLoading,
            onSelectPage: handleSelectPage,
            onCreatePage: handleCreatePage,
            onRenamePage: handleRenamePage,
            onDeletePage: handleDeletePage,
            onReorderPages: handleReorderPages,
            readOnly
          }} layerProps={{
            store: currentStore,
            selectedElementIds,
            onSelectElement: handleSelectElement,
            onSelectElements: handleSelectElements,
            onDragElements,
            onRenameElement,
            onFocusElement: handleFocusElement,
            searchInputRef: layersSearchRef,
            renameRequestId,
            onRenameRequestHandled: () => setRenameRequestId(null),
            suppressMenuCloseFocusRef,
            onContextMenuRow: id_19 => {
              if (!selectedElementIds.has(id_19)) setSelectedElementIds(new Set([id_19]));
              contextMenuPointRef.current = null;
            },
            renderRowContextMenu: id_20 => renderContextMenuItems(id_20),
            readOnly
          }} />} assets={<AssetsSidebarTabV2 ref={assetsSidebarRef} onAddElement={onAddElement} componentIndex={componentIndex} components={components} iconLibraries={iconLibraries} allIconLibraries={allIconLibraries} onEditComponent={openComponentFile} onCreateComponentFile={openNewComponentFile} onAddShadcnComponents={onAddShadcnComponents} onImportDesignSystem={handleImportDesignSystem} onOpenIconSettings={onOpenProjectSettings ? () => onOpenProjectSettings("icons") : void 0} onAskAIForIconLibrary={handleAskAIForIconLibrary} onPasteCompositionJsx={readOnly ? void 0 : pasteCompositionJsx} readCompositionFile={readOnly || !chatBackend?.readFileRaw ? void 0 : path_0 => chatBackend.readFileRaw(path_0)} compositionSourceId={effectiveProjectPath} compositionRefreshKey={compositionRefreshKey} readOnly={readOnly} isElectron={isElectron} onEnsureComponentNames={onEnsureComponentNames} />} agents={!readOnly ? <ChatArchiveView open={archiveOpen} onBack={() => setArchiveOpen(false)} backend={chatBackend ?? null} onRestore={handleRestoreChat}>{<AgentsSidebarTabV2 onRenameChat={handleRenameChat} chats={chatTabs.map(chat_1 => ({
              id: chat_1.id,
              title: chat_1.title,
              generatedTitle: chat_1.generatedTitle,
              createdAt: chat_1.createdAt
            }))} activeChatId={chatTabs[visibleChatIndex]?.id} historyOpen={chatHistoryOpen} onHistoryOpenChange={setChatHistoryOpen} runningChatIds={runningChatIds} unreadChatIds={unreadChatIds} loading={chatsLoading} onNewChat={handleNewChat} onOpenSettings={onOpenProjectSettings ? () => onOpenProjectSettings("ai") : void 0} onSwitchChat={handleSwitchChat} onArchiveChat={handleArchiveChat} onDropAttachments={data => chatPanelRef.current?.attachDroppedFiles(data)} onArchiveAllChats={handleArchiveAllChats} onOpenArchivedChats={() => setArchiveOpen(true)} followAi={followAi} onFollowAiChange={persistFollowAi} onFocusLastResult={handleFocusLastChatResult} renderChat={(chat_2, active_1) => {
              const chatTab = chatTabs.find(candidate_0 => candidate_0.id === chat_2.id);
              if (!chatTab) return null;
              return <ChatPanel ref={active_1 ? chatPanelRef : void 0} variant="sidebar-v2" store={currentStore} selectedElementIds={selectedElementIds} componentIndex={mergedComponentIndex} contextPages={tabs.flatMap(tab_21 => tab_21.canvasId ? [{
                id: tab_21.canvasId,
                name: tab_21.name
              }] : [])} activeTabInfo={activeTab ? {
                name: activeTab.name,
                id: activeTab.id
              } : void 0} focusedComponent={focusedComponent?.name} messages={chatTab.messages} onMessagesChange={newMessages_0 => {
                applyChatMessages(chatTab.id, newMessages_0, chatTab.title);
              }} activeChatId={chatTab.id} chatList={chatTabs.map(tab_22 => ({
                id: tab_22.id,
                title: tab_22.title,
                createdAt: tab_22.createdAt,
                updatedAt: tab_22.createdAt,
                archivedAt: null,
                messageCount: tab_22.messages.length
              }))} onNewChat={handleNewChat} onSwitchChat={handleSwitchChat} onArchiveChat={handleArchiveChat} onArchiveAllChats={handleArchiveAllChats} onOpenArchivedChats={() => setArchiveOpen(true)} chatColor={chatTabs.length > 1 ? chatColorMap.get(chatTab.id) || "#2563eb" : void 0} chatColors={chatTabs.length > 1 ? chatColorMap : void 0} iconLibraryNames={Object.keys(iconLibraries)} allowedPaths={effectiveAllowedPaths} onAddAllowedPath={effectiveOnAdd} onRemoveAllowedPath={onRemoveAllowedPath} onClearAllowedPaths={onClearAllowedPaths} onOpenProjectSettings={onOpenProjectSettings ? () => onOpenProjectSettings("ai") : void 0} onProjectFilesEdited={onProjectFilesEdited} onPlanLimit={onPlanLimit} onFeedback={onFeedback} onStreamStart={handleChatStreamStart} onRunComplete={run => onActivityRef.current?.({
                type: "ai_chat_completed",
                ...run
              })} onStreamEnd={chatTabId_1 => {
                handleChatStreamFinish(chatTabId_1);
                let changed_0 = false;
                for (const [elementId_19, claimId_0] of elementLocksRef.current) if (claimIdToChatTabIdRef.current.get(claimId_0) === chatTabId_1) {
                  elementLocksRef.current.delete(elementId_19);
                  changed_0 = true;
                }
                for (const [claimId_1, ownerChatTabId] of [...claimIdToChatTabIdRef.current]) if (ownerChatTabId === chatTabId_1) claimIdToChatTabIdRef.current.delete(claimId_1);
                if (changed_0) publishElementLocks();
              }} onSelectElement={handleSelectChatElement} />;
            }} />}</ChatArchiveView> : void 0} skills={showSkillsTab ? <SkillsPanel overrides={skillOverrides} onOpenSkill={openSkillInBottomBar} onResetSkill={resetSkillOverride} onToggleSkillActive={toggleSkillOverrideActive} /> : void 0} /> : <div className={`flex flex-col h-full overflow-hidden${isElectron ? " electron-sidebar-inset" : ""}`}>{leftHeader && <div className="shrink-0 border-b border-ed-border">{leftHeader}</div>}{<PanelGroup$1 direction="vertical" className="flex-1" autoSaveId="left-pages-panel">{<Panel defaultSize={15} minSize={5} collapsible={true}>{<ScrollArea className="h-full">{<PagesPanel pages={pages} activePageId={activePageId} isPageLoading={isPageLoading} onSelectPage={handleSelectPage} onCreatePage={handleCreatePage} onRenamePage={handleRenamePage} onDeletePage={handleDeletePage} onReorderPages={handleReorderPages} readOnly={readOnly} />}</ScrollArea>}</Panel>}{<PanelResizeHandle className="h-px bg-ed-border cursor-row-resize" />}{<Panel defaultSize={85} minSize={30}>{<Tabs value={leftPanelTab} onValueChange={setLeftPanelTab} className="w-full gap-0 h-full overflow-hidden flex flex-col">{<VariablesButton className="self-start ml-2 mt-1" />}{<TabsList ref={leftTabsListRef} className="!w-full p-2 overflow-x-auto overflow-y-hidden scrollbar-hide shrink-0 flex-nowrap" data-horizontal-scroll="" variant="simple">{!readOnly && <TabsTrigger value="chat" className="shrink-0">{t("shell.chat")}</TabsTrigger>}{<TabsTrigger value="layers" className="shrink-0">{t("shell.layers")}</TabsTrigger>}{<TabsTrigger value="insert" className="shrink-0">{t("shell.insert")}</TabsTrigger>}{<TabsTrigger value="assets" className="relative gap-1 shrink-0">{t("shell.assets")}</TabsTrigger>}{<TabsTrigger value="icons" className="shrink-0">{t("shell.icons")}</TabsTrigger>}{showSkillsTab && <TabsTrigger value="skills" className="shrink-0">{t("shell.skills")}</TabsTrigger>}</TabsList>}{<TabsContent value="layers" className="h-full overflow-hidden flex flex-col">{<LayersPanel store={currentStore} selectedElementIds={selectedElementIds} onSelectElement={handleSelectElement} onSelectElements={handleSelectElements} onDragElements={onDragElements} onRenameElement={onRenameElement} onFocusElement={handleFocusElement} searchInputRef={layersSearchRef} renameRequestId={renameRequestId} onRenameRequestHandled={() => setRenameRequestId(null)} suppressMenuCloseFocusRef={suppressMenuCloseFocusRef} onContextMenuRow={id_21 => {
                      if (!selectedElementIds.has(id_21)) setSelectedElementIds(new Set([id_21]));
                      contextMenuPointRef.current = null;
                    }} renderRowContextMenu={id_22 => renderContextMenuItems(id_22)} readOnly={readOnly} />}</TabsContent>}{<TabsContent value="insert" className="h-full overflow-hidden flex flex-col">{<InsertPanel onAddElement={onAddElement} readOnly={readOnly} isElectron={isElectron} />}</TabsContent>}{<TabsContent value="assets" className="h-full overflow-hidden flex flex-col">{<AssetsPanel onAddElement={onAddElement} onPasteCompositionJsx={readOnly ? void 0 : pasteCompositionJsx} readCompositionFile={readOnly || !chatBackend?.readFileRaw ? void 0 : path_1 => chatBackend.readFileRaw(path_1)} compositionSourceId={effectiveProjectPath} componentIndex={componentIndex} components={components} iconLibraries={iconLibraries} allIconLibraries={allIconLibraries} onEditComponent={openComponentFile} readOnly={readOnly} onAskAI={handleAskAIForStarterComponent} onAskAIForComposition={handleAskAIForComposition} compositionRefreshKey={compositionRefreshKey} onEnsureComponentNames={onEnsureComponentNames} />}</TabsContent>}{<TabsContent value="icons" className="h-full overflow-hidden flex flex-col">{<IconsPanel iconLibraries={iconLibraries} onOpenIconSettings={onOpenProjectSettings ? () => onOpenProjectSettings("icons") : void 0} onAskAI={handleAskAIForIconLibrary} onAddElement={onAddElement} readOnly={readOnly} />}</TabsContent>}{showSkillsTab && <TabsContent value="skills" className="h-full overflow-hidden flex flex-col">{<SkillsPanel overrides={skillOverrides} onOpenSkill={openSkillInBottomBar} onResetSkill={resetSkillOverride} onToggleSkillActive={toggleSkillOverrideActive} />}</TabsContent>}{!readOnly && <TabsContent value="chat" forceMount={true} className="h-full overflow-hidden flex flex-col data-[state=inactive]:hidden!">{<ChatArchiveView open={archiveOpen} onBack={() => setArchiveOpen(false)} backend={chatBackend ?? null} onRestore={handleRestoreChat}>{chatsLoading && chatTabs.length === 0 ? <div className="flex flex-1 items-center justify-center text-sm text-ed-muted-foreground">{t("shell.loadingChats")}</div> : <ChatConversations chats={chatTabs} activeChatId={chatTabs[visibleChatIndex]?.id} renderChat={(chatTab_0, active_2) => <ChatPanel ref={active_2 ? chatPanelRef : void 0} store={currentStore} selectedElementIds={selectedElementIds} componentIndex={mergedComponentIndex} contextPages={tabs.flatMap(tab_23 => tab_23.canvasId ? [{
                        id: tab_23.canvasId,
                        name: tab_23.name
                      }] : [])} activeTabInfo={activeTab ? {
                        name: activeTab.name,
                        id: activeTab.id
                      } : void 0} focusedComponent={focusedComponent?.name} messages={chatTab_0.messages} onMessagesChange={newMsgs => {
                        applyChatMessages(chatTab_0.id, newMsgs, chatTab_0.title);
                      }} activeChatId={chatTab_0.id} chatList={chatTabs.map(t_17 => ({
                        id: t_17.id,
                        title: t_17.title,
                        createdAt: t_17.createdAt,
                        updatedAt: t_17.createdAt,
                        archivedAt: null,
                        messageCount: t_17.messages.length
                      }))} onNewChat={handleNewChat} onSwitchChat={handleSwitchChat} onArchiveChat={handleArchiveChat} onArchiveAllChats={handleArchiveAllChats} onOpenArchivedChats={() => setArchiveOpen(true)} chatColor={chatTabs.length > 1 ? chatColorMap.get(chatTab_0.id) || "#2563eb" : void 0} chatColors={chatTabs.length > 1 ? chatColorMap : void 0} iconLibraryNames={Object.keys(iconLibraries)} allowedPaths={effectiveAllowedPaths} onAddAllowedPath={effectiveOnAdd} onRemoveAllowedPath={onRemoveAllowedPath} onClearAllowedPaths={onClearAllowedPaths} onOpenProjectSettings={onOpenProjectSettings ? () => onOpenProjectSettings("ai") : void 0} onProjectFilesEdited={onProjectFilesEdited} onPlanLimit={onPlanLimit} onFeedback={onFeedback} onStreamStart={handleChatStreamStart} onRunComplete={run_0 => onActivityRef.current?.({
                        type: "ai_chat_completed",
                        ...run_0
                      })} onStreamEnd={chatTabId_2 => {
                        handleChatStreamFinish(chatTabId_2);
                        let changed_1 = false;
                        for (const [elemId, claimId_2] of elementLocksRef.current) if (claimIdToChatTabIdRef.current.get(claimId_2) === chatTabId_2) {
                          elementLocksRef.current.delete(elemId);
                          changed_1 = true;
                        }
                        for (const [claimId_3, ownerChatTabId_0] of [...claimIdToChatTabIdRef.current]) if (ownerChatTabId_0 === chatTabId_2) claimIdToChatTabIdRef.current.delete(claimId_3);
                        if (changed_1) publishElementLocks();
                      }} onSelectElement={handleSelectChatElement} />} />}</ChatArchiveView>}</TabsContent>}</Tabs>}</Panel>}</PanelGroup$1>}</div>} rightChildren={<div className="h-full flex flex-col overflow-hidden">{rightHeader && <div className="shrink-0">{rightHeader}</div>}{activeTab?.loaded && (!selectedElementId && selectedElementIds.size === 0 || showGitPanel && gitPanel || enableWebviewTweak && selectedElementId && getById(currentStore, selectedElementId)?.type === "webview") && <div className="editor-panel-header z-10 flex min-w-0 shrink-0 items-center justify-end border-b border-ed-divider bg-ed-background p-3">{<CanvasZoomMenu store={currentStore} selectedElementIds={selectedElementIds} viewportRef={viewportRef} commentsHidden={commentsHidden} onCommentsHiddenChange={setCommentsHidden} />}</div>}{showGitPanel && gitPanel ? <div className="h-full flex flex-col overflow-hidden">{<div className="flex items-center justify-between px-3 py-2 border-b border-ed-border shrink-0">{<span className="text-sm font-medium text-ed-foreground">Git</span>}{<Tooltip content={t("shell.close")}>{<button type="button" aria-label={t("shell.close")} onClick={() => setShowGitPanel(false)} className="p-0.5 rounded hover:bg-ed-accent text-ed-muted-foreground hover:text-ed-foreground">{<svg width="14" height="14" viewBox="0 0 14 14" fill="none">{<path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}</svg>}</button>}</Tooltip>}</div>}{<div className="flex-1 overflow-auto">{gitPanel}</div>}</div> : (() => {
              if (enableWebviewTweak && selectedElementId && getById(currentStore, selectedElementId)?.type === "webview") return <WebviewEditPanel onNavigate={url => {
                const el_19 = getById(currentStore, selectedElementId);
                if (el_19?.type === "webview") onReplaceElement?.(selectedElementId, {
                  ...el_19,
                  src: url
                });
              }} />;
              const selectedEl = selectedElementId && selectedElementIds.size <= 1 ? getById(currentStore, selectedElementId) : null;
              const elementHeaderEl = selectedEl?.type === "component" ? (() => {
                const componentName_7 = selectedEl.componentName;
                const componentFilePath_0 = mergedComponentIndex?.[componentName_7]?.path;
                return <ElementHeader name={componentName_7} kind="component" onGoToMain={componentFilePath_0 ? () => openComponentFile(componentName_7, componentFilePath_0) : void 0} />;
              })() : selectedEl?.type === "icon" ? <ElementHeader name={selectedEl.iconName} kind="icon" detail={iconLibraries?.[selectedEl.library]?.displayName || selectedEl.library} /> : void 0;
              const elementContent = <StylesPanelTabs selectedElementId={selectedElementId} selectedElementIds={selectedElementIds} store={currentStore} onUpdateElementStyles={onUpdateElementStyles} onUpdateElementProps={onUpdateElementProps} onUpdateMultipleElementsProps={onUpdateMultipleElementsProps} onUpdateMultipleElementsStyles={onUpdateMultipleElementsStyles} onUpdateElementPositions={onUpdateElementPositions} onToggleTextFormat={onToggleTextFormat} textSelectionState={textSelectionState} onCreateComponent={() => setShowCreateComponentModal(true)} readOnly={readOnly} fonts={fonts} propsPanel={showPropsTab ? <PropsPanel selectedElementId={selectedElementId} selectedElementIds={selectedElementIds} store={currentStore} componentIndex={mergedComponentIndex} iconLibraries={iconLibraries} onUpdateElementProps={onUpdateElementProps} onSetElementPropsTransient={onSetElementPropsTransient} onUpdateMultipleElementsProps={onUpdateMultipleElementsProps} onReplaceElement={onReplaceElement} onOpenComponent={openComponentFile} onCreateComponent={() => setShowCreateComponentModal(true)} readOnly={readOnly} scanLoading={scanLoading} onRequestPropsScan={onRequestPropsScan} hideHeader={!!elementHeaderEl} /> : void 0} header={elementHeaderEl} headerActions={activeTab?.loaded && <CanvasZoomMenu store={currentStore} selectedElementIds={selectedElementIds} viewportRef={viewportRef} commentsHidden={commentsHidden} onCommentsHiddenChange={setCommentsHidden} />} />;
              if (!readOnly && !selectedElementId && selectedElementIds.size === 0) return <div className="flex-1 overflow-auto">{<PagePanel backgroundColor={activeTab?.backgroundColor} backgroundToken={activeTab?.backgroundToken} onChangeBackground={handleSetPageBackground} disabled={isPageLoading || !activeTab?.loaded} />}</div>;
              return <div className="flex-1 overflow-hidden flex flex-col">{elementContent}</div>;
            })()}</div>} bottomChildren={activeTab && <BottomBar tab={activeTab} openFiles={openCodeFiles} onCloseFile={closeCodeFile} activateFile={fileOpenSignal} onSaveFile={saveCodeFile} openSkills={openSkills} onCloseSkill={closeSkill} activateSkill={skillOpenSignal} onSaveSkill={saveSkill} onSaveSuccess={serverDrivenFileRefresh ? void 0 : refreshFocusedComponent} onSaveEnd={(success, errorMsg) => {
            const componentName_8 = focusedComponent?.name || activeTab?.name || "Component";
            const componentFilePath_1 = focusedComponent?.filePath;
            if (success) toast.success(t("shell.savedToCode", { name: componentName_8 }), {
              duration: 8e3,
              action: componentFilePath_1 ? {
                label: t("shell.undo"),
                onClick: async () => {
                  const versionsResult_0 = await listFileVersions(componentName_8, componentFilePath_1);
                  if (!versionsResult_0.success || versionsResult_0.versions.length === 0) {
                    toast.error(t("shell.previousVersionMissing"));
                    return;
                  }
                  const latestVersion_0 = versionsResult_0.versions[0];
                  const restoreResult_0 = await restoreFileVersion(componentName_8, latestVersion_0.filename, componentFilePath_1);
                  if (restoreResult_0.success) {
                    toast.success(t("shell.revertedComponent", { name: componentName_8 }));
                    refreshFocusedComponentRef.current(componentFilePath_1);
                  } else toast.error(t("shell.revertFailed", { error: restoreResult_0.error }));
                }
              } : void 0
            });else toast.error(t("shell.saveToCodeFailed", { name: componentName_8 }), {
              description: errorMsg || t("shell.unknownError")
            });
          }} onOpenVersionHistory={() => setShowVersionHistory(true)} readOnly={readOnly} selectedElementId={selectedElementId} documentId={activeTabId} onRevealDraft={async (pageId, elementId) => {
                await handleSelectPage(pageId);
                setSelectedElementIds(new Set([elementId]));
                setPendingElementToCenter(elementId);
              }} store={currentStore} enableCssEditor={enableCssEditor} componentIndex={componentIndex} components={components} iconLibraries={iconLibraries} onReplaceElement={onReplaceElement} onPreviewElement={onPreviewElement} onClearPreview={onClearPreview} />}>{canvasAlert}{activeTab && <div className="h-full relative">{(!activeTab.loaded || canvasCameraPending) && <div className="absolute inset-0 flex items-center justify-center z-10">{<div className="flex flex-col items-center gap-2 text-ed-muted-foreground">{<div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />}</div>}</div>}{<ContextMenu$1 onOpenChange={open => {
                if (!open) setCanvasMenuTargetId(null);
              }}>{<ContextMenuTrigger asChild={true} onContextMenu={handleCanvasContextMenu}>{<div style={{
                    display: "contents",
                    visibility: canvasCameraPending ? "hidden" : void 0
                  }}>{<Canvas key={`canvas-${activeTab.id}-${transformKey}`} store={previewStore ?? activeTab.store} backgroundColor={activeTab.backgroundColor} setStore={setStore} selectedElementIds={selectedElementIds} onSelectElement={handleSelectElement} onResizeElement={onResizeElement} onEditText={onEditText} editingTextId={editingTextId} onStartEditText={id_23 => setEditingTextId(id_23)} onStopEditText={() => setEditingTextId(null)} onActivateTextEditor={api => {
                      activeTextEditorRef.current = api;
                    }} onDeactivateTextEditor={() => {
                      activeTextEditorRef.current = null;
                    }} onTextSelectionChange={setTextSelectionState} components={components} componentIndex={componentIndex} componentsRevision={componentsRevision} iconLibraries={iconLibraries} canvasRefProp={canvasRef} viewportRefProp={viewportRef} onStopFollowingAgent={!readOnly && followingAi ? () => persistFollowAi(false) : void 0} interactiveParentIds={interactiveParentIds} drilledParentId={drilledParentId} onAddElement={onAddElement} onDropElement={readOnly ? void 0 : onPasteElement} onOpenMoreHtml={readOnly ? void 0 : revealInsertPanel} readOnly={readOnly} initialTransform={initialCanvasTransform || pageCamera} onUpdateElementStyles={onUpdateElementStyles} onUpdateElementProps={onUpdateElementProps} onFixWithAI={handleFixWithAI} onSaveToCode={handleSaveToCode} onOpenFile={(filePath_9, line) => {
                      openFileInBottomBar(filePath_9, {
                        line
                      });
                    }} allowedPaths={effectiveAllowedPaths} onAddAllowedPath={effectiveOnAdd} externalMcpApprovals={externalMcpApprovals} onExternalMcpApproval={onExternalMcpApproval} pasteStyleSuggestion={pasteStyleSuggestion} onApplyPasteStyleClean={applyPasteStyleClean} onDismissPasteStyleClean={() => setPasteStyleSuggestion(null)} componentEditMode={focusedComponentEditSession ? {
                      componentName: focusedComponentEditSession.original.componentName,
                      filePath: focusedComponentEditSession.sourceInfo?.filePath || "",
                      isPreparing: savingComponentEditIds.has(focusedComponentEditSession.containerId),
                      onSave: designerNotes_0 => {
                        handleSaveComponentEdit(designerNotes_0);
                      },
                      onCancel: handleCancelComponentEdit
                    } : null} elementLocks={elementLocksWithColors} commentMode={commentMode} onCommentClick={handleCommentClick} showCommentTools={showCommentTools} onToggleCommentMode={() => setCommentMode(!commentMode)} showResolvedComments={showResolvedComments} onShowResolvedChange={onShowResolvedChange} commentOverlay={!commentsHidden && (showCommentTools || commentsProp.length > 0) ? transform_0 => <>{<CommentPins comments={commentsProp} transform={transform_0} activeCommentId={activeCommentId} onSelectComment={handleSelectComment} onMoveComment={onMoveComment} showResolved={showResolvedComments} />}{pendingCommentPosition && <CommentComposer position={{
                        canvasX: pendingCommentPosition.canvasX,
                        canvasY: pendingCommentPosition.canvasY
                      }} onSubmit={handleCommentSubmit} onCancel={() => setPendingCommentPosition(null)} />}{activeCommentId && (() => {
                        const activeComment = commentsProp.find(c_9 => c_9.id === activeCommentId);
                        if (!activeComment || activeComment.canvasX == null || activeComment.canvasY == null) return null;
                        return <CommentThread comment={activeComment} replies={commentRepliesProp} currentUserId={currentUserId} onReply={handleCommentReply} onResolve={() => onResolveComment?.(activeCommentId)} onUnresolve={() => onUnresolveComment?.(activeCommentId)} onDelete={id_24 => {
                          onDeleteComment?.(id_24);
                          if (id_24 === activeCommentId) setActiveCommentId(null);
                        }} onEdit={(id_25, body_1) => onEditComment?.(id_25, body_1)} onReaction={(id_26, emoji) => onToggleReaction?.(id_26, emoji)} onClose={() => {
                          setActiveCommentId(null);
                          onActiveCommentChange?.(null);
                        }} />;
                      })()}</> : void 0} onPushOperations={onPushDragOperations} onStartAltDrag={onStartAltDrag} onSelectElements={handleSelectElements} onAltDragAborted={onAltDragAborted} />}</div>}</ContextMenuTrigger>}{<ContextMenuContent className="min-w-[14rem]" onCloseAutoFocus={e_14 => {
                  if (suppressMenuCloseFocusRef.current) {
                    e_14.preventDefault();
                    suppressMenuCloseFocusRef.current = false;
                  }
                }}>{renderContextMenuItems(canvasMenuTargetId)}</ContextMenuContent>}</ContextMenu$1>}</div>}{<CreateComponentModal isOpen={showCreateComponentModal} onClose={() => setShowCreateComponentModal(false)} onConfirm={onCreateComponent} />}{showVersionHistory && focusedComponent?.filePath && <VersionHistoryModal componentName={focusedComponent.name} filePath={focusedComponent.filePath} onClose={() => setShowVersionHistory(false)} onRestore={fp => refreshFocusedComponentRef.current(fp)} componentIndex={mergedComponentIndex} compilePreview={compilePreview} />}</CanvasLayout>}{previewOpen && <PreviewWindow store={currentStore} rootIds={getRootIds(currentStore)} startId={selectedElementId ?? void 0} components={components} componentIndex={componentIndex} iconLibraries={iconLibraries} assetResolver={assetResolver} onClose={() => setPreviewOpen(false)} onPopOut={effectiveProjectPath ? elementId => openBrowserPreview(elementId) : void 0} />}</ScrubSessionContext.Provider>}</ActiveToolProvider>}</EditorModeProvider>}</VariableEditorProvider></>;
};
var BingoEditor = t0 => {
  const $ = (0, import_compiler_runtime.c)(9);
  let assetResolver;
  let props;
  if ($[0] !== t0) {
    ({
      assetResolver,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = assetResolver;
    $[2] = props;
  } else {
    assetResolver = $[1];
    props = $[2];
  }
  let t1;
  if ($[3] !== assetResolver || $[4] !== props) {
    t1 = <BingoEditorInner {...props} assetResolver={assetResolver} />;
    $[3] = assetResolver;
    $[4] = props;
    $[5] = t1;
  } else t1 = $[5];
  let t2;
  if ($[6] !== assetResolver || $[7] !== t1) {
    t2 = <AssetProvider resolver={assetResolver}>{t1}</AssetProvider>;
    $[6] = assetResolver;
    $[7] = t1;
    $[8] = t2;
  } else t2 = $[8];
  return <VariableLibraryProvider key={props.projectPath || "local"} projectPath={props.projectPath}>{t2}</VariableLibraryProvider>;
};
function _temp$12() {
  return typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
}

export { BingoEditor };
