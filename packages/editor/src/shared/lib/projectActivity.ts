import { useEffect, useSyncExternalStore } from "react";
const isProject = () => typeof window !== "undefined" && !!window.api && /(?:^\?|&)projectTab=/.test(window.location?.search ?? "");
let state = { active: !isProject(), windowVisible: true, revision: -1 };
let renderRequests = 0;
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };
export const isProjectForegroundActive = () => state.active && state.windowVisible;
export const isProjectVisualActive = () => renderRequests > 0 || isProjectForegroundActive();
export function subscribeProjectActivity(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const useProjectVisualActivity = () => useSyncExternalStore(subscribeProjectActivity, isProjectVisualActive, () => true);
const noSubscription = () => () => {};
const inactive = () => false;
export const useProjectForegroundActivity = (enabled = true) => useSyncExternalStore(enabled ? subscribeProjectActivity : noSubscription, enabled ? isProjectForegroundActive : inactive, inactive);
/** Tools can require fresh geometry without selecting or focusing their project. */
export function acquireProjectRender() {
  renderRequests++; notify();
  let released = false;
  return () => { if (!released) { released = true; renderRequests--; notify(); } };
}
/** Wait for React to commit the camera-ready canvas after a render lease. */
export async function waitForProjectRenderReady(timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  do {
    await new Promise(resolve => setTimeout(resolve, 16));
    const canvas = document.querySelector("[data-project-canvas-ready]");
    if (!canvas || canvas.getAttribute("data-project-canvas-ready") === "true") return;
  } while (Date.now() < deadline);
  throw new Error("Project canvas is not ready for capture.");
}
export function ProjectActivityProvider({ children }) {
  useEffect(() => {
    if (!isProject()) {
      const update = () => { state = { active: true, windowVisible: !document.hidden, revision: 0 }; notify(); };
      update(); document.addEventListener("visibilitychange", update);
      return () => document.removeEventListener("visibilitychange", update);
    }
    let alive = true;
    const update = next => { if (alive && next.revision >= state.revision) { state = next; notify(); } };
    const off = window.api.on("project-tabs:activity-changed", update);
    window.api.invoke("project-tabs:activity-get").then(update).catch(error => console.warn("[ProjectActivity]", error));
    return () => { alive = false; off(); };
  }, []);
  return children;
}
