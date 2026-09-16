/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/tailwindUtils.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ensureV2 } from "../store/ensureV2";
import { getById, walk } from "../store/read";
import { ROOT } from "../store/types";

/**
* Shared Tailwind CSS utilities
*
* Pure functions (no I/O, no platform deps) for extracting class names from
* canvas stores. Used by cloud, api, and vite-plugin-bingo-local.
*/
/** Walk canvas elements, collect all className strings.
*  Accepts any payload ensureV2 understands: Store, StoreWireV2, legacy
*  FEElement[], or `{ elements: ... }` envelope. */
function extractClassNames(input) {
  const store = ensureV2(input);
  const classNames = new Set();
  walk(store, ROOT, id => {
    const el = getById(store, id);
    if (!el) return;
    const cn = el.props?.className ?? el.className;
    if (cn && typeof cn === "string") {
      for (const cls of cn.split(/\s+/)) if (cls) classNames.add(cls);
    }
    const scn = el.styles?.className;
    if (scn && typeof scn === "string") {
      for (const cls of scn.split(/\s+/)) if (cls) classNames.add(cls);
    }
  });
  return classNames;
}

export { extractClassNames };
