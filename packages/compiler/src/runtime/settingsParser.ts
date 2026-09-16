/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/settingsParser.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_lib$1 from "@babel/generator";

/**
* Bingo pre-bundles the default icon libraries in the editor
* runtime, so they are always available even if the project's package.json
* doesn't list them. `set_icon_library` (MCP) writes to DB settings, and we
* must honor that even on a project with no icon dep — otherwise the Icons
* tab silently disappears after import.
*/
var BUNDLED_ICON_LIBRARIES = new Set(["lucide-react", "@phosphor-icons/react", "@heroicons/react/24/outline", "@heroicons/react/24/solid", "@heroicons/react/20/solid"]);
function getIconLibraryDependencyName(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}
function normalizeIconLibrarySpecifier(specifier) {
  return specifier === "@heroicons/react" ? "@heroicons/react/24/outline" : specifier;
}
function isLoadableIconLibrary(library) {
  const segment = "[a-z0-9][a-z0-9._~-]*";
  return new RegExp(`^(@${segment}\\/${segment}|${segment})(\\/${segment})*$`).test(library);
}
function isLikelyIconLibraryPackage(name) {
  if (!isLoadableIconLibrary(name)) return false;
  if (BUNDLED_ICON_LIBRARIES.has(name)) return true;
  if (name === "@mui/icons-material" || name === "@tabler/icons-react" || name === "react-icons") return true;
  return /(?:^|[\/@_-])icons?(?:$|[\/_-])/.test(name);
}
import_lib$1.default.default || import_lib$1.default;

export { getIconLibraryDependencyName, isLikelyIconLibraryPackage, isLoadableIconLibrary, normalizeIconLibrarySpecifier };
