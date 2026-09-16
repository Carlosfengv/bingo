/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/workspace/src/hooks/useProjectBuilderSession.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { projectBuilderClient } from "../services/ProjectBuilderClient";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var RECONNECT_BASE_MS = 1e3;
var RECONNECT_MAX_MS = 3e4;
function reconnectDelay(attempt) {
  return Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
}
function useProjectBuilderSession(projectId, projectAccessToken) {
  const $ = (0, import_compiler_runtime.c)(4);
  let t0;
  let t1;
  if ($[0] !== projectAccessToken || $[1] !== projectId) {
    t0 = () => {
      if (!projectId) {
        projectBuilderClient.disconnect();
        return;
      }
      if (projectAccessToken) projectBuilderClient.setProjectAccessToken(projectId, projectAccessToken);
      let cancelled = false;
      let attempt = 0;
      let timer = null;
      const clearTimer = () => {
        if (timer == null) return;
        clearTimeout(timer);
        timer = null;
      };
      const tryConnect = () => {
        if (cancelled) return;
        if (projectBuilderClient.isConnected(projectId)) return;
        projectBuilderClient.connect(projectId).catch(err => {
          if (cancelled) return;
          console.warn("[useProjectBuilderSession] Connect failed:", err);
          scheduleReconnect();
        });
      };
      const scheduleReconnect = () => {
        if (cancelled) return;
        clearTimer();
        const delay = reconnectDelay(attempt);
        attempt = attempt + 1;
        timer = setTimeout(tryConnect, delay);
      };
      tryConnect();
      const unsub = projectBuilderClient.on(event => {
        if (event.type === "connected") {
          attempt = 0;
          clearTimer();
          return;
        }
        if (event.type === "disconnected") scheduleReconnect();
      });
      const onVisibilityChange = () => {
        if (document.visibilityState !== "visible") return;
        if (projectBuilderClient.isConnected(projectId)) return;
        attempt = 0;
        clearTimer();
        tryConnect();
      };
      document.addEventListener("visibilitychange", onVisibilityChange);
      return () => {
        cancelled = true;
        clearTimer();
        unsub();
        document.removeEventListener("visibilitychange", onVisibilityChange);
        projectBuilderClient.disconnect();
      };
    };
    t1 = [projectId, projectAccessToken];
    $[0] = projectAccessToken;
    $[1] = projectId;
    $[2] = t0;
    $[3] = t1;
  } else {
    t0 = $[2];
    t1 = $[3];
  }
  (0, import_react.useEffect)(t0, t1);
}

export { useProjectBuilderSession };
