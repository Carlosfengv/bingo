function normalizedCanvasEditText(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\bdata-element-id=/g, "id=")
    .replace(/\s+/g, " ")
    .trim();
}

function toolPayload(event: any) {
  return event?.payload && typeof event.payload === "object" ? event.payload : {};
}

function compatibleRetry(failed: any, candidate: any) {
  const failedPayload = toolPayload(failed);
  const candidatePayload = toolPayload(candidate);
  if (failedPayload.toolName !== candidatePayload.toolName) return false;
  if (failedPayload.toolName !== "canvas_edit") return false;
  const failedArgs = failedPayload.args ?? {};
  const candidateArgs = candidatePayload.args ?? {};
  if (!failedArgs.element_id || failedArgs.element_id !== candidateArgs.element_id) return false;
  const failedIntent = normalizedCanvasEditText(failedArgs.new_string);
  const candidateIntent = normalizedCanvasEditText(candidateArgs.new_string);
  return !!failedIntent && failedIntent === candidateIntent;
}

function findRecoveredToolAttempt(events: any[], operationId?: string | null) {
  if (!operationId) return null;
  const failed = events.find(event => event.operationId === operationId && event.eventName === "tool.failed");
  if (!failed) return null;
  const failedSequence = Number(failed.receivedSequence ?? 0);
  const successful = events.find(event =>
    event.eventName === "tool.completed" &&
    Number(event.receivedSequence ?? 0) > failedSequence &&
    Number(event.receivedSequence ?? 0) - failedSequence <= 100 &&
    event.projectKey === failed.projectKey &&
    (!failed.chatId || event.chatId === failed.chatId) &&
    (!failed.runId || event.runId === failed.runId) &&
    (!failed.timestamp || !event.timestamp || new Date(event.timestamp).getTime() - new Date(failed.timestamp).getTime() <= 5 * 60 * 1000) &&
    compatibleRetry(failed, event)
  );
  if (!successful) return null;
  return {
    outcome: "operation_recovered",
    failedOperationId: operationId,
    successfulOperationId: successful.operationId,
    successfulAt: successful.timestamp
  };
}

function selectIncidentEvents(events: any[], input: any, pKey: string | null, appSessionId: string) {
  const recovery = findRecoveredToolAttempt(events, input?.operationId);
  const operationIds = new Set([input?.operationId, recovery?.successfulOperationId].filter(Boolean));
  let selected;
  if (operationIds.size > 0) {
    selected = events.filter(event => operationIds.has(event.operationId));
  } else if (input?.runId) {
    selected = events.filter(event => event.runId === input.runId);
  } else if (pKey) {
    selected = events.filter(event => event.projectKey === pKey);
  } else {
    selected = events.filter(event => event.appSessionId === appSessionId);
  }
  return { events: selected, recovery };
}

export { findRecoveredToolAttempt, normalizedCanvasEditText, selectIncidentEvents };
