/*
 * Local project builder client.
 *
 * Receives local build events after Electron compiles the project's TSX to ESM.
 *
 * This class has the same shape -- `on`, `emit`, `connect`, `disconnect`,
 * `isConnected`, `scanComponents`, `compileSnapshotPreview` -- but the build
 * runs in the main process (src/main/localCompiler.ts, via esbuild) and pushes
 * the same event objects over IPC. Consumers cannot tell the difference, which
 * is the point: `useProjectBuilderSession` and `useComponents` are unchanged.
 *
 * The event payloads follow the editor builder contract.
 */
/** Bootstrap events, cached and replayed to late subscribers like the original. */
class LocalProjectBuilderClient {
  constructor() {
    this.handlers = new Set();
    this.projectId = null;
    this.sessionId = null;
    this.lastBootstrapProjectId = null;
    this.lastStatus = null;
    this.lastModulesReady = null;
    this.lastComponentsReady = null;
    this.lastCssReady = null;
    this.lastFailure = null;
    this.lastProgress = null;
    this.unsubscribe = null;
  }

  on(handler, projectId) {
    this.handlers.add(handler);
    this.replayLastBootstrapEvents(handler, projectId);
    return () => this.handlers.delete(handler);
  }

  replayLastBootstrapEvents(handler, projectId) {
    const id = projectId ?? this.projectId ?? this.lastBootstrapProjectId;
    if (!id || this.lastBootstrapProjectId !== id) return;
    for (const event of [this.lastStatus, this.lastProgress, this.lastModulesReady, this.lastComponentsReady, this.lastCssReady, this.lastFailure]) {
      if (event != null) handler(event);
    }
  }

  clearBootstrapEvents() {
    this.lastStatus = null;
    this.lastCssReady = null;
    this.lastComponentsReady = null;
    this.lastModulesReady = null;
    this.lastFailure = null;
    this.lastProgress = null;
    this.lastBootstrapProjectId = null;
  }

  emit(event) {
    if (event.type === "modules:build_started") { this.lastFailure = null; this.lastProgress = event; }
    if (event.type === "modules:build_progress") this.lastProgress = event;
    if (event.type === "modules:ready") this.lastFailure = null;
    if (event.type === "modules:build_failed" || event.type === "connection:failed") this.lastFailure = event;
    if (event.type === "project:status") this.lastStatus = event;
    if (event.type === "modules:ready") this.lastModulesReady = event;
    if (event.type === "components:ready") this.lastComponentsReady = event;
    if (event.type === "css:ready") this.lastCssReady = event;
    if (
      event.type === "project:status" ||
      event.type === "modules:ready" ||
      event.type === "components:ready" ||
      event.type === "css:ready" || event.type === "modules:build_started" || event.type === "modules:build_progress" || event.type === "modules:build_failed" || event.type === "connection:failed"
    ) {
      this.lastBootstrapProjectId = this.projectId;
    }
    for (const handler of this.handlers) handler(event);
  }

  isConnected(projectId) {
    return (
      !!this.projectId &&
      (projectId === void 0 || this.projectId === projectId) &&
      this.connected === true
    );
  }

  async connect(projectId) {
    if (this.projectId !== projectId) {
      this.disconnect();
      this.projectId = projectId;
      this.sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      this.connected = false;
      this.clearBootstrapEvents();
    }
    if (!this.sessionId) this.sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    if (this.connected) return;

    if (!this.unsubscribe) {
      this.unsubscribe = window.api.on("bingo:builder-event", (event) => {
        if (String(event?.projectId) !== String(this.projectId)) return;
        if (event?.sessionId && event.sessionId !== this.sessionId) return;
        if (event.type === "connected") this.connected = true;
        this.emit(event);
      });
    }

    const sessionId = this.sessionId;
    try {
      await window.api.invoke("bingo:builder-connect", { root: projectId, sessionId });
    } catch (error) {
      if (this.projectId === projectId && this.sessionId === sessionId) {
        this.emit({ type: "connection:failed", projectId, sessionId, payload: { error: String(error?.message || error), code: "PROJECT_CONNECT_FAILED" } });
      }
      throw error;
    }
    if (this.projectId !== projectId || this.sessionId !== sessionId) return;
    this.connected = true;
    this.emit({ type: "connected", payload: {} });
  }

  async reconnect(projectId) {
    this.disconnect();
    await this.connect(projectId ?? this.projectId);
  }

  disconnect() {
    const projectId = this.projectId;
    const sessionId = this.sessionId;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (projectId && sessionId) {
      window.api.invoke("bingo:builder-disconnect", { root: projectId, sessionId }).catch(() => {});
    }
    this.connected = false;
    this.sessionId = null;
    this.clearBootstrapEvents();
  }

  // The server analyses component props to drive the inspector. Locally the
  // props come from the rendered element instead, so this is a no-op.
  async scanComponents(options = {}) {
    if (options.forceRescan && this.projectId && this.sessionId) {
      const result = await window.api.invoke("bingo:builder-rebuild", {
        root: this.projectId,
        sessionId: this.sessionId,
      });
      if (!result?.ok) throw new Error(result?.error || "Could not rebuild project");
      return { success: true, status: "rebuilt" };
    }
    return { success: true };
  }

  // Snapshot previews are rendered server-side in the shipped app.
  async compileSnapshotPreview() {
    return null;
  }

  setProjectAccessToken() {}
}

const localProjectBuilderClient = new LocalProjectBuilderClient();

export { LocalProjectBuilderClient, localProjectBuilderClient };
