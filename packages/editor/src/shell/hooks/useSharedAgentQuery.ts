import { useCallback, useEffect, useSyncExternalStore } from "react";
type State = { value: any; error: boolean; loading: boolean };
function createQuery(channel: string) {
  let state: State = { value: null, error: false, loading: true };
  let expires = 0, generation = 0;
  let pending: Promise<any> | undefined;
  const listeners = new Set<() => void>();
  let off: (() => void) | undefined;
  const publish = (next: State) => {
    if (JSON.stringify(next) === JSON.stringify(state)) return;
    state = next; for (const listener of listeners) listener();
  };
  const refresh = (force = false): Promise<any> => {
    if (pending) return pending;
    if (!force && Date.now() < expires) return Promise.resolve(state.value);
    if (!window.api?.invoke) { publish({ ...state, loading: false }); return Promise.resolve(null); }
    const request = generation;
    pending = window.api.invoke(channel, { force }).then(value => {
      if (request !== generation) return;
      const healthy = channel === "agent:list" ? value.agents.some(agent => agent.installed) : value.installed && value.loggedIn;
      expires = Date.now() + (healthy ? 30_000 : 3_000);
      publish({ value, error: false, loading: false });
      return value;
    }).catch(() => {
      if (request === generation) { expires = Date.now() + 3_000; publish({ ...state, error: true, loading: false }); }
      return null;
    }).finally(() => { pending = undefined; if (request !== generation && listeners.size) void refresh(true); });
    return pending;
  };
  const onFocus = () => { void refresh(); };
  return {
    getSnapshot: () => state, refresh,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        window.addEventListener("focus", onFocus);
        off = window.api?.on?.("ai-config:changed", () => { generation++; expires = 0; void refresh(true); });
        void refresh();
      }
      return () => { listeners.delete(listener); if (!listeners.size) { window.removeEventListener("focus", onFocus); off?.(); } };
    },
  };
}
const queries = { "claude:check-status": createQuery("claude:check-status"), "agent:list": createQuery("agent:list") };
const noSubscription = () => () => {};
export function useSharedAgentQuery(channel: keyof typeof queries, enabled = true) {
  const query = queries[channel];
  const state = useSyncExternalStore(enabled ? query.subscribe : noSubscription, query.getSnapshot, query.getSnapshot);
  const refresh = useCallback(() => query.refresh(true), [query]);
  useEffect(() => { if (enabled) void query.refresh(); }, [enabled, query]);
  return { ...state, refresh };
}
