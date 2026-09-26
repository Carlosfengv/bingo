/** Ephemeral previews never enter the design store or its persistence stream. */
export type PreviewProps = Record<string, unknown>;
export type PreviewTarget = { id: string; before: PreviewProps; after: PreviewProps };
export type PreviewScene = { tabId: string; store: any; owner: "code" | "agent" };
export type ComponentPreview = {
  token: number;
  targets: Map<string, PreviewTarget>;
  status: "pending" | "failed";
  error?: string;
  scene?: PreviewScene;
  /** Keep validated candidate props visible until the gesture is confirmed. */
  continuous?: boolean;
};

export function createComponentPreviewStore(timeoutMs = 3000) {
  let snapshot: ComponentPreview | null = null;
  let nextToken = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let commit: (() => void) | undefined;
  let completion: { resolve: () => void; reject: (error: Error) => void } | undefined;
  const passed = new Set<string>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());
  const stopTimer = () => { clearTimeout(timer); timer = undefined; };
  const cancel = () => {
    stopTimer(); commit = undefined; passed.clear();
    const pending = completion; completion = undefined;
    pending?.reject(new Error("Component preview cancelled. No changes were applied."));
    if (snapshot) { snapshot = null; emit(); }
  };
  const fail = (token: number, error: string) => {
    if (snapshot?.token !== token || snapshot.status !== "pending") return;
    stopTimer(); commit = undefined;
    const pending = completion; completion = undefined;
    snapshot = { ...snapshot, status: "failed", error };
    emit();
    pending?.reject(new Error(error));
  };
  const start = (targets: PreviewTarget[], onCommit: () => void, scene?: PreviewScene,
    settled?: { resolve: () => void; reject: (error: Error) => void }, continuous = false) => {
    stopTimer(); passed.clear();
    completion?.reject(new Error("Component preview superseded. No changes were applied."));
    completion = settled;
    const token = ++nextToken;
    snapshot = { token, targets: new Map(targets.map(target => [target.id, target])), status: "pending", ...(scene ? { scene } : {}), ...(continuous ? { continuous: true } : {}) };
    commit = onCommit;
    timer = setTimeout(() => fail(token, "PREVIEW_TIMEOUT"), timeoutMs);
    emit();
    return token;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    cancel,
    start(targets: PreviewTarget[], onCommit: () => void) { return start(targets, onCommit); },
    preview(targets: PreviewTarget[]) { return start(targets, () => {}, undefined, undefined, true); },
    validate(targets: PreviewTarget[], scene: PreviewScene, onCommit: () => void) {
      if (!targets.length) {
        cancel();
        try { onCommit(); return Promise.resolve(); } catch (error) { return Promise.reject(error); }
      }
      return new Promise<void>((resolve, reject) => { start(targets, onCommit, scene, { resolve, reject }); });
    },
    report(token: number, id: string, error?: string) {
      if (snapshot?.token !== token || snapshot.status !== "pending" || !snapshot.targets.has(id)) return;
      if (error !== undefined) { fail(token, error); return; }
      passed.add(id);
      if (passed.size !== snapshot.targets.size) return;
      // Let all boundaries report errors before committing a batch, including
      // failures in layout effects that occur later in the same React commit.
      queueMicrotask(() => {
        if (snapshot?.token !== token || snapshot.status !== "pending") return;
        if (snapshot.continuous) { stopTimer(); return; }
        const apply = commit;
        // A successful publication can synchronously cancel the old preview
        // during React cleanup. Detach its completion before invoking it.
        const settled = completion; completion = undefined;
        stopTimer(); commit = undefined;
        try { apply?.(); } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          fail(token, message); settled?.reject(new Error(message)); return;
        }
        settled?.resolve();
        // A callback may synchronously start a newer edit; never clear it.
        if (snapshot?.token === token) { snapshot = null; passed.clear(); emit(); }
      });
    },
  };
}

export type ComponentPreviewStore = ReturnType<typeof createComponentPreviewStore>;
