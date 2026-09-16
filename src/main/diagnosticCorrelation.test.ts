import assert from "node:assert/strict";
import test from "node:test";

import { findRecoveredToolAttempt, selectIncidentEvents } from "./diagnosticCorrelation";

const failed = {
  eventId: "failed",
  eventName: "tool.failed",
  operationId: "op-failed",
  projectKey: "project",
  chatId: "chat",
  receivedSequence: 10,
  payload: {
    toolName: "canvas_edit",
    args: {
      element_id: "el-button",
      old_string: '<Button id="el-button" variant="secondary">',
      new_string: '<Button id="el-button" variant="primary">',
    },
  },
};

const recovered = {
  eventId: "recovered",
  eventName: "tool.completed",
  operationId: "op-recovered",
  projectKey: "project",
  chatId: "chat",
  receivedSequence: 12,
  timestamp: "2026-09-14T12:00:00.000Z",
  payload: {
    toolName: "canvas_edit",
    args: {
      element_id: "el-button",
      old_string: '<Button data-element-id="el-button" variant="secondary">',
      new_string: '<Button data-element-id="el-button" variant="primary">',
    },
  },
};

test("diagnostics correlate a successful canonical retry with the failed edit", () => {
  assert.deepEqual(findRecoveredToolAttempt([failed, recovered], "op-failed"), {
    outcome: "operation_recovered",
    failedOperationId: "op-failed",
    successfulOperationId: "op-recovered",
    successfulAt: "2026-09-14T12:00:00.000Z",
  });
});

test("operation-scoped incidents exclude unrelated project noise but include recovery", () => {
  const noise = {
    eventId: "noise",
    eventName: "renderer.console",
    operationId: null,
    projectKey: "project",
    appSessionId: "app",
    receivedSequence: 11,
  };
  const selected = selectIncidentEvents([failed, noise, recovered], { operationId: "op-failed", runId: "run" }, "project", "app");

  assert.deepEqual(selected.events.map(event => event.eventId), ["failed", "recovered"]);
  assert.equal(selected.recovery?.successfulOperationId, "op-recovered");
});

test("different edit intent is not marked recovered", () => {
  const other = {
    ...recovered,
    payload: {
      ...recovered.payload,
      args: { ...recovered.payload.args, new_string: '<Button data-element-id="el-button">Delete</Button>' },
    },
  };
  assert.equal(findRecoveredToolAttempt([failed, other], "op-failed"), null);
});

test("an identical edit much later is not mistaken for the recovery retry", () => {
  const muchLater = { ...recovered, receivedSequence: 500 };
  assert.equal(findRecoveredToolAttempt([failed, muchLater], "op-failed"), null);
});
