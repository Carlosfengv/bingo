/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/positionAlignment.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Align root-level layers inside their current selection bounds. The rendered
* rect can differ from canvasPosition because of margins or internal wrappers,
* so each persisted position is shifted by the rect delta instead of being
* replaced with the target coordinate directly.
*/
function alignCanvasSelection(items, axis, alignment) {
  const positions = new Map();
  if (items.length < 2) return positions;
  const horizontal = axis === "horizontal";
  const starts = items.map(item => horizontal ? item.rect.x : item.rect.y);
  const ends = items.map(item => horizontal ? item.rect.x + item.rect.width : item.rect.y + item.rect.height);
  const selectionStart = Math.min(...starts);
  const selectionEnd = Math.max(...ends);
  const selectionCenter = (selectionStart + selectionEnd) / 2;
  for (const item of items) {
    const size = horizontal ? item.rect.width : item.rect.height;
    const currentStart = horizontal ? item.rect.x : item.rect.y;
    const delta = (alignment === "start" ? selectionStart : alignment === "end" ? selectionEnd - size : selectionCenter - size / 2) - currentStart;
    positions.set(item.id, {
      x: item.position.x + (horizontal ? delta : 0),
      y: item.position.y + (horizontal ? 0 : delta)
    });
  }
  return positions;
}
/**
* Evenly distribute the gaps between root-level layers. Visual order is based
* on each layer's center; the first and last layers are deliberately omitted
* from the result so their persisted positions cannot drift.
*/
function distributeCanvasSelection(items, axis) {
  const positions = new Map();
  if (items.length < 3) return positions;
  const horizontal = axis === "horizontal";
  const ordered = items.map((item, index) => ({
    item,
    index
  })).sort((a, b) => {
    return (horizontal ? a.item.rect.x + a.item.rect.width / 2 : a.item.rect.y + a.item.rect.height / 2) - (horizontal ? b.item.rect.x + b.item.rect.width / 2 : b.item.rect.y + b.item.rect.height / 2) || a.index - b.index;
  }).map(({
    item
  }) => item);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const firstStart = horizontal ? first.rect.x : first.rect.y;
  const lastEnd = horizontal ? last.rect.x + last.rect.width : last.rect.y + last.rect.height;
  const totalSize = ordered.reduce((sum, item) => sum + (horizontal ? item.rect.width : item.rect.height), 0);
  const gap = (lastEnd - firstStart - totalSize) / (ordered.length - 1);
  let cursor = firstStart + (horizontal ? first.rect.width : first.rect.height) + gap;
  for (let index = 1; index < ordered.length - 1; index += 1) {
    const item = ordered[index];
    const currentStart = horizontal ? item.rect.x : item.rect.y;
    const delta = cursor - currentStart;
    if (Math.abs(delta) > 1e-6) positions.set(item.id, {
      x: item.position.x + (horizontal ? delta : 0),
      y: item.position.y + (horizontal ? 0 : delta)
    });
    cursor += (horizontal ? item.rect.width : item.rect.height) + gap;
  }
  return positions;
}
/** CSS inset updates for a frame-contained layer. Existing position is left
* untouched, so relative, absolute, fixed, and sticky modes stay intact. */
function pinnedAlignmentStyles(axis, alignment) {
  if (axis === "horizontal") {
    if (alignment === "start") return {
      left: "0px",
      right: void 0,
      marginLeft: void 0,
      marginRight: void 0
    };
    if (alignment === "end") return {
      right: "0px",
      left: void 0,
      marginLeft: void 0,
      marginRight: void 0
    };
    return {
      left: "0px",
      right: "0px",
      marginLeft: "auto",
      marginRight: "auto"
    };
  }
  if (alignment === "start") return {
    top: "0px",
    bottom: void 0,
    marginTop: void 0,
    marginBottom: void 0
  };
  if (alignment === "end") return {
    bottom: "0px",
    top: void 0,
    marginTop: void 0,
    marginBottom: void 0
  };
  return {
    top: "0px",
    bottom: "0px",
    marginTop: "auto",
    marginBottom: "auto"
  };
}
/** Alignment is an out-of-flow operation. Static, relative, and sticky layers
* first become absolute; already-absolute/fixed layers keep their mode. */
function positionedAlignmentStyles(position, axis, alignment) {
  return {
    ...(position === "static" || position === "relative" || position === "sticky" ? {
      position: "absolute"
    } : {}),
    ...pinnedAlignmentStyles(axis, alignment)
  };
}

export { alignCanvasSelection, distributeCanvasSelection, pinnedAlignmentStyles, positionedAlignmentStyles };
