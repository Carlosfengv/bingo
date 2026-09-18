import { VariableLayerBadge } from "../../../shared/theme/VariableControls";
/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/LayersPanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { publishHover, subscribeHover } from "../../../shared/state/hoverChannel";
import { hasAncestorIn, resolveLayerTreeDrop } from "../../../shared/utils/dropPlan";
import { useScrolledHeader } from "../../hooks/useScrolledHeader";
import { SidebarSectionHeader } from "../SidebarSectionHeader";
import { LayerIcon } from "./LayerIcon";
import { PanelSearchInput } from "./PanelSearchInput";
import { getLayerAccent } from "./layerAppearance";
import { createLayerSearchIndex, getElementLabel, splitLabelMatches, withTextParents } from "./layerSearch";
import { IconBtn } from "./styles/primitives";
import { getById, getChildren$2, getParentId, getRootIds, hasChildren$1, isTextLikeOwner } from "@bingo/compiler";
import { Button, CaretDownIcon, CaretRightIcon, CollapseAllIcon, ContextMenu$1, ContextMenuContent, ContextMenuTrigger, CrosshairIcon, Input, OpenAllIcon, ScrollArea, Text$4, Tooltip, TooltipContent, TooltipTrigger, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import { useVirtualizer } from "@tanstack/react-virtual";
import { defaultRangeExtractor } from "@tanstack/virtual-core";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function expandCollapsedAncestors(collapsed, store, ids, expandTextOwners) {
  if (collapsed.size === 0) return collapsed;
  const next = new Set(collapsed);
  let changed = false;
  for (const id of ids) {
    if (expandTextOwners && isTextLikeOwner(store, id)) changed = next.delete(id) || changed;
    for (let parentId = getParentId(store, id); parentId && parentId !== "ROOT"; parentId = getParentId(store, parentId)) changed = next.delete(parentId) || changed;
  }
  return changed ? next : collapsed;
}
function collectExpandableIds(store) {
  const ids = [];
  for (const [parentId, childIds] of store.childrenByParent) {
    if (parentId === "ROOT" || childIds.length === 0) continue;
    const parent = getById(store, parentId);
    if (parent && hasChildren$1(parent)) ids.push(parentId);
  }
  return ids;
}
var LAYER_ROW_GAP = 6;
/** 26px row (`h-6.5`) + gap. Shared by virtualization and drop targeting. */
var LAYER_ROW_HEIGHT = 32;
var LAYER_LIST_TOP_PADDING = 0;
var LAYER_LIST_BOTTOM_PADDING = 8;
/** Sticky parents keep the same inset as the list's horizontal padding. */
var LAYER_STICKY_INSET = 8;
/**
* Pre-order visible rows: children of a collapsed parent are omitted.
* `subtreeEnd` is written after descendants so drop-after can sit under the
* whole expanded wrap, matching the recursive list's wrap box.
*/
function flattenVisibleLayerRows(store, collapsedIds, selectedIds) {
  const rows = [];
  const walk = (id, depth, insideSelected) => {
    const element = getById(store, id);
    if (!element) return;
    const isSelected = selectedIds.has(id);
    const index = rows.length;
    const row = {
      id,
      depth,
      isInherited: !isSelected && insideSelected,
      wrapsSelection: isSelected && !insideSelected,
      subtreeEnd: index + 1
    };
    rows.push(row);
    const childIds = getChildren$2(store, id);
    if (hasChildren$1(element) && childIds.length > 0 && !collapsedIds.has(id)) {
      const nextInside = isSelected || insideSelected;
      for (const childId of childIds) walk(childId, depth + 1, nextInside);
    }
    row.subtreeEnd = rows.length;
  };
  for (const id of getRootIds(store)) walk(id, 0, false);
  return rows;
}
/** Search results are already a flat list; each selected row is its own shell. */
function flattenSearchLayerRows(resultRows, selectedIds) {
  return resultRows.map((result, index) => ({
    id: result.id,
    depth: result.depth,
    isInherited: false,
    wrapsSelection: selectedIds.has(result.id),
    subtreeEnd: index + 1
  }));
}
/** Outermost selected subtrees as contiguous index ranges. */
function selectionShells(rows) {
  const shells = [];
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].wrapsSelection) continue;
    shells.push({
      start: i,
      end: rows[i].subtreeEnd
    });
  }
  return shells;
}
function layerRowIndexById(rows) {
  const map = new Map();
  for (let i = 0; i < rows.length; i++) map.set(rows[i].id, i);
  return map;
}
/**
* Indent per tree level. Rows and the drop indicator share this value so their
* geometry cannot drift.
*/
var INDENT_STEP$1 = 20;
var INDENT_BASE$1 = 0;
var indentOf$1 = depth => depth * INDENT_STEP$1 + INDENT_BASE$1;
/** Caret column (`w-4`) + the gap before the icon — the line starts at the icon, not under the chevron. */
var DROP_LINE_INSET = 18;
/** Right inset on the drop line. */
var DROP_LINE_RIGHT_INSET = 12;
/** How close to the list edge a drag starts scrolling, and max px per frame. */
var DROP_SCROLL_EDGE = 36;
var DROP_SCROLL_MAX = 18;
/** Linger on a container before the nest outline replaces the sibling line. */
var NEST_DWELL_MS = 220;
/** A 1x1 transparent GIF. Decoded once at module load, because setDragImage
*  silently falls back to the default ghost for an image that hasn't loaded. */
var EMPTY_DRAG_IMAGE = typeof Image !== "undefined" ? new Image() : null;
if (EMPTY_DRAG_IMAGE) EMPTY_DRAG_IMAGE.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
/** The drop indicator line and the target outline already say where the rows
*  will land, at the depth they'll land at. A row-shaped image dragging along
*  under the cursor only competes with that — and the tree scrolls horizontally,
*  so every row's layout box is stretched to the width of the widest row, which
*  the browser would happily paint out over the canvas. Suppress it. */
function suppressRowDragImage(e) {
  if (EMPTY_DRAG_IMAGE) e.dataTransfer.setDragImage(EMPTY_DRAG_IMAGE, 0, 0);
}
var DROP_INSIDE_ROW = "data-[drop-inside]:outline data-[drop-inside]:outline-1 data-[drop-inside]:outline-ed-canvas-selection";
/** Sticky canvas-focus control. Its backing matches the row beneath it. */
function LayerFocusScrub(t0) {
  const $ = (0, import_compiler_runtime.c)(8);
  const { t } = useTranslation("editor");
  const {
    isSelected,
    isInherited,
    onFocus
  } = t0;
  const base = isSelected ? "bg-ed-layer-active" : isInherited ? "bg-ed-layer-child-hover" : "bg-ed-layer-hover";
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = cn$2("relative right-0 sticky z-10 ml-auto flex shrink-0 items-stretch opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto");
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== base) {
    t2 = cn$2("relative flex items-center", base);
    $[1] = base;
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if (true) {
    t3 = onFocus && <IconBtn label={t("layers.focusOnCanvas", { name: t("canvas.element") })} onClick={e => {
      e.stopPropagation();
      onFocus();
    }} className="group/focus relative z-[1] text-ed-muted-foreground hover:bg-transparent hover:text-ed-foreground">{<CrosshairIcon className="size-3.75 opacity-60 group-hover/focus:opacity-100 group-focus-visible/focus:opacity-100" />}</IconBtn>;
    $[3] = onFocus;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] !== t2 || $[6] !== t3) {
    t4 = <div className={t1}>{<div className={t2}>{t3}</div>}</div>;
    $[5] = t2;
    $[6] = t3;
    $[7] = t4;
  } else t4 = $[7];
  return t4;
}
/**
* Isolates `useVirtualizer` from the React Compiler. LayersPanel stays compiled;
* this child owns scroll-range updates.
*/
function VirtualizedLayerRows({
  count,
  getItemKey,
  scrollElement,
  pinnedIndexes,
  overscan = 8,
  listRef,
  virtualizerRef,
  minWidthResetKey,
  shells,
  stickyParents,
  dropLine,
  renderRow
}) {
  "use no memo";

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollElement,
    estimateSize: () => LAYER_ROW_HEIGHT,
    overscan,
    paddingStart: LAYER_LIST_TOP_PADDING,
    paddingEnd: LAYER_LIST_BOTTOM_PADDING,
    scrollPaddingStart: 56,
    scrollPaddingEnd: 56,
    getItemKey,
    rangeExtractor: range => {
      const indexes = defaultRangeExtractor(range);
      const next = new Set(indexes);
      for (const [start, end] of stickyParents) if (start <= range.endIndex && end > range.startIndex) next.add(start);
      for (const i of pinnedIndexes) if (i >= 0 && i < range.count) next.add(i);
      return [...next].sort((a, b) => a - b);
    }
  });
  (0, import_react.useLayoutEffect)(() => {
    virtualizerRef.current = virtualizer;
  });
  const virtualItems = virtualizer.getVirtualItems();
  const rangeKey = virtualItems.map(item => item.key).join("\0");
  const resetKeyRef = (0, import_react.useRef)(minWidthResetKey);
  const rowContentWidths = (0, import_react.useRef)(new Map());
  const [minWidth, setMinWidth] = (0, import_react.useState)(0);
  if (resetKeyRef.current !== minWidthResetKey) {
    resetKeyRef.current = minWidthResetKey;
    rowContentWidths.current.clear();
    setMinWidth(0);
  }
  (0, import_react.useLayoutEffect)(() => {
    const list = listRef.current;
    if (!list) return;
    const rows = [...list.querySelectorAll("[data-layer-id]")];
    const measure = () => {
      for (const row of rows) {
        const style = getComputedStyle(row);
        const children = [...row.children];
        let width = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + (parseFloat(style.columnGap) || 0) * Math.max(0, children.length - 1);
        for (const child of children) {
          const childStyle = getComputedStyle(child);
          width += Math.max(child.getBoundingClientRect().width, child.scrollWidth);
          if (!child.classList.contains("ml-auto")) width += parseFloat(childStyle.marginLeft) || 0;
          width += parseFloat(childStyle.marginRight) || 0;
        }
        rowContentWidths.current.set(row.dataset.layerId, Math.ceil(width));
      }
      setMinWidth(Math.max(0, ...rowContentWidths.current.values()));
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const row_0 of rows) for (const child_0 of row_0.children) observer.observe(child_0);
    return () => observer.disconnect();
  }, [listRef, rangeKey, minWidthResetKey, renderRow]);
  return <div ref={listRef} data-layer-list="" className="relative min-w-full" style={{
    height: virtualizer.getTotalSize(),
    minWidth: minWidth || void 0
  }}>{shells.map(shell => <div key={`shell-${shell.start}`} aria-hidden={true} className="absolute left-0 right-0 rounded-[5px] bg-ed-layer-active-child pointer-events-none" style={{
      top: LAYER_LIST_TOP_PADDING + shell.start * LAYER_ROW_HEIGHT,
      height: (shell.end - shell.start) * LAYER_ROW_HEIGHT - LAYER_ROW_GAP
    }} />)}{virtualItems.map(item_0 => {
      const subtreeEnd = stickyParents.get(item_0.index);
      const sticky = subtreeEnd !== void 0;
      return <div key={item_0.key} data-index={item_0.index} data-sticky-parent={sticky ? "" : void 0} className={cn$2("absolute left-0", sticky ? "z-10 pointer-events-none overflow-clip rounded-[5px]" : "z-[1]")} style={{
        height: sticky ? (subtreeEnd - item_0.index) * LAYER_ROW_HEIGHT - LAYER_ROW_GAP : item_0.size,
        top: item_0.start,
        width: "max-content",
        minWidth: "100%"
      }}>{<div className={sticky ? "sticky pointer-events-auto bg-ed-background" : void 0} style={sticky ? {
          top: LAYER_STICKY_INSET
        } : void 0}>{sticky && <div aria-hidden={true} data-sticky-mask="" className="pointer-events-none absolute inset-x-0 bg-ed-background" style={{
            top: -8,
            height: LAYER_STICKY_INSET
          }} />}{renderRow(item_0.index)}</div>}</div>;
    })}{dropLine}</div>;
}
function LayersPanel(t0) {
  const $ = (0, import_compiler_runtime.c)(176);
  const {
    store,
    selectedElementIds,
    onSelectElement,
    onSelectElements,
    onDragElements,
    onRenameElement,
    onFocusElement,
    searchInputRef,
    renameRequestId,
    onRenameRequestHandled,
    suppressMenuCloseFocusRef,
    onContextMenuRow,
    renderRowContextMenu,
    readOnly: t1,
    headerVariant: t2,
    searchValue,
    onSearchValueChange
  } = t0;
  const readOnly = t1 === void 0 ? false : t1;
  const headerVariant = t2 === void 0 ? "default" : t2;
  const { t } = useTranslation("editor");
  const [collapsedIds, setCollapsedIds] = (0, import_react.useState)(_temp$28);
  const [openMenuId, setOpenMenuId] = (0, import_react.useState)(null);
  const [dragIds, setDragIds] = (0, import_react.useState)(null);
  const [renamingId, setRenamingId] = (0, import_react.useState)(null);
  const [renameDraft, setRenameDraft] = (0, import_react.useState)("");
  const [internalSearchQuery, setInternalSearchQuery] = (0, import_react.useState)("");
  const searchQuery = searchValue ?? internalSearchQuery;
  const setSearchQuery = onSearchValueChange ?? setInternalSearchQuery;
  let t3;
  if ($[0] !== selectedElementIds) {
    t3 = Array.from(selectedElementIds).sort().join(",");
    $[0] = selectedElementIds;
    $[1] = t3;
  } else t3 = $[1];
  const selectionKey = t3;
  const [expandedForSelection, setExpandedForSelection] = (0, import_react.useState)(selectionKey);
  const [handledRenameId, setHandledRenameId] = (0, import_react.useState)(null);
  let nextCollapsed = collapsedIds;
  if (selectionKey !== expandedForSelection) {
    setExpandedForSelection(selectionKey);
    if (selectedElementIds.size > 0) nextCollapsed = expandCollapsedAncestors(nextCollapsed, store, selectedElementIds, true);
  }
  if ((renameRequestId ?? null) !== handledRenameId) {
    setHandledRenameId(renameRequestId ?? null);
    if (renameRequestId) {
      nextCollapsed = expandCollapsedAncestors(nextCollapsed, store, [renameRequestId], false);
      const element = getById(store, renameRequestId);
      if (element && !readOnly && onRenameElement) {
        setRenamingId(element.id);
        setRenameDraft(element.name ?? getElementLabel(element));
      }
    }
  }
  if (nextCollapsed !== collapsedIds) setCollapsedIds(nextCollapsed);
  const anchorIdRef = (0, import_react.useRef)(null);
  const dragIdsRef = (0, import_react.useRef)(null);
  const dropStickyRef = (0, import_react.useRef)(null);
  const dropLineRef = (0, import_react.useRef)(null);
  const dropListRef = (0, import_react.useRef)(null);
  const dropInsideRowRef = (0, import_react.useRef)(null);
  const hoverRowRef = (0, import_react.useRef)(null);
  const dropPaintRef = (0, import_react.useRef)(null);
  const lastDragPointRef = (0, import_react.useRef)(null);
  const autoScrollRafRef = (0, import_react.useRef)(0);
  const autoScrollTickRef = (0, import_react.useRef)(_temp2$20);
  const collapsedIdsRef = (0, import_react.useRef)(collapsedIds);
  let t4;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = [];
    $[2] = t4;
  } else t4 = $[2];
  const visibleRowsRef = (0, import_react.useRef)(t4);
  let t5;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = new Map();
    $[3] = t5;
  } else t5 = $[3];
  const indexByIdRef = (0, import_react.useRef)(t5);
  let t6;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = {
      hoveredId: null,
      armed: false,
      timer: 0
    };
    $[4] = t6;
  } else t6 = $[4];
  const nestDwellRef = (0, import_react.useRef)(t6);
  const editInputRef = (0, import_react.useRef)(null);
  const scrollContainerRef = (0, import_react.useRef)(null);
  const {
    hasScrolled,
    viewportRef,
    scrollElement
  } = useScrolledHeader(scrollContainerRef);
  const virtualizerRef = (0, import_react.useRef)(null);
  const handleRowHover = _temp3$12;
  const handleRowUnhover = _temp4$11;
  let t7;
  let t8;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = () => subscribeHover((id, source) => {
      hoverRowRef.current?.removeAttribute("data-canvas-hover");
      hoverRowRef.current = null;
      const container = scrollContainerRef.current;
      if (!container) return;
      if (!id || source !== "canvas") return;
      const row_0 = container.querySelector(`[data-layer-id="${CSS.escape(id)}"]`);
      if (!row_0) return;
      row_0.setAttribute("data-canvas-hover", "");
      hoverRowRef.current = row_0;
    });
    t8 = [];
    $[5] = t7;
    $[6] = t8;
  } else {
    t7 = $[5];
    t8 = $[6];
  }
  (0, import_react.useEffect)(t7, t8);
  let t10;
  let t9;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t9 = () => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;
      const handleWheel = e_0 => {
        if (!(e_0.metaKey || e_0.shiftKey)) return;
        const horizontalDelta = Math.abs(e_0.deltaX) > Math.abs(e_0.deltaY) ? e_0.deltaX : e_0.deltaY;
        if (horizontalDelta === 0) return;
        scrollContainer.scrollLeft = scrollContainer.scrollLeft + horizontalDelta;
        e_0.preventDefault();
      };
      scrollContainer.addEventListener("wheel", handleWheel, {
        passive: false
      });
      return () => scrollContainer.removeEventListener("wheel", handleWheel);
    };
    t10 = [];
    $[7] = t10;
    $[8] = t9;
  } else {
    t10 = $[7];
    t9 = $[8];
  }
  (0, import_react.useEffect)(t9, t10);
  let t11;
  if ($[9] !== onRenameElement || $[10] !== readOnly) {
    t11 = element_0 => {
      if (readOnly || !onRenameElement) return;
      setRenamingId(element_0.id);
      setRenameDraft(element_0.name ?? getElementLabel(element_0));
    };
    $[9] = onRenameElement;
    $[10] = readOnly;
    $[11] = t11;
  } else t11 = $[11];
  const startRename = t11;
  let t12;
  let t13;
  if ($[12] !== renamingId) {
    t12 = () => {
      if (!renamingId) return;
      requestAnimationFrame(() => {
        const input = editInputRef.current;
        if (!input) return;
        input.focus({
          preventScroll: true
        });
        input.select();
      });
    };
    t13 = [renamingId];
    $[12] = renamingId;
    $[13] = t12;
    $[14] = t13;
  } else {
    t12 = $[13];
    t13 = $[14];
  }
  (0, import_react.useEffect)(t12, t13);
  let t14;
  let t15;
  if ($[15] !== onRenameRequestHandled || $[16] !== renameRequestId) {
    t14 = () => {
      if (!renameRequestId) return;
      onRenameRequestHandled?.();
    };
    t15 = [renameRequestId, onRenameRequestHandled];
    $[15] = onRenameRequestHandled;
    $[16] = renameRequestId;
    $[17] = t14;
    $[18] = t15;
  } else {
    t14 = $[17];
    t15 = $[18];
  }
  (0, import_react.useEffect)(t14, t15);
  let t16;
  let t17;
  if ($[19] !== onRenameElement || $[20] !== readOnly || $[21] !== renamingId || $[22] !== selectedElementIds || $[23] !== startRename || $[24] !== store) {
    t16 = () => {
      if (readOnly || !onRenameElement) return;
      const handleKeyDown = e_1 => {
        if (renamingId || selectedElementIds.size !== 1) return;
        const isEnter = e_1.key === "Enter" && !e_1.shiftKey && !e_1.metaKey && !e_1.ctrlKey && !e_1.altKey;
        if (e_1.key !== "F2" && !isEnter) return;
        const target_0 = e_1.target;
        if (target_0.tagName === "INPUT" || target_0.tagName === "TEXTAREA" || target_0.isContentEditable) return;
        const element_1 = getById(store, Array.from(selectedElementIds)[0]);
        if (!element_1) return;
        e_1.preventDefault();
        startRename(element_1);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    };
    t17 = [selectedElementIds, renamingId, readOnly, onRenameElement, store, startRename];
    $[19] = onRenameElement;
    $[20] = readOnly;
    $[21] = renamingId;
    $[22] = selectedElementIds;
    $[23] = startRename;
    $[24] = store;
    $[25] = t16;
    $[26] = t17;
  } else {
    t16 = $[25];
    t17 = $[26];
  }
  (0, import_react.useEffect)(t16, t17);
  let t18;
  if ($[27] !== selectedElementIds || $[28] !== store) {
    t18 = () => {
      if (selectedElementIds.size === 0) return;
      const firstSelectedId = Array.from(selectedElementIds)[0];
      const revealId = isTextLikeOwner(store, firstSelectedId) ? getChildren$2(store, firstSelectedId)[0] ?? firstSelectedId : firstSelectedId;
      const index = indexByIdRef.current.get(revealId);
      if (index == null) return;
      virtualizerRef.current?.scrollToIndex(index, {
        align: "auto"
      });
    };
    $[27] = selectedElementIds;
    $[28] = store;
    $[29] = t18;
  } else t18 = $[29];
  let t19;
  if ($[30] !== collapsedIds || $[31] !== selectedElementIds || $[32] !== store) {
    t19 = [selectedElementIds, collapsedIds, store];
    $[30] = collapsedIds;
    $[31] = selectedElementIds;
    $[32] = store;
    $[33] = t19;
  } else t19 = $[33];
  (0, import_react.useEffect)(t18, t19);
  let t20;
  if ($[34] !== startRename) {
    t20 = (e_2, element_2) => {
      e_2.stopPropagation();
      startRename(element_2);
    };
    $[34] = startRename;
    $[35] = t20;
  } else t20 = $[35];
  const handleStartRename = t20;
  let t21;
  if ($[36] !== onRenameElement || $[37] !== renameDraft || $[38] !== renamingId) {
    t21 = () => {
      if (renamingId && onRenameElement) onRenameElement(renamingId, renameDraft);
      setRenamingId(null);
      setRenameDraft("");
    };
    $[36] = onRenameElement;
    $[37] = renameDraft;
    $[38] = renamingId;
    $[39] = t21;
  } else t21 = $[39];
  const handleRenameComplete = t21;
  let t22;
  if ($[40] !== handleRenameComplete) {
    t22 = e_3 => {
      if (e_3.nativeEvent.isComposing || e_3.keyCode === 229) return;
      if (e_3.key === "Enter") handleRenameComplete();else if (e_3.key === "Escape") {
        setRenamingId(null);
        setRenameDraft("");
      }
    };
    $[40] = handleRenameComplete;
    $[41] = t22;
  } else t22 = $[41];
  const handleRenameKeyDown = t22;
  let expandableIds;
  let t23;
  if ($[42] !== collapsedIds || $[43] !== store) {
    expandableIds = collectExpandableIds(store);
    let t24;
    if ($[46] !== collapsedIds) {
      t24 = id_0 => !collapsedIds.has(id_0);
      $[46] = collapsedIds;
      $[47] = t24;
    } else t24 = $[47];
    t23 = expandableIds.some(t24);
    $[42] = collapsedIds;
    $[43] = store;
    $[44] = expandableIds;
    $[45] = t23;
  } else {
    expandableIds = $[44];
    t23 = $[45];
  }
  const hasExpanded = t23;
  const allCollapsed = expandableIds.length > 0 && !hasExpanded;
  let t24;
  if ($[48] !== collapsedIds || $[49] !== store) {
    t24 = () => {
      const ids = collectExpandableIds(store);
      if (!ids.some(id_1 => !collapsedIds.has(id_1))) return;
      setCollapsedIds(new Set(ids));
    };
    $[48] = collapsedIds;
    $[49] = store;
    $[50] = t24;
  } else t24 = $[50];
  const collapseAll = t24;
  let t25;
  if ($[51] !== allCollapsed || $[52] !== expandableIds) {
    t25 = () => {
      if (expandableIds.length === 0) return;
      setCollapsedIds(allCollapsed ? new Set() : new Set(expandableIds));
    };
    $[51] = allCollapsed;
    $[52] = expandableIds;
    $[53] = t25;
  } else t25 = $[53];
  const toggleAll = t25;
  let t26;
  let t27;
  if ($[54] !== collapseAll || $[55] !== headerVariant || $[56] !== toggleAll) {
    t26 = () => {
      const handleKeyDown_0 = e_4 => {
        if (!e_4.altKey || e_4.metaKey || e_4.ctrlKey) return;
        if (e_4.code !== "KeyL") return;
        const target_1 = e_4.target;
        if (target_1.tagName === "INPUT" || target_1.tagName === "TEXTAREA" || target_1.isContentEditable) return;
        e_4.preventDefault();
        if (headerVariant === "sidebar-v2") toggleAll();else collapseAll();
      };
      window.addEventListener("keydown", handleKeyDown_0);
      return () => window.removeEventListener("keydown", handleKeyDown_0);
    };
    t27 = [collapseAll, toggleAll, headerVariant];
    $[54] = collapseAll;
    $[55] = headerVariant;
    $[56] = toggleAll;
    $[57] = t26;
    $[58] = t27;
  } else {
    t26 = $[57];
    t27 = $[58];
  }
  (0, import_react.useEffect)(t26, t27);
  let t28;
  if ($[59] === Symbol.for("react.memo_cache_sentinel")) {
    t28 = id_2 => {
      setCollapsedIds(prev => {
        const next = new Set(prev);
        if (next.has(id_2)) next.delete(id_2);else next.add(id_2);
        return next;
      });
    };
    $[59] = t28;
  } else t28 = $[59];
  const toggleCollapse = t28;
  let t29;
  if ($[60] !== readOnly || $[61] !== selectedElementIds) {
    t29 = (e_5, id_3) => {
      if (readOnly) {
        e_5.preventDefault();
        return;
      }
      e_5.stopPropagation();
      const ids_0 = selectedElementIds.has(id_3) && selectedElementIds.size > 1 ? new Set(selectedElementIds) : new Set([id_3]);
      dragIdsRef.current = ids_0;
      dropStickyRef.current = null;
      setDragIds(ids_0);
      e_5.dataTransfer.effectAllowed = "move";
      e_5.dataTransfer.setData("text/plain", id_3);
      suppressRowDragImage(e_5);
    };
    $[60] = readOnly;
    $[61] = selectedElementIds;
    $[62] = t29;
  } else t29 = $[62];
  const handleDragStart = t29;
  let t30;
  if ($[63] === Symbol.for("react.memo_cache_sentinel")) {
    t30 = () => {
      const line = dropLineRef.current;
      if (line) {
        line.style.opacity = "0";
        line.removeAttribute("data-drop-indicator");
      }
      dropInsideRowRef.current?.removeAttribute("data-drop-inside");
      dropInsideRowRef.current = null;
      dropPaintRef.current = null;
    };
    $[63] = t30;
  } else t30 = $[63];
  const clearDropPaint = t30;
  let t31;
  if ($[64] === Symbol.for("react.memo_cache_sentinel")) {
    t31 = () => {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = 0;
      }
      lastDragPointRef.current = null;
    };
    $[64] = t31;
  } else t31 = $[64];
  const stopAutoScroll = t31;
  let t32;
  if ($[65] === Symbol.for("react.memo_cache_sentinel")) {
    t32 = () => {
      const dwell = nestDwellRef.current;
      if (dwell.timer) window.clearTimeout(dwell.timer);
      nestDwellRef.current = {
        hoveredId: null,
        armed: false,
        timer: 0
      };
    };
    $[65] = t32;
  } else t32 = $[65];
  const resetNestDwell = t32;
  let t33;
  if ($[66] === Symbol.for("react.memo_cache_sentinel")) {
    t33 = (targetId, position) => {
      const prev_0 = dropPaintRef.current;
      if (prev_0 && prev_0.targetId === targetId && prev_0.position === position) return;
      dropPaintRef.current = {
        targetId,
        position
      };
      const list = dropListRef.current;
      const line_0 = dropLineRef.current;
      if (!list || !line_0) return;
      const insideRow = dropInsideRowRef.current;
      if (insideRow && (position !== "inside" || insideRow.getAttribute("data-layer-id") !== targetId)) {
        insideRow.removeAttribute("data-drop-inside");
        dropInsideRowRef.current = null;
      }
      if (position === "inside") {
        line_0.style.opacity = "0";
        line_0.removeAttribute("data-drop-indicator");
        const row_1 = list.querySelector(`[data-layer-id="${CSS.escape(targetId)}"]`);
        if (row_1) {
          row_1.setAttribute("data-drop-inside", "");
          dropInsideRowRef.current = row_1;
        }
        return;
      }
      const index_0 = indexByIdRef.current.get(targetId);
      const hit = index_0 == null ? void 0 : visibleRowsRef.current[index_0];
      if (index_0 == null || !hit) {
        line_0.style.opacity = "0";
        line_0.removeAttribute("data-drop-indicator");
        return;
      }
      const top = position === "before" ? LAYER_LIST_TOP_PADDING + index_0 * LAYER_ROW_HEIGHT : LAYER_LIST_TOP_PADDING + hit.subtreeEnd * LAYER_ROW_HEIGHT;
      line_0.style.top = `${top}px`;
      line_0.style.marginLeft = `${indentOf$1(hit.depth) + DROP_LINE_INSET}px`;
      line_0.style.opacity = "1";
      line_0.setAttribute("data-drop-indicator", position);
    };
    $[66] = t33;
  } else t33 = $[66];
  const paintDrop = t33;
  let hitTestLayerRow;
  let retargetDropAt;
  if ($[67] !== store) {
    const applyDropHover = (targetId_0, depth, canHaveChildren, expanded, clientX, clientY, rowRect) => {
      const ids_1 = dragIdsRef.current;
      if (!ids_1 || ids_1.has(targetId_0) || hasAncestorIn(store, targetId_0, ids_1)) return;
      const dwell_0 = nestDwellRef.current;
      if (dwell_0.hoveredId !== targetId_0) {
        if (dwell_0.timer) window.clearTimeout(dwell_0.timer);
        dwell_0.hoveredId = targetId_0;
        dwell_0.armed = false;
        dwell_0.timer = canHaveChildren ? window.setTimeout(() => {
          dwell_0.timer = 0;
          dwell_0.armed = true;
          const pt = lastDragPointRef.current;
          if (pt) retargetDropAt(pt.x, pt.y);
        }, NEST_DWELL_MS) : 0;
      }
      const intent = resolveLayerTreeDrop(store, {
        hoveredId: targetId_0,
        depth,
        canHaveChildren,
        expanded,
        xInRow: clientX - rowRect.left,
        yRatio: (clientY - rowRect.top) / (rowRect.height || 1),
        indentBase: INDENT_BASE$1,
        indentStep: INDENT_STEP$1,
        sticky: dropStickyRef.current,
        dragIds: ids_1,
        allowInside: dwell_0.armed
      });
      dropStickyRef.current = intent.sticky;
      paintDrop(intent.targetId, intent.position);
    };
    let t34;
    if ($[70] === Symbol.for("react.memo_cache_sentinel")) {
      t34 = (clientX_0, clientY_0) => {
        const list_0 = dropListRef.current;
        const rows = visibleRowsRef.current;
        if (!list_0 || rows.length === 0) return null;
        const box = list_0.getBoundingClientRect();
        if (clientY_0 < box.top || clientY_0 > box.bottom || clientX_0 < box.left || clientX_0 > box.right) return null;
        const stickyRow = document.elementFromPoint(clientX_0, clientY_0)?.closest("[data-sticky-parent] [data-layer-id]");
        if (stickyRow && list_0.contains(stickyRow)) {
          const index_1 = indexByIdRef.current.get(stickyRow.dataset.layerId);
          if (index_1 !== void 0) return {
            row: rows[index_1],
            index: index_1,
            rect: stickyRow.getBoundingClientRect()
          };
        }
        const y = clientY_0 - box.top - LAYER_LIST_TOP_PADDING;
        const index_2 = Math.max(0, Math.min(rows.length - 1, Math.floor(y / LAYER_ROW_HEIGHT)));
        const row_2 = rows[index_2];
        if (!row_2) return null;
        const top_0 = box.top + LAYER_LIST_TOP_PADDING + index_2 * LAYER_ROW_HEIGHT;
        return {
          row: row_2,
          index: index_2,
          rect: new DOMRect(box.left, top_0, box.width, LAYER_ROW_HEIGHT)
        };
      };
      $[70] = t34;
    } else t34 = $[70];
    hitTestLayerRow = t34;
    retargetDropAt = (clientX_1, clientY_1) => {
      const hit_0 = hitTestLayerRow(clientX_1, clientY_1);
      if (!hit_0) return;
      const {
        row: row_3,
        rect
      } = hit_0;
      const element_3 = getById(store, row_3.id);
      if (!element_3) return;
      const canHaveChildren_0 = hasChildren$1(element_3);
      const expanded_0 = canHaveChildren_0 && getChildren$2(store, row_3.id).length > 0 && !collapsedIdsRef.current.has(row_3.id);
      applyDropHover(row_3.id, row_3.depth, canHaveChildren_0, expanded_0, clientX_1, clientY_1, rect);
    };
    $[67] = store;
    $[68] = hitTestLayerRow;
    $[69] = retargetDropAt;
  } else {
    hitTestLayerRow = $[68];
    retargetDropAt = $[69];
  }
  let t34;
  if ($[71] !== retargetDropAt) {
    t34 = () => {
      autoScrollTickRef.current = () => {
        const pt_0 = lastDragPointRef.current;
        const sc = scrollContainerRef.current;
        if (!pt_0 || !sc || !dragIdsRef.current) {
          autoScrollRafRef.current = 0;
          return;
        }
        const rect_0 = sc.getBoundingClientRect();
        let dy = 0;
        if (pt_0.y < rect_0.top + DROP_SCROLL_EDGE) {
          const t = Math.min(1, (rect_0.top + DROP_SCROLL_EDGE - pt_0.y) / DROP_SCROLL_EDGE);
          dy = -Math.max(1, Math.round(DROP_SCROLL_MAX * t));
        } else if (pt_0.y > rect_0.bottom - DROP_SCROLL_EDGE) {
          const t_0 = Math.min(1, (pt_0.y - (rect_0.bottom - DROP_SCROLL_EDGE)) / DROP_SCROLL_EDGE);
          dy = Math.max(1, Math.round(DROP_SCROLL_MAX * t_0));
        }
        if (dy) {
          const prev_1 = sc.scrollTop;
          sc.scrollTop = sc.scrollTop + dy;
          if (sc.scrollTop !== prev_1) {
            retargetDropAt(pt_0.x, pt_0.y);
            autoScrollRafRef.current = requestAnimationFrame(() => autoScrollTickRef.current());
            return;
          }
        }
        autoScrollRafRef.current = 0;
      };
    };
    $[71] = retargetDropAt;
    $[72] = t34;
  } else t34 = $[72];
  (0, import_react.useLayoutEffect)(t34);
  let t35;
  if ($[73] === Symbol.for("react.memo_cache_sentinel")) {
    t35 = () => {
      if (autoScrollRafRef.current) return;
      autoScrollRafRef.current = requestAnimationFrame(() => autoScrollTickRef.current());
    };
    $[73] = t35;
  } else t35 = $[73];
  const kickAutoScroll = t35;
  let t36;
  if ($[74] === Symbol.for("react.memo_cache_sentinel")) {
    t36 = () => {
      dragIdsRef.current = null;
      dropStickyRef.current = null;
      stopAutoScroll();
      resetNestDwell();
      clearDropPaint();
      setDragIds(null);
    };
    $[74] = t36;
  } else t36 = $[74];
  const handleDragEnd = t36;
  let t37;
  if ($[75] !== retargetDropAt || $[76] !== searchQuery) {
    t37 = e_6 => {
      if (!dragIdsRef.current || searchQuery.trim().length > 0) return;
      e_6.preventDefault();
      lastDragPointRef.current = {
        x: e_6.clientX,
        y: e_6.clientY
      };
      retargetDropAt(e_6.clientX, e_6.clientY);
      kickAutoScroll();
    };
    $[75] = retargetDropAt;
    $[76] = searchQuery;
    $[77] = t37;
  } else t37 = $[77];
  const handleListDragOver = t37;
  let t38;
  if ($[78] !== hitTestLayerRow || $[79] !== onDragElements || $[80] !== searchQuery || $[81] !== store) {
    t38 = e_7 => {
      e_7.preventDefault();
      if (searchQuery.trim().length > 0) {
        handleDragEnd();
        return;
      }
      const ids_2 = dragIdsRef.current;
      const hit_1 = hitTestLayerRow(e_7.clientX, e_7.clientY);
      if (ids_2 && onDragElements && hit_1 && !ids_2.has(hit_1.row.id) && !hasAncestorIn(store, hit_1.row.id, ids_2)) {
        const element_4 = getById(store, hit_1.row.id);
        if (element_4) {
          const canHaveChildren_1 = hasChildren$1(element_4);
          const expanded_1 = canHaveChildren_1 && getChildren$2(store, hit_1.row.id).length > 0 && !collapsedIdsRef.current.has(hit_1.row.id);
          const intent_0 = resolveLayerTreeDrop(store, {
            hoveredId: hit_1.row.id,
            depth: hit_1.row.depth,
            canHaveChildren: canHaveChildren_1,
            expanded: expanded_1,
            xInRow: e_7.clientX - hit_1.rect.left,
            yRatio: (e_7.clientY - hit_1.rect.top) / (hit_1.rect.height || 1),
            indentBase: INDENT_BASE$1,
            indentStep: INDENT_STEP$1,
            sticky: dropStickyRef.current,
            dragIds: ids_2,
            allowInside: nestDwellRef.current.armed && nestDwellRef.current.hoveredId === hit_1.row.id
          });
          if (!ids_2.has(intent_0.targetId)) onDragElements([...ids_2], intent_0.targetId, intent_0.position);
        }
      }
      handleDragEnd();
    };
    $[78] = hitTestLayerRow;
    $[79] = onDragElements;
    $[80] = searchQuery;
    $[81] = store;
    $[82] = t38;
  } else t38 = $[82];
  const handleListDrop = t38;
  let t39;
  if ($[83] === Symbol.for("react.memo_cache_sentinel")) {
    t39 = e_8 => {
      const related = e_8.relatedTarget;
      if (related && e_8.currentTarget.contains(related)) return;
      stopAutoScroll();
      resetNestDwell();
      dropStickyRef.current = null;
      clearDropPaint();
    };
    $[83] = t39;
  } else t39 = $[83];
  const handleListDragLeave = t39;
  let filtering;
  let matches;
  let searchResult;
  let t40;
  let visibleRows;
  if ($[84] !== collapsedIds || $[85] !== searchQuery || $[86] !== selectedElementIds || $[87] !== store) {
    const searchIndex = createLayerSearchIndex();
    let t41;
    if ($[93] !== searchQuery) {
      t41 = searchQuery.trim();
      $[93] = searchQuery;
      $[94] = t41;
    } else t41 = $[94];
    filtering = t41.length > 0;
    searchResult = searchIndex.search(store, searchQuery);
    matches = searchResult?.matches ?? [];
    const resultRows = matches.length ? withTextParents(store, matches) : [];
    visibleRows = filtering ? flattenSearchLayerRows(resultRows, selectedElementIds) : flattenVisibleLayerRows(store, collapsedIds, selectedElementIds);
    t40 = layerRowIndexById(visibleRows);
    $[84] = collapsedIds;
    $[85] = searchQuery;
    $[86] = selectedElementIds;
    $[87] = store;
    $[88] = filtering;
    $[89] = matches;
    $[90] = searchResult;
    $[91] = t40;
    $[92] = visibleRows;
  } else {
    filtering = $[88];
    matches = $[89];
    searchResult = $[90];
    t40 = $[91];
    visibleRows = $[92];
  }
  const indexById = t40;
  let t41;
  if ($[95] !== collapsedIds || $[96] !== indexById || $[97] !== visibleRows) {
    t41 = () => {
      collapsedIdsRef.current = collapsedIds;
      visibleRowsRef.current = visibleRows;
      indexByIdRef.current = indexById;
    };
    $[95] = collapsedIds;
    $[96] = indexById;
    $[97] = visibleRows;
    $[98] = t41;
  } else t41 = $[98];
  (0, import_react.useLayoutEffect)(t41);
  let t42;
  if ($[99] !== visibleRows) {
    t42 = selectionShells(visibleRows);
    $[99] = visibleRows;
    $[100] = t42;
  } else t42 = $[100];
  const shells = t42;
  let stickyParents;
  if ($[101] !== selectedElementIds || $[102] !== visibleRows) {
    stickyParents = new Map();
    visibleRows.forEach((row_4, index_3) => {
      if (selectedElementIds.has(row_4.id) && row_4.subtreeEnd > index_3 + 1) stickyParents.set(index_3, row_4.subtreeEnd);
    });
    $[101] = selectedElementIds;
    $[102] = visibleRows;
    $[103] = stickyParents;
  } else stickyParents = $[103];
  let pinnedIndexes;
  if ($[104] !== indexById || $[105] !== openMenuId || $[106] !== renamingId) {
    pinnedIndexes = [];
    if (renamingId != null) {
      let t43;
      if ($[108] !== indexById || $[109] !== renamingId) {
        t43 = indexById.get(renamingId);
        $[108] = indexById;
        $[109] = renamingId;
        $[110] = t43;
      } else t43 = $[110];
      const i = t43;
      if (i != null) pinnedIndexes.push(i);
    }
    if (openMenuId != null) {
      let t43;
      if ($[111] !== indexById || $[112] !== openMenuId) {
        t43 = indexById.get(openMenuId);
        $[111] = indexById;
        $[112] = openMenuId;
        $[113] = t43;
      } else t43 = $[113];
      const i_0 = t43;
      if (i_0 != null) pinnedIndexes.push(i_0);
    }
    $[104] = indexById;
    $[105] = openMenuId;
    $[106] = renamingId;
    $[107] = pinnedIndexes;
  } else pinnedIndexes = $[107];
  let t43;
  if ($[114] !== collapsedIds || $[115] !== dragIds || $[116] !== filtering || $[117] !== handleDragStart || $[118] !== handleRenameComplete || $[119] !== handleRenameKeyDown || $[120] !== handleStartRename || $[121] !== onContextMenuRow || $[122] !== onFocusElement || $[123] !== onSelectElement || $[124] !== onSelectElements || $[125] !== openMenuId || $[126] !== renameDraft || $[127] !== renamingId || $[128] !== renderRowContextMenu || $[129] !== searchQuery || $[130] !== selectedElementIds || $[131] !== store || $[132] !== suppressMenuCloseFocusRef || $[133] !== visibleRows) {
    t43 = index_4 => {
      const row_5 = visibleRows[index_4];
      if (!row_5) return null;
      const element_5 = getById(store, row_5.id);
      if (!element_5) return null;
      const childIds = getChildren$2(store, row_5.id);
      const isSelected = selectedElementIds.has(element_5.id);
      const isInherited = row_5.isInherited;
      const isCollapsed = collapsedIds.has(element_5.id);
      const currentlyHasChildren = hasChildren$1(element_5) && childIds.length > 0;
      const isDragging = dragIds?.has(element_5.id) ?? false;
      const isEditingThis = renamingId === element_5.id;
      const layerAccent = getLayerAccent(element_5);
      const flat = filtering;
      return <ContextMenu$1 onOpenChange={o => {
        if (o) setOpenMenuId(element_5.id);else setOpenMenuId(c => c === element_5.id ? null : c);
      }}>{<ContextMenuTrigger asChild={true} onContextMenu={() => onContextMenuRow?.(element_5.id)}>{<div data-layer-id={element_5.id} data-layer-wrap={element_5.id} data-layer-depth={row_5.depth} draggable={!isEditingThis && !flat} onDragStart={e_9 => handleDragStart(e_9, element_5.id)} onDragEnd={handleDragEnd} className={cn$2("flex h-6.5 min-w-full w-max items-center gap-0.5 rounded-[5px] py-0 pl-3 pr-1 group relative", DROP_INSIDE_ROW, !isSelected && !isInherited && "hover:bg-ed-layer-hover data-[canvas-hover]:bg-ed-layer-hover", isSelected && "bg-ed-layer-active", isSelected && row_5.subtreeEnd > index_4 + 1 && "rounded-b-none", isInherited && "rounded-none hover:bg-ed-layer-child-hover data-[canvas-hover]:bg-ed-layer-child-hover", isDragging && "opacity-50")} style={{
            paddingLeft: `${indentOf$1(row_5.depth)}px`
          }} onClick={e_10 => {
            const anchor = anchorIdRef.current;
            if (e_10.shiftKey && anchor && selectedElementIds.has(anchor) && onSelectElements) {
              const parentKey = getParentId(store, anchor);
              if (parentKey !== null) {
                const siblings = getChildren$2(store, parentKey);
                const anchorIdx = siblings.indexOf(anchor);
                let effectiveId = element_5.id;
                while (effectiveId !== null && siblings.indexOf(effectiveId) === -1) {
                  const p = getParentId(store, effectiveId);
                  if (p === null || p === "ROOT") {
                    effectiveId = null;
                    break;
                  }
                  effectiveId = p;
                }
                const clickedIdx = effectiveId !== null ? siblings.indexOf(effectiveId) : -1;
                if (anchorIdx !== -1 && clickedIdx !== -1) {
                  const start = Math.min(anchorIdx, clickedIdx);
                  const end = Math.max(anchorIdx, clickedIdx);
                  onSelectElements([...selectedElementIds, ...siblings.slice(start, end + 1)]);
                  return;
                }
              }
            }
            const toggle = e_10.metaKey || e_10.ctrlKey;
            onSelectElement(element_5.id, e_10.shiftKey || toggle);
            if (!e_10.shiftKey) anchorIdRef.current = element_5.id;
            if (filtering && !toggle && !e_10.shiftKey) onFocusElement?.(element_5.id);
          }}>{<div className="flex h-full w-4 shrink-0 items-center justify-center">{currentlyHasChildren && !flat && <Button variant="ghost" size="icon-3xs" isChildText={false} aria-label={t(isCollapsed ? "layers.expand" : "layers.collapseOne", { name: getElementLabel(element_5) })} onClick={e_11 => {
                e_11.stopPropagation();
                toggleCollapse(element_5.id);
              }} className="group/caret h-full w-4 rounded-[5px] hover:bg-transparent [&_svg]:translate-x-0.5">{isCollapsed ? <CaretRightIcon className="size-2.5 text-ed-muted-foreground group-hover/caret:text-ed-foreground" /> : <CaretDownIcon className="size-2.5 text-ed-muted-foreground group-hover/caret:text-ed-foreground" />}</Button>}</div>}{<div className="mr-1 shrink-0 flex [&_svg]:size-3.5">{<LayerIcon element={element_5} size={14} />}</div>}{isEditingThis ? <Input ref={editInputRef} type="text" aria-label={t("layers.rename", { name: getElementLabel(element_5) })} value={renameDraft} onChange={e_12 => setRenameDraft(e_12.target.value)} onBlur={handleRenameComplete} onKeyDown={handleRenameKeyDown} onClick={_temp5$8} size="xs" className="flex-1 min-w-0 focus-visible:border-ed-border focus-visible:ring-ed-border/50 focus-visible:ring-[2px]" /> : <div data-layer-label="" className="flex h-full shrink-0 items-center" onDoubleClick={e_14 => handleStartRename(e_14, element_5)}>{<Text$4 size="3xs" variant="primary" className={cn$2("shrink-0 whitespace-nowrap select-none text-left", layerAccent.label)}>{flat ? splitLabelMatches(getElementLabel(element_5), searchQuery).map(_temp6$6) : getElementLabel(element_5)}</Text$4>}<VariableLayerBadge element={element_5} /></div>}{<LayerFocusScrub isSelected={isSelected} isInherited={isInherited} onFocus={onFocusElement ? () => onFocusElement(element_5.id) : void 0} />}</div>}</ContextMenuTrigger>}{openMenuId === element_5.id && renderRowContextMenu && <ContextMenuContent className="min-w-[14rem]" onCloseAutoFocus={e_15 => {
          if (suppressMenuCloseFocusRef?.current) {
            e_15.preventDefault();
            suppressMenuCloseFocusRef.current = false;
          }
        }}>{renderRowContextMenu(element_5.id)}</ContextMenuContent>}</ContextMenu$1>;
    };
    $[114] = collapsedIds;
    $[115] = dragIds;
    $[116] = filtering;
    $[117] = handleDragStart;
    $[118] = handleRenameComplete;
    $[119] = handleRenameKeyDown;
    $[120] = handleStartRename;
    $[121] = onContextMenuRow;
    $[122] = onFocusElement;
    $[123] = onSelectElement;
    $[124] = onSelectElements;
    $[125] = openMenuId;
    $[126] = renameDraft;
    $[127] = renamingId;
    $[128] = renderRowContextMenu;
    $[129] = searchQuery;
    $[130] = selectedElementIds;
    $[131] = store;
    $[132] = suppressMenuCloseFocusRef;
    $[133] = visibleRows;
    $[134] = t43;
  } else t43 = $[134];
  const renderLayerRow = t43;
  const noMatches = filtering && matches.length === 0;
  const resultCount = searchResult?.truncated ? t("layers.resultCountMany") : t("layers.resultCount", { count: matches.length });
  const t44 = headerVariant === "default" && "pt-1";
  const t45 = headerVariant === "sidebar-v2" && "border-t border-ed-border";
  let t46;
  if ($[135] !== t44 || $[136] !== t45) {
    t46 = cn$2("h-full min-w-0 flex flex-col", t44, t45);
    $[135] = t44;
    $[136] = t45;
    $[137] = t46;
  } else t46 = $[137];
  let t47;
  if (true) {
    t47 = headerVariant === "default" && <div className="px-3 pb-2 border-b border-ed-border flex items-center gap-1.5">{<div className="flex-1 min-w-0">{<PanelSearchInput inputRef={searchInputRef} value={searchQuery} onChange={setSearchQuery} onKeyDown={e_16 => {
          if (e_16.nativeEvent.isComposing || e_16.keyCode === 229) return;
          if (e_16.key === "Escape") setSearchQuery("");
        }} placeholder={t("layers.search")} />}</div>}{hasExpanded && <Tooltip>{<TooltipTrigger asChild={true}>{<Button variant="outline" size="icon" isChildText={false} aria-label={t("layers.collapse")} onClick={collapseAll} className="size-8 shrink-0 shadow-none">{<CollapseAllIcon className="size-4 text-ed-muted-foreground" />}</Button>}</TooltipTrigger>}{<TooltipContent side="bottom">{t("layers.collapse")} ⌥L</TooltipContent>}</Tooltip>}</div>;
    $[138] = collapseAll;
    $[139] = hasExpanded;
    $[140] = headerVariant;
    $[141] = searchInputRef;
    $[142] = searchQuery;
    $[143] = setSearchQuery;
    $[144] = t47;
  } else t47 = $[144];
  let t48;
  if (true) {
    const toggleLabel = allCollapsed ? t("layers.expandAll") : t("layers.collapseAll");
    t48 = headerVariant === "sidebar-v2" && <SidebarSectionHeader title={t("layers.title")} showScrollBorder={hasScrolled} alignWithLayerRows={true} leadingAction={<Button variant="ghost" size="icon-3xs" isChildText={false} aria-label={toggleLabel} title={`${toggleLabel} ⌥L`} onClick={toggleAll} disabled={expandableIds.length === 0} className="h-6.5 w-4 text-ed-foreground-secondary hover:bg-transparent hover:text-ed-foreground [&_svg]:translate-x-0.5">{allCollapsed ? <OpenAllIcon className="size-2.5" /> : <CollapseAllIcon className="size-2.5" />}</Button>} />;
    $[145] = allCollapsed;
    $[146] = expandableIds.length;
    $[147] = hasScrolled;
    $[148] = headerVariant;
    $[149] = toggleAll;
    $[150] = t48;
  } else t48 = $[150];
  let t49;
  if (true) {
    t49 = filtering && !noMatches && <div className="px-3 py-1">{<Text$4 size="3xs" variant="secondary">{resultCount}</Text$4>}</div>;
    $[151] = filtering;
    $[152] = noMatches;
    $[153] = resultCount;
    $[154] = t49;
  } else t49 = $[154];
  let t50;
  if ($[155] !== dragIds || $[156] !== filtering || $[157] !== noMatches || $[158] !== pinnedIndexes || $[159] !== renderLayerRow || $[160] !== scrollElement || $[161] !== shells || $[162] !== stickyParents || $[163] !== visibleRows) {
    t50 = noMatches ? <div className="flex items-center justify-center h-32">{<Text$4 size="3xs" variant="tertiary">{t("layers.noMatches")}</Text$4>}</div> : visibleRows.length > 0 ? <div className="w-max min-w-full px-2">{<VirtualizedLayerRows count={visibleRows.length} getItemKey={i_2 => visibleRows[i_2]?.id ?? String(i_2)} scrollElement={scrollElement} pinnedIndexes={pinnedIndexes} overscan={dragIds ? 24 : 8} listRef={dropListRef} virtualizerRef={virtualizerRef} minWidthResetKey={`${filtering}:${visibleRows.length}:${visibleRows[0]?.id ?? ""}:${visibleRows[visibleRows.length - 1]?.id ?? ""}`} shells={shells} stickyParents={stickyParents} renderRow={renderLayerRow} dropLine={<div ref={dropLineRef} className="absolute left-0 right-0 z-20 h-0.5 -translate-y-1/2 rounded-full pointer-events-none opacity-0" style={{
        marginRight: DROP_LINE_RIGHT_INSET,
        backgroundColor: "var(--ed-canvas-selection)"
      }} />} />}</div> : null;
    $[155] = dragIds;
    $[156] = filtering;
    $[157] = noMatches;
    $[158] = pinnedIndexes;
    $[159] = renderLayerRow;
    $[160] = scrollElement;
    $[161] = shells;
    $[162] = stickyParents;
    $[163] = visibleRows;
    $[164] = t50;
  } else t50 = $[164];
  let t51;
  if ($[165] !== handleListDragOver || $[166] !== handleListDrop || $[167] !== t50 || $[168] !== viewportRef) {
    t51 = <ScrollArea horizontal={true} viewportRef={viewportRef} viewportClassName="overscroll-x-contain" className="flex-1 min-w-0" data-horizontal-scroll="" onDragOver={handleListDragOver} onDrop={handleListDrop} onDragLeave={handleListDragLeave} onMouseOver={handleRowHover} onMouseLeave={handleRowUnhover}>{t50}</ScrollArea>;
    $[165] = handleListDragOver;
    $[166] = handleListDrop;
    $[167] = t50;
    $[168] = viewportRef;
    $[169] = t51;
  } else t51 = $[169];
  let t52;
  if ($[170] !== t46 || $[171] !== t47 || $[172] !== t48 || $[173] !== t49 || $[174] !== t51) {
    t52 = <div className={t46}>{t47}{t48}{t49}{t51}</div>;
    $[170] = t46;
    $[171] = t47;
    $[172] = t48;
    $[173] = t49;
    $[174] = t51;
    $[175] = t52;
  } else t52 = $[175];
  return t52;
}
function _temp6$6(seg, i_1) {
  return <span key={i_1} className={cn$2(seg.match && "font-semibold")}>{seg.text}</span>;
}
function _temp5$8(e_13) {
  return e_13.stopPropagation();
}
function _temp4$11() {
  publishHover(null, "panel");
}
function _temp3$12(e) {
  publishHover((e.target?.closest?.("[data-layer-id]") ?? null)?.getAttribute("data-layer-id") ?? null, "panel");
}
function _temp2$20() {}
function _temp$28() {
  return new Set();
}

export { LayersPanel };
