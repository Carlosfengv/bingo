/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/parseComposition.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { isLikelyIconLibraryPackage, normalizeIconLibrarySpecifier } from "../runtime/settingsParser";
import { storeSubtreeToLegacyNested } from "../store/legacy";
import { getRootIds } from "../store/read";
import { parseJSX } from "./parseJSX";
import * as import_lib from "@babel/parser";
import traverse from "@babel/traverse";
import * as import_lib$3 from "@babel/types";

var DEFAULT_MOCK_ICON = () => null;
function isIconImportSource(source) {
  if (source === "lucide-react") return true;
  if (source === "@phosphor-icons/react") return true;
  if (source.startsWith("@heroicons/react")) return true;
  if (source === "@tabler/icons-react") return true;
  if (source.startsWith("react-icons/")) return true;
  if (source.startsWith("@mui/icons-material")) return true;
  return isLikelyIconLibraryPackage(normalizeIconLibrarySpecifier(source));
}
function getImportedBindings(specifiers) {
  const bindings = [];
  for (const specifier of specifiers) {
    if (import_lib$3.isImportSpecifier(specifier)) {
      const imported = import_lib$3.isIdentifier(specifier.imported) ? specifier.imported.name : import_lib$3.isStringLiteral(specifier.imported) ? specifier.imported.value : null;
      if (imported && import_lib$3.isIdentifier(specifier.local)) bindings.push({
        localName: specifier.local.name,
        importedName: imported
      });
      continue;
    }
    if (import_lib$3.isImportDefaultSpecifier(specifier) && import_lib$3.isIdentifier(specifier.local)) bindings.push({
      localName: specifier.local.name,
      importedName: specifier.local.name
    });
  }
  return bindings;
}
function importPathToComponentPath(source) {
  return source.replace(/^\@\//, "").replace(/\.tsx?$/, "");
}
/**
* Build parseJSX context from a composition file's imports.
* Used when a full project componentIndex is unavailable (CLI scripts).
*/
function buildParseContextFromImports(source, options) {
  const mockIcon = options?.mockIcon ?? DEFAULT_MOCK_ICON;
  const iconLibraries = {};
  const componentIndex = {};
  let ast;
  try {
    ast = (0, import_lib.parse)(source, {
      sourceType: "module",
      plugins: ["jsx", "typescript"]
    });
  } catch {
    return {
      iconLibraries,
      componentIndex
    };
  }
  traverse(ast, {
    ImportDeclaration(path) {
      const sourceValue = path.node.source.value;
      const importedBindings = getImportedBindings(path.node.specifiers);
      if (isIconImportSource(sourceValue)) {
        const libraryKey = normalizeIconLibrarySpecifier(sourceValue);
        if (!iconLibraries[libraryKey]) iconLibraries[libraryKey] = {
          icons: {},
          iconAliases: {}
        };
        for (const {
          localName,
          importedName
        } of importedBindings) {
          if (!/^[A-Z]/.test(localName)) continue;
          iconLibraries[libraryKey].icons[localName] = mockIcon;
          if (localName !== importedName) iconLibraries[libraryKey].iconAliases[localName] = importedName;
        }
        return;
      }
      const componentPath = importPathToComponentPath(sourceValue);
      for (const {
        localName,
        importedName
      } of importedBindings) {
        if (!/^[A-Z]/.test(localName)) continue;
        componentIndex[localName] = {
          path: componentPath,
          exportName: importedName
        };
      }
    }
  });
  return {
    iconLibraries,
    componentIndex
  };
}
/**
* Parse one composition JSX snippet the same way AssetsPanel drag / paste does.
*/
function parseCompositionJsx(jsx, iconLibraries, componentIndex, options) {
  const forceNewIds = options?.forceNewIds ?? true;
  const originalConsoleError = console.error;
  if (options?.suppressParseErrors) console.error = () => {};
  try {
    return parseJSX(jsx, iconLibraries, componentIndex, void 0, {
      forceNewIds
    });
  } finally {
    if (options?.suppressParseErrors) console.error = originalConsoleError;
  }
}
/**
* Parse composition JSX into nested legacy roots — matches BingoEditor paste:
* parseJSX → getRootIds → storeSubtreeToLegacyNested per root.
*/
function parseCompositionJsxToNestedRoots(jsx, iconLibraries, componentIndex, options) {
  const store = parseCompositionJsx(jsx, iconLibraries, componentIndex, options);
  return getRootIds(store).map(id => storeSubtreeToLegacyNested(store, id));
}

export { buildParseContextFromImports, parseCompositionJsx, parseCompositionJsxToNestedRoots };
