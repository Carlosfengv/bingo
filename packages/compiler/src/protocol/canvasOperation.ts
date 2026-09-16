/* Shared, dependency-free wire vocabulary for canvas operation coordination. */
const CANVAS_OPERATION_PROTOCOL_VERSION = 1;
const CANVAS_EXECUTION_STATES = ["queued", "preparing", "ready", "committed", "rejected", "cancelled", "orphaned"];
const CANVAS_OBSERVATION_STATES = ["waiting", "unconfirmed", "confirmed"];
const CANVAS_PERSISTENCE_STATES = ["pending", "saved", "failed"];
const CANVAS_OPERATION_ERROR_CODES = {
  RESULT_UNCONFIRMED: "CANVAS_RESULT_UNCONFIRMED",
  REVISION_CONFLICT: "CANVAS_REVISION_CONFLICT",
  IDEMPOTENCY_CONFLICT: "CANVAS_IDEMPOTENCY_CONFLICT",
  UNKNOWN: "CANVAS_OPERATION_UNKNOWN"
};

function isCanvasOperationStatus(value) {
  if (!value || typeof value !== "object") return false;
  if (value.protocolVersion !== CANVAS_OPERATION_PROTOCOL_VERSION) return false;
  if (typeof value.operationId !== "string" || !value.operationId) return false;
  if (!CANVAS_EXECUTION_STATES.includes(value.state)) return false;
  if (!CANVAS_OBSERVATION_STATES.includes(value.observation)) return false;
  if (![true, false, null].includes(value.applied)) return false;
  return true;
}

export { CANVAS_EXECUTION_STATES, CANVAS_OBSERVATION_STATES, CANVAS_OPERATION_ERROR_CODES, CANVAS_OPERATION_PROTOCOL_VERSION, CANVAS_PERSISTENCE_STATES, isCanvasOperationStatus };
