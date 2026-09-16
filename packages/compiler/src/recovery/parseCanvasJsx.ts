import { getRootIds } from "../store/read";
import { parseJSX } from "../codegen/parseJSX";
import { getJsxRecoveryRules } from "./jsxRegistry";
import type { CanvasJsxOperation, JsxRecoveryAttempt, JsxRecoveryReport, JsxRecoveryRule } from "./types";

function errorSummary(error: any, lineOffset = 0) {
  const location = error?.location && typeof error.location.line === "number" && typeof error.location.column === "number"
    ? { line: Math.max(1, error.location.line + lineOffset), column: error.location.column }
    : undefined;
  return {
    code: typeof error?.code === "string" ? error.code : undefined,
    reasonCode: typeof error?.reasonCode === "string" ? error.reasonCode : undefined,
    message: error instanceof Error ? error.message : String(error),
    location
  };
}

function failure(error: any, report: JsxRecoveryReport) {
  const wrapped = new Error(error instanceof Error ? error.message : String(error), { cause: error });
  wrapped.name = error?.name || "CanvasJsxInputError";
  (wrapped as any).code = error?.code || report.errorCode || "INVALID_JSX";
  (wrapped as any).reasonCode = error?.reasonCode;
  (wrapped as any).location = error?.location;
  (wrapped as any).recovery = report;
  return wrapped;
}

function validateRootCount(store: any, operation: CanvasJsxOperation) {
  const rootCount = getRootIds(store).length;
  if (rootCount === 0) {
    const error: any = new Error("Canvas JSX produced no renderable root elements.");
    error.code = "CANVAS_ROOT_COUNT_MISMATCH";
    throw error;
  }
  if ((operation === "canvas_edit" || operation === "canvas_update") && rootCount !== 1) {
    const error: any = new Error(`${operation} requires exactly one JSX root, but received ${rootCount}.`);
    error.code = "CANVAS_ROOT_COUNT_MISMATCH";
    throw error;
  }
}

export function parseCanvasJsx(input: string, iconLibraries: any, components: any, defaultIconLibrary: any, options: {
  operation: CanvasJsxOperation;
  forceNewIds?: boolean;
  recoveryEnabled?: boolean;
  disabledRuleIds?: Iterable<string>;
  rules?: readonly JsxRecoveryRule[];
}) {
  const parse = (value: string, rejectUnsupported = false) => parseJSX(value, iconLibraries, components, defaultIconLibrary, {
    forceNewIds: options.forceNewIds,
    silent: true,
    rejectUnsupported
  });

  try {
    const store = parse(input);
    validateRootCount(store, options.operation);
    return {
      store,
      recovery: { schemaVersion: 1, status: "unchanged", stage: "validate", attempts: [] } as JsxRecoveryReport
    };
  } catch (originalError) {
    const original = errorSummary(originalError);
    const baseReport: JsxRecoveryReport = {
      schemaVersion: 1,
      status: "failed",
      stage: original.code === "CANVAS_ROOT_COUNT_MISMATCH" ? "validate" : "parse",
      errorCode: original.code || "INVALID_JSX",
      initialError: original,
      attempts: []
    };
    if (options.recoveryEnabled === false || (options.operation !== "canvas_add" && options.operation !== "canvas_insert")) {
      throw failure(originalError, baseReport);
    }

    const context = { operation: options.operation, input, error: original };
    const disabled = new Set(options.disabledRuleIds);
    const rules = (options.rules ?? getJsxRecoveryRules(disabled)).filter(rule => !disabled.has(rule.id));
    const rule = rules.find(candidate => candidate.matches(context));
    if (!rule) throw failure(originalError, baseReport);

    const startedAt = performance.now();
    let proposal;
    try {
      proposal = rule.propose(context);
    } catch (ruleError) {
      const attempt: JsxRecoveryAttempt = {
        ruleId: rule.id,
        ruleVersion: rule.version,
        outcome: "failed",
        summary: "Recovery rule failed while creating a candidate.",
        durationMs: performance.now() - startedAt,
        error: errorSummary(ruleError)
      };
      throw failure(originalError, { ...baseReport, attempts: [attempt] });
    }
    if (!proposal || proposal.candidate === input) {
      const attempt: JsxRecoveryAttempt = {
        ruleId: rule.id,
        ruleVersion: rule.version,
        outcome: "skipped",
        summary: "Recovery rule did not produce a distinct candidate.",
        durationMs: performance.now() - startedAt
      };
      throw failure(originalError, { ...baseReport, attempts: [attempt] });
    }

    try {
      const store = parse(proposal.candidate, true);
      validateRootCount(store, options.operation);
      const attempt: JsxRecoveryAttempt = {
        ruleId: rule.id,
        ruleVersion: rule.version,
        outcome: "recovered",
        summary: proposal.summary,
        durationMs: performance.now() - startedAt
      };
      return {
        store,
        recovery: { schemaVersion: 1, status: "recovered", stage: "validate", attempts: [attempt] } as JsxRecoveryReport
      };
    } catch (candidateError) {
      const candidate = errorSummary(candidateError, -1);
      const attempt: JsxRecoveryAttempt = {
        ruleId: rule.id,
        ruleVersion: rule.version,
        outcome: "failed",
        summary: proposal.summary,
        durationMs: performance.now() - startedAt,
        error: candidate
      };
      const combined: any = new Error(`${original.message} Recovery with ${rule.id} also failed: ${candidate.message}`, {
        cause: candidateError
      });
      combined.name = "CanvasJsxRecoveryError";
      combined.code = candidate.code || original.code || "INVALID_JSX";
      combined.reasonCode = candidate.reasonCode;
      combined.location = candidate.location;
      throw failure(combined, {
        ...baseReport,
        stage: candidate.code === "CANVAS_ROOT_COUNT_MISMATCH" ? "validate" : "parse",
        errorCode: combined.code,
        candidateError: candidate,
        attempts: [attempt]
      });
    }
  }
}

export type { CanvasJsxOperation, JsxRecoveryAttempt, JsxRecoveryReport } from "./types";
