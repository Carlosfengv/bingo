/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/hooks/usePotentialParentOverlay.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

function usePotentialParentOverlay({
  canvasRef,
  potentialParentId,
  dropSlotRect,
  transform
}) {
  const getBaseRect = () => {
    if (transform) {
      const overlayContainer = document.querySelector("[data-overlay-container]");
      return overlayContainer ? overlayContainer.getBoundingClientRect() : null;
    }
    return canvasRef?.current?.getBoundingClientRect() ?? null;
  };
  const renderPotentialParentOverlay = () => {
    if (!potentialParentId && !dropSlotRect) return null;
    const baseRect = getBaseRect();
    if (!baseRect) return null;
    const nodes = [];
    if (potentialParentId) {
      const parentElement = document.querySelector(`[data-element-id="${potentialParentId}"]`);
      if (parentElement) {
        const parentRect = (window.getComputedStyle(parentElement).display === "contents" && parentElement.firstElementChild ? parentElement.firstElementChild : parentElement).getBoundingClientRect();
        nodes.push(<div key="potential-parent-outline" data-potential-parent-outline={potentialParentId} className="absolute pointer-events-none outline outline-2 outline-ed-canvas-selection" style={{
          left: parentRect.left - baseRect.left,
          top: parentRect.top - baseRect.top,
          width: parentRect.width,
          height: parentRect.height
        }} />);
      }
    }
    if (dropSlotRect) nodes.push(<div key="drop-slot-indicator" className="absolute pointer-events-none" style={{
      left: dropSlotRect.left - baseRect.left,
      top: dropSlotRect.top - baseRect.top,
      width: dropSlotRect.width,
      height: dropSlotRect.height,
      background: "color-mix(in srgb, var(--ed-canvas-selection) 25%, transparent)",
      outline: "2px solid var(--ed-canvas-selection)",
      outlineOffset: "-1px",
      borderRadius: 2
    }} />);
    return <>{nodes}</>;
  };
  return {
    renderPotentialParentOverlay
  };
}

export { usePotentialParentOverlay };
