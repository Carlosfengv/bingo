/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/useClaudeStatus.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";

function getBridge$1() {
  if (typeof window === "undefined") return null;
  const api = window.api;
  return api && typeof api.invoke === "function" ? api : null;
}
function isClaudeSetUp(status) {
  return !!status?.installed && !!status?.loggedIn;
}
/**
* Reads Claude Code setup state over the Electron `claude:check-status` IPC.
* Pass `{ poll: true }` (e.g. while the setup wizard is open) to re-check on an
* interval so a freshly installed / logged-in CLI is picked up automatically.
*/
function useClaudeStatus(opts = {}) {
  const {
    poll = false,
    intervalMs = 1500
  } = opts;
  const isDesktop = getBridge$1() !== null;
  const [status, setStatus] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(isDesktop);
  const [error, setError] = (0, import_react.useState)(false);
  const inFlight = (0, import_react.useRef)(false);
  const mounted = (0, import_react.useRef)(true);
  const refresh = (0, import_react.useCallback)(async () => {
    const bridge = getBridge$1();
    if (!bridge) {
      setLoading(false);
      return null;
    }
    if (inFlight.current) return null;
    inFlight.current = true;
    try {
      const next = await bridge.invoke("claude:check-status");
      if (mounted.current) {
        setStatus(next);
        setError(false);
      }
      return next;
    } catch {
      if (mounted.current) setError(true);
      return null;
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);
  (0, import_react.useEffect)(() => {
    mounted.current = true;
    refresh();
    if (!isDesktop) return () => {
      mounted.current = false;
    };
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const timer = poll ? setInterval(() => void refresh(), intervalMs) : null;
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", onFocus);
      if (timer) clearInterval(timer);
    };
  }, [poll, intervalMs, isDesktop, refresh]);
  return {
    status,
    loading,
    error,
    refresh,
    isDesktop
  };
}

export { isClaudeSetUp, useClaudeStatus };
