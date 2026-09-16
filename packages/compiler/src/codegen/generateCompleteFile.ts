/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/generateCompleteFile.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { extractComponentDependencies, extractIconDependencies } from "./extractDependencies";
import { generateIconImports, generateImports } from "./generateImports";
import { generateJSX } from "./generateJSX";
import * as import_lib$1 from "@babel/generator";
import * as import_lib$2 from "@babel/traverse";

/**
* Generate a complete TypeScript/React component file
*/
function generateCompleteFile(options) {
  const {
    componentName,
    store,
    componentIndex,
    targetFilePath,
    includeReactImport = false,
    includeDataElementId = false,
    assetResolver
  } = options;
  const parts = [];
  const componentDeps = extractComponentDependencies(store);
  const iconDeps = extractIconDependencies(store);
  const componentImports = generateImports(componentDeps, componentIndex, targetFilePath);
  const iconImports = generateIconImports(iconDeps);
  if (includeReactImport) parts.push("import React from 'react'");
  if (iconImports.length > 0) parts.push(...iconImports);
  if (componentImports.length > 0) parts.push(...componentImports);
  if (parts.length > 0) parts.push("");
  parts.push(`export function ${componentName}() {`);
  parts.push("  return (");
  const jsx = generateJSX(store, 2, {
    includeDataElementId,
    assetResolver
  });
  parts.push(jsx);
  parts.push("  )");
  parts.push("}");
  return parts.join("\n");
}
import_lib$2.default.default || import_lib$2.default;
import_lib$1.default.default || import_lib$1.default;

export { generateCompleteFile };
