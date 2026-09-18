/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/executeModule.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { __vitePreload as __bingo_vitePreload } from "../../../../src/renderer/vite-preload-helper";

/**
* Execute server-compiled module via ESM import from a public dist URL (R2) or blob URL.
*/
function moduleNamespaceToRecord(mod) {
  const exports = {};
  for (const key of Object.keys(mod)) exports[key] = mod[key];
  if (!("default" in exports) && "default" in mod) exports.default = mod.default;
  return exports;
}
async function importModuleUrl(url) {
  return moduleNamespaceToRecord(await __bingo_vitePreload(() => import(/* @vite-ignore */
  url), [], import.meta.url));
}
// ESM keeps imported modules alive. Key by digest so that the cache preserves
// module identity without retaining another full copy of every inline URL.
const inlineModuleImports = new Map<string, Promise<Record<string, unknown>>>();
async function importInlineModule(codeUrl: string) {
  const comma = codeUrl.indexOf(",");
  const header = codeUrl.slice(0, comma);
  const payload = codeUrl.slice(comma + 1);
  const bytes = header.endsWith(";base64")
    ? Uint8Array.from(atob(payload), character => character.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  let pending = inlineModuleImports.get(key);
  if (!pending) {
    const url = URL.createObjectURL(new Blob([bytes], { type: "text/javascript" }));
    pending = importModuleUrl(url).finally(() => URL.revokeObjectURL(url));
    inlineModuleImports.set(key, pending);
  }
  return pending;
}
async function executeCompiledModule(codeUrl) {
  try {
    // Long data: URLs become the source location of every function/stack frame.
    // A short blob URL avoids enormous debugger/source-location allocations.
    return await (codeUrl.startsWith("data:") && typeof document !== "undefined"
      ? importInlineModule(codeUrl)
      : importModuleUrl(codeUrl));
  } catch (err) {
    // Inline modules can contain megabytes of source. Never copy that source
    // into errors forwarded to the console, IPC diagnostics, or error views.
    const label = codeUrl.startsWith("data:") ? "inline module" : codeUrl.slice(0, 240);
    const message = (err instanceof Error ? err.message : String(err))
      .replace(/data:[^\s)"']+/g, "[inline module]").slice(0, 1000);
    throw new Error(`Failed to import module (${label}): ${message}`);
  }
}
/** Execute inline ESM source (snapshots) via a temporary blob URL — import() requires a URL, not raw source. */
async function executeCompiledModuleSource(code) {
  const blob = new Blob([code], {
    type: "text/javascript"
  });
  const url = URL.createObjectURL(blob);
  try {
    return await importModuleUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export { executeCompiledModule, executeCompiledModuleSource };
