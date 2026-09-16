export type CanvasJsxOperation = "canvas_add" | "canvas_insert" | "canvas_edit" | "canvas_update";

export type JsxRecoveryAttempt = {
  ruleId: string;
  ruleVersion: number;
  outcome: "recovered" | "failed" | "skipped";
  summary: string;
  durationMs: number;
  error?: { code?: string; reasonCode?: string; message: string; location?: { line: number; column: number } };
};

export type JsxRecoveryReport = {
  schemaVersion: 1;
  status: "unchanged" | "recovered" | "failed";
  stage: "parse" | "validate" | "commit";
  errorCode?: string;
  initialError?: JsxRecoveryContext["error"];
  candidateError?: JsxRecoveryContext["error"];
  attempts: JsxRecoveryAttempt[];
};

export type JsxRecoveryContext = {
  operation: CanvasJsxOperation;
  input: string;
  error: { code?: string; reasonCode?: string; message: string; location?: { line: number; column: number } };
};

export type JsxRecoveryRule = {
  id: string;
  version: number;
  matches(context: JsxRecoveryContext): boolean;
  propose(context: JsxRecoveryContext): { candidate: string; summary: string } | null;
};
