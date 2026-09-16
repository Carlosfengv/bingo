/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/backends/BackendContext.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var BackendContext = (0, import_react.createContext)(null);
/**
* Provider for the BingoBackend.
*
* Usage:
* ```tsx
* // For web/dev with fetch backend
* <BackendProvider backend={fetchBackend}>
*   <BingoEditor />
* </BackendProvider>
*
* // For Tauri desktop app
* <BackendProvider backend={tauriBackend}>
*   <BingoEditor />
* </BackendProvider>
* ```
*/
function BackendProvider(t0) {
  const $ = (0, import_compiler_runtime.c)(5);
  const {
    backend,
    children
  } = t0;
  let t1;
  if ($[0] !== backend) {
    t1 = {
      backend
    };
    $[0] = backend;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== children || $[3] !== t1) {
    t2 = <BackendContext.Provider value={t1}>{children}</BackendContext.Provider>;
    $[2] = children;
    $[3] = t1;
    $[4] = t2;
  } else t2 = $[4];
  return t2;
}
/**
* Hook to access the BingoBackend.
*
* @throws Error if used outside of BackendProvider
*/
function useBackend() {
  const context = (0, import_react.useContext)(BackendContext);
  if (!context) throw new Error("useBackend must be used within a BackendProvider");
  return context.backend;
}
/**
* Hook to optionally access the BingoBackend.
* Returns null if not within a BackendProvider.
*
* Useful for gradual migration where backend might not be available.
*/
function useBackendOptional() {
  return (0, import_react.useContext)(BackendContext)?.backend ?? null;
}

export { BackendProvider, useBackend, useBackendOptional };
