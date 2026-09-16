function operationAction(toolName) {
  const name = String(toolName ?? "").toLocaleLowerCase();
  if (/verify|test|check/.test(name)) return "verify";
  if (/write|edit|insert|add|delete|update|copy|create|set/.test(name)) return "write";
  if (/read|list|search|get|glob|grep|screenshot/.test(name)) return "read";
  return "other";
}

function operationTargets(event) {
  const args = event?.args ?? event?.input ?? {};
  return [...new Set([args.file_path, args.path, args.element_id, args.parent_id, ...(Array.isArray(event?.createdElementIds) ? event.createdElementIds : [])].filter(value => typeof value === "string" && value).map(value => value.slice(0, 500)))];
}

function createOperationFactAccumulator(runId) {
  const facts = [];
  const byId = new Map();
  const record = input => {
    const id = String(input.id || `unknown:${facts.length}`);
    const candidate = {
      id,
      runId,
      source: input.source === "bingo-mcp" ? "bingo-mcp" : "agent-native",
      toolName: String(input.toolName || "tool").slice(0, 500),
      outcome: ["succeeded", "failed"].includes(input.outcome) ? input.outcome : "unknown",
      action: operationAction(input.toolName),
      targets: operationTargets(input),
      resultText: String(input.resultText || "Outcome unavailable.").slice(0, 2_000)
    };
    const existingIndex = byId.get(id);
    if (existingIndex === void 0) {
      byId.set(id, facts.length);
      facts.push(candidate);
      return candidate;
    }
    const existing = facts[existingIndex];
    if (existing.outcome === "unknown" && candidate.outcome !== "unknown" || existing.source !== "bingo-mcp" && candidate.source === "bingo-mcp") {
      facts[existingIndex] = candidate;
      return candidate;
    }
    return existing;
  };
  return { facts, record };
}

export { createOperationFactAccumulator, operationAction, operationTargets };
