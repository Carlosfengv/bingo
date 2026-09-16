/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/contexts/AssetContext.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var defaultResolver = url => url;
var AssetContext = (0, import_react.createContext)(defaultResolver);
function AssetProvider(t0) {
  const $ = (0, import_compiler_runtime.c)(3);
  const {
    resolver,
    children
  } = t0;
  const resolverFn = resolver || defaultResolver;
  let t1;
  if ($[0] !== children || $[1] !== resolverFn) {
    t1 = <AssetContext.Provider value={resolverFn}>{children}</AssetContext.Provider>;
    $[0] = children;
    $[1] = resolverFn;
    $[2] = t1;
  } else t1 = $[2];
  return t1;
}
function useAssetResolver() {
  return (0, import_react.useContext)(AssetContext);
}

export { AssetProvider, useAssetResolver };
