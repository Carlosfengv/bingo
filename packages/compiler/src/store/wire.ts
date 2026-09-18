/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/store/wire.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { isTransientUploadProp } from "./sanitize";

function toWire(store) {
  const byId = {};
  for (const [id, el] of store.byId) byId[id] = stripNonSerializable$1(el);
  const childrenByParent = {};
  for (const [parent, ids] of store.childrenByParent) childrenByParent[parent] = [...ids];
  return {
    schemaVersion: 2,
    ...(store.variableModes ? { variableModes: store.variableModes } : {}),
    byId,
    childrenByParent
  };
}
function stripNonSerializable$1(el) {
  const cleaned = {};
  for (const key of Object.keys(el)) {
    if (key === "componentRef" || key === "isRegistered") continue;
    const val = el[key];
    if (typeof val === "function") continue;
    if (key === "props" && val && typeof val === "object") {
      const cleanedProps = {};
      for (const [pk, pv] of Object.entries(val)) if (typeof pv !== "function" && !isTransientUploadProp(pk)) cleanedProps[pk] = pv;
      cleaned.props = cleanedProps;
    } else cleaned[key] = val;
  }
  return cleaned;
}

export { toWire };
