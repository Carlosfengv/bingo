/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/useInspectorScrub.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useScrub } from "../../../../../shared/utils/useScrub";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Adds inspector active-state tracking without changing the shared scrub hook. */
function useInspectorScrub(getCurrentValue, onChange, t0) {
  const $ = (0, import_compiler_runtime.c)(17);
  let t1;
  if ($[0] !== t0) {
    t1 = t0 === void 0 ? {} : t0;
    $[0] = t0;
    $[1] = t1;
  } else t1 = $[1];
  const options = t1;
  const [isScrubbing, setIsScrubbing] = (0, import_react.useState)(false);
  let onEnd;
  let onStart;
  let scrubOptions;
  if ($[2] !== options) {
    ({
      onStart,
      onEnd,
      ...scrubOptions
    } = options);
    $[2] = options;
    $[3] = onEnd;
    $[4] = onStart;
    $[5] = scrubOptions;
  } else {
    onEnd = $[3];
    onStart = $[4];
    scrubOptions = $[5];
  }
  let t2;
  if ($[6] !== onStart) {
    t2 = start => {
      setIsScrubbing(true);
      onStart?.(start);
    };
    $[6] = onStart;
    $[7] = t2;
  } else t2 = $[7];
  let t3;
  if ($[8] !== onEnd) {
    t3 = final => {
      setIsScrubbing(false);
      onEnd?.(final);
    };
    $[8] = onEnd;
    $[9] = t3;
  } else t3 = $[9];
  let t4;
  if ($[10] !== scrubOptions || $[11] !== t2 || $[12] !== t3) {
    t4 = {
      ...scrubOptions,
      onStart: t2,
      onEnd: t3
    };
    $[10] = scrubOptions;
    $[11] = t2;
    $[12] = t3;
    $[13] = t4;
  } else t4 = $[13];
  const scrubRef = useScrub(getCurrentValue, onChange, t4);
  let t5;
  if ($[14] !== isScrubbing || $[15] !== scrubRef) {
    t5 = {
      scrubRef,
      isScrubbing
    };
    $[14] = isScrubbing;
    $[15] = scrubRef;
    $[16] = t5;
  } else t5 = $[16];
  return t5;
}

export { useInspectorScrub };
