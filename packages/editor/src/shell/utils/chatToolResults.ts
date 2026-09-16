/** The main-process journal and older renderer transcripts use different result shapes. */
const badgeTypes = {
  project_write: "Write", project_write_batch: "Write", project_edit: "Edit", project_delete: "Delete",
  canvas_add: "add_jsx", canvas_insert: "add_jsx", canvas_update: "update_jsx", canvas_edit: "update_jsx",
  canvas_delete: "delete_element",
};
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const unavailable = (code, type = "unknown") => ({ type, payload: {}, recoveryIssue: code });

function invalidDisplayFields(result) {
  const payload = result.payload;
  return ["path", "elementId", "componentName"].some(key => payload[key] != null && typeof payload[key] !== "string")
    || (result.createdElementId != null && typeof result.createdElementId !== "string")
    || (result.createdElementIds != null && (!Array.isArray(result.createdElementIds) || result.createdElementIds.some(id => typeof id !== "string")))
    || (payload.success != null && typeof payload.success !== "boolean");
}

export function normalizeToolResult(result) {
  if (!record(result) || typeof result.type !== "string") return unavailable("CHAT_TOOL_RESULT_INVALID");
  if (result.recoveryIssue) return result;
  if (record(result.payload)) {
    if (invalidDisplayFields(result)) return unavailable("CHAT_TOOL_DETAILS_INVALID", result.type);
    if (typeof result.payload.success !== "boolean" && !result.payload.error) return unavailable("CHAT_TOOL_OUTCOME_UNKNOWN", result.type);
    return result;
  }
  const args = record(result.args) ? result.args : {};
  const operation = record(result.operation) ? result.operation : {};
  const success = typeof result.success === "boolean" ? result.success : typeof operation.applied === "boolean" ? operation.applied : undefined;
  if (success === undefined && !result.error) return unavailable("CHAT_TOOL_OUTCOME_UNKNOWN", result.type);
  const createdIds = (Array.isArray(operation.createdElementIds) ? operation.createdElementIds
    : Array.isArray(result.createdElementIds) ? result.createdElementIds : []).filter(id => typeof id === "string");
  const elementId = result.createdElementId || createdIds[0] || args.element_id;
  const normalized = {
    ...result,
    type: badgeTypes[result.type] || result.type,
    payload: {
      toolName: result.type, path: args.file_path || args.path || args.element_id,
      elementId, parentElementId: operation.parentElementId ?? args.parent_id,
      canvasId: operation.resolvedCanvasId ?? args.canvas_id,
      requestedCanvasId: operation.requestedCanvasId, operationId: operation.operationId,
      applied: operation.applied, observation: operation.observation,
      success, error: result.error,
    },
    createdElementId: elementId,
    createdElementIds: createdIds,
  };
  return invalidDisplayFields(normalized) ? unavailable("CHAT_TOOL_DETAILS_INVALID", result.type) : normalized;
}

/** Collapse implementation noise into one useful row per file or canvas action. */
export function getDisplayToolResults(input, getElement) {
  const results = input == null ? [] : Array.isArray(input) ? input.map(normalizeToolResult) : [unavailable("CHAT_TOOL_RESULTS_INVALID")];
  const fileResults = new Map();
  const canvasResults = new Map();
  const otherResults = new Map();
  const componentIdsByName = new Map();
  const pairedComponentIds = new Set();
  for (const result of results) {
    if (result.recoveryIssue) continue;
    const ids = [...(result.createdElementIds || []), ...(result.createdElementId ? [result.createdElementId] : [])];
    for (const id of ids) {
      const element = getElement(id);
      if (element?.type === "component") componentIdsByName.set(element.componentName, id);
      if (element?.type === "capture") componentIdsByName.set(element.original?.componentName, id);
    }
  }
  for (const result of results) {
    if (result.recoveryIssue) continue;
    const componentMatch = typeof result.payload?.path === "string" ? result.payload.path.match(/(?:^|\/)components?\/([^/]+?)\.(?:tsx|jsx|ts|js)$/i) : null;
    const componentId = componentMatch ? componentIdsByName.get(componentMatch[1]) : void 0;
    if (componentId) pairedComponentIds.add(componentId);
  }
  for (const result of results) {
    if (result.recoveryIssue) {
      otherResults.set(`unavailable:${otherResults.size}`, result);
      continue;
    }
    if (result.payload.error || result.payload.success === false) {
      otherResults.set(`failed:${otherResults.size}`, result);
      continue;
    }
    if (["Write", "Edit", "Delete", "Read"].includes(result.type)) {
      const key = result.payload?.path || `${result.type}:${fileResults.size}`;
      const componentName = (typeof result.payload?.path === "string" ? result.payload.path.match(/(?:^|\/)components?\/([^/]+?)\.(?:tsx|jsx|ts|js)$/i) : null)?.[1];
      const componentId = componentName ? componentIdsByName.get(componentName) : void 0;
      fileResults.set(key, componentName ? {
        ...result,
        payload: {
          ...result.payload,
          componentRegistered: true,
          componentName
        },
        createdElementId: componentId || result.createdElementId
      } : result);
      continue;
    }
    if (["add_jsx", "update_jsx", "delete_element", "replace_with_component"].includes(result.type)) {
      const resultIds = [...(result.createdElementIds || []), ...(result.createdElementId ? [result.createdElementId] : [])];
      const remainingIds = resultIds.filter(id => !pairedComponentIds.has(id));
      if (result.type === "add_jsx" && resultIds.length > 0 && remainingIds.length === 0) continue;
      const displayResult = remainingIds.length === resultIds.length ? result : {
        ...result,
        createdElementId: remainingIds[0],
        createdElementIds: remainingIds
      };
      const resultKey = `${displayResult.type}:${displayResult.payload.error || displayResult.payload.success === false ? "failed" : "success"}`;
      const previous = canvasResults.get(resultKey);
      if (!previous) {
        canvasResults.set(resultKey, {
          ...displayResult,
          payload: {
            ...displayResult.payload,
            actionCount: 1
          },
          createdElementIds: displayResult.createdElementIds ? [...displayResult.createdElementIds] : void 0
        });
        continue;
      }
      const ids = new Set([...(previous.createdElementIds || []), ...(previous.createdElementId ? [previous.createdElementId] : []), ...(displayResult.createdElementIds || []), ...(displayResult.createdElementId ? [displayResult.createdElementId] : [])]);
      canvasResults.set(resultKey, {
        ...previous,
        payload: {
          ...previous.payload,
          actionCount: (previous.payload?.actionCount || 1) + 1
        },
        createdElementIds: ids.size ? Array.from(ids) : void 0
      });
      continue;
    }
    const key = `${result.type}:${result.payload?.path || result.payload?.elementId || otherResults.size}`;
    otherResults.set(key, result);
  }
  return [...fileResults.values(), ...canvasResults.values(), ...otherResults.values()];
}
