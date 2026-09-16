/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/compositionFiles.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var COMPOSITION_FILE_RE = /\.compositions\.(tsx|ts|jsx|js)$/;
function isCompositionFile(path) {
  return COMPOSITION_FILE_RE.test(path);
}
/** `button.tsx` → `button.compositions.tsx` */
function getCompositionPathForBase(basePath) {
  return basePath.replace(/\.(tsx|ts|jsx|js)$/, ".compositions.$1");
}
/** `CardDefault` → `Card Default` */
function exportNameToDisplayName(exportName) {
  return exportName.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}
function buildCompositionTemplates(exportNames) {
  return exportNames.map(exportName => ({
    exportName,
    name: exportNameToDisplayName(exportName)
  }));
}

export { buildCompositionTemplates, getCompositionPathForBase, isCompositionFile };
