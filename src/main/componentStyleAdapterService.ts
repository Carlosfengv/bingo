import crypto from "node:crypto";
import { transform } from "esbuild";
import { componentIndexFor, notifyLocalSourceWrite } from "./localCompiler";
import { readProjectFile, writeProjectFile } from "./localStore";
import { extractComponentMetadata } from "./componentPropMetadata";
import { proposeComponentStyleAdapter, proposeComponentThemeAdapter } from "./componentStyleAdapter";

/** Separate, explicit definition edit. Never called by an instance parameter save. */
export async function componentStyleAdapterLocally(projectId: string, componentName: string, reviewed?: { sourceHash: string; filePath: string; exportName: string; kind?: string }, kind = "style") {
  if (!["style", "theme"].includes(kind) || reviewed && (reviewed.kind ?? "style") !== kind) throw new Error("Review the requested adaptation before applying it.");
  const indexed = componentIndexFor(projectId)[componentName];
  if (!indexed?.path) throw new Error("The component definition is unavailable.");
  const exportName = indexed.exportName || componentName;
  if (reviewed && (reviewed.filePath !== indexed.path || reviewed.exportName !== exportName)) throw new Error("The component source identity changed. Review a new proposal before applying it.");
  const source = readProjectFile(projectId, indexed.path);
  if (source === null) throw new Error("The component definition cannot be read.");
  const hash = crypto.createHash("sha256").update(source).digest("hex");
  if (reviewed && reviewed.sourceHash !== hash) throw new Error("The component definition changed. Review a new proposal before applying it.");
  const metadata = extractComponentMetadata(source)[exportName];
  const editing = metadata?.editing;
  if (editing?.rootStyle !== "supported" || editing[kind === "theme" ? "themeVariables" : "styleNormalization"] !== "available" || !editing.rootStyleExpression) throw new Error("This component has no verified root style expression that can be adapted.");
  const propose = kind === "theme" ? proposeComponentThemeAdapter : proposeComponentStyleAdapter;
  const proposal = propose(source, editing.rootStyleExpression, /\.tsx?$/.test(indexed.path));
  if (extractComponentMetadata(proposal.code)[exportName]?.editing?.[kind === "theme" ? "themeVariables" : "styleNormalization"] !== "applied") throw new Error("The proposed adapter does not preserve the verified component contract. The original source is unchanged.");
  await transform(proposal.code, { loader: /\.tsx?$/.test(indexed.path) ? "tsx" : "jsx", format: "esm" });
  if (reviewed) {
    writeProjectFile(projectId, indexed.path, proposal.code, { expectedHash: reviewed.sourceHash });
    notifyLocalSourceWrite(projectId, indexed.path);
  }
  return { success: true, kind, applied: !!reviewed, filePath: indexed.path, exportName, sourceHash: hash, ...proposal };
}
