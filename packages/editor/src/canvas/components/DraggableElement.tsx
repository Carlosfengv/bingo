/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/DraggableElement.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useDraggable } from "@dnd-kit/core";
import * as import_compiler_runtime from "react/compiler-runtime";

function DraggableElement(t0) {
  const $ = (0, import_compiler_runtime.c)(22);
  const {
    id,
    children,
    display,
    width,
    height,
    boxStyle,
    dragDisabled,
    onClick,
    onMouseOver,
    onMouseLeave
  } = t0;
  let t1;
  if ($[0] !== dragDisabled || $[1] !== id) {
    t1 = {
      id,
      disabled: dragDisabled
    };
    $[0] = dragDisabled;
    $[1] = id;
    $[2] = t1;
  } else t1 = $[2];
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging
  } = useDraggable(t1);
  let style;
  if ($[3] !== boxStyle || $[4] !== display || $[5] !== height || $[6] !== isDragging || $[7] !== width) {
    style = boxStyle ? {
      ...boxStyle,
      display: boxStyle.display ?? display
    } : {
      display,
      width,
      height
    };
    style.pointerEvents = isDragging ? "none" : style.pointerEvents;
    $[3] = boxStyle;
    $[4] = display;
    $[5] = height;
    $[6] = isDragging;
    $[7] = width;
    $[8] = style;
  } else style = $[8];
  const isRealWrapper = display !== "contents";
  let t2;
  if ($[9] !== id || $[10] !== isRealWrapper) {
    t2 = isRealWrapper ? {
      "data-element-id": id
    } : {};
    $[9] = id;
    $[10] = isRealWrapper;
    $[11] = t2;
  } else t2 = $[11];
  let t3;
  if ($[12] !== attributes || $[13] !== children || $[14] !== listeners || $[15] !== onClick || $[16] !== onMouseLeave || $[17] !== onMouseOver || $[18] !== setNodeRef || $[19] !== style || $[20] !== t2) {
    t3 = <div ref={setNodeRef} style={style} {...t2} onClick={onClick} onMouseOver={onMouseOver} onMouseLeave={onMouseLeave} {...listeners} {...attributes}>{children}</div>;
    $[12] = attributes;
    $[13] = children;
    $[14] = listeners;
    $[15] = onClick;
    $[16] = onMouseLeave;
    $[17] = onMouseOver;
    $[18] = setNodeRef;
    $[19] = style;
    $[20] = t2;
    $[21] = t3;
  } else t3 = $[21];
  return t3;
}

export { DraggableElement };
