/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/lib/capture/fiber.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getFiberFromHostInstance as Z$2, areFiberEqual as be$2, isCompositeFiber as ve$2, getDisplayName as we$2, isHostFiber as x$2 } from "bippy/core";
import { getFallbackOwnerStack as F$1, getOwnerStack as L$1, normalizeFileName as Me$1, isSourceFile as Ne$1, getSourceMap as O$1, hasDebugStack as Se$1, getSource as ke$1, parseStack as m$1, symbolicateStack as xe$1 } from "bippy/source";

/**
* Fiber helpers backed by bippy — handles React 18 + 19, ForwardRef, Memo,
* source map symbolication (resolves Turbopack chunk URLs → real file paths).
*
* Two-phase capture strategy:
*   Phase 1 (sync): DOM walk uses getFiber, getComponentName, findOwningComponent,
*     findContainingComponent. These are cheap fiber-chain reads.
*   Phase 2 (async): resolveSourceInfo calls bippy's getSource per unique fiber,
*     which fetches + caches source maps when needed (React 19 path).
*/
/** Get the React fiber attached to a DOM element, if any. */
function getFiber(el) {
  return Z$2(el) ?? null;
}
/**
* Get a human-readable component name from a composite fiber.
* Uses bippy's getDisplayName which unwraps ForwardRef, Memo, lazy, etc.
* Falls back to function.name / forwardRef.render.name — canvas runtime
* bundles often omit displayName while keeping the function name.
*/
function getComponentName(fiber) {
  if (!fiber) return null;
  const fromBippy = we$2(fiber.type);
  if (fromBippy) return stripForwardRefWrapper(fromBippy);
  return inferNameFromType(fiber.type);
}
function stripForwardRefWrapper(name) {
  const m = name.match(/^ForwardRef\((.+)\)$/);
  return m ? m[1] : name;
}
function inferNameFromType(type) {
  if (!type) return null;
  if (typeof type === "function") {
    const n = type.displayName || type.name;
    return n ? stripForwardRefWrapper(n) : null;
  }
  if (typeof type === "object") {
    const t = type;
    if (t.displayName) return stripForwardRefWrapper(t.displayName);
    if (t.render) {
      const rn = t.render.displayName || t.render.name;
      if (rn) return stripForwardRefWrapper(rn);
    }
    if (t.type) return inferNameFromType(t.type);
  }
  return null;
}
/**
* Map a shadcn-style `data-slot` value to a PascalCase registry name
* when that name is in `known` (e.g. "button" → "Button").
*/
function registryNameFromDataSlot(slot, known) {
  if (!slot || !known || known.size === 0) return null;
  const pascal = slot.split(/[^a-zA-Z0-9]+/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  if (!pascal) return null;
  if (known.has(pascal)) return pascal;
  if (slot === "button" && known.has("Button")) return "Button";
  if (slot === "button-link" && known.has("ButtonLink")) return "ButtonLink";
  return null;
}
/** Read compile-time provenance stamp (`data-bingo-component`) when in registry. */
function registryNameFromBingoAttr(value, known) {
  if (!value) return null;
  if (known && known.size > 0 && !known.has(value)) return null;
  return value;
}
/**
* Prefer a name that exists in the project registry. Fiber owners are often
* Radix `Slot` / anonymous wrappers — those must lose to `data-slot` → Button.
*/
function pickKnownComponentName(candidates, known) {
  if (known && known.size > 0) {
    for (const c of candidates) if (c && known.has(c)) return c;
  }
  for (const c of candidates) if (c) return c;
  return null;
}
/** Walk up the fiber return chain for a composite with this display name. */
function findAncestorCompositeByName(hostFiber, name) {
  if (!hostFiber || !name) return null;
  let cur = hostFiber.return;
  while (cur) {
    if (ve$2(cur)) {
      if (getComponentName(cur) === name) return cur;
    }
    cur = cur.return;
  }
  return null;
}
/**
* STRICT: if `hostFiber` is the root-rendered output of some composite
* component fiber, return that fiber. Otherwise null.
*
* Uses bippy's `isCompositeFiber` which correctly handles ForwardRef (tag 11),
* Memo (tag 14/15), and ClassComponent (tag 1) — not just `typeof === 'function'`.
*/
function findOwningComponent(hostFiber) {
  if (!hostFiber || !hostFiber.return) return null;
  let component = hostFiber.return;
  while (component) {
    if (ve$2(component)) {
      let probe = component.child;
      while (probe) {
        if (be$2(probe, hostFiber)) return component;
        if (x$2(probe)) return null;
        probe = probe.child;
      }
      return null;
    }
    if (x$2(component)) return null;
    component = component.return;
  }
  return null;
}
/**
* LOOSE: nearest composite fiber ancestor (any name). Used for things that
* need the literal nearest wrapper — e.g. checking whether the wrapping
* composite came from `next-devtools/` in `_debugStack`, where walking
* past the wrapper would lose the signal.
*/
function findImmediateComposite(hostFiber) {
  if (!hostFiber) return null;
  let cur = hostFiber.return;
  while (cur) {
    if (ve$2(cur)) return cur;
    cur = cur.return;
  }
  return null;
}
var SLOT_NAMES = new Set(["Slot", "SlotClone", "Slottable"]);
/**
* LOOSE: nearest composite fiber ancestor *that the user would recognize*.
* Walks past framework / Next-app-router internals (InnerLayoutRouter,
* RedirectBoundary, ScrollAndFocusHandler, …) and Radix Slot clones so the
* captured element is named after the user's component (Button), not Slot.
*
* Used for:
*   - `_compNameHint` on html/text captures (the prompt's "from X" label)
*   - `shouldEmitAsComponent` on the walker's component branch (we don't
*     want `type:'component'` captures named "InnerLayoutRouter")
*/
function findContainingComponent(hostFiber) {
  if (!hostFiber) return null;
  let cur = hostFiber.return;
  while (cur) {
    if (ve$2(cur)) {
      const name = getComponentName(cur);
      if (name && (INTERNAL_OWNER_NAMES.has(name) || SLOT_NAMES.has(name))) {
        cur = cur.return;
        continue;
      }
      return cur;
    }
    cur = cur.return;
  }
  return null;
}
/**
* Resolve the `asChild` wrapper for a host node's strict owner.
*
* `asChild` (shadcn Button/Card, Radix primitives) makes a component render
* THROUGH its child instead of emitting its own DOM — so the host's owner is
* the inner renderer (e.g. Link), not the component the user wrote (Button).
* The wrapper sits one or more composites up. Two shapes in the wild:
*   - Radix `<Slot>`: Button → Slot[/SlotClone] → Link → <a>
*   - bare `cloneElement`: Button → Link → <a>  (NO Slot fiber)
* Both are caught by climbing while each ancestor composite is either a Slot
* (transparent) or carries `asChild === true` (it rendered via its child); the
* topmost such component is the one the user wrote. Returns `owningFiber`
* unchanged when nothing above it delegated through a child.
*/
function resolveAsChildOwner(owningFiber) {
  if (!owningFiber) return owningFiber;
  let cur = owningFiber.return;
  let resolved = owningFiber;
  while (cur) {
    if (x$2(cur)) break;
    if (ve$2(cur)) {
      const name = we$2(cur.type);
      const isSlot = !!name && SLOT_NAMES.has(name);
      if (cur.memoizedProps?.asChild === true) resolved = cur;else if (!isSlot) break;
    }
    cur = cur.return;
  }
  return resolved;
}
var GENERIC_ICON_WRAPPERS = new Set(["IconBase", "FontAwesomeIcon", "SvgIcon", "Icon"]);
/**
* Best-effort specific icon name for an SVG, across the common libraries:
*   - heroicons: `<PlusIcon>` renders the svg directly → owner name is the icon.
*   - phosphor:  `<Clock>` → `<IconBase>` → svg → owner is the shared IconBase;
*                the real icon is the composite one level up.
*   - FontAwesome: `<FontAwesomeIcon icon={faSitemap}>` → the id is in the svg's
*                `data-icon` attribute, not a component.
* Returns null when nothing icon-like is found.
*/
function detectIconName(el, fiber) {
  const dataIcon = el.getAttribute("data-icon");
  if (dataIcon) return dataIcon;
  const owner = resolveAsChildOwner(findOwningComponent(fiber));
  const name = owner ? getComponentName(owner) : null;
  if (name && owner && GENERIC_ICON_WRAPPERS.has(name)) {
    let up = owner.return;
    while (up) {
      if (x$2(up)) break;
      if (ve$2(up)) {
        const n = getComponentName(up);
        if (n && !GENERIC_ICON_WRAPPERS.has(n)) return n;
      }
      up = up.return;
    }
  }
  return name;
}
/**
* Is a component safe to RE-RENDER live on the canvas?
*
* A component re-renders correctly only when its captured props fully determine
* its output. The thing that breaks that is **runtime state we couldn't
* capture** — a chart's data, a list's fetched rows. In the fiber, that state
* lives in STATE hooks: `useState` / `useReducer` / `useSyncExternalStore`
* (incl. React Query / Redux / Zustand under the hood). Those hook nodes are
* the only ones carrying a `.queue`, so we walk the hook list and freeze if any
* is found. Class components are frozen whenever they hold state.
*
* We deliberately DON'T freeze on `useRef` / `useMemo` / `useCallback` / `useId`
* / `useContext` — those are routing, refs, ids, theme: benign, the output
* still follows from props. (Otherwise an `asChild` Button wrapping a router
* `<Link>` — whose Slot/Link use `useMemo`/`useContext` — gets wrongly frozen.)
* So Buttons stay live + editable; charts/lists with real state stay frozen.
*
* Trade-off: a component that holds genuine DATA in `useState` (rare for the
* primitives you'd edit) is treated as live; acceptable vs. freezing Buttons.
*/
function isLiveSafeComponent(fiber) {
  if (!fiber) return false;
  if (fiber.tag === 1) return fiber.memoizedState == null;
  let hook = fiber.memoizedState;
  while (hook) {
    if (hook.queue != null) return false;
    hook = hook.next;
  }
  return true;
}
/**
* Filter memoizedProps down to JSON-serializable values.
* Drops children, ref, key, functions, React elements, DOM nodes, and
* `undefined` (fiber leaves every omitted prop as undefined — emitting those
* produces `loading={undefined}` noise in Copy-as-React).
*/
function extractComponentProps(memoizedProps) {
  if (!memoizedProps || typeof memoizedProps !== "object") return void 0;
  const out = {};
  let n = 0;
  for (const k of Object.keys(memoizedProps)) {
    if (k === "children" || k === "ref" || k === "key") continue;
    const v = memoizedProps[k];
    if (v === void 0) continue;
    if (isSafePropValue(v)) {
      out[k] = v;
      n++;
    }
  }
  return n > 0 ? out : void 0;
}
function isSafePropValue(v, depth = 0) {
  if (depth > 3) return false;
  if (v === null) return true;
  if (v === void 0) return false;
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (t === "function" || t === "symbol" || t === "bigint") return false;
  if (Array.isArray(v)) return v.length <= 20 && v.every(x => isSafePropValue(x, depth + 1));
  if (t === "object") {
    if (typeof Node !== "undefined" && v instanceof Node) return false;
    if (typeof Event !== "undefined" && v instanceof Event) return false;
    if ("$$typeof" in v) return false;
    const keys = Object.keys(v);
    return keys.length <= 20 && keys.every(k => isSafePropValue(v[k], depth + 1));
  }
  return false;
}
/**
* Flatten React `children` from fiber props into plain values.
* Returns `'mixed'` when children include elements (icons, nested comps) —
* caller should fall back to a DOM walk + synthesis filter.
*/
function authoredChildrenKind(childrenProp) {
  if (childrenProp == null || childrenProp === false || childrenProp === true) return {
    kind: "empty"
  };
  const flat = flattenReactChildren(childrenProp);
  if (flat.length === 0) return {
    kind: "empty"
  };
  const texts = [];
  for (const c of flat) {
    if (typeof c === "string" || typeof c === "number") {
      texts.push(String(c));
      continue;
    }
    return {
      kind: "mixed"
    };
  }
  return {
    kind: "text",
    texts
  };
}
function flattenReactChildren(children) {
  if (children == null || children === false || children === true) return [];
  if (Array.isArray(children)) return children.flatMap(c => flattenReactChildren(c));
  return [children];
}
/**
* Drop DOM-captured children that a component already synthesizes from props
* (e.g. Button `shortcut` → `<Kbd>`, `withArrow` → arrow svg). Keeping both
* doubles Esc / arrows when the frozen tree remounts.
*/
function stripPropSynthesizedChildren(children, props) {
  if (!children?.length || !props) return children;
  let out = children;
  if (props.shortcut != null && props.shortcut !== false && props.shortcut !== "") out = out.filter(c => !isShortcutChrome(c));
  if (props.withArrow === true || props.withArrow === "true") out = out.filter(c => !isArrowChrome(c));
  return out.length > 0 ? out : void 0;
}
function isShortcutChrome(c) {
  if (c.type === "component" && c.componentName === "Kbd") return true;
  if (c.type === "html") {
    if (c.props?.["data-slot"] === "kbd" || c.tag === "kbd") return true;
  }
  return false;
}
function isArrowChrome(c) {
  if (c.type !== "html") return false;
  const slot = c.props?.["data-slot"];
  if (slot === "button-arrow" || slot === "arrow") return true;
  if (c.tag === "svg" || c.tag === "div") {
    const html = c.props?.dangerouslySetInnerHTML?.__html;
    if (typeof html === "string" && /button-arrow|lucide-arrow-right/.test(html)) return true;
    if (typeof c.props?.className === "string" && /lucide-arrow-right/.test(c.props.className)) return true;
  }
  return false;
}
/**
* Strip URL prefixes so `local_read` gets bare filesystem paths.
* Handles `file:///`, `rsc://React/Server/file:///…` (RSC/Turbopack), and
* `/@fs/…` (Vite's dev-server scheme for files outside the project root).
*/
function cleanFilePath(raw) {
  let p = raw;
  try {
    p = Me$1(p);
  } catch {}
  if (p.startsWith("file:///")) p = p.slice(7);
  if (p.startsWith("rsc://")) {
    const fileIdx = p.indexOf("file:///");
    if (fileIdx >= 0) p = p.slice(fileIdx + 7);
  }
  if (p.startsWith("/@fs/")) p = p.slice(4);
  return p;
}
/**
* Belt-and-suspenders guard. bippy's `isSourceFile` is the authoritative check
* but we also reject leaked bundle URLs / Next chunk paths in case bippy ever
* returns a frame whose file URL slipped through unsymbolicated. Without this,
* a failed symbolication would leak `_6560a9c5._.js:5714` to the save-to-code
* prompt and send the AI hunting through bundle output.
*/
function isRealUserSourcePath(p) {
  if (!p) return false;
  if (!Ne$1(p)) return false;
  if (/^[a-z]+:\/\//i.test(p)) return false;
  if (p.includes("/_next/") || p.includes(".next/")) return false;
  if (/^\/?_[0-9a-f]+\._\.js/i.test(p)) return false;
  if (p.includes("node_modules")) return false;
  if (!/\.(tsx?|jsx?|mjs)$/i.test(p)) return false;
  return true;
}
/**
* Pick the call site (where the captured element is written in user JSX)
* from an owner stack. The stack is leaf→root.
*
*   - For `type:'component'` captures, the attached fiber IS the component
*     itself, so frame 0 is the component's own file (e.g. button.tsx for
*     Button). We want the *parent that wrote `<Button>`* — pass
*     `skipLeaf:true` to drop frame 0 + any same-file internal frames.
*
*   - For `type:'html'` / `type:'text'` captures, the attached fiber is the
*     HOST fiber for the element (or its parent host for text). The host's
*     owner-stack frame 0 is *where `<this-tag>` was written*. When that
*     happens to be inside a SHARED LIBRARY component (e.g. an Nx monorepo's
*     `libs/components/.../InputLabel.tsx` rendering an inner `<label>`),
*     resolving to the library's own file is almost never what the user
*     wants — they clicked a thing on the consumer page and want to edit
*     the consumer. So we bump past library frames to the consumer.
*
* Both paths bias against shared/library code (`../` escapes, `/libs/`,
* `/packages/`, `node_modules`, `/components/ui/`) so we land on the user's
* feature code. Falls back to the full filtered list if the bias would
* empty everything out.
*/
function pickCallSiteFrame(frames, opts = {}) {
  const sourceFrames = frames.filter(f => f.fileName && isRealUserSourcePath(cleanFilePath(f.fileName)));
  if (sourceFrames.length === 0) return null;
  let ownerFrames = sourceFrames;
  if (opts.skipLeaf) {
    const leafFile = cleanFilePath(sourceFrames[0].fileName);
    let i = 1;
    while (i < sourceFrames.length && cleanFilePath(sourceFrames[i].fileName) === leafFile) i++;
    ownerFrames = sourceFrames.slice(i);
    if (ownerFrames.length === 0) return null;
  }
  const userCodeFrames = ownerFrames.filter(f => !isLibraryFrame(cleanFilePath(f.fileName)));
  const candidates = userCodeFrames.length > 0 ? userCodeFrames : ownerFrames;
  return candidates.find(f => f.functionName && isLikelyUserComponentName(f.functionName)) ?? candidates[0] ?? null;
}
/**
* Heuristic: is this frame in shared / library / primitive code that the
* user almost certainly does NOT want to land in when they click a rendered
* element on the consumer page?
*
*   - `../` prefixes: webpack-rootDir-relative path that escapes the app
*     root. In an Nx monorepo this is the canonical shape for `libs/*`
*     imports (`../../libs/...`).
*   - top-level `/libs/`, `/packages/`: monorepo workspace folders. Excludes
*     `/src/libs/` and `/src/packages/` — those are app-internal subfolders
*     and the user owns them like normal feature code.
*   - `/node_modules/`: third-party deps.
*   - `/components/ui/`: Shadcn-style primitives folder by convention.
*
* Conservative — we only want clear library signals, not every shared file.
* If the user works directly inside `libs/`, the bumped fallback in
* `pickCallSiteFrame` still returns the library frame when nothing else
* is available.
*/
function isLibraryFrame(filePath) {
  if (filePath.startsWith("../")) return true;
  if (filePath.includes("/node_modules/")) return true;
  if (/\/components\/ui\//.test(filePath)) return true;
  if (/(?<!\/src)\/(?:libs|packages)\//.test(filePath)) return true;
  return false;
}
/**
* Heuristic: PascalCase, not a React/Next/HOC internal. Borrowed from
* react-grab's owner-stack resolution — picks the user component that wrote
* the JSX over wrappers like Provider/Context/Boundary.
*/
var INTERNAL_OWNER_NAMES = new Set(["Suspense", "Fragment", "StrictMode", "Profiler", "SuspenseList", "InnerLayoutRouter", "OuterLayoutRouter", "RedirectErrorBoundary", "RedirectBoundary", "HTTPAccessFallbackErrorBoundary", "HTTPAccessFallbackBoundary", "LoadingBoundary", "ErrorBoundary", "ErrorBoundaryHandler", "InnerScrollAndFocusHandler", "ScrollAndFocusHandler", "RenderFromTemplateContext", "AppRouter", "Router", "ServerRoot", "SegmentStateProvider", "RootErrorBoundary", "AppDevOverlay", "AppDevOverlayErrorBoundary", "DevRootHTTPAccessFallbackBoundary", "HotReload", "LoadableComponent"]);
function isLikelyUserComponentName(name) {
  if (name.length <= 1) return false;
  if (INTERNAL_OWNER_NAMES.has(name)) return false;
  if (name[0] !== name[0].toUpperCase()) return false;
  if (name.endsWith("Provider") || name.endsWith("Context")) return false;
  return true;
}
var SYMBOLICATION_TIMEOUT_MS = 4e3;
var cachedIsNextProject;
function checkIsNextProject() {
  if (typeof document === "undefined") return false;
  if (cachedIsNextProject !== void 0) return cachedIsNextProject;
  cachedIsNextProject = !!(document.getElementById("__NEXT_DATA__") || document.querySelector("nextjs-portal"));
  return cachedIsNextProject;
}
async function symbolicateViaNextDevServer(frames) {
  const indices = [];
  const requestFrames = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (!f.fileName) continue;
    if (isRealUserSourcePath(cleanFilePath(f.fileName))) continue;
    indices.push(i);
    requestFrames.push({
      file: f.fileName,
      methodName: f.functionName ?? "<unknown>",
      line1: f.lineNumber ?? null,
      column1: f.columnNumber ?? null,
      arguments: []
    });
  }
  if (requestFrames.length === 0) return frames;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYMBOLICATION_TIMEOUT_MS);
  try {
    const response = await fetch("/__nextjs_original-stack-frames", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        frames: requestFrames,
        isServer: false,
        isEdgeServer: false,
        isAppDirectory: true
      }),
      signal: controller.signal
    });
    if (!response.ok) return frames;
    const results = await response.json();
    const out = frames.slice();
    for (let r = 0; r < indices.length; r++) {
      const result = results[r];
      if (result?.status !== "fulfilled") continue;
      const resolved = result.value?.originalStackFrame;
      if (!resolved?.file || resolved.ignored) continue;
      const i = indices[r];
      out[i] = {
        ...frames[i],
        fileName: resolved.file,
        lineNumber: resolved.line1 ?? void 0,
        columnNumber: resolved.column1 ?? void 0,
        isSymbolicated: true
      };
    }
    return out;
  } catch {
    return frames;
  } finally {
    clearTimeout(timeout);
  }
}
/**
* Detect the user's project root directory once per capture.
*
* Some build configs (Next + webpack on certain Next versions, Nx-style
* monorepos, etc.) emit source maps with project-root-relative `sources[]`
* — we get back paths like `./src/app/page.tsx` from bippy's resolution.
* Without knowing the project root those paths are unactionable for the AI.
*
* Two tiers (in order):
*
*   Tier 1 — fiber-stack route. Pick a chunk frame from the sample fiber's
*     `_debugStack` (or fallback owner-chain synthesis), ask Next's
*     `/__nextjs_original-stack-frames` for the absolute path,
*     simultaneously ask bippy to symbolicate the same frame. Subtract
*     bippy's relative off the absolute → root. Best when fibers carry
*     `_debugStack` (React 19 / recent Next).
*
*   Tier 2 — chunk-scrape fallback. Tier 1 fails on stacks where neither
*     `_debugStack` nor the synthesized owner stack contains a chunk URL
*     (seen on Next + webpack + Nx where the fibers we sample are above
*     the user-code boundary). Walk the document for any `<script
*     src="/_next/...">`, fetch the source map, find a mapping that points
*     at user-code source, then run the same Next/bippy round-trip on
*     that synthetic frame.
*
* Returns null when:
*   - not a Next project (use other heuristics — common-prefix-of-absolutes)
*   - both tiers fail / time out
*   - bippy's resolution already gave an absolute path (root not needed)
*/
async function detectProjectRoot(sampleFiber) {
  if (!checkIsNextProject()) return null;
  if (sampleFiber) {
    const fromFiber = await detectRootFromFiberStack(sampleFiber);
    if (fromFiber) return fromFiber;
  }
  return await detectRootFromDocumentChunks();
}
async function detectRootFromFiberStack(sampleFiber) {
  let rawStack;
  if (Se$1(sampleFiber)) rawStack = sampleFiber._debugStack?.stack;else if (sampleFiber.alternate && Se$1(sampleFiber.alternate)) rawStack = sampleFiber.alternate._debugStack?.stack;
  if (!rawStack) try {
    rawStack = F$1(sampleFiber);
  } catch {}
  if (!rawStack) return null;
  const chunkFrame = m$1(rawStack).find(f => f.fileName && /\/_next\//.test(f.fileName) && f.lineNumber != null);
  if (!chunkFrame) return null;
  return await deriveRootFromChunkFrame(chunkFrame);
}
/**
* Round-trip a chunk frame through Next + bippy and subtract to get root.
* Shared by Tier 1 (fiber-derived frame) and Tier 2 (synthesized frame).
*
* Symbolicates via the source map ourselves rather than going through
* bippy's `symbolicateStack` so we get the source path the same way the
* Tier 2 chunk scrape does — `webpack://`-prefix-stripped, ready to subtract.
*/
async function deriveRootFromChunkFrame(chunkFrame) {
  const [absolute, bippyResolved] = await Promise.all([askNextForAbsolute(chunkFrame), xe$1([chunkFrame], true).then(arr => arr?.[0] ?? null).catch(() => null)]);
  if (!absolute) return null;
  const relative = bippyResolved?.fileName ? cleanFilePath(bippyResolved.fileName) : null;
  if (!relative || relative.startsWith("/")) return null;
  const relTrim = relative.startsWith("./") ? relative.slice(2) : relative;
  if (!relTrim) return null;
  const suffix = "/" + relTrim;
  if (absolute.endsWith(suffix)) return absolute.slice(0, absolute.length - suffix.length);
  return null;
}
/**
* Tier 2 fallback. No fiber stack available → scan `<script src="/_next/…">`
* tags in the document, fetch each chunk's source map, find a mapping that
* lands inside a user-code source file, and run that synthetic frame
* through `deriveRootFromChunkFrame`.
*
* Why scripts: every Next page loads its app code via chunk URLs. Even
* when fibers don't carry stack info (older React / certain Next + Nx
* combos), the chunk URLs are still in the DOM and bippy can fetch the
* source maps Next serves alongside them.
*
* Caps:
*   - tries at most 4 chunks (avoid hammering source-map fetches)
*   - skips runtime/polyfill/framework/webpack chunks (no user-code mappings)
*/
async function detectRootFromDocumentChunks() {
  if (typeof document === "undefined") return null;
  const scripts = Array.from(document.querySelectorAll("script[src]"));
  const chunkUrls = [];
  for (const s of scripts) {
    const src = s.src;
    if (!src || !/\/_next\//.test(src)) continue;
    if (/\/(webpack|polyfills|framework|main-app|main\.|chunks\/main)\b/.test(src)) continue;
    if (!/\.js(\?|$)/.test(src)) continue;
    chunkUrls.push(src);
    if (chunkUrls.length >= 4) break;
  }
  for (const chunkUrl of chunkUrls) {
    let map;
    try {
      map = await O$1(chunkUrl, true);
    } catch {
      map = null;
    }
    if (!map || !Array.isArray(map.mappings)) continue;
    const sources = map.sources || [];
    const mappings = map.mappings;
    for (let line = 0; line < mappings.length; line++) {
      const lineSegs = mappings[line];
      if (!Array.isArray(lineSegs)) continue;
      for (const seg of lineSegs) {
        if (!seg || seg.length < 4) continue;
        const rawSrc = sources[seg[1]];
        if (!rawSrc) continue;
        const stripped = stripSourceMapPrefix(rawSrc);
        if (!stripped.startsWith("./") || !isUserSourceFile(stripped)) continue;
        const root = await deriveRootFromChunkFrame({
          fileName: chunkUrl,
          lineNumber: line + 1,
          columnNumber: (seg[0] || 0) + 1
        });
        if (root) return root;
      }
    }
  }
  return null;
}
/**
* Strip `webpack://name/` (or `webpack:///`) and `rsc://` prefixes from a
* source map's `sources[]` entry to get the path bippy normalizes to.
*/
function stripSourceMapPrefix(s) {
  let p = s;
  const wp = p.match(/^webpack:\/\/[^/]*\/(.+)$/);
  if (wp) p = wp[1];
  if (p.startsWith("rsc://")) {
    const i = p.indexOf("file:///");
    if (i >= 0) p = p.slice(i + 7);
  }
  return p;
}
/** True for `<name>.tsx|jsx|ts|js|mjs` paths outside vendor / build dirs. */
function isUserSourceFile(p) {
  if (!p) return false;
  if (!/\.(tsx?|jsx?|mjs)$/i.test(p)) return false;
  if (p.includes("node_modules")) return false;
  if (p.startsWith("webpack-internal:")) return false;
  if (p.includes("/.next/")) return false;
  return true;
}
async function askNextForAbsolute(frame) {
  if (!frame.fileName) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYMBOLICATION_TIMEOUT_MS);
  try {
    const response = await fetch("/__nextjs_original-stack-frames", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        frames: [{
          file: frame.fileName,
          methodName: frame.functionName ?? "<unknown>",
          line1: frame.lineNumber ?? null,
          column1: frame.columnNumber ?? null,
          arguments: []
        }],
        isServer: false,
        isEdgeServer: false,
        isAppDirectory: true
      }),
      signal: controller.signal
    });
    if (!response.ok) return null;
    const resolved = (await response.json())?.[0]?.value?.originalStackFrame;
    if (!resolved?.file || resolved.ignored) return null;
    return resolved.file;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
