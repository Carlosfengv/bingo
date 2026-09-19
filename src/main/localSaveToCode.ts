/*
 * Save-to-code, local.
 *
 * Added on top of the recovered tree. The shipped `save_file` handler in
 * src/main/index.ts does four things over HTTP: read the file, fetch the
 * project's scan result for the component index, validate that the merged code
 * compiles, and write the file back. All four have local equivalents, so in
 * local mode the handler delegates here instead.
 *
 * The merge keeps the compiler's validation loop, but its model call can be
 * supplied by any selected local coding-agent adapter.
 */

import {
  MergeValidationError,
  ensureV2,
  extractComponentDependencies,
  generateJSX,
  getComponentImportMappings,
  mergeWithClaude,
  repairComponentImports,
  repairStripMarkdownCodeFences,
  resolveSaveToCodeAiFromEnv,
  resolveUpdatedInstanceProps,
  validateHasEsmExports,
  validateJsxComponentsResolved,
  validateLooksLikeSourceModule,
  validateNotEmpty,
  validateParsesAsTsx,
} from "@bingo/compiler";
import { transform } from "esbuild";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";

import { componentIndexFor } from "./localCompiler";
import { invokeLocalStore, readProjectFile, writeProjectFile } from "./localStore";
import { AGENT_INFO, getAgentStatus, runAgent } from "./agentRuntime";
import { getLocalAgents } from "./aiConfig";
import { createIncident, recordDiagnosticEvent } from "./diagnosticsStore";

function flattenAgentMessages(messages) {
  return messages.map(message => `${message.role.toUpperCase()}:\n${message.content}`).join("\n\n");
}

function createAgentMergeExecutor(agent, model) {
  const execute = async messages => {
    let output = "";
    await runAgent({
      agent,
      prompt: flattenAgentMessages(messages),
      model,
      workDir: os.tmpdir(),
      autoApprove: false,
      emit(event) {
        if (event.type === "text") output += event.content;
      },
      onSpawn() {}
    });
    if (!output.trim()) throw new Error(`${AGENT_INFO[agent].name} returned no code`);
    return output;
  };
  execute.label = `${AGENT_INFO[agent].name} CLI`;
  return execute;
}

/** Compile-check the merged code the way the server's validate-compile did. */
async function validateCompiles(code) {
  try {
    await transform(code, { loader: "tsx", format: "esm" });
    return { ok: true };
  } catch (error) {
    const message = error?.errors?.length
      ? error.errors.map((e) => e.text).join("; ")
      : String(error?.message || error);
    return { ok: false, message: `Compile validation failed: ${message}` };
  }
}

/**
 * Turn a bare CLI failure into something actionable.
 *
 * `executeClaude` reports stderr, but the CLI writes authentication failures to
 * stdout, so the user otherwise sees "exited with code 1: " and nothing else.
 */
function describeFailure(error) {
  const message = String(error?.message || error);
  if (/exited with code \d+:?\s*$/.test(message)) {
    return (
      `${message} The Claude CLI produced no error output. Run ` +
      "`echo hi | claude -p` in a terminal to check that it is authenticated."
    );
  }
  return message;
}

/**
 * Write a canvas edit back into its source file.
 *
 * Mirrors the cloud handler's shape -- same option names, same return value --
 * so the renderer cannot tell the two apart.
 */
