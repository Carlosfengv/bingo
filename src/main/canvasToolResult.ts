/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: src/main/canvasToolResult.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/** Creation results list new IDs on their own lines; preserve them for chat navigation. */
function getCreatedCanvasElementIds(toolName, result) {
  if (toolName !== "canvas_add" && toolName !== "canvas_insert" || result?.isError) return void 0;
  const structured = result?.structuredContent?.operation?.createdElementIds;
  if (Array.isArray(structured) && structured.every(id => typeof id === "string" && id.startsWith("el-"))) return [...new Set(structured)];
  const ids = [...(result?.content ?? []).filter(block => block.type === "text").map(block => block.text ?? "").join("\n").matchAll(/^- (el-[^\s]+)\s*$/gm)].map(match => match[1]);
  return ids.length > 0 ? [...new Set(ids)] : void 0;
}
function getCanvasRecoveryReport(result) {
  const report = result?.structuredContent?.recovery;
  if (!report || typeof report !== "object" || report.schemaVersion !== 1) return void 0;
  if (!["unchanged", "recovered", "failed"].includes(report.status)) return void 0;
  if (!["parse", "validate", "commit"].includes(report.stage)) return void 0;
  if (!Array.isArray(report.attempts) || report.attempts.length > 20) return void 0;
  for (const attempt of report.attempts) {
    if (!attempt || typeof attempt !== "object") return void 0;
    if (typeof attempt.ruleId !== "string" || attempt.ruleId.length > 120) return void 0;
    if (!Number.isInteger(attempt.ruleVersion) || attempt.ruleVersion < 1) return void 0;
    if (!["recovered", "failed", "skipped"].includes(attempt.outcome)) return void 0;
    if (typeof attempt.summary !== "string" || attempt.summary.length > 1000) return void 0;
    if (!Number.isFinite(attempt.durationMs) || attempt.durationMs < 0) return void 0;
  }
  try {
    if (JSON.stringify(report).length > 16_000) return void 0;
  } catch {
    return void 0;
  }
  return report;
}

export { getCanvasRecoveryReport, getCreatedCanvasElementIds };
