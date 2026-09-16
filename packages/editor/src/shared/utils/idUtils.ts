/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/idUtils.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { nanoid } from "nanoid";

/**
* Generate an ID with a prefix (e.g., "element-", "component-")
* Used for local canvas element IDs, NOT for database entity IDs.
*/
function generatePrefixedId(prefix) {
  return `${prefix}-${nanoid()}`;
}

export { generatePrefixedId };
