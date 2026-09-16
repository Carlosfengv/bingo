/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/store/sanitize.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/** DOM attrs Bingo sets from element.id — never user/agent-editable props */
var BINGO_OWNED_DOM_PROPS = ["data-element-id", "dataElementId"];
/**
* Coerce a parsed `className` prop into a CSS class string.
* Streaming / shadcn JSX often uses `className={cn(...)}`, arrays, or
* `{ flex: true }` maps — those are not strings, and `.match` on them
* takes down the whole editor.
*/
function coerceClassName(value) {
  if (value == null || value === false) return void 0;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(coerceClassName).filter(part => !!part);
    return parts.length > 0 ? parts.join(" ") : void 0;
  }
  if (typeof value === "object") {
    const parts = Object.keys(value).filter(key => !!value[key]);
    return parts.length > 0 ? parts.join(" ") : void 0;
  }
}
function sanitizeElementProps(props) {
  if (!props) return props;
  let changed = false;
  const next = {
    ...props
  };
  for (const key of BINGO_OWNED_DOM_PROPS) if (key in next) {
    delete next[key];
    changed = true;
  }
  if ("className" in next) {
    const className = coerceClassName(next.className);
    if (className === void 0) {
      delete next.className;
      changed = true;
    } else if (className !== next.className) {
      next.className = className;
      changed = true;
    }
  }
  if (!changed) return props;
  return Object.keys(next).length > 0 ? next : void 0;
}
function isPlainObject$2(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
/**
* Props safe to spread onto a DOM node. Streaming JSX leaves arrays, maps, and
* leftover expression objects in props; React (and `.match` on className)
* throws on those and used to take down the whole editor.
*/
function sanitizeDomRenderProps(props) {
  const base = sanitizeElementProps(props);
  if (!base) return {};
  const out = {};
  for (const [key, value] of Object.entries(base)) {
    if (key === "style") {
      if (isPlainObject$2(value)) out.style = value;
      continue;
    }
    if (key === "className") {
      const className = coerceClassName(value);
      if (className) out.className = className;
      continue;
    }
    if (key.startsWith("on") && key.length > 2 && key[2] === key[2]?.toUpperCase()) {
      if (typeof value === "function") out[key] = value;
      continue;
    }
    if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") out[key] = value;
  }
  return out;
}
function isBingoOwnedDomProp(key) {
  return BINGO_OWNED_DOM_PROPS.includes(key);
}
/**
* Editor-only upload-progress markers. Kept in the live store so the loading
* placeholder renders, but never serialized (toWire) or emitted in codegen —
* a `blob:` preview URL or a stuck `data-uploading` would be meaningless (and
* a permanent spinner) once outside the session that created them.
*
* Unlike BINGO_OWNED_DOM_PROPS these are NOT stripped by sanitizeElementProps:
* sanitize runs on the insert path, where the marker must survive so the
* placeholder can show its spinner.
*/
var TRANSIENT_UPLOAD_PROPS = ["data-uploading", "data-upload-preview"];
function isTransientUploadProp(key) {
  return TRANSIENT_UPLOAD_PROPS.includes(key);
}

export { coerceClassName, isBingoOwnedDomProp, isPlainObject$2, isTransientUploadProp, sanitizeDomRenderProps, sanitizeElementProps };
