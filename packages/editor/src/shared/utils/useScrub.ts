/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/useScrub.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Optional context for grouping scrub mousemoves into a single undo entry.
* Editor wires onStart -> history.beginScrub, onEnd -> history.endScrub.
* Default is a no-op so isolated usage of useScrub still works.
*/
var ScrubSessionContext = (0, import_react.createContext)({
  onStart: () => {},
  onEnd: () => {}
});
/**
* Coalesce native <input type="color"> drag events into a single scrub
* session. The picker fires `change` continuously while the user moves
* through the OS dialog (saturation, hue, etc.) — without coalescing each
* pixel of motion lands a separate undo entry. Caller wires the returned
* `onPickerChange` to the input's onChange and `endSession` to onBlur.
*
* `idleEndMs` (default 400ms) closes the session if no further `change` events
* fire — the native picker has no "done" event, so we approximate it.
*/
function useColorPickerSession(commit, t0) {
  const $ = (0, import_compiler_runtime.c)(20);
  const idleEndMs = t0 === void 0 ? 400 : t0;
  const session = (0, import_react.useContext)(ScrubSessionContext);
  const activeRef = (0, import_react.useRef)(false);
  const [idleGen, setIdleGen] = (0, import_react.useState)(0);
  let t1;
  if ($[0] !== session) {
    t1 = () => {
      if (activeRef.current) {
        session.onEnd();
        activeRef.current = false;
      }
    };
    $[0] = session;
    $[1] = t1;
  } else t1 = $[1];
  const finish = (0, import_react.useEffectEvent)(t1);
  let t2;
  if ($[2] !== finish || $[3] !== idleEndMs || $[4] !== idleGen) {
    t2 = () => {
      if (idleGen === 0) return;
      const t = setTimeout(() => finish(), idleEndMs);
      return () => clearTimeout(t);
    };
    $[2] = finish;
    $[3] = idleEndMs;
    $[4] = idleGen;
    $[5] = t2;
  } else t2 = $[5];
  let t3;
  if ($[6] !== idleEndMs || $[7] !== idleGen) {
    t3 = [idleGen, idleEndMs];
    $[6] = idleEndMs;
    $[7] = idleGen;
    $[8] = t3;
  } else t3 = $[8];
  (0, import_react.useEffect)(t2, t3);
  let t4;
  if ($[9] !== finish) {
    t4 = () => () => finish();
    $[9] = finish;
    $[10] = t4;
  } else t4 = $[10];
  let t5;
  if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = [];
    $[11] = t5;
  } else t5 = $[11];
  (0, import_react.useEffect)(t4, t5);
  let t6;
  if ($[12] !== commit || $[13] !== session) {
    t6 = next => {
      if (!activeRef.current) {
        session.onStart();
        activeRef.current = true;
      }
      commit(next);
      setIdleGen(_temp$67);
    };
    $[12] = commit;
    $[13] = session;
    $[14] = t6;
  } else t6 = $[14];
  const onPickerChange = t6;
  let t7;
  if ($[15] !== session) {
    t7 = () => {
      setIdleGen(0);
      if (activeRef.current) {
        session.onEnd();
        activeRef.current = false;
      }
    };
    $[15] = session;
    $[16] = t7;
  } else t7 = $[16];
  const endSession = t7;
  let t8;
  if ($[17] !== endSession || $[18] !== onPickerChange) {
    t8 = {
      onPickerChange,
      endSession
    };
    $[17] = endSession;
    $[18] = onPickerChange;
    $[19] = t8;
  } else t8 = $[19];
  return t8;
}
function _temp$67(g) {
  return g + 1;
}
/**
* Click-and-drag horizontally on the returned ref element to scrub a numeric value.
* Hold Shift for ×10, Alt/Option/Meta for ×0.1.
*
* Returns a callback ref so the listener rebinds when the element identity
* changes across conditional render branches.
*/
function useScrub(getCurrentValue, onChange, t0) {
  const $ = (0, import_compiler_runtime.c)(14);
  let t1;
  if ($[0] !== t0) {
    t1 = t0 === void 0 ? {} : t0;
    $[0] = t0;
    $[1] = t1;
  } else t1 = $[1];
  const options = t1;
  const session = (0, import_react.useContext)(ScrubSessionContext);
  const getValue = (0, import_react.useEffectEvent)(getCurrentValue);
  const change = (0, import_react.useEffectEvent)(onChange);
  let t2;
  if ($[2] !== options) {
    t2 = () => options;
    $[2] = options;
    $[3] = t2;
  } else t2 = $[3];
  const getOpts = (0, import_react.useEffectEvent)(t2);
  let t3;
  if ($[4] !== session) {
    t3 = () => session;
    $[4] = session;
    $[5] = t3;
  } else t3 = $[5];
  const getSession = (0, import_react.useEffectEvent)(t3);
  const [node, setNode] = (0, import_react.useState)(null);
  const dragRef = (0, import_react.useRef)(null);
  let t4;
  if ($[6] !== change || $[7] !== getOpts || $[8] !== getSession || $[9] !== getValue || $[10] !== node) {
    t4 = () => {
      if (!node) return;
      let startX = 0;
      let startVal = 0;
      let lastVal = 0;
      const compute = e => {
        const {
          pxPerStep: t5,
          step: t6,
          min,
          max,
          precision: t7
        } = getOpts();
        const pxPerStep = t5 === void 0 ? 1 : t5;
        const step = t6 === void 0 ? 1 : t6;
        const precision = t7 === void 0 ? 0 : t7;
        const mult = e.shiftKey ? 10 : e.altKey || e.metaKey ? .1 : 1;
        const delta = (e.clientX - startX) / pxPerStep * step * mult;
        let next = startVal + delta;
        const f = precision > 0 ? 10 ** precision : 1;
        next = precision > 0 ? Math.round(next * f) / f : Math.round(next);
        if (min !== void 0 && next < min) next = min;
        if (max !== void 0 && next > max) next = max;
        return next;
      };
      const onMove = e_0 => {
        lastVal = compute(e_0);
        change(lastVal);
      };
      const stop = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", stop);
        dragRef.current = null;
        getOpts().onEnd?.(lastVal);
        getSession().onEnd();
      };
      const handler = e_1 => {
        if (e_1.button !== 0) return;
        e_1.preventDefault();
        const v = getValue();
        startVal = Number.isFinite(v) ? v : 0;
        lastVal = startVal;
        startX = e_1.clientX;
        document.body.style.cursor = "ew-resize";
        document.body.style.userSelect = "none";
        getOpts().onStart?.(startVal);
        getSession().onStart();
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", stop);
        dragRef.current = {
          onMove,
          stop
        };
      };
      node.addEventListener("mousedown", handler);
      return () => {
        node.removeEventListener("mousedown", handler);
        if (dragRef.current) {
          document.removeEventListener("mousemove", dragRef.current.onMove);
          document.removeEventListener("mouseup", dragRef.current.stop);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
          dragRef.current = null;
          getSession().onEnd();
        }
      };
    };
    $[6] = change;
    $[7] = getOpts;
    $[8] = getSession;
    $[9] = getValue;
    $[10] = node;
    $[11] = t4;
  } else t4 = $[11];
  let t5;
  if ($[12] !== node) {
    t5 = [node];
    $[12] = node;
    $[13] = t5;
  } else t5 = $[13];
  (0, import_react.useEffect)(t4, t5);
  return setNode;
}

export { ScrubSessionContext, useColorPickerSession, useScrub };
