/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/fiberExtract.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { CAPTURE_ARTIFACT } from "../lib/capture/artifact.generated";
import { runCapture } from "../lib/capture/runCapture";

/**
* Public capture entry points used by WebviewRenderer.
*
* Thin wrapper around `lib/capture`:
*   - `captureFromIframe`: same-origin iframe capture (in-process, sync-like)
*   - `captureFromWebview`: Electron <webview> capture via executeJavaScript
*
* Both return the same `CaptureResult` shape. No capture logic lives here —
* it's all in `lib/capture`, which is also the source for the chrome
* extension content script.
*/
/**
* Tracks whether the 18KB capture artifact is already installed in a given
* webview's guest document. We skip re-injecting on subsequent captures —
* saves V8 parse + eval (~1–5ms per capture).
*
* Callers MUST call `markWebviewArtifactStale(webview)` when the webview
* navigates (did-navigate / did-start-loading), otherwise the cache will
* lie once the guest document changes.
*/
var artifactLoadedCache = new WeakSet();
function markWebviewArtifactStale(webview) {
  artifactLoadedCache.delete(webview);
}
/**
* Walk captured elements and infer the repo root from their `sourceInfo.filePath`.
* Filters vendor paths (node_modules/.next) and requires
* /Users/<name>/<dir>/<subdir> before trusting the prefix. Returns null when
* the capture yielded no usable source info.
*
* Run once at capture time on the ORIGINAL tree — callers should stash the
* result so later edits (which may remove source-backed elements) don't
* affect the answer.
*/
/**
* Is this path a REAL filesystem absolute (vs a "looks-absolute" project-
* rooted path like Vite's `/src/foo.tsx`)?
*
* POSIX: must start with a known top-level directory (`/Users`, `/home`,
* etc.). Windows: any drive-letter prefix.
*
* Used to filter source-map outputs before computing a project root and to
* decide whether `resolveAgainstRoot` should pass the path through (true
* absolute) or join with the project root (Vite-rooted relative).
*/
function isLikelyFilesystemPath$1(p) {
  if (!p) return false;
  if (/^[a-zA-Z]:[\\/]/.test(p)) return true;
  return /^\/(?:Users|home|root|opt|srv|usr|var|tmp|private|Volumes|mnt|data)\//.test(p);
}
function detectRepoRootFromCapture(elements) {
  const paths = [];
  const collect = els => {
    for (const el of els) {
      if (el?.sourceInfo?.filePath) paths.push(el.sourceInfo.filePath);
      if (el?.children) collect(el.children);
    }
  };
  collect(elements);
  const userPaths = paths.filter(p => isLikelyFilesystemPath$1(p) && !/\/node_modules\/|\/\.next\//.test(p));
  if (userPaths.length === 0) return null;
  const parts = userPaths.map(p => p.split("/"));
  const common = [];
  for (let i = 0; i < parts[0].length; i++) {
    const seg = parts[0][i];
    if (parts.every(p => p[i] === seg)) common.push(seg);else break;
  }
  if (common[common.length - 1]?.includes(".")) common.pop();
  const MIN_DEPTH = 4;
  const root = common.join("/");
  if (!root || root === "/" || common.length < MIN_DEPTH) return null;
  return root;
}
function normalize$4(result) {
  if (!result || "error" in result) {
    if (result && "error" in result) console.warn("[fiberExtract] capture reported:", result.error);
    return null;
  }
  return {
    elements: result.elements,
    componentCount: result.componentCount,
    elementCount: result.elementCount,
    projectRoot: result.projectRoot ?? null
  };
}
/**
* Capture from a same-origin iframe document. Runs in-process using the
* shared `runCapture` entry.
*/
async function captureFromIframe(iframeDoc, opts) {
  if (!iframeDoc.body) {
    console.warn("[fiberExtract] iframe document has no body");
    return null;
  }
  return normalize$4(await runCapture({
    rootElement: iframeDoc.body,
    withFiber: true,
    withComputedStyles: true,
    withStyleHeuristics: true,
    withStylesheetPreload: opts?.withStylesheetPreload ?? false,
    knownComponents: opts?.knownComponents
  }));
}
/**
* Capture from an Electron <webview> tag via `executeJavaScript`.
*
* Injects the built capture artifact (self-contained IIFE) into the guest,
* then calls `__bingoCapture.run(...)` with JSON-passed options.
* Returns the parsed result or null if the guest reported an error.
*/
async function captureFromWebview(webview, opts) {
  const runOptions = {
    withFiber: true,
    withComputedStyles: true,
    withStyleHeuristics: true,
    withStylesheetPreload: opts?.withStylesheetPreload ?? false,
    maxDepth: opts?.maxDepth ?? 30,
    knownComponents: opts?.knownComponents instanceof Set ? Array.from(opts.knownComponents) : opts?.knownComponents
  };
  const invocation = `(async () => {
  try {
    const r = await globalThis.__bingoCapture.run(${JSON.stringify(runOptions)});
    return JSON.stringify(r);
  } catch (err) {
    return JSON.stringify({ error: String(err && err.message || err) });
  }
})()`;
  const needsArtifact = !artifactLoadedCache.has(webview);
  const script = needsArtifact ? `${CAPTURE_ARTIFACT};\n${invocation}` : invocation;
  let raw;
  try {
    raw = await webview.executeJavaScript(script);
    if (needsArtifact) artifactLoadedCache.add(webview);
  } catch (err) {
    console.error("[fiberExtract] executeJavaScript threw:", err);
    return null;
  }
  if (!raw || typeof raw !== "string") {
    console.warn("[fiberExtract] webview returned no result");
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("[fiberExtract] failed to parse webview result:", err);
    return null;
  }
  return normalize$4(parsed);
}
/**
* Read the clicked element's fingerprint from the guest: tag + className + text
* (accurate from the DOM) and the source FILE (from the fiber's `_debugSource`,
* which gets the file right even when its line is wrong). The HOST then resolves
* the exact line by content-searching that file in the main process.
*/
async function getTargetFingerprint(webview) {
  const script = `(function(){
    var el = window.__bingoEditTarget; if(!el) return JSON.stringify({error:'no-target'});
    function getFiber(n){ for(var k in n){ if(k.indexOf('__reactFiber$')===0||k.indexOf('__reactInternalInstance$')===0) return n[k]; } return null; }
    function fileOf(n){ var f=getFiber(n),h=0; while(f&&h<40){ if(f._debugSource&&f._debugSource.fileName) return f._debugSource.fileName; f=f.return; h++; } return null; }
    var isLeaf = el.children && el.children.length === 0;
    return JSON.stringify({
      tag:(el.tagName||'').toLowerCase(),
      className:(el.getAttribute&&el.getAttribute('class'))||'',
      text: isLeaf ? ((el.textContent||'').trim() || null) : null,
      file: fileOf(el),
    });
  })()`;
  let raw;
  try {
    raw = await webview.executeJavaScript(script);
  } catch {
    return null;
  }
  try {
    const p = JSON.parse(raw);
    if (p?.error) return null;
    return {
      tag: p.tag || "",
      className: p.className || "",
      text: p.text ?? null,
      file: p.file ?? null
    };
  } catch {
    return null;
  }
}

export { captureFromIframe, captureFromWebview, detectRepoRootFromCapture, getTargetFingerprint, markWebviewArtifactStale };
