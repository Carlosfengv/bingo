/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/workspace/src/services/projectStylesheet.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { PROJECT_CSS_ISOLATION_TAIL } from "../utils/projectCssIsolation";

var COMPILED_LINK_ID = "bingo-project-compiled-css";
var ISOLATION_STYLE_ID = "bingo-project-css-isolation";
var LEGACY_COMPILED_LINK_ID = "bingo-compiled-css";
/** projectId → cache key of the stylesheet currently applied */
var loadedKeyByProject = new Map();
/** `${projectId}:${cacheKey}` → in-flight load */
var inFlightByKey = new Map();
/** Content-addressed dist URLs are `…/path@hash`; extract hash for dedup. */
function cssUrlCacheKey(cssUrl) {
  try {
    const pathname = decodeURIComponent(new URL(cssUrl).pathname);
    const at = pathname.lastIndexOf("@");
    if (at !== -1) {
      const hash = pathname.slice(at + 1);
      if (hash) return hash;
    }
  } catch {
    const path = decodeURIComponent(cssUrl.split("?")[0]);
    const at = path.lastIndexOf("@");
    if (at !== -1) {
      const hash = path.slice(at + 1);
      if (hash) return hash;
    }
  }
  return cssUrl.split("?")[0];
}
function ensureIsolationTail() {
  if (document.getElementById(ISOLATION_STYLE_ID)) return;
  const isolation = document.createElement("style");
  isolation.id = ISOLATION_STYLE_ID;
  isolation.textContent = PROJECT_CSS_ISOLATION_TAIL;
  document.head.appendChild(isolation);
}
function injectFontLinks(fontUrls) {
  for (const fontUrl of fontUrls) {
    const linkId = "bingo-font-import-" + fontUrl.replace(/[^a-z0-9]/gi, "").slice(0, 32);
    if (document.getElementById(linkId)) continue;
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = fontUrl;
    document.head.appendChild(link);
  }
}
function isStylesheetApplied(link) {
  return Boolean(link.sheet);
}
function notifyCssUpdated(compiledClasses, onCompiledClasses) {
  if (compiledClasses?.length) onCompiledClasses?.(compiledClasses);
  window.dispatchEvent(new CustomEvent("bingo-css-updated"));
}
async function loadStylesheetLink(link, cssUrl) {
  if (link.href === cssUrl && isStylesheetApplied(link)) return;
  await new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      link.removeEventListener("load", onLoad);
      link.removeEventListener("error", onError);
    };
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Failed to load project stylesheet. Check CSS imports and the compiled stylesheet output."));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Project stylesheet did not finish loading within 15 seconds."));
    }, 15_000);
    link.addEventListener("load", onLoad);
    link.addEventListener("error", onError);
    link.href = cssUrl;
  });
}
/**
* Load the locally compiled project stylesheet once per content-addressed URL.
* Skips network fetch when css:ready repeats the same build output.
*/
async function loadProjectStylesheet(projectId, cssUrl, options = {}) {
  const {
    fontUrls,
    compiledClasses,
    onCompiledClasses
  } = options;
  const cacheKey = cssUrlCacheKey(cssUrl);
  if (fontUrls?.length) injectFontLinks(fontUrls);
  const loadKey = `${projectId}:${cacheKey}`;
  if (loadedKeyByProject.get(projectId) === cacheKey) {
    const existing = document.getElementById(COMPILED_LINK_ID);
    if (existing && isStylesheetApplied(existing)) {
      ensureIsolationTail();
      notifyCssUpdated(compiledClasses, onCompiledClasses);
      return;
    }
  }
  const inFlight = inFlightByKey.get(loadKey);
  if (inFlight) {
    await inFlight;
    notifyCssUpdated(compiledClasses, onCompiledClasses);
    return;
  }
  const loadPromise = (async () => {
    document.getElementById(LEGACY_COMPILED_LINK_ID)?.remove();
    let link = document.getElementById(COMPILED_LINK_ID);
    if (!link) {
      link = document.createElement("link");
      link.id = COMPILED_LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    await loadStylesheetLink(link, cssUrl);
    ensureIsolationTail();
    loadedKeyByProject.set(projectId, cacheKey);
  })();
  inFlightByKey.set(loadKey, loadPromise);
  try {
    await loadPromise;
    notifyCssUpdated(compiledClasses, onCompiledClasses);
  } finally {
    if (inFlightByKey.get(loadKey) === loadPromise) inFlightByKey.delete(loadKey);
  }
}
function cleanupProjectStylesheet(projectId) {
  loadedKeyByProject.delete(projectId);
  for (const key of inFlightByKey.keys()) if (key.startsWith(`${projectId}:`)) inFlightByKey.delete(key);
  document.getElementById(COMPILED_LINK_ID)?.remove();
  document.getElementById(ISOLATION_STYLE_ID)?.remove();
  document.getElementById(LEGACY_COMPILED_LINK_ID)?.remove();
  document.querySelectorAll("[id^=\"bingo-font-import-\"]").forEach(el => el.remove());
}

export { cleanupProjectStylesheet, loadProjectStylesheet };
