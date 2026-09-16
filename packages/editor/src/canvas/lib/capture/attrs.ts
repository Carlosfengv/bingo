/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/lib/capture/attrs.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { CAPTURE_ATTRS, SKIP_ATTR_PREFIXES } from "./constants";

/**
* DOM attribute → React props extraction.
*/
/**
* Copy DOM attributes worth keeping to a React-style props object.
* Returns undefined if nothing meaningful was captured.
*/
function getAttrs$2(el) {
  const props = {};
  let n = 0;
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (SKIP_ATTR_PREFIXES.some(p => name.startsWith(p))) continue;
    if (name === "class") {
      if (attr.value) {
        props.className = attr.value;
        n++;
      }
    } else if (name === "style") continue;else if (CAPTURE_ATTRS.has(name)) {
      const reactName = name === "for" ? "htmlFor" : name === "readonly" ? "readOnly" : name;
      props[reactName] = attr.value;
      n++;
    } else if (name.startsWith("aria-") || name.startsWith("data-")) {
      props[name] = attr.value;
      n++;
    }
  }
  if (typeof HTMLImageElement !== "undefined" && el instanceof HTMLImageElement && el.currentSrc) props.src = el.currentSrc;
  return n > 0 ? props : void 0;
}

export { getAttrs$2 };
