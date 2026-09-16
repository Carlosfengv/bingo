/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/chatToolFailure.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

function toolFailureReport(result, chatId) {
  const payload = result.payload;
  const error = payload.error;
  const message = typeof error === "string" ? error : error && typeof error === "object" && "message" in error ? String(error.message) : error ? JSON.stringify(error, null, 2) : "The tool reported a failure without an error message.";
  const createdIds = result.type === "add_jsx" ? result.createdElementIds ?? (result.createdElementId ? [result.createdElementId] : []) : [];
  return [`Action: ${payload.toolName || result.type}`, payload.operationId && `Operation: ${payload.operationId}`, payload.path && `Path: ${payload.path}`, result.type !== "add_jsx" && payload.elementId && `Element: ${payload.elementId}`, createdIds.length > 0 && `Created Elements: ${createdIds.join(", ")}`, payload.parentElementId && `Parent Element: ${payload.parentElementId}`, payload.requestedCanvasId && `Requested Canvas: ${payload.requestedCanvasId}`, payload.canvasId && `Resolved Canvas: ${payload.canvasId}`, payload.applied !== void 0 && `Applied: ${payload.applied === null ? "unknown" : String(payload.applied)}`, payload.observation && `Observation: ${payload.observation}`, chatId && `Chat: ${chatId}`, `\nError:\n${message}`].filter(Boolean).join("\n");
}

export { toolFailureReport };
