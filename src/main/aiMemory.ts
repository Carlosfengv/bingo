import { createHash } from "node:crypto";

const SUMMARY_OUTPUT_MAX_BYTES = 64 * 1024;
const SUMMARY_TIMEOUT_MS = 30_000;
const SUMMARY_ITEM_GROUPS = ["goal", "decisions", "completed", "pending", "openQuestions"];

function summaryHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function boundedText(value, max = 2_000) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function normalizedMessageIdentity(message) {
  return {
    id: message.id,
    seq: message.seq,
    role: message.role,
    content: typeof message.content === "string" ? message.content : message.content?.bodyRef ?? message.content?.__bingoBodyRef ?? null,
    inlineRefs: Array.isArray(message.inlineRefs) ? message.inlineRefs.map(ref => ({ id: ref.id, type: ref.type, name: ref.name ?? ref.displayName ?? null })) : [],
    operationFacts: Array.isArray(message.operationFacts) ? message.operationFacts.map(fact => ({
      id: fact.id,
      runId: fact.runId,
      source: fact.source,
      toolName: fact.toolName,
      outcome: fact.outcome,
      action: fact.action,
      targets: Array.isArray(fact.targets) ? fact.targets : [],
      resultText: boundedText(fact.resultText)
    })) : []
  };
}

function coveredPrefixHash(messages, coveredThroughSeq) {
  return summaryHash(messages.filter(message => message.finalized !== false && message.seq <= coveredThroughSeq).sort((a, b) => a.seq - b.seq).map(normalizedMessageIdentity));
}

function validateEvidence(evidence, context) {
  if (!evidence || typeof evidence !== "object") return false;
  if (evidence.kind === "message") {
    const message = context.messages.find(candidate => candidate.id === evidence.messageId && candidate.seq === evidence.seq && candidate.seq <= context.coveredThroughSeq);
    return !!message && evidence.chatId === context.chatId && typeof evidence.excerpt === "string" && evidence.excerpt.length <= 500 && typeof message.content === "string" && message.content.includes(evidence.excerpt);
  }
  if (evidence.kind === "operation") {
    const fact = context.messages.flatMap(message => message.operationFacts ?? []).find(candidate => candidate.id === evidence.operationId && candidate.runId === evidence.runId);
    return !!fact && evidence.chatId === context.chatId && fact.outcome === "succeeded" && typeof evidence.excerpt === "string" && evidence.excerpt.length <= 500 && boundedText(fact.resultText).includes(evidence.excerpt);
  }
  return false;
}

function validateSummaryCandidate(candidate, context) {
  if (!candidate || typeof candidate !== "object") throw Object.assign(new Error("Summary output must be an object."), { code: "INVALID_SUMMARY" });
  if (Buffer.byteLength(JSON.stringify(candidate), "utf8") > SUMMARY_OUTPUT_MAX_BYTES) throw Object.assign(new Error("Summary output exceeds 64 KiB."), { code: "SUMMARY_TOO_LARGE" });
  if (candidate.generation !== context.expectedGeneration) throw Object.assign(new Error("Summary generation is stale."), { code: "STALE_GENERATION" });
  if (!Number.isInteger(candidate.coveredThroughSeq) || candidate.coveredThroughSeq < 0) throw Object.assign(new Error("Invalid coveredThroughSeq."), { code: "INVALID_SUMMARY" });
  const covered = context.messages.filter(message => message.seq <= candidate.coveredThroughSeq);
  if (covered.some(message => message.finalized === false)) throw Object.assign(new Error("A summary cannot cross an unfinished message."), { code: "INVALID_COVERAGE" });
  const expectedHash = coveredPrefixHash(context.messages, candidate.coveredThroughSeq);
  if (candidate.coveredPrefixHash !== expectedHash || candidate.coveredPrefixHash !== context.expectedPrefixHash) throw Object.assign(new Error("Covered history changed before summary commit."), { code: "STALE_PREFIX" });
  const normalized = {
    generation: candidate.generation,
    coveredThroughSeq: candidate.coveredThroughSeq,
    coveredPrefixHash: candidate.coveredPrefixHash,
    updatedAt: new Date().toISOString(),
    relevantPaths: Array.isArray(candidate.relevantPaths) ? candidate.relevantPaths.filter(value => typeof value === "string").slice(0, 100).map(value => value.slice(0, 500)) : [],
    relevantElementIds: Array.isArray(candidate.relevantElementIds) ? candidate.relevantElementIds.filter(value => typeof value === "string").slice(0, 100).map(value => value.slice(0, 500)) : []
  };
  for (const group of SUMMARY_ITEM_GROUPS) {
    if (!Array.isArray(candidate[group])) throw Object.assign(new Error(`Summary group ${group} must be an array.`), { code: "INVALID_SUMMARY" });
    normalized[group] = candidate[group].slice(0, 100).map(item => {
      if (!item || typeof item.text !== "string" || !["user-stated", "tool-confirmed", "inferred"].includes(item.verification) || !Array.isArray(item.evidence)) throw Object.assign(new Error(`Invalid item in ${group}.`), { code: "INVALID_SUMMARY" });
      if (!item.evidence.every(evidence => validateEvidence(evidence, { ...context, coveredThroughSeq: candidate.coveredThroughSeq }))) throw Object.assign(new Error(`Invalid evidence in ${group}.`), { code: "INVALID_EVIDENCE" });
      if (item.verification === "tool-confirmed" && !item.evidence.some(evidence => evidence.kind === "operation")) throw Object.assign(new Error("tool-confirmed requires a successful captured operation."), { code: "INVALID_VERIFICATION" });
      if (item.verification === "user-stated" && !item.evidence.some(evidence => evidence.kind === "message" && context.messages.some(message => message.id === evidence.messageId && message.role === "user"))) throw Object.assign(new Error("user-stated requires user-message evidence."), { code: "INVALID_VERIFICATION" });
      return { text: item.text.slice(0, 2_000), verification: item.verification, evidence: item.evidence };
    });
  }
  return normalized;
}

