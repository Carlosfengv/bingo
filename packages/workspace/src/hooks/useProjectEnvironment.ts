import * as React from "react";

// Keep installation alive when the presentation changes from loading to error
// or canvas, but never apply a completed request to a different project.
export function useProjectEnvironment(projectId, { enabled = true, refreshKey, onPrepared }) {
  const context = React.useMemo(() => ({ active: false, busy: false, request: 0 }), [projectId, enabled]);
  const onPreparedRef = React.useRef(onPrepared);
  onPreparedRef.current = onPrepared;
  const [state, setState] = React.useState({ context, inspection: null, phase: "checking", error: null });
  const current = state.context === context ? state : { inspection: null, phase: "checking", error: null };
  const update = React.useCallback((patch) => {
    if (context.active) setState(previous => ({ ...(previous.context === context ? previous : {}), context, ...patch }));
  }, [context]);

  const refresh = React.useCallback(async (resume = false) => {
    if (!context.active || context.busy) return;
    const request = ++context.request;
    update({ phase: "checking", error: null });
    let step = "check";
    try {
      const inspection = await window.api.invoke("bingo:environment-inspect", { root: projectId });
      if (!context.active || request !== context.request) return;
      update({ inspection, phase: "idle" });
      if (resume && inspection.status === "ready") {
        context.busy = true;
        step = "reload";
        update({ phase: "reloading" });
        await onPreparedRef.current(() => context.active);
        if (context.active) update({ phase: "idle" });
      }
    } catch (cause) {
      if (context.active && request === context.request) update({ phase: "idle", error: { step, detail: String(cause?.message || cause) } });
    } finally {
      if (step === "reload") context.busy = false;
    }
  }, [context, projectId, update]);

  React.useEffect(() => {
    context.active = enabled && !!projectId;
    return () => { context.active = false; context.request += 1; };
  }, [context, enabled, projectId]);
  React.useEffect(() => { void refresh(); }, [refresh, refreshKey]);

  const prepare = React.useCallback(async () => {
    if (!context.active || context.busy) return;
    context.busy = true;
    context.request += 1;
    update({ phase: "preparing", error: null });
    let step = "install";
    try {
      // The main process rechecks dependencies and skips installation if the
      // user already prepared the project elsewhere.
      const result = await window.api.invoke("bingo:environment-prepare", { root: projectId, workspaceRoot: current.inspection?.workspaceRoot });
      if (!context.active) return;
      if (!result?.success) throw new Error(result?.error || "Project preparation failed");
      update({ inspection: result.inspection, phase: "reloading" });
      step = "reload";
      await onPreparedRef.current(() => context.active);
      if (context.active) update({ phase: "idle" });
    } catch (cause) {
      update({ phase: "idle", error: { step, detail: String(cause?.message || cause) } });
    } finally {
      context.busy = false;
    }
  }, [context, projectId, update, current.inspection?.workspaceRoot]);

  const busy = current.phase === "preparing" || current.phase === "reloading";
  return { ...current, busy, visible: enabled && (busy || current.inspection?.status === "needs-install" || !!current.error), refresh, prepare };
}
