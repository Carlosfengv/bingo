export function updateProjectLoadProgress(previous, event) {
  const payload = event.payload ?? {};
  const next = { ...previous, lastEvent: event.type, sessionId: event.sessionId ?? previous.sessionId, buildId: event.buildId ?? previous.buildId };
  if (event.type === "connected") next.stage = "connecting";
  if (event.type === "project:status") next.stage = payload.stage === "restoring" ? "restoring" : "checking";
  if (event.type === "modules:build_started" || event.type === "modules:build_progress") {
    next.stage = "building";
    next.error = null;
    next.code = null;
    next.incidentId = null;
    next.reportPath = null;
    if (event.type === "modules:build_started") { next.file = null; next.processed = null; next.total = null; }
    else Object.assign(next, { file: payload.file, processed: payload.processed, total: payload.total });
  }
  if (event.type === "modules:ready" || event.type === "components:ready") { next.stage = "runtime"; next.error = null; next.code = null; next.incidentId = null; next.reportPath = null; }
  if (event.type === "css:ready") next.stage = "styles";
  if (event.type === "modules:build_failed" || event.type === "connection:failed") {
    Object.assign(next, { stage: event.type === "connection:failed" ? "connecting" : "building", error: payload.error,
      code: payload.code || "PROJECT_BUILD_FAILED", incidentId: payload.incidentId, reportPath: payload.reportPath });
  }
  return next;
}

export function createProjectLoadFailure({ projectId, progress, error, timedOut, cssLoaded, loading, startedAt, now = Date.now() }) {
  const cause = error || progress.error;
  return {
    projectId, stage: cause ? progress.stage : loading ? (progress.stage === "styles" ? "runtime" : progress.stage || "connecting") : "styles",
    code: cause ? progress.code || "PROJECT_LOAD_FAILED" : "PROJECT_LOAD_TIMEOUT",
    error: cause ? String(cause) : null, timedOut: !!timedOut,
    elapsedMs: Math.max(0, now - startedAt), timestamp: new Date(now).toISOString(),
    sessionId: progress.sessionId, buildId: progress.buildId, lastEvent: progress.lastEvent,
    file: progress.file, processed: progress.processed, total: progress.total,
    incidentId: progress.incidentId, reportPath: progress.reportPath,
    componentsReady: !loading, stylesReady: cssLoaded,
  };
}
