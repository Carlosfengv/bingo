import { memo, useEffect, useState } from "react";
import { useTranslation } from "@bingo/i18n";
import { beginCanvasSelection, getCanvasPerformance, resetCanvasPerformance, setCanvasPerformanceEnabled } from "../lib/canvasPerformance";

const ms = (value: number | null) => value === null ? "—" : `${value.toFixed(1)} ms`;
const stop = (event) => event.stopPropagation();

export const CanvasPerformanceToolbar = memo(function CanvasPerformanceToolbar({ viewportRef, nodeCount, selectedCount }) {
  const { t } = useTranslation("editor");
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(getCanvasPerformance);
  const [frames, setFrames] = useState<{ fps: number; slow: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  useEffect(() => {
    if (!open) return;
    setCanvasPerformanceEnabled(true);
    setSnapshot(getCanvasPerformance());
    setFrames(null);
    let last = 0;
    let count = 0;
    let duration = 0;
    let slow = 0;
    let raf = 0;
    const tick = (now: number) => {
      if (!document.hidden && last) {
        const delta = now - last;
        count++;
        duration += delta;
        if (delta > 32) slow++;
      }
      last = document.hidden ? 0 : now;
      raf = requestAnimationFrame(tick);
    };
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || event.target.closest("[data-canvas-performance]")) return;
      if (event.button !== 0 || event.altKey) return;
      const ids = Array.from(viewportRef.current?.querySelectorAll("[data-selection-overlay-id]") ?? [], (node: HTMLElement) => node.dataset.selectionOverlayId!);
      beginCanvasSelection(event.timeStamp, ids);
    };
    const viewport = viewportRef.current;
    const onVisibilityChange = () => { last = 0; count = duration = slow = 0; };
    document.addEventListener("visibilitychange", onVisibilityChange);
    viewport?.addEventListener("click", onClick, true);
    raf = requestAnimationFrame(tick);
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setSnapshot(getCanvasPerformance());
      setFrames(duration ? { fps: count * 1000 / duration, slow } : null);
      count = duration = slow = 0;
    }, 500);
    return () => {
      viewport?.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cancelAnimationFrame(raf);
      clearInterval(timer);
      setCanvasPerformanceEnabled(false);
    };
  }, [open, viewportRef]);
  const reset = () => {
    resetCanvasPerformance();
    setSnapshot(getCanvasPerformance());
    setCopied(false);
    setCopyFailed(false);
  };
  const copy = async () => {
    try {
      const text = JSON.stringify({ capturedAt: new Date().toISOString(), nodeCount, selectedCount, frames,
        metrics: getCanvasPerformance(), note: "Selection: click event timestamp to overlay DOM commit; nextFrame: subsequent requestAnimationFrame, not presentation time. P95: last 120 samples. Variables: render-store preparation. Tree: renderElement CPU only. Geometry: individual box reads. FPS: document frame callbacks." }, null, 2);
      try { await navigator.clipboard.writeText(text); } catch {
        // Electron/file previews may deny the asynchronous Clipboard API.
        const previousFocus = document.activeElement as HTMLElement | null;
        const input = document.createElement("textarea");
        input.value = text;
        input.readOnly = true;
        input.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(input);
        input.select();
        try { if (!document.execCommand("copy")) throw new Error("Copy unavailable"); }
        finally { input.remove(); previousFocus?.focus({ preventScroll: true }); }
      }
      setCopied(true);
      setCopyFailed(false);
    } catch { setCopyFailed(true); }
  };
  const buttonClass = "rounded px-2 py-1 text-[11px] hover:bg-ed-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  return <div data-canvas-performance="" style={{ position: "absolute", left: 12, top: 12, zIndex: 70, width: open ? 420 : undefined, maxWidth: "calc(100% - 24px)", overflow: "auto" }} className="select-text rounded-lg border border-ed-border bg-ed-background text-ed-foreground shadow-sm"
    onPointerDown={stop} onMouseDown={stop} onClick={stop} onDoubleClick={stop} onContextMenu={stop}>
    <div className="flex items-center gap-2 px-2 py-1">
      <button type="button" className={buttonClass} aria-expanded={open} onClick={() => setOpen(value => !value)}>{t("performance.title")} {open ? "−" : "+"}</button>
      {open && <><span className="text-[11px] text-ed-muted-foreground">{t("performance.nodes", { count: nodeCount, selected: selectedCount })}</span>
        <button type="button" className={buttonClass} onClick={reset}>{t("performance.reset")}</button>
        <button type="button" className={buttonClass} onClick={copy}>{t(copyFailed ? "performance.copyFailed" : copied ? "performance.copied" : "performance.copy")}</button></>}
    </div>
    {open && <div className="border-t border-ed-border px-3 py-2 text-[11px] tabular-nums">
      <table className="w-full text-left"><thead className="text-ed-muted-foreground"><tr>
        <th className="pb-1 pr-5 font-normal">{t("performance.metric")}</th><th className="pr-4 font-normal">{t("performance.latest")}</th><th className="pr-4 font-normal">P95</th><th className="font-normal">{t("performance.count")}</th>
      </tr></thead><tbody>{(["selection", "nextFrame", "variables", "tree", "renderNode", "geometry", "codegen"] as const).map(key => <tr key={key}>
        <th className="pr-5 font-normal">{t(`performance.${key}`)}</th><td className="pr-4">{ms(snapshot[key].last)}</td><td className="pr-4">{ms(snapshot[key].p95)}</td><td>{snapshot[key].count}</td>
      </tr>)}</tbody></table>
      <div className="mt-2 border-t border-ed-border pt-2 text-ed-muted-foreground">{t("performance.frames", { fps: frames ? frames.fps.toFixed(0) : "—", slow: frames?.slow ?? "—" })}</div>
      <p className="mt-1 max-w-[360px] text-ed-muted-foreground">{t("performance.help")}</p>
    </div>}
  </div>;
});
