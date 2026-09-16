/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/parseJSXPartial.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { storeFromNested } from "../store/ensureV2";
import { storeSubtreeToLegacyNested } from "../store/legacy";
import { getRootIds } from "../store/read";
import { closeIncompleteJsx } from "./closeIncompleteJsx";
import { parseJSX } from "./parseJSX";

/**
* Parse JSX that may still be streaming. Closes open tags / strings, then
* runs the normal parser. Optional `stableIdPrefix` keeps node ids stable
* across successive prefixes of the same tree (path `0`, `0-0`, `0-1`, …).
*/
function parseJSXPartial(jsx, iconLibraries, components, defaultIconLibrary, options) {
  const closed = closeIncompleteJsx(jsx);
  if (!closed) return null;
  let store;
  try {
    store = parseJSX(closed, iconLibraries, components, defaultIconLibrary, {
      forceNewIds: true,
      silent: true
    });
  } catch {
    return null;
  }
  const rootIds = getRootIds(store);
  if (rootIds.length === 0) return null;
  if (options?.stableIdPrefix) {
    const nested = rootIds.map(id => storeSubtreeToLegacyNested(store, id));
    nested.forEach((root, i) => remapNestedIds(root, options.stableIdPrefix, String(i)));
    store = storeFromNested(nested);
  }
  return {
    store,
    closedJsx: closed,
    truncated: closed !== jsx.trim()
  };
}
function remapNestedIds(node, prefix, path) {
  node.id = `${prefix}-${path}`;
  const children = node.children;
  if (!Array.isArray(children)) return;
  let index = 0;
  for (const child of children) {
    if (!child || typeof child !== "object") continue;
    const typed = child;
    if (typeof typed.id !== "string" || typeof typed.type !== "string") continue;
    remapNestedIds(typed, prefix, `${path}-${index}`);
    index += 1;
  }
}

export { parseJSXPartial };