async function fetchOwnerStackForFiber(fiber) {
  const frames = await L$1(fiber, true);
  return checkIsNextProject() ? await symbolicateViaNextDevServer(frames) : frames;
}
/**
* Resolve the CALL SITE for a `type:'component'` capture — where
* `<Component …>` is written in user JSX. Walks the owner stack (via bippy's
* `getOwnerStack`, with Next.js dev-server symbolication when applicable),
* skips the leaf component's own file + Shadcn-style `/components/ui/`
* wrappers, picks the first user-component frame.
*
* Falls back to `getSource` (= the component's DEFINITION file) when the
* owner-stack route can't produce a usable frame, then to name-only.
*
* Used for `type:'component'` because the captured fiber IS the component
* itself; we want where it was instantiated, not where it was declared.
*/
async function resolveComponentCallSite(fiber) {
  const name = getComponentName(fiber) || "Unknown";
  try {
    const callSite = pickCallSiteFrame(await fetchOwnerStackForFiber(fiber), {
      skipLeaf: true
    });
    if (callSite?.fileName) {
      const cleaned = cleanFilePath(callSite.fileName);
      if (isRealUserSourcePath(cleaned)) return {
        componentName: name,
        filePath: cleaned,
        lineNumber: callSite.lineNumber ?? 0,
        columnNumber: callSite.columnNumber
      };
    }
  } catch {}
  return name !== "Unknown" ? {
    componentName: name,
    filePath: "",
    lineNumber: 0
  } : null;
}
/**
* Resolve the CALL SITE for a host-fiber-backed capture (`type:'html'` /
* `type:'text'`). Walks the host's owner stack and picks the first usable
* source frame. Frame 0 IS where the user wrote `<this-tag>` — don't skip
* it (unlike component captures which want the parent of frame 0).
*
* `compNameHint` is the containing-composite name walker stashed on the
* captured element (e.g. "CardContent") so the prompt's "from X" hint stays
* meaningful even though the resolved file is wherever the user wrote the
* JSX (often a different file from the composite's definition).
*/
async function resolveHostCallSite(fiber, compNameHint) {
  const name = compNameHint || getComponentName(fiber) || "Unknown";
  try {
    const callSite = pickCallSiteFrame(await fetchOwnerStackForFiber(fiber), {
      skipLeaf: false
    });
    if (callSite?.fileName) {
      const cleaned = cleanFilePath(callSite.fileName);
      if (isRealUserSourcePath(cleaned)) return {
        componentName: name,
        filePath: cleaned,
        lineNumber: callSite.lineNumber ?? 0,
        columnNumber: callSite.columnNumber
      };
    }
  } catch {}
  try {
    const src = await ke$1(fiber, true);
    if (src && src.fileName) {
      const cleaned = cleanFilePath(src.fileName);
      if (isRealUserSourcePath(cleaned)) return {
        componentName: name,
        filePath: cleaned,
        lineNumber: src.lineNumber ?? 0,
        columnNumber: src.columnNumber
      };
    }
  } catch {}
  return name !== "Unknown" ? {
    componentName: name,
    filePath: "",
    lineNumber: 0
  } : null;
}
/**
* Walk the captured tree and resolve sourceInfo for every node that has a
* `_fiber` reference, dispatching by element type:
*
*   - `type:'component'` — fiber IS the component (e.g. `Card`'s fiber).
*     Resolve via `resolveComponentCallSite` which walks the owner stack
*     and skips the leaf component's own file → lands on where `<Card>`
*     was written.
*
*   - `type:'html'` / `type:'text'` — fiber is the HOST fiber for the
*     element (or its parent host for text). Frame 0 of the host's owner
*     stack IS the user file where `<this-tag>` was written, so we don't
*     skip the leaf — we just step past UI-lib wrappers if any. Walker
*     stashes the containing-composite name on the node so the prompt can
*     still show the meaningful "from X" label.
*
* Cache is keyed by `(fiber, mode)` so the same fiber can produce both a
* call site and a host site if both kinds of capture reference it.
*
* Mutates nodes in-place (sets sourceInfo, deletes _fiber + _compNameHint).
*/
async function resolveSourceInfoBatch(elements) {
  const cache = new Map();
  const getCallSite = fiber => {
    let entry = cache.get(fiber);
    if (!entry) {
      entry = {};
      cache.set(fiber, entry);
    }
    entry.callSite ??= resolveComponentCallSite(fiber);
    return entry.callSite;
  };
  const getHostSite = (fiber, hint) => {
    let entry = cache.get(fiber);
    if (!entry) {
      entry = {};
      cache.set(fiber, entry);
    }
    if (!entry.hostSite) entry.hostSite = new Map();
    const key = hint ?? "";
    let p = entry.hostSite.get(key);
    if (!p) {
      p = resolveHostCallSite(fiber, hint);
      entry.hostSite.set(key, p);
    }
    return p;
  };
  const work = [];
  const collect = nodes => {
    for (const node of nodes) {
      const fiber = node._fiber;
      if (fiber) {
        const mode = node.type === "component" ? "call" : "host";
        const hint = node._compNameHint;
        work.push({
          node,
          fiber,
          mode,
          hint
        });
      }
      if (node.children) collect(node.children);
    }
  };
  collect(elements);
  await Promise.all(work.map(async w => {
    const resolved = w.mode === "call" ? await getCallSite(w.fiber) : await getHostSite(w.fiber, w.hint);
    if (resolved) w.node.sourceInfo = resolved;
    delete w.node._fiber;
    delete w.node._compNameHint;
  }));
}

export { authoredChildrenKind, detectIconName, detectProjectRoot, extractComponentProps, findAncestorCompositeByName, findContainingComponent, findImmediateComposite, findOwningComponent, getComponentName, getFiber, isLiveSafeComponent, pickKnownComponentName, registryNameFromDataSlot, registryNameFromBingoAttr, resolveAsChildOwner, resolveSourceInfoBatch, stripPropSynthesizedChildren };