const AGENT_MEMORY_CAPABILITIES = Object.freeze({
  claude: { p1a: true, toolFreeSummary: true, isolatedHooks: true, cancellable: true, boundedOutput: true },
  codex: { p1a: true, toolFreeSummary: false },
  opencode: { p1a: true, toolFreeSummary: false },
  grok: { p1a: true, toolFreeSummary: false }
});

function getAgentMemoryCapabilities(agent) {
  return AGENT_MEMORY_CAPABILITIES[agent] ?? { p1a: true, toolFreeSummary: false };
}

class SummaryCoordinator {
  constructor(options = {}) {
    this.timeoutMs = options.timeoutMs ?? SUMMARY_TIMEOUT_MS;
    this.active = null;
    this.mainRuns = 0;
    this.attemptedRuns = new Set();
  }

  mainRunStarted() {
    this.mainRuns += 1;
    this.active?.controller.abort();
  }

  mainRunFinished() {
    this.mainRuns = Math.max(0, this.mainRuns - 1);
  }

  cancelActive() {
    if (!this.active) return false;
    this.active.controller.abort();
    return true;
  }

  cancelChat(chatId) {
    if (!this.active || this.active.chatId !== chatId) return false;
    this.active.controller.abort();
    return true;
  }

  async schedule(task) {
    if (!task.enabled || !getAgentMemoryCapabilities(task.agent).toolFreeSummary) return { status: "unsupported-or-disabled" };
    if (this.mainRuns > 0 || this.active) return { status: "deferred" };
    if (this.attemptedRuns.has(task.triggerRunId)) return { status: "already-attempted" };
    this.attemptedRuns.add(task.triggerRunId);
    const controller = new AbortController();
    this.active = { chatId: task.chatId, agent: task.agent, model: task.model, controller };
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const candidate = await task.generate({ signal: controller.signal, agent: task.agent, model: task.model });
      if (Buffer.byteLength(JSON.stringify(candidate), "utf8") > SUMMARY_OUTPUT_MAX_BYTES) throw Object.assign(new Error("Summary output exceeds 64 KiB."), { code: "SUMMARY_TOO_LARGE" });
      await task.commit(candidate);
      return { status: "committed" };
    } catch (error) {
      return { status: controller.signal.aborted ? "cancelled" : "failed", error };
    } finally {
      clearTimeout(timeout);
      if (this.active?.controller === controller) this.active = null;
    }
  }
}

export {
  AGENT_MEMORY_CAPABILITIES,
  SUMMARY_OUTPUT_MAX_BYTES,
  SUMMARY_TIMEOUT_MS,
  SummaryCoordinator,
  coveredPrefixHash,
  getAgentMemoryCapabilities,
  normalizedMessageIdentity,
  validateSummaryCandidate
};
