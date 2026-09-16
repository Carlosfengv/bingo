/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/generateImports.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_lib$2 from "@babel/traverse";

/**
* Calculate relative import path from source file to target file
* Example: from '.bingo/canvases/canvas-1/components/Foo.tsx' to 'components/ui/text.tsx'
* Returns: '../../../../components/ui/text'
*/
function calculateRelativePath(fromFile, toFile) {
  if (toFile.startsWith("/") && !fromFile.startsWith("/")) {
    const toParts = toFile.split("/").filter(Boolean);
    const projectDirs = new Set(["components", "src", "lib", "app", "pages", ".bingo", "packages"]);
    for (let i = toParts.length - 1; i >= 0; i--) if (projectDirs.has(toParts[i])) return calculateRelativePath(fromFile, toParts.slice(i).join("/"));
    return calculateRelativePath(fromFile, toParts.slice(-3).join("/"));
  }
  const fromParts = fromFile.split("/").slice(0, -1);
  const toParts = toFile.split("/");
  let commonLength = 0;
  const minLength = Math.min(fromParts.length, toParts.length);
  for (let i = 0; i < minLength; i++) if (fromParts[i] === toParts[i]) commonLength++;else break;
  const upLevels = fromParts.length - commonLength;
  const relativeParts = toParts.slice(commonLength);
  const relPath = "../".repeat(upLevels) + relativeParts.join("/");
  return relPath.startsWith(".") ? relPath : "./" + relPath;
}
/**
* Generate import statements from component dependencies
*
* @param componentNames - Set of component names used in the JSX
* @param componentIndex - ComponentIndex.json mapping
* @param targetFilePath - Path of the file being generated (for relative imports)
* @returns Array of import statements
*/
function generateImports(componentNames, componentIndex, targetFilePath) {
  const imports = [];
  const importsByPath = new Map();
  for (const componentName of componentNames) {
    const entry = componentIndex[componentName];
    if (!entry) {
      console.warn(`Component "${componentName}" not found in ComponentIndex`);
      continue;
    }
    const {
      path,
      exportName
    } = entry;
    if (!importsByPath.has(path)) importsByPath.set(path, new Set());
    importsByPath.get(path).add(exportName);
  }
  for (const [path, exportNames] of importsByPath) {
    const importPath = path.replace(/\.tsx?$/, "");
    const namedImports = Array.from(exportNames).sort().join(", ");
    let finalPath;
    if (targetFilePath) finalPath = calculateRelativePath(targetFilePath, importPath);else if (importPath.startsWith("@/")) finalPath = importPath;else if (importPath.startsWith("/")) {
      const parts = importPath.split("/").filter(Boolean);
      const projectDirs = new Set(["components", "src", "lib", "app", "pages", ".bingo", "packages"]);
      let relativePath = importPath;
      for (let i = parts.length - 1; i >= 0; i--) if (projectDirs.has(parts[i])) {
        relativePath = parts.slice(i).join("/");
        break;
      }
      finalPath = `@/${relativePath}`;
    } else finalPath = `@/${importPath}`;
    imports.push(`import { ${namedImports} } from '${finalPath}'`);
  }
  return imports.sort();
}
/**
* Generate import statements for icons grouped by library
*
* @param iconsByLibrary - Map of library name -> Set of icon names
* @returns Array of import statements
*/
function generateIconImports(iconsByLibrary) {
  const imports = [];
  for (const [library, iconNames] of iconsByLibrary) {
    if (library === "@hugeicons/core-free-icons") {
      const sortedNames = Array.from(iconNames).map(name => name.endsWith("Icon") ? name : `${name}Icon`).sort().join(", ");
      imports.push(`import { ${sortedNames} } from '${library}'`);
      imports.push("import { HugeiconsIcon } from '@hugeicons/react'");
    } else {
      const sortedNames = Array.from(iconNames).sort().join(", ");
      imports.push(`import { ${sortedNames} } from '${library}'`);
    }
  }
  return imports.sort();
}
import_lib$2.default.default || import_lib$2.default;
/**
* Get component import mappings (for use in prompts/hints)
* Returns array of { component, importPath } objects
*
* @param preferAlias - when true (recommended for save-to-code), always emit
*   `@/…` paths. Relative paths like `../actions/copy-button` are how Claude
*   invents broken imports that miss the canvas module registry.
*/
function getComponentImportMappings(componentNames, componentIndex, targetFilePath, options) {
  const mappings = [];
  const seen = new Set();
  const preferAlias = options?.preferAlias !== false;
  for (const componentName of componentNames) {
    const entry = resolveIndexEntry(componentIndex, componentName);
    if (!entry) {
      console.warn(`Component "${componentName}" not found in ComponentIndex`);
      continue;
    }
    const {
      path,
      exportName
    } = entry;
    if (seen.has(exportName)) continue;
    seen.add(exportName);
    const importPathNoExt = path.replace(/\.tsx?$/, "");
    let finalPath;
    if (preferAlias || !targetFilePath) finalPath = toAliasImportPath(importPathNoExt);else finalPath = calculateRelativePath(targetFilePath, importPathNoExt);
    mappings.push({
      component: exportName,
      importPath: finalPath
    });
  }
  return mappings;
}
/** Stable `@/` import path matching canvas LOCAL_MODULES alias keys. */
function toAliasImportPath(importPathNoExt) {
  if (importPathNoExt.startsWith("@/")) return importPathNoExt;
  let p = importPathNoExt.replace(/^\/+/, "");
  if (p.startsWith("src/")) p = p.slice(4);
  return `@/${p}`;
}
/** Resolve bare or path-qualified component names against the index. */
function resolveIndexEntry(componentIndex, componentName) {
  const exact = componentIndex[componentName];
  if (exact) return exact;
  const matches = Object.entries(componentIndex).filter(([key, entry]) => {
    return (key.includes("::") ? key.slice(0, key.indexOf("::")) : key) === componentName || entry.exportName === componentName;
  });
  if (matches.length === 1) return matches[0][1];
  const byExport = matches.filter(([, e]) => e.exportName === componentName);
  if (byExport.length === 1) return byExport[0][1];
  if (byExport.length > 1) {
    const underComponents = byExport.find(([, e]) => /(?:^|\/)components\//.test(e.path.replace(/\\/g, "/")));
    if (underComponents) return underComponents[1];
  }
  if (matches.length > 1) {
    const underComponents = matches.find(([, e]) => /(?:^|\/)components\//.test(e.path.replace(/\\/g, "/")));
    if (underComponents) return underComponents[1];
  }
  return null;
}

export { generateIconImports, generateImports, getComponentImportMappings };
