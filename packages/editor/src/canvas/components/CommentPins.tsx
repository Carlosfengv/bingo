/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/CommentPins.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getCamera } from "../../shell/utils/chatShortcuts";
import { CheckIcon } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function DraggablePin(t0) {
  const $ = (0, import_compiler_runtime.c)(33);
  const {
    comment,
    screenX,
    screenY,
    isActive,
    onSelectComment,
    onMoveComment
  } = t0;
  const btnRef = (0, import_react.useRef)(null);
  const dragRef = (0, import_react.useRef)(null);
  const [dragOffset, setDragOffset] = (0, import_react.useState)(null);
  let t1;
  if ($[0] !== onMoveComment) {
    t1 = e => {
      if (!onMoveComment) return;
      e.stopPropagation();
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        moved: false
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    };
    $[0] = onMoveComment;
    $[1] = t1;
  } else t1 = $[1];
  const handlePointerDown = t1;
  let t2;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = e_0 => {
      if (!dragRef.current) return;
      const dx = e_0.clientX - dragRef.current.startX;
      const dy = e_0.clientY - dragRef.current.startY;
      if (!dragRef.current.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) dragRef.current.moved = true;
      if (dragRef.current.moved) setDragOffset({
        dx,
        dy
      });
    };
    $[2] = t2;
  } else t2 = $[2];
  const handlePointerMove = t2;
  let t3;
  if ($[3] !== comment.id || $[4] !== onMoveComment || $[5] !== onSelectComment) {
    t3 = e_1 => {
      if (!dragRef.current) return;
      const wasDrag = dragRef.current.moved;
      dragRef.current = null;
      setDragOffset(null);
      if (wasDrag && onMoveComment) {
        const rect = btnRef.current?.closest("[data-overlay-container]")?.getBoundingClientRect();
        if (rect) {
          const {
            scale,
            positionX,
            positionY
          } = getCamera();
          const canvasX = Math.round((e_1.clientX - rect.left - positionX) / scale);
          const canvasY = Math.round((e_1.clientY - rect.top - positionY) / scale);
          onMoveComment(comment.id, canvasX, canvasY);
        }
      } else onSelectComment(comment.id);
    };
    $[3] = comment.id;
    $[4] = onMoveComment;
    $[5] = onSelectComment;
    $[6] = t3;
  } else t3 = $[6];
  const handlePointerUp = t3;
  const isDragging = dragOffset !== null;
  const authorName = comment.author.name ?? "?";
  let t4;
  if ($[7] !== authorName) {
    t4 = authorName.charAt(0).toUpperCase();
    $[7] = authorName;
    $[8] = t4;
  } else t4 = $[8];
  const initials = t4;
  const t5 = comment.canvasX;
  const t6 = comment.canvasY;
  const t7 = isDragging ? "" : "hover:scale-110";
  const t8 = isActive ? "ring-2 ring-ed-primary scale-110" : "";
  const t9 = comment.resolved ? "opacity-50" : "";
  let t10;
  if ($[9] !== t7 || $[10] !== t8 || $[11] !== t9) {
    t10 = ["absolute pointer-events-auto flex items-center justify-center", "w-8 h-8 rounded-full", "focus:outline-none", t7, t8, t9];
    $[9] = t7;
    $[10] = t8;
    $[11] = t9;
    $[12] = t10;
  } else t10 = $[12];
  const t11 = t10.join(" ");
  const t12 = screenX + (dragOffset?.dx ?? 0);
  const t13 = screenY + (dragOffset?.dy ?? 0);
  const t14 = isDragging ? 40 : isActive ? 35 : 30;
  const t15 = isDragging ? "grabbing" : onMoveComment ? "grab" : "pointer";
  const t16 = isDragging ? "drop-shadow(0 4px 6px rgba(0,0,0,0.2))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.15))";
  let t17;
  if ($[13] !== t12 || $[14] !== t13 || $[15] !== t14 || $[16] !== t15 || $[17] !== t16) {
    t17 = {
      left: t12,
      top: t13,
      transform: "translate(-50%, -100%)",
      zIndex: t14,
      cursor: t15,
      touchAction: "none",
      filter: t16
    };
    $[13] = t12;
    $[14] = t13;
    $[15] = t14;
    $[16] = t15;
    $[17] = t16;
    $[18] = t17;
  } else t17 = $[18];
  let t18;
  if ($[19] !== authorName || $[20] !== comment.author.image || $[21] !== comment.resolved || $[22] !== initials) {
    t18 = comment.resolved ? <div className="w-full h-full rounded-full bg-ed-muted-foreground/60 flex items-center justify-center">{<CheckIcon width={14} height={14} className="text-white" />}</div> : comment.author.image ? <img src={comment.author.image} alt={authorName} className="w-full h-full rounded-full object-cover border-2 border-ed-foreground" draggable={false} /> : <div className="w-full h-full rounded-full bg-ed-primary flex items-center justify-center border-2 border-ed-foreground">{<span className="text-xs font-semibold text-white leading-none">{initials}</span>}</div>;
    $[19] = authorName;
    $[20] = comment.author.image;
    $[21] = comment.resolved;
    $[22] = initials;
    $[23] = t18;
  } else t18 = $[23];
  let t19;
  if ($[24] === Symbol.for("react.memo_cache_sentinel")) {
    t19 = <svg className="absolute -bottom-[5px] left-1/2 -translate-x-1/2" width="10" height="6" viewBox="0 0 10 6" fill="none">{<path d="M5 6L0 0h10L5 6z" fill="var(--ed-foreground)" />}</svg>;
    $[24] = t19;
  } else t19 = $[24];
  let t20;
  if ($[25] !== comment.canvasX || $[26] !== comment.canvasY || $[27] !== handlePointerDown || $[28] !== handlePointerUp || $[29] !== t11 || $[30] !== t17 || $[31] !== t18) {
    t20 = <button ref={btnRef} data-comment-canvas-x={t5} data-comment-canvas-y={t6} className={t11} style={t17} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>{t18}{t19}</button>;
    $[25] = comment.canvasX;
    $[26] = comment.canvasY;
    $[27] = handlePointerDown;
    $[28] = handlePointerUp;
    $[29] = t11;
    $[30] = t17;
    $[31] = t18;
    $[32] = t20;
  } else t20 = $[32];
  return t20;
}
function CommentPins(t0) {
  const $ = (0, import_compiler_runtime.c)(20);
  const {
    comments,
    transform,
    activeCommentId,
    onSelectComment,
    onMoveComment,
    showResolved
  } = t0;
  const {
    scale,
    positionX,
    positionY
  } = transform;
  let t1;
  if ($[0] !== activeCommentId || $[1] !== comments || $[2] !== onMoveComment || $[3] !== onSelectComment || $[4] !== positionX || $[5] !== positionY || $[6] !== scale || $[7] !== showResolved) {
    let t2;
    if ($[9] !== showResolved) {
      t2 = c => c.canvasX != null && c.canvasY != null && (!c.resolved || showResolved);
      $[9] = showResolved;
      $[10] = t2;
    } else t2 = $[10];
    const visibleComments = comments.filter(t2);
    let t3;
    if ($[11] !== activeCommentId || $[12] !== onMoveComment || $[13] !== onSelectComment || $[14] !== positionX || $[15] !== positionY || $[16] !== scale) {
      t3 = comment => {
        const screenX = comment.canvasX * scale + positionX;
        const screenY = comment.canvasY * scale + positionY;
        const isActive = activeCommentId === comment.id;
        return <DraggablePin key={comment.id} comment={comment} screenX={screenX} screenY={screenY} isActive={isActive} onSelectComment={onSelectComment} onMoveComment={onMoveComment} />;
      };
      $[11] = activeCommentId;
      $[12] = onMoveComment;
      $[13] = onSelectComment;
      $[14] = positionX;
      $[15] = positionY;
      $[16] = scale;
      $[17] = t3;
    } else t3 = $[17];
    t1 = visibleComments.map(t3);
    $[0] = activeCommentId;
    $[1] = comments;
    $[2] = onMoveComment;
    $[3] = onSelectComment;
    $[4] = positionX;
    $[5] = positionY;
    $[6] = scale;
    $[7] = showResolved;
    $[8] = t1;
  } else t1 = $[8];
  let t2;
  if ($[18] !== t1) {
    t2 = <>{t1}</>;
    $[18] = t1;
    $[19] = t2;
  } else t2 = $[19];
  return t2;
}

export { CommentPins };
