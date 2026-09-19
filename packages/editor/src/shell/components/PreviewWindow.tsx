import * as React from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { useTranslation } from "@bingo/i18n";
import { LOCAL_SHORTCUTS } from "../../shared/shortcuts/catalog";
import { isTypingTarget } from "../../shared/shortcuts/matchShortcut";
import { useFrameContent, useFramePager } from "./presentation";
import { ResponsivePreview } from "./ResponsivePreview";

const TITLE_HEIGHT = 36;
function clampBounds(bounds) {
  const w = Math.min(Math.max(280, bounds.w), Math.max(1, window.innerWidth - 16));
  const h = Math.min(Math.max(160, bounds.h), Math.max(1, window.innerHeight - TITLE_HEIGHT - 16));
  return { w, h, x: Math.max(0, Math.min(bounds.x, window.innerWidth - w)),
    y: Math.max(0, Math.min(bounds.y, window.innerHeight - h - TITLE_HEIGHT)) };
}

function PreviewWindow({ store, rootIds, startId, onClose, onPopOut, ...render }) {
  const { t } = useTranslation("editor");
  const { index, currentId, go, goTo } = useFramePager({
    store, rootIds, startId, prevShortcut: LOCAL_SHORTCUTS.previewWindow.prev,
    nextShortcut: LOCAL_SHORTCUTS.previewWindow.next
  });
  const [bounds, setBounds] = React.useState(() => clampBounds({ w: 686, h: 427, x: 96, y: 96 }));
  const [gesture, setGesture] = React.useState(null);
  const [restart, setRestart] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const content = useFrameContent(currentId, store, render, true);
  React.useEffect(() => {
    ref.current?.focus();
    const resize = () => setBounds(value => clampBounds(value));
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const start = (event, direction) => {
    if (event.button !== 0 || (direction === "move" && event.target.closest("button"))) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setGesture({ direction, x: event.clientX, y: event.clientY, bounds });
  };
  const move = event => {
    if (!gesture) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    const next = { ...gesture.bounds };
    if (gesture.direction === "move") { next.x += dx; next.y += dy; }
    else {
      if (gesture.direction.includes("e")) next.w += dx;
      if (gesture.direction.includes("s")) next.h += dy;
      if (gesture.direction.includes("w")) {
        next.w = Math.max(280, next.w - dx);
        next.x += gesture.bounds.w - next.w;
      }
    }
    setBounds(clampBounds(next));
  };
  const control = "flex size-7 items-center justify-center rounded text-ed-background/70 hover:bg-ed-background/10 hover:text-ed-background disabled:opacity-40";
  return <div ref={ref} role="dialog" aria-label={t("preview.title")} tabIndex={-1}
    className="fixed z-[100] overflow-hidden rounded-[10px] bg-ed-background shadow-2xl"
    style={{ left: bounds.x, top: bounds.y, width: bounds.w }}
    onPointerMove={move} onPointerUp={() => setGesture(null)} onPointerCancel={() => setGesture(null)}
    onLostPointerCapture={() => setGesture(null)}>
    <div onPointerDown={event => start(event, "move")} className="flex h-9 items-center gap-0.5 bg-ed-foreground px-1.5 cursor-grab">
      <button type="button" className={control} disabled={rootIds.length < 2} onClick={() => go(-1)} aria-label={t("preview.previousFrame")}><ChevronLeft size={16} /></button>
      <button type="button" className={control} disabled={rootIds.length < 2} onClick={() => go(1)} aria-label={t("preview.nextFrame")}><ChevronRight size={16} /></button>
      <button type="button" className={control} onClick={() => { goTo(0); setRestart(value => value + 1); }} aria-label={t("preview.restart")}><RotateCcw size={15} /></button>
      <span className="px-1.5 text-[11px] tabular-nums text-ed-background/70">{rootIds.length ? index + 1 : 0} / {rootIds.length}</span>
      <div className="flex-1" />
      {onPopOut && <button type="button" className={control} onClick={() => onPopOut(currentId)} aria-label={t("preview.openBrowser")} title={t("preview.openBrowser")}><ArrowUpRight size={16} /></button>}
      <button type="button" className={control} onClick={onClose} aria-label={t("preview.close")}><X size={16} /></button>
    </div>
    <div style={{ width: "100%", height: bounds.h, pointerEvents: gesture ? "none" : undefined }}>
      {currentId ? <ResponsivePreview key={restart} title={t("preview.title")} onKeyDown={event => {
        if (event.defaultPrevented || isTypingTarget(event)) return;
        if (event.key === "Escape" || (event.code === "Space" && event.shiftKey)) { event.preventDefault(); onClose(); }
        else if (event.key === "ArrowRight") { event.preventDefault(); go(1); }
        else if (event.key === "ArrowLeft") { event.preventDefault(); go(-1); }
      }}>{content}</ResponsivePreview>
        : <div className="flex h-full items-center justify-center text-sm text-ed-muted-foreground">{t("preview.empty")}</div>}
    </div>
    {["e", "w", "s", "se", "sw"].map(direction => <div key={direction} data-preview-resize={direction}
      onPointerDown={event => start(event, direction)} style={{ touchAction: "none" }}
      className={direction === "e" ? "absolute inset-y-0 right-0 w-1.5 cursor-ew-resize"
        : direction === "w" ? "absolute inset-y-0 left-0 w-1.5 cursor-ew-resize"
        : direction === "s" ? "absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
        : direction === "se" ? "absolute bottom-0 right-0 z-10 size-3 cursor-nwse-resize"
        : "absolute bottom-0 left-0 z-10 size-3 cursor-nesw-resize"} />)}
  </div>;
}
export { PreviewWindow };
