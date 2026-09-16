import assert from "node:assert/strict";
import test from "node:test";
import { SummaryCoordinator, coveredPrefixHash, getAgentMemoryCapabilities, validateSummaryCandidate } from "./aiMemory";

const messages = [
  { id: "u1", seq: 1, role: "user", content: "Use cobalt as the primary color", finalized: true },
  { id: "a1", seq: 3, role: "assistant", content: "Done", finalized: true, operationFacts: [{ id: "op1", runId: "run1", outcome: "succeeded", source: "bingo-mcp", toolName: "canvas_update", action: "write", targets: ["button"], resultText: "Updated button" }] }
];

function candidate() {
  return {
    generation: 1,
    coveredThroughSeq: 3,
    coveredPrefixHash: coveredPrefixHash(messages, 3),
    goal: [{ text: "Use cobalt", verification: "user-stated", evidence: [{ kind: "message", chatId: "chat", messageId: "u1", seq: 1, excerpt: "Use cobalt" }] }],
    decisions: [],
    completed: [{ text: "Button updated", verification: "tool-confirmed", evidence: [{ kind: "operation", chatId: "chat", runId: "run1", operationId: "op1", excerpt: "Updated button" }] }],
    pending: [],
    openQuestions: [],
    relevantPaths: [],
    relevantElementIds: ["button"]
  };
}

test("validates summary generation, prefix evidence, seq holes, and tool confirmation", () => {
  const input = candidate();
  const validated = validateSummaryCandidate(input, { chatId: "chat", messages, expectedGeneration: 1, expectedPrefixHash: input.coveredPrefixHash });
  assert.equal(validated.completed[0].verification, "tool-confirmed");
  assert.equal(validated.coveredThroughSeq, 3);
  assert.throws(() => validateSummaryCandidate({ ...input, generation: 0 }, { chatId: "chat", messages, expectedGeneration: 1, expectedPrefixHash: input.coveredPrefixHash }), error => error.code === "STALE_GENERATION");
  assert.throws(() => validateSummaryCandidate({ ...input, completed: [{ ...input.completed[0], evidence: [{ kind: "message", chatId: "chat", messageId: "a1", seq: 3, excerpt: "Done" }] }] }, { chatId: "chat", messages, expectedGeneration: 1, expectedPrefixHash: input.coveredPrefixHash }), error => error.code === "INVALID_VERIFICATION");
  assert.throws(() => validateSummaryCandidate({ ...input, coveredPrefixHash: "stale" }, { chatId: "chat", messages, expectedGeneration: 1, expectedPrefixHash: input.coveredPrefixHash }), error => error.code === "STALE_PREFIX");
});

test("does not treat assistant claims as tool-confirmed", () => {
  const input = candidate();
  input.completed[0] = { text: "Tests passed", verification: "tool-confirmed", evidence: [{ kind: "message", chatId: "chat", messageId: "a1", seq: 3, excerpt: "Done" }] };
  assert.throws(() => validateSummaryCandidate(input, { chatId: "chat", messages, expectedGeneration: 1, expectedPrefixHash: input.coveredPrefixHash }), error => error.code === "INVALID_VERIFICATION");
});

test("summary capability is explicit and coordinator is single-flight with one attempt per run", async () => {
  assert.equal(getAgentMemoryCapabilities("claude").toolFreeSummary, true);
  assert.equal(getAgentMemoryCapabilities("codex").toolFreeSummary, false);
  const coordinator = new SummaryCoordinator({ timeoutMs: 1_000 });
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const first = coordinator.schedule({ enabled: true, agent: "claude", chatId: "one", triggerRunId: "run", generate: () => pending, commit: async () => {} });
  assert.equal((await coordinator.schedule({ enabled: true, agent: "claude", chatId: "two", triggerRunId: "other", generate: async () => ({}), commit: async () => {} })).status, "deferred");
  release({});
  assert.equal((await first).status, "committed");
  assert.equal((await coordinator.schedule({ enabled: true, agent: "claude", chatId: "one", triggerRunId: "run", generate: async () => ({}), commit: async () => {} })).status, "already-attempted");
});

test("an active summary can be cancelled when the feature is disabled", async () => {
  const coordinator = new SummaryCoordinator({ timeoutMs: 1_000 });
  const result = coordinator.schedule({
    enabled: true,
    agent: "claude",
    chatId: "one",
    triggerRunId: "cancel-me",
    generate: ({ signal }) => new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true })),
    commit: async () => {}
  });
  assert.equal(coordinator.cancelActive(), true);
  assert.equal((await result).status, "cancelled");
});

test("an active summary can be cancelled only for its stable chat id", async () => {
  const coordinator = new SummaryCoordinator({ timeoutMs: 1_000 });
  const result = coordinator.schedule({
    enabled: true,
    agent: "claude",
    chatId: "target-chat",
    triggerRunId: "archive-me",
    generate: ({ signal }) => new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true })),
    commit: async () => {}
  });
  assert.equal(coordinator.cancelChat("other-chat"), false);
  assert.equal(coordinator.cancelChat("target-chat"), true);
  assert.equal((await result).status, "cancelled");
});
