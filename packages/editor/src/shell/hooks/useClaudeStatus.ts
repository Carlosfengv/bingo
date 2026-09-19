import { useEffect } from "react";
import { useSharedAgentQuery } from "./useSharedAgentQuery";
import { useProjectForegroundActivity } from "../../shared/lib/projectActivity";

function isClaudeSetUp(status) { return !!status?.installed && !!status?.loggedIn; }
function useClaudeStatus({ poll = false, intervalMs = 1500, enabled = true } = {}) {
  const query = useSharedAgentQuery("claude:check-status", enabled);
  const active = useProjectForegroundActivity(enabled && poll);
  const isDesktop = typeof window !== "undefined" && typeof window.api?.invoke === "function";
  useEffect(() => {
    if (!enabled || !poll || !active || !isDesktop) return;
    void query.refresh();
    const timer = setInterval(() => void query.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [enabled, poll, active, isDesktop, intervalMs, query.refresh]);
  return { status: query.value, loading: isDesktop && query.loading, error: query.error, refresh: query.refresh, isDesktop };
}
export { isClaudeSetUp, useClaudeStatus };
