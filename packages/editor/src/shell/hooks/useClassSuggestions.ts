/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/useClassSuggestions.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getClassIndexGeneration, getClassesForProperty, subscribeClassIndex } from "../utils/classIndex";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Tailwind class-suggestion state for a style input bound to `cssProperty`.
* Owns the suggestion-fetching and popover-open state the inputs used to inline,
* so the input components only handle rendering. `hasSuggestions` is true only
* when the input can both resolve a property and apply a chosen class.
*/
function useClassIndexGeneration() {
  return (0, import_react.useSyncExternalStore)(subscribeClassIndex, getClassIndexGeneration, getClassIndexGeneration);
}
/** Class suggestions that recompute when the project stylesheet loads or recompiles. */
function useClassesForProperty(cssProperty) {
  const $ = (0, import_compiler_runtime.c)(3);
  const generation = useClassIndexGeneration();
  let t0;
  if ($[0] !== cssProperty || $[1] !== generation) {
    t0 = getClassesForProperty(document, cssProperty, generation);
    $[0] = cssProperty;
    $[1] = generation;
    $[2] = t0;
  } else t0 = $[2];
  return t0;
}
function useClassSuggestions(cssProperty, onSelectClass) {
  const $ = (0, import_compiler_runtime.c)(7);
  const [showSuggestions, setShowSuggestions] = (0, import_react.useState)(false);
  const hasSuggestions = Boolean(cssProperty && onSelectClass);
  const generation = useClassIndexGeneration();
  let t0;
  if ($[0] !== cssProperty || $[1] !== generation) {
    t0 = cssProperty ? getClassesForProperty(document, cssProperty, generation) : [];
    $[0] = cssProperty;
    $[1] = generation;
    $[2] = t0;
  } else t0 = $[2];
  const allSuggestions = t0;
  let t1;
  if ($[3] !== allSuggestions || $[4] !== hasSuggestions || $[5] !== showSuggestions) {
    t1 = {
      showSuggestions,
      setShowSuggestions,
      hasSuggestions,
      allSuggestions
    };
    $[3] = allSuggestions;
    $[4] = hasSuggestions;
    $[5] = showSuggestions;
    $[6] = t1;
  } else t1 = $[6];
  return t1;
}

export { useClassSuggestions, useClassesForProperty };
