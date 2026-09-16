/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/snapping.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var NO_SNAP_MEMORY = {
  x: null,
  y: null
};
/** Per axis: keep the held line while it's still within `threshold` of the anchor it held;
*  otherwise pick the line/anchor pair with the smallest correction. */
function pickSnapLine(anchors, candidates, held, threshold) {
  if (held && held.anchor < anchors.length) {
    const anchor = anchors[held.anchor];
    for (const line of candidates) {
      if (line.pos !== held.pos) continue;
      const delta = line.pos - anchor;
      if (Math.abs(delta) <= threshold) return {
        delta,
        line,
        anchor: held.anchor
      };
    }
  }
  let chosen = null;
  for (const line of candidates) for (let i = 0; i < anchors.length; i++) {
    const delta = line.pos - anchors[i];
    if (Math.abs(delta) <= threshold && (chosen === null || Math.abs(delta) < Math.abs(chosen.delta))) chosen = {
      delta,
      line,
      anchor: i
    };
  }
  return chosen;
}
function holdOf(pick) {
  return pick ? {
    pos: pick.line.pos,
    anchor: pick.anchor
  } : null;
}
/** Keep only the rects that overlap `viewport` (screen px) — the siblings the user can currently
*  see. An off-screen sibling would still pull the dragged element toward a guide that never
*  appears, and every rect kept here costs six line comparisons per pointer move. */
function visibleSnapRects(rects, viewport) {
  return rects.filter(r => r.left < viewport.right && r.left + r.width > viewport.left && r.top < viewport.bottom && r.top + r.height > viewport.top);
}
/** Build the set of alignment lines from sibling/peer rects and an optional containing box
*  (parent padding box). Each rect contributes its near edge, far edge, and center on both axes.
*  With a `viewport`, lines whose position falls outside it are dropped: a partially visible
*  sibling (or the parent box) only offers the edges the user can see. */
function collectSnapLines(targets, box, viewport) {
  const vertical = [];
  const horizontal = [];
  const visibleX = x => !viewport || x >= viewport.left && x <= viewport.right;
  const visibleY = y => !viewport || y >= viewport.top && y <= viewport.bottom;
  const addBox = (left, top, right, bottom) => {
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    if (visibleX(left)) vertical.push({
      pos: left,
      spanStart: top,
      spanEnd: bottom,
      kind: "edge"
    });
    if (visibleX(right)) vertical.push({
      pos: right,
      spanStart: top,
      spanEnd: bottom,
      kind: "edge"
    });
    if (visibleX(cx)) vertical.push({
      pos: cx,
      spanStart: top,
      spanEnd: bottom,
      kind: "center"
    });
    if (visibleY(top)) horizontal.push({
      pos: top,
      spanStart: left,
      spanEnd: right,
      kind: "edge"
    });
    if (visibleY(bottom)) horizontal.push({
      pos: bottom,
      spanStart: left,
      spanEnd: right,
      kind: "edge"
    });
    if (visibleY(cy)) horizontal.push({
      pos: cy,
      spanStart: left,
      spanEnd: right,
      kind: "center"
    });
  };
  if (box) addBox(box.left, box.top, box.right, box.bottom);
  for (const t of targets) addBox(t.left, t.top, t.left + t.width, t.top + t.height);
  return {
    vertical,
    horizontal
  };
}
/** Pick, per axis, the smallest correction that aligns one of the dragged rect's three anchors
*  (near edge / center / far edge) to a line within `threshold` screen px, holding the previous
*  move's line while it stays in range. Returns the correction and the matched guide line(s), each
*  widened to also span the dragged rect. */
function computeSnap(preview, lines, threshold = 6, memory = NO_SNAP_MEMORY) {
  const pLeft = preview.left;
  const pRight = preview.left + preview.width;
  const pCenterX = preview.left + preview.width / 2;
  const pTop = preview.top;
  const pBottom = preview.top + preview.height;
  const pCenterY = preview.top + preview.height / 2;
  const bestX = pickSnapLine([pLeft, pCenterX, pRight], lines.vertical, memory.x, threshold);
  const bestY = pickSnapLine([pTop, pCenterY, pBottom], lines.horizontal, memory.y, threshold);
  const dx = bestX ? bestX.delta : 0;
  const dy = bestY ? bestY.delta : 0;
  return {
    dx,
    dy,
    guidesV: bestX ? [{
      ...bestX.line,
      spanStart: Math.min(bestX.line.spanStart, pTop + dy),
      spanEnd: Math.max(bestX.line.spanEnd, pBottom + dy)
    }] : [],
    guidesH: bestY ? [{
      ...bestY.line,
      spanStart: Math.min(bestY.line.spanStart, pLeft + dx),
      spanEnd: Math.max(bestY.line.spanEnd, pRight + dx)
    }] : [],
    memory: {
      x: holdOf(bestX),
      y: holdOf(bestY)
    }
  };
}
/** Snap during resize: align only the moving edge(s) to a line within `threshold`, holding the
*  previous move's line while it stays in range. Unlike computeSnap (which can move the whole rect
*  via any of three anchors), this anchors solely on the edge the handle drags, so the opposite
*  (pinned) edge never moves. `dx`/`dy` are the screen-px corrections to add to the moving edge's
*  coordinate. */
function computeResizeSnap(preview, moving, lines, threshold = 6, memory = NO_SNAP_MEMORY) {
  const pLeft = preview.left;
  const pRight = preview.left + preview.width;
  const pTop = preview.top;
  const pBottom = preview.top + preview.height;
  const xAnchor = moving.x === "left" ? pLeft : moving.x === "right" ? pRight : void 0;
  const yAnchor = moving.y === "top" ? pTop : moving.y === "bottom" ? pBottom : void 0;
  const bestX = xAnchor === void 0 ? null : pickSnapLine([xAnchor], lines.vertical, memory.x, threshold);
  const bestY = yAnchor === void 0 ? null : pickSnapLine([yAnchor], lines.horizontal, memory.y, threshold);
  const dx = bestX ? bestX.delta : 0;
  const dy = bestY ? bestY.delta : 0;
  const top = pTop + (moving.y === "top" ? dy : 0);
  const bottom = pBottom + (moving.y === "bottom" ? dy : 0);
  const left = pLeft + (moving.x === "left" ? dx : 0);
  const right = pRight + (moving.x === "right" ? dx : 0);
  return {
    dx,
    dy,
    guidesV: bestX ? [{
      ...bestX.line,
      spanStart: Math.min(bestX.line.spanStart, top),
      spanEnd: Math.max(bestX.line.spanEnd, bottom)
    }] : [],
    guidesH: bestY ? [{
      ...bestY.line,
      spanStart: Math.min(bestY.line.spanStart, left),
      spanEnd: Math.max(bestY.line.spanEnd, right)
    }] : [],
    memory: {
      x: holdOf(bestX),
      y: holdOf(bestY)
    }
  };
}
/** Perpendicular extent two spans share. Segments are drawn inside this band so the line visibly
*  connects the pair — anchoring at the dragged rect's centre leaves it hanging in space when the
*  two only clip each other at an edge. */
function crossBand(a, b) {
  return {
    lo: Math.max(a.crossLo, b.crossLo),
    hi: Math.min(a.crossHi, b.crossHi)
  };
}
function spacingAxis(p, sibs, threshold) {
  const overlap = sibs.filter(s => s.crossHi > p.crossLo && s.crossLo < p.crossHi);
  const before = overlap.filter(s => s.hi <= p.lo).sort((a, b) => b.hi - a.hi);
  const after = overlap.filter(s => s.lo >= p.hi).sort((a, b) => a.lo - b.lo);
  const nb = before[0];
  const na = after[0];
  const measures = [];
  if (nb) measures.push({
    gap: p.lo - nb.hi,
    start: nb.hi,
    end: p.lo,
    cross: crossBand(p, nb)
  });
  if (na) measures.push({
    gap: na.lo - p.hi,
    start: p.hi,
    end: na.lo,
    cross: crossBand(p, na)
  });
  const width = p.hi - p.lo;
  const candidates = [];
  if (nb && na) {
    const delta = (nb.hi + na.lo - width) / 2 - p.lo;
    const lo = p.lo + delta,
      hi = p.hi + delta;
    const g = lo - nb.hi;
    candidates.push({
      delta,
      guides: [{
        gap: g,
        start: nb.hi,
        end: lo,
        cross: crossBand(p, nb)
      }, {
        gap: g,
        start: hi,
        end: na.lo,
        cross: crossBand(p, na)
      }]
    });
  }
  if (nb && before[1]) {
    const g = nb.lo - before[1].hi;
    const delta = nb.hi + g - p.lo;
    candidates.push({
      delta,
      guides: [{
        gap: g,
        start: before[1].hi,
        end: nb.lo,
        cross: crossBand(before[1], nb)
      }, {
        gap: g,
        start: nb.hi,
        end: p.lo + delta,
        cross: crossBand(p, nb)
      }]
    });
  }
  if (na && after[1]) {
    const g = after[1].lo - na.hi;
    const delta = na.lo - g - p.hi;
    candidates.push({
      delta,
      guides: [{
        gap: g,
        start: na.hi,
        end: after[1].lo,
        cross: crossBand(na, after[1])
      }, {
        gap: g,
        start: p.hi + delta,
        end: na.lo,
        cross: crossBand(p, na)
      }]
    });
  }
  let best = null;
  for (const c of candidates) if (Math.abs(c.delta) <= threshold && (best === null || Math.abs(c.delta) < Math.abs(best.delta))) best = c;
  return {
    delta: best ? best.delta : 0,
    measures,
    guides: best ? best.guides : []
  };
}
/** Equal-spacing detection. Measures the gap to the nearest sibling on each side (for live distance
*  labels) and, when the dragged rect can be placed to equalise gaps — centred between two
*  neighbours, or extending a run that already shares a gap — returns the snap correction and the
*  equal-gap segments to draw. Pure screen-px geometry; siblings collected once at drag start. */
function computeSpacing(preview, siblings, threshold = 6) {
  const pCenterX = preview.left + preview.width / 2;
  const pCenterY = preview.top + preview.height / 2;
  const x = spacingAxis({
    lo: preview.left,
    hi: preview.left + preview.width,
    crossLo: preview.top,
    crossHi: preview.top + preview.height
  }, siblings.map(s => ({
    lo: s.left,
    hi: s.left + s.width,
    crossLo: s.top,
    crossHi: s.top + s.height
  })), threshold);
  const y = spacingAxis({
    lo: preview.top,
    hi: preview.top + preview.height,
    crossLo: preview.left,
    crossHi: preview.left + preview.width
  }, siblings.map(s => ({
    lo: s.top,
    hi: s.top + s.height,
    crossLo: s.left,
    crossHi: s.left + s.width
  })), threshold);
  const at = (centre, cross) => cross.hi > cross.lo ? Math.min(Math.max(centre, cross.lo), cross.hi) : centre;
  const measures = [...x.measures.map(m => ({
    axis: "x",
    gap: m.gap,
    start: m.start,
    end: m.end,
    pos: at(pCenterY, m.cross)
  })), ...y.measures.map(m => ({
    axis: "y",
    gap: m.gap,
    start: m.start,
    end: m.end,
    pos: at(pCenterX, m.cross)
  }))];
  const guides = [...x.guides.map(g => ({
    axis: "x",
    gap: g.gap,
    start: g.start,
    end: g.end,
    pos: at(pCenterY, g.cross)
  })), ...y.guides.map(g => ({
    axis: "y",
    gap: g.gap,
    start: g.start,
    end: g.end,
    pos: at(pCenterX, g.cross)
  }))];
  return {
    dx: x.delta,
    dy: y.delta,
    measures,
    guides
  };
}

export { NO_SNAP_MEMORY, collectSnapLines, computeResizeSnap, computeSnap, computeSpacing, visibleSnapRects };
