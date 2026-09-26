import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { transform } from "esbuild";
import { componentImportAtCallsite, componentSourceChanges, editComponentCallsite } from "../../packages/compiler/src/codegen/componentSourceEdit";
import { canResetComponentProp, componentClassSupport, componentIdentityMatches, componentPropControl, componentStyleSupport, componentStyleOverrides, componentStyleTarget, isPublicComponentProp, validateComponentProp } from "../../packages/compiler/src/store/componentEditing";
import { extractComponentMetadata } from "./componentPropMetadata";
import { componentIndexFor, resolveProjectComponentImport } from "./localCompiler";
import { readProjectFile, writeProjectFile } from "./localStore";

const hash = (source: string) => crypto.createHash("sha256").update(source).digest("hex");
const fail = (code: string, message: string): never => { throw Object.assign(new Error(message), { code }); };

export function prepareComponentInstanceSourceEdit(source: string, element: any, info: any) {
  const binding = element?.componentEditing?.sourceBinding;
  if (element?.type !== "component" || binding?.schemaVersion !== 1 || binding.tag !== element.componentName) fail("SOURCE_UNBOUND", "This instance has no verified source call.");
  if (!componentIdentityMatches(element, info)) fail("SOURCE_COMPONENT_CHANGED", "The component identity changed. Review its source before saving this instance.");
  if (hash(source) !== binding.sourceHash) throw Object.assign(new Error("The source file changed. Review the current source before saving this instance."), { code: "SOURCE_CONFLICT", expected: binding.openingSource, actual: source.slice(binding.start, binding.end) });
  const changes = componentSourceChanges(binding, element);
  if (componentStyleOverrides(element, info).some(entry => !entry.active && element.componentEditing?.styleRecords?.[entry.property]?.rootTag)) fail("UNSUPPORTED_STYLE", "Remove incompatible style overrides before saving this instance.");
  for (const name of [...Object.keys(changes.props.set), ...changes.props.remove]) {
    if (name === "className" && componentClassSupport(element, info) && (changes.props.remove.includes(name) || typeof changes.props.set[name] === "string")) continue;
    const descriptor = info?.props?.[name];
    if (!isPublicComponentProp(name) || !descriptor) fail("INVALID_PARAMETER", `The current component API does not describe ${name}.`);
    if (componentPropControl(descriptor).kind === "readonly" || (changes.props.remove.includes(name) ? !canResetComponentProp(descriptor) : !validateComponentProp(descriptor, changes.props.set[name]))) fail("INVALID_PARAMETER", `The current component API does not allow this value for ${name}.`);
  }
  const styleNames = [...Object.keys(changes.styles.set), ...changes.styles.remove];
  if (Object.keys(changes.styles.set).length && !componentStyleSupport(element, info)) fail("UNSUPPORTED_STYLE", "The component does not expose a verified root style interface.");
  if (styleNames.some(name => componentStyleTarget(binding.baseStyles, name) === "outer" || componentStyleTarget(element.styles, name) === "outer")) fail("UNSUPPORTED_LAYOUT", "An outer container change needs a layout source edit; it cannot be written onto the component root.");
  const result = editComponentCallsite(source, binding, changes);
  return {
    code: result.source,
    filePath: binding.filePath,
    previousHash: binding.sourceHash,
    oldEnd: binding.end,
    delta: result.source.length - source.length,
    sourceBinding: { ...binding, ...result.locator, sourceHash: hash(result.source), baseProps: structuredClone(element.props ?? {}), baseStyles: structuredClone(element.styles ?? {}) },
  };
}

export async function saveComponentInstanceLocally(projectId: string, element: any) {
  const filePath = element?.componentEditing?.sourceBinding?.filePath;
  if (typeof filePath !== "string" || !/\.[jt]sx?$/.test(filePath)) fail("SOURCE_UNBOUND", "A source file is required.");
  const source = readProjectFile(projectId, filePath);
  if (source === null) fail("SOURCE_UNAVAILABLE", "The component source file cannot be read.");
  const indexed = componentIndexFor(projectId)[element.componentName];
  const definition = indexed?.path ? readProjectFile(projectId, indexed.path) : null;
  const metadata = definition === null ? undefined : extractComponentMetadata(definition)[indexed.exportName || element.componentName];
  if (!metadata) fail("SOURCE_COMPONENT_CHANGED", "The current component definition could not be verified.");
  const info = { ...indexed, ...metadata };
  const prepared = prepareComponentInstanceSourceEdit(source, element, info);
  const imported = componentImportAtCallsite(source, element.componentEditing.sourceBinding);
  const resolved = imported ? resolveProjectComponentImport(projectId, filePath, imported.source) : null;
  const expected = info?.path ? fs.realpathSync(path.resolve(projectId, info.path)) : null;
  if (!resolved || resolved !== expected || imported?.name !== (info.exportName || element.componentName)) fail("SOURCE_COMPONENT_CHANGED", "The binding at this source call does not match the component definition. Open the call in source to review it.");
  await transform(prepared.code, { loader: filePath.endsWith(".jsx") || filePath.endsWith(".js") ? "jsx" : "tsx", format: "esm" });
  if (readProjectFile(projectId, info.path) !== definition) fail("SOURCE_COMPONENT_CHANGED", "The component API changed during saving. Try again with its current parameters.");
  if (resolveProjectComponentImport(projectId, filePath, imported!.source) !== resolved) fail("SOURCE_COMPONENT_CHANGED", "The component import resolution changed during saving. Review the project aliases before retrying.");
  // Recheck after asynchronous validation, inside the synchronous write path.
  writeProjectFile(projectId, filePath, prepared.code, { expectedHash: prepared.previousHash });
  return { success: true, elementId: element.id, ...prepared };
}