async function saveFileLocally(projectId, options) {
  const {
    filePath,
    elements,
    stateContext,
    internalComponent,
    userInstructions,
    suggestInstanceProps,
    componentIndex,
  } = options || {};
  const operationId = `op_${crypto.randomUUID()}`;
  const startedAt = Date.now();
  const context = { filePath, elementCount: Array.isArray(elements) ? elements.length : null };
  void recordDiagnosticEvent({ projectId, operationId, source: "save-to-code", eventName: "save.started", payload: context });
  const failure = async (error, extra = {}) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    void recordDiagnosticEvent({ projectId, operationId, level: "error", source: "save-to-code", eventName: "save.failed", durationMs: Date.now() - startedAt, payload: { ...context, ...extra, error: normalized } });
    const report = await createIncident({ projectId, operationId, kind: "error", category: "save-to-code", severity: "error", summary: normalized.message, error: normalized, context: { ...context, ...extra } });
    return { report, message: `${normalized.message} (Error ID: ${report.incidentId})` };
  };

  // The cloud default is "api". Local mode delegates to the coding agent
  // selected in Settings.
  const ai = resolveSaveToCodeAiFromEnv(process.env, { defaultMode: "cli" });
  const catalog = ai.mode === "cli" ? await getLocalAgents() : null;
  const selectedAgent = catalog?.selectedAgent ?? "claude";
  const selectedModel = undefined;
  const executeOverride = ai.mode === "cli" && selectedAgent !== "claude"
    ? createAgentMergeExecutor(selectedAgent, selectedModel)
    : undefined;

  const agentStatus = ai.mode === "cli" ? await getAgentStatus(selectedAgent) : null;
  if (agentStatus && (!agentStatus.installed || !agentStatus.loggedIn)) {
    const message = agentStatus.installed
      ? `${agentStatus.displayName} must be authenticated before saving. Run: ${agentStatus.loginCommand}`
      : `${agentStatus.displayName} is required for saving. ${agentStatus.installCommand}`;
    const failed = await failure(message, { stage: "agent-readiness", agent: selectedAgent });
    return {
      success: false,
      error: failed.message,
      incidentId: failed.report.incidentId,
    };
  }

  const originalCode = readProjectFile(projectId, filePath);
  if (originalCode == null) {
    const failed = await failure(`File not found: ${filePath}`, { stage: "read-source" });
    return { success: false, error: failed.message, incidentId: failed.report.incidentId };
  }

  const store = ensureV2(elements);
  const originalHash = crypto.createHash("sha256").update(originalCode).digest("hex");
  let generatedJSX;
  try {
    const variables = await invokeLocalStore({ op: "read-variable-library", root: projectId });
    generatedJSX = generateJSX(store, 0, { purpose: "project", variableLibrary: variables.library, variablePageModes: store.variableModes ?? variables.defaultModes });
  } catch (error) {
    const failed = await failure(error, { stage: "generate-source" });
    return { success: false, error: failed.message, incidentId: failed.report.incidentId };
  }

  const deps = extractComponentDependencies(store);
  if (internalComponent?.name) deps.delete(internalComponent.name);

  // The compiler's index is the local stand-in for the server's scanResult.
  // The renderer can briefly hold the previous snapshot while a rebuild is
  // being applied. Prefer the compiler-owned index so deleted or renamed
  // components cannot be mapped back through stale paths during that window.
  const index = { ...(componentIndex || {}), ...componentIndexFor(projectId) };

  const componentImports = getComponentImportMappings(deps, index, filePath, {
    preferAlias: true,
  });
  const importFinalizeOpts = {
    extraNames: deps,
    excludeNames: internalComponent?.name ? [internalComponent.name] : [],
  };

  let mergedCode;
  try {
    mergedCode = await mergeWithClaude({
    originalCode,
    generatedJSX,
    componentImports,
    stateContext,
    userInstructions,
    internalComponentName: internalComponent?.name,
    internalComponentRange: internalComponent
      ? { startLine: internalComponent.startLine, endLine: internalComponent.endLine }
      : undefined,
    mode: ai.mode,
    provider: ai.provider,
    apiKey: ai.apiKey,
    model: ai.mode === "api" ? ai.model : selectedModel,
    apiBaseUrl: ai.apiBaseUrl,
    apiTimeoutMs: ai.apiTimeoutMs,
    executeOverride,
    repair: (raw) => {
      const repaired = repairComponentImports(
        repairStripMarkdownCodeFences(raw),
        index,
        importFinalizeOpts
      );
      // Diagnostic: dump both the raw model output and the repaired code.
      // Raw output alone cannot distinguish a prompt problem from a repair bug.
      if (process.env.BINGO_SAVE_DEBUG) {
        try {
          fs.writeFileSync(
            process.env.BINGO_SAVE_DEBUG,
            `=== RAW (${raw.length} chars) ===\n${raw}\n\n=== REPAIRED (${repaired.length} chars) ===\n${repaired}\n`
          );
        } catch {}
      }
      return repaired;
    },
    validate: {
      validator: async (code) => {
        const notEmpty = validateNotEmpty(code);
        if (!notEmpty.ok) return notEmpty;
        const parses = validateParsesAsTsx(code);
        if (!parses.ok) {
          if (process.env.BINGO_SAVE_DEBUG) {
            try {
              fs.writeFileSync(
                `${process.env.BINGO_SAVE_DEBUG}.parsed`,
                `len=${code.length}\nhead=${JSON.stringify(code.slice(0, 120))}\ntail=${JSON.stringify(code.slice(-60))}\n\n${code}\n`
              );
            } catch {}
          }
          return parses;
        }
        const moduleShape = validateLooksLikeSourceModule(code);
        if (!moduleShape.ok) return moduleShape;
        const jsx = validateJsxComponentsResolved(code, {
          componentIndex: index,
          ...importFinalizeOpts,
        });
        if (!jsx.ok) return jsx;
        const hasExports = validateHasEsmExports(code);
        if (!hasExports.ok) return hasExports;
        return validateCompiles(code);
      },
    },
    });
  } catch (error) {
    const failed = await failure(describeFailure(error), { stage: "merge-and-validate" });
    throw new Error(failed.message);
  }

  // writeFile snapshots the previous contents first, so the editor's version
  // history keeps working. A trailing newline is restored because models
  // usually omit it, and its absence shows up as a spurious diff in the user's
  // repository.
  try {
    writeProjectFile(projectId, filePath, mergedCode.replace(/\s*$/, "\n"), { expectedHash: originalHash });
  } catch (error) {
    const failed = await failure(error, { stage: "write-source" });
    if (error?.code === "SOURCE_CONFLICT") {
      return {
        success: false,
        reason: "SOURCE_CONFLICT",
        error: failed.message,
        incidentId: failed.report.incidentId,
        filePath,
        candidateCode: mergedCode,
      };
    }
    throw new Error(failed.message);
  }
  console.log("[save-to-code] wrote", filePath);

  let updatedInstanceProps;
  try {
    updatedInstanceProps = await resolveUpdatedInstanceProps({
      originalCode,
      mergedCode,
      stateContext,
      userInstructions,
      suggestInstanceProps,
      mode: ai.mode,
      provider: ai.provider,
      apiKey: ai.apiKey,
      model: ai.mode === "api" ? ai.model : selectedModel,
      apiBaseUrl: ai.apiBaseUrl,
      apiTimeoutMs: ai.apiTimeoutMs,
      executeOverride,
    });
  } catch (error) {
    const failed = await failure(error, { stage: "resolve-instance-props", sourceAlreadyWritten: true });
    return {
      success: true,
      partial: true,
      warning: failed.message,
      incidentId: failed.report.incidentId,
      filePath,
      code: mergedCode,
    };
  }

  void recordDiagnosticEvent({ projectId, operationId, source: "save-to-code", eventName: "save.completed", durationMs: Date.now() - startedAt, payload: context });

  return {
    success: true,
    filePath,
    code: mergedCode,
    ...(updatedInstanceProps ? { instanceProps: updatedInstanceProps } : {}),
  };
}

export { createAgentMergeExecutor, saveFileLocally, MergeValidationError };
