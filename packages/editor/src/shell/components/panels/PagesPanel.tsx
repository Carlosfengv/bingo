/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/PagesPanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useScrolledHeader } from "../../hooks/useScrolledHeader";
import { ConfirmDialog } from "../ConfirmDialog";
import { SidebarSectionHeader } from "../SidebarSectionHeader";
import { IconBtn } from "./styles/primitives";
import { Button, ContextMenu$1, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, FileIcon, Input, PlusIcon, ScrollArea, SearchIcon, SpinnerIcon, Text$4, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var PAGE_ROW_LEFT_PADDING = 18;
function LocalizedPageText({ id }) {
  const { t } = useTranslation("editor");
  return <>{t(`pages.${id}`)}</>;
}
function PageRowContextMenu(t0) {
  const $ = (0, import_compiler_runtime.c)(15);
  const {
    children,
    disabled,
    onRename,
    onDelete
  } = t0;
  const pendingAction = (0, import_react.useRef)(null);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = open => {
      if (open) pendingAction.current = null;
    };
    $[0] = t1;
  } else t1 = $[0];
  const t2 = disabled || !onRename && !onDelete;
  let t3;
  if ($[1] !== children || $[2] !== t2) {
    t3 = <ContextMenuTrigger asChild={true} disabled={t2}>{children}</ContextMenuTrigger>;
    $[1] = children;
    $[2] = t2;
    $[3] = t3;
  } else t3 = $[3];
  let t4;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = event => {
      const action = pendingAction.current;
      if (action) {
        event.preventDefault();
        pendingAction.current = null;
        requestAnimationFrame(action);
      }
    };
    $[4] = t4;
  } else t4 = $[4];
  let t5;
  if ($[5] !== onRename) {
    t5 = onRename && <ContextMenuItem onSelect={() => {
      pendingAction.current = onRename;
    }}><LocalizedPageText id="rename" /></ContextMenuItem>;
    $[5] = onRename;
    $[6] = t5;
  } else t5 = $[6];
  let t6;
  if ($[7] !== onDelete) {
    t6 = onDelete && <ContextMenuItem onSelect={() => {
      pendingAction.current = onDelete;
    }}><LocalizedPageText id="delete" /></ContextMenuItem>;
    $[7] = onDelete;
    $[8] = t6;
  } else t6 = $[8];
  let t7;
  if ($[9] !== t5 || $[10] !== t6) {
    t7 = <ContextMenuContent onCloseAutoFocus={t4}>{t5}{t6}</ContextMenuContent>;
    $[9] = t5;
    $[10] = t6;
    $[11] = t7;
  } else t7 = $[11];
  let t8;
  if ($[12] !== t3 || $[13] !== t7) {
    t8 = <ContextMenu$1 onOpenChange={t1}>{t3}{t7}</ContextMenu$1>;
    $[12] = t3;
    $[13] = t7;
    $[14] = t8;
  } else t8 = $[14];
  return t8;
}
function PagesPanelImpl(t0) {
  const $ = (0, import_compiler_runtime.c)(67);
  const {
    pages,
    activePageId,
    isPageLoading,
    onSelectPage,
    onCreatePage,
    onRenamePage,
    onDeletePage,
    onReorderPages,
    readOnly: t1,
    variant: t2,
    expanded,
    onExpandedChange,
    onSearchClick
  } = t0;
  const readOnly = t1 === void 0 ? false : t1;
  const sidebarV2 = (t2 === void 0 ? "default" : t2) === "sidebar-v2";
  const { t } = useTranslation("editor");
  const {
    hasScrolled,
    viewportRef
  } = useScrolledHeader();
  const [internalExpanded, setInternalExpanded] = (0, import_react.useState)(true);
  const isExpanded = expanded ?? internalExpanded;
  let t3;
  if ($[0] !== expanded || $[1] !== onExpandedChange) {
    t3 = next => {
      if (expanded === void 0) setInternalExpanded(next);
      onExpandedChange?.(next);
    };
    $[0] = expanded;
    $[1] = onExpandedChange;
    $[2] = t3;
  } else t3 = $[2];
  const setExpanded = t3;
  const [editingPageId, setEditingPageId] = (0, import_react.useState)(null);
  const [editingName, setEditingName] = (0, import_react.useState)("");
  const [showDeletePage, setShowDeletePage] = (0, import_react.useState)(false);
  const [pageToDelete, setPageToDelete] = (0, import_react.useState)(null);
  const editInputRef = (0, import_react.useRef)(null);
  const [draggedId, setDraggedId] = (0, import_react.useState)(null);
  const [dropIndex, setDropIndex] = (0, import_react.useState)(null);
  const listRef = (0, import_react.useRef)(null);
  const pointerStartY = (0, import_react.useRef)(0);
  const didDrag = (0, import_react.useRef)(false);
  const draggedIdRef = (0, import_react.useRef)(null);
  const dropIndexRef = (0, import_react.useRef)(null);
  let t4;
  let t5;
  if ($[3] !== editingPageId) {
    t4 = () => {
      if (editingPageId && editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    };
    t5 = [editingPageId];
    $[3] = editingPageId;
    $[4] = t4;
    $[5] = t5;
  } else {
    t4 = $[4];
    t5 = $[5];
  }
  (0, import_react.useEffect)(t4, t5);
  let t6;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = page => {
      setEditingPageId(page.id);
      setEditingName(page.name);
    };
    $[6] = t6;
  } else t6 = $[6];
  const handleStartRename = t6;
  let t7;
  if ($[7] !== editingName || $[8] !== editingPageId || $[9] !== onRenamePage) {
    t7 = () => {
      if (editingPageId && editingName.trim() && onRenamePage) onRenamePage(editingPageId, editingName.trim());
      setEditingPageId(null);
      setEditingName("");
    };
    $[7] = editingName;
    $[8] = editingPageId;
    $[9] = onRenamePage;
    $[10] = t7;
  } else t7 = $[10];
  const handleConfirmRename = t7;
  let t8;
  if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = () => {
      setEditingPageId(null);
      setEditingName("");
    };
    $[11] = t8;
  } else t8 = $[11];
  const handleCancelRename = t8;
  let t9;
  if ($[12] !== handleConfirmRename) {
    t9 = e => {
      if (e.key === "Enter") handleConfirmRename();else if (e.key === "Escape") handleCancelRename();
    };
    $[12] = handleConfirmRename;
    $[13] = t9;
  } else t9 = $[13];
  const handleKeyDown = t9;
  let t10;
  if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
    t10 = page_0 => {
      setPageToDelete(page_0);
      setShowDeletePage(true);
    };
    $[14] = t10;
  } else t10 = $[14];
  const handleDelete = t10;
  let t11;
  if ($[15] !== onDeletePage || $[16] !== pageToDelete) {
    t11 = () => {
      if (pageToDelete && onDeletePage) onDeletePage(pageToDelete.id);
      setShowDeletePage(false);
      setPageToDelete(null);
    };
    $[15] = onDeletePage;
    $[16] = pageToDelete;
    $[17] = t11;
  } else t11 = $[17];
  const confirmDeletePage = t11;
  const computeDropIndex = clientY => {
    const list = listRef.current;
    if (!list) return null;
    const items = Array.from(list.querySelectorAll(":scope > [data-page-row]"));
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return items.length;
  };
  const handlePointerDown = (e_0, pageId) => {
    if (readOnly || editingPageId) return;
    if (e_0.button !== 0) return;
    const target = e_0.target;
    if (sidebarV2 ? target.closest("[data-page-action]") : target.closest("button")) return;
    pointerStartY.current = e_0.clientY;
    didDrag.current = false;
    const startPageId = pageId;
    const onMove = me => {
      if (Math.abs(me.clientY - pointerStartY.current) > 4) {
        didDrag.current = true;
        draggedIdRef.current = startPageId;
        setDraggedId(startPageId);
        const nextIndex = computeDropIndex(me.clientY);
        dropIndexRef.current = nextIndex;
        setDropIndex(nextIndex);
      }
      if (didDrag.current) {
        const nextIndex_0 = computeDropIndex(me.clientY);
        dropIndexRef.current = nextIndex_0;
        setDropIndex(nextIndex_0);
      }
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (didDrag.current) {
        const prev = draggedIdRef.current;
        const prevDrop = dropIndexRef.current;
        if (prev && prevDrop !== null && onReorderPages) {
          const fromIndex = pages.findIndex(p => p.id === prev);
          let toIndex = prevDrop;
          if (toIndex > fromIndex) toIndex--;
          if (fromIndex !== -1 && toIndex !== fromIndex) {
            const reordered = [...pages];
            const [moved] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, moved);
            onReorderPages(reordered);
          }
        }
        draggedIdRef.current = null;
        dropIndexRef.current = null;
        setDraggedId(null);
        setDropIndex(null);
      }
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };
  if (sidebarV2) {
    let t12;
    if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
      t12 = cn$2("flex h-full min-h-0 flex-col");
      $[18] = t12;
    } else t12 = $[18];
    const t13 = isExpanded && hasScrolled;
    let t14;
    if ($[19] !== isExpanded || $[20] !== setExpanded) {
      t14 = () => setExpanded(!isExpanded);
      $[19] = isExpanded;
      $[20] = setExpanded;
      $[21] = t14;
    } else t14 = $[21];
    let t15;
    if ($[22] !== onSearchClick) {
      t15 = onSearchClick && <IconBtn data-page-action="" label={t("pages.searchLayers")} onClick={onSearchClick}>{<SearchIcon />}</IconBtn>;
      $[22] = onSearchClick;
      $[23] = t15;
    } else t15 = $[23];
    let t16;
    if ($[24] !== onCreatePage || $[25] !== readOnly) {
      t16 = !readOnly && <IconBtn data-page-action="" label={t("pages.create")} onClick={onCreatePage}>{<PlusIcon />}</IconBtn>;
      $[24] = onCreatePage;
      $[25] = readOnly;
      $[26] = t16;
    } else t16 = $[26];
    let t17;
    if ($[27] !== t15 || $[28] !== t16) {
      t17 = <div className="flex items-center gap-0.5">{t15}{t16}</div>;
      $[27] = t15;
      $[28] = t16;
      $[29] = t17;
    } else t17 = $[29];
    let t18;
    if ($[30] !== isExpanded || $[31] !== t13 || $[32] !== t14 || $[33] !== t17) {
      t18 = <SidebarSectionHeader title={t("pages.title")} className="pr-2" showScrollBorder={t13} alignWithLayerRows={true} expanded={isExpanded} onToggle={t14} actions={t17} />;
      $[30] = isExpanded;
      $[31] = t13;
      $[32] = t14;
      $[33] = t17;
      $[34] = t18;
    } else t18 = $[34];
    const t19 = isExpanded && <ScrollArea className="min-h-0 flex-1" viewportRef={viewportRef}>{<div ref={listRef} className="relative flex w-full flex-col gap-0.5 px-2 pb-2">{pages.map((page_1, index) => {
          const isActive = page_1.id === activePageId;
          const isEditing = editingPageId === page_1.id;
          const isDragging = draggedId === page_1.id;
          return <PageRowContextMenu key={page_1.id} disabled={readOnly || isEditing} onRename={onRenamePage ? () => handleStartRename(page_1) : void 0} onDelete={pages.length > 1 && onDeletePage ? () => handleDelete(page_1) : void 0}>{<div data-page-row="" onPointerDown={e_1 => handlePointerDown(e_1, page_1.id)} className={cn$2("group relative flex w-full shrink-0 select-none", isDragging && "opacity-30")}>{dropIndex === index && draggedId && <div className="pointer-events-none absolute -top-0.5 left-0 right-0 z-10 h-0.5 rounded-full" style={{
                marginRight: 12,
                backgroundColor: "var(--ed-canvas-selection)"
              }} />}{isEditing ? <div className="flex h-6.5 w-full items-center gap-1.5 rounded-[5px] pr-1.5" style={{
                paddingLeft: PAGE_ROW_LEFT_PADDING
              }}>{<FileIcon width={14} height={14} className="size-3.5 shrink-0 text-ed-foreground-secondary" />}{<Input ref={editInputRef} aria-label={`Rename ${page_1.name}`} value={editingName} onChange={e_2 => setEditingName(e_2.target.value)} onKeyDown={handleKeyDown} onBlur={handleConfirmRename} onClick={_temp$27} size="xs" className="min-w-0 flex-1" />}</div> : <>{<Button type="button" variant="ghost" size="text" isChildText={false} data-active={isActive ? "true" : void 0} className={cn$2("h-6.5 justify-start gap-2 rounded-[5px] px-1.5 text-[11px] font-normal text-ed-foreground-secondary hover:text-ed-foreground [&_svg]:size-4", "data-[active=true]:bg-ed-accent data-[active=true]:text-ed-foreground", "w-full gap-1.5 [&_svg]:size-3.5", draggedId && "pointer-events-none hover:bg-transparent! hover:text-ed-foreground-secondary!")} style={{
                  paddingLeft: PAGE_ROW_LEFT_PADDING
                }} onClick={() => {
                  if (!didDrag.current) onSelectPage(page_1.id);
                }}>{<FileIcon width={14} height={14} className="size-3.5 shrink-0 text-ed-foreground-secondary" />}{<span className="min-w-0 flex-1 truncate text-left">{page_1.name}</span>}{isActive && isPageLoading && <SpinnerIcon className="shrink-0 animate-spin text-ed-foreground-secondary" />}</Button>}</>}</div>}</PageRowContextMenu>;
        })}{dropIndex === pages.length && draggedId && <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-0.5 rounded-full" style={{
          marginRight: 12,
          backgroundColor: "var(--ed-canvas-selection)"
        }} />}</div>}</ScrollArea>;
    let t20;
    if ($[35] === Symbol.for("react.memo_cache_sentinel")) {
      t20 = () => {
        setShowDeletePage(false);
        setPageToDelete(null);
      };
      $[35] = t20;
    } else t20 = $[35];
    const t21 = t("pages.deleteTitle", { name: pageToDelete?.name ?? "" });
    let t22;
    if ($[36] !== confirmDeletePage || $[37] !== showDeletePage || $[38] !== t21) {
      t22 = <ConfirmDialog isOpen={showDeletePage} onClose={t20} onConfirm={confirmDeletePage} title={t21} description={t("pages.deleteDescription")} confirmText={t("pages.deleteConfirm")} destructive={true} />;
      $[36] = confirmDeletePage;
      $[37] = showDeletePage;
      $[38] = t21;
      $[39] = t22;
    } else t22 = $[39];
    let t23;
    if ($[40] !== t18 || $[41] !== t19 || $[42] !== t22) {
      t23 = <div className={t12}>{t18}{t19}{t22}</div>;
      $[40] = t18;
      $[41] = t19;
      $[42] = t22;
      $[43] = t23;
    } else t23 = $[43];
    return t23;
  }
  const t12 = "flex flex-col";
  let t13;
  if ($[44] === Symbol.for("react.memo_cache_sentinel")) {
    t13 = <Text$4 size="xs" weight="semibold" variant="primary">{t("pages.title")}</Text$4>;
    $[44] = t13;
  } else t13 = $[44];
  let t14;
  if ($[45] !== onCreatePage || $[46] !== readOnly) {
    t14 = !readOnly && <Button variant="ghost" size="icon-2xs" onClick={onCreatePage} title={t("pages.create")}>{<PlusIcon width={14} height={14} />}</Button>;
    $[45] = onCreatePage;
    $[46] = readOnly;
    $[47] = t14;
  } else t14 = $[47];
  let t15;
  if ($[48] !== t14) {
    t15 = <div className="flex items-center justify-between px-4 py-3">{t13}{t14}</div>;
    $[48] = t14;
    $[49] = t15;
  } else t15 = $[49];
  const t16 = "relative flex flex-col gap-0.5 pb-2";
  const t17 = pages.map((page_2, index_0) => {
    const isActive_0 = page_2.id === activePageId;
    const isEditing_0 = editingPageId === page_2.id;
    const isDragging_0 = draggedId === page_2.id;
    return <PageRowContextMenu key={page_2.id} disabled={readOnly || isEditing_0} onRename={onRenamePage ? () => handleStartRename(page_2) : void 0} onDelete={pages.length > 1 && onDeletePage ? () => handleDelete(page_2) : void 0}>{<div data-page-row="" onPointerDown={e_4 => handlePointerDown(e_4, page_2.id)} className={cn$2("group flex items-center gap-2 px-4 py-1.5 cursor-default hover:bg-ed-accent/50 relative select-none", isActive_0 && "bg-ed-accent font-medium", isDragging_0 && "opacity-30")} onClick={() => {
        if (!didDrag.current && !isEditing_0) onSelectPage(page_2.id);
      }}>{dropIndex === index_0 && draggedId && !isDragging_0 && <div className="absolute -top-px left-2 right-2 h-0.5 bg-ed-primary rounded-full pointer-events-none z-10" />}{isEditing_0 ? <div className="flex-1 flex items-center gap-1">{<input ref={editInputRef} aria-label={`Rename ${page_2.name}`} type="text" value={editingName} onChange={e_5 => setEditingName(e_5.target.value)} onKeyDown={handleKeyDown} onBlur={handleConfirmRename} onClick={_temp2$19} className="flex-1 min-w-0 px-1.5 py-0.5 text-sm bg-ed-background border border-ed-border rounded outline-none focus:border-ed-primary text-ed-foreground" />}</div> : <>{<Text$4 size="sm" variant={isActive_0 ? "primary" : "secondary"} className="flex-1 truncate select-none">{page_2.name}</Text$4>}{isActive_0 && isPageLoading && <SpinnerIcon width={14} height={14} className="shrink-0 text-ed-muted-foreground animate-spin" />}</>}</div>}</PageRowContextMenu>;
  });
  let t18;
  if ($[50] !== draggedId || $[51] !== dropIndex || $[52] !== pages.length) {
    t18 = dropIndex === pages.length && draggedId && <div className="absolute bottom-2 left-2 right-2 h-0.5 bg-ed-primary rounded-full pointer-events-none z-10" />;
    $[50] = draggedId;
    $[51] = dropIndex;
    $[52] = pages.length;
    $[53] = t18;
  } else t18 = $[53];
  let t19;
  if ($[54] !== listRef || $[55] !== t17 || $[56] !== t18) {
    t19 = <div ref={listRef} className={t16}>{t17}{t18}</div>;
    $[54] = listRef;
    $[55] = t17;
    $[56] = t18;
    $[57] = t19;
  } else t19 = $[57];
  let t20;
  if ($[58] === Symbol.for("react.memo_cache_sentinel")) {
    t20 = () => {
      setShowDeletePage(false);
      setPageToDelete(null);
    };
    $[58] = t20;
  } else t20 = $[58];
  const t21 = t("pages.deleteTitle", { name: pageToDelete?.name ?? "" });
  let t22;
  if ($[59] !== confirmDeletePage || $[60] !== showDeletePage || $[61] !== t21) {
    t22 = <ConfirmDialog isOpen={showDeletePage} onClose={t20} onConfirm={confirmDeletePage} title={t21} description={t("pages.deleteDescription")} confirmText={t("pages.deleteConfirm")} destructive={true} />;
    $[59] = confirmDeletePage;
    $[60] = showDeletePage;
    $[61] = t21;
    $[62] = t22;
  } else t22 = $[62];
  let t23;
  if ($[63] !== t15 || $[64] !== t19 || $[65] !== t22) {
    t23 = <div className={t12}>{t15}{t19}{t22}</div>;
    $[63] = t15;
    $[64] = t19;
    $[65] = t22;
    $[66] = t23;
  } else t23 = $[66];
  return t23;
}
function _temp2$19(e_6) {
  return e_6.stopPropagation();
}
function _temp$27(e_3) {
  return e_3.stopPropagation();
}

function PagesPanel(props) {
  const { i18n } = useTranslation("editor");
  return <PagesPanelImpl key={i18n.resolvedLanguage} {...props} />;
}

export { PagesPanel };
