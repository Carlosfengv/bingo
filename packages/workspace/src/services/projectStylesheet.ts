/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/workspace/src/services/projectStylesheet.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { PROJECT_CSS_ISOLATION_TAIL } from "../utils/projectCssIsolation";
import { refreshProjectStyleBaseline, cleanupProjectStyleBaseline } from "@bingo/editor";

var COMPILED_LINK_ID = "bingo-project-compiled-css";
var ISOLATION_STYLE_ID = "bingo-project-css-isolation";
var LEGACY_COMPILED_LINK_ID = "bingo-compiled-css";
/** projectId → cache key of the stylesheet currently applied */
var loadedKeyByProject = new Map();
/** Only the newest request may publish a stylesheet or a cache entry. */
var loadGeneration = 0;
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
  const generation = ++loadGeneration;
  if (!cssUrl) {
    loadedKeyByProject.delete(projectId);
    document.getElementById(COMPILED_LINK_ID)?.remove();
    document.getElementById(LEGACY_COMPILED_LINK_ID)?.remove();
    ensureIsolationTail();
    await refreshProjectStyleBaseline();
    if (generation === loadGeneration) notifyCssUpdated([], options.onCompiledClasses);
    return;
  }
  const {
    fontUrls,
    compiledClasses,
    onCompiledClasses
  } = options;
  const cacheKey = cssUrlCacheKey(cssUrl);
  if (fontUrls?.length) injectFontLinks(fontUrls);
  if (loadedKeyByProject.get(projectId) === cacheKey) {
    const existing = document.getElementById(COMPILED_LINK_ID);
    if (existing?.href === cssUrl && isStylesheetApplied(existing)) {
      ensureIsolationTail();
      await refreshProjectStyleBaseline();
      if (generation === loadGeneration) notifyCssUpdated(compiledClasses, onCompiledClasses);
      return;
    }
  }
  // Load away from the active stylesheet. A failed or superseded build must
  // never replace the colors currently painted on the canvas.
  const next = document.createElement("link");
  next.rel = "stylesheet";
  next.media = "not all";
  document.head.appendChild(next);
  try {
    await loadStylesheetLink(next, cssUrl);
    if (generation !== loadGeneration) return;
    const previous = document.getElementById(COMPILED_LINK_ID);
    const legacy = document.getElementById(LEGACY_COMPILED_LINK_ID);
    if (previous) { previous.id = `${COMPILED_LINK_ID}-previous`; previous.disabled = true; }
    if (legacy) legacy.disabled = true;
    next.id = COMPILED_LINK_ID;
    next.media = "all";
    ensureIsolationTail();
    try {
      await refreshProjectStyleBaseline();
    } catch (error) {
      if (generation !== loadGeneration) {
        previous?.remove();
        legacy?.remove();
        return;
      }
      next.remove();
      if (previous) { previous.id = COMPILED_LINK_ID; previous.disabled = false; }
      if (legacy) legacy.disabled = false;
      await refreshProjectStyleBaseline().catch(() => {});
      throw error;
    }
    if (generation !== loadGeneration) {
      previous?.remove();
      legacy?.remove();
      return;
    }
    previous?.remove();
    legacy?.remove();
    loadedKeyByProject.set(projectId, cacheKey);
    notifyCssUpdated(compiledClasses, onCompiledClasses);
  } finally {
    if (next.id !== COMPILED_LINK_ID) next.remove();
  }
}
function cleanupProjectStylesheet(projectId) {
  loadGeneration++;
  cleanupProjectStyleBaseline();
  loadedKeyByProject.delete(projectId);
  document.getElementById(COMPILED_LINK_ID)?.remove();
  document.getElementById(`${COMPILED_LINK_ID}-previous`)?.remove();
  document.getElementById(ISOLATION_STYLE_ID)?.remove();
  document.getElementById(LEGACY_COMPILED_LINK_ID)?.remove();
  document.querySelectorAll("[id^=\"bingo-font-import-\"]").forEach(el => el.remove());
}

export { cleanupProjectStylesheet, loadProjectStylesheet };
