type Revision<T> = { version: number; value: T };
type Entry<T> = {
  latest: Revision<T>;
  saved: number;
  timer?: ReturnType<typeof setTimeout>;
  running?: Promise<void>;
};

/** One writer per document. Preparing/serializing a snapshot happens only when
 * its debounce expires or a caller explicitly flushes. Edits during a write
 * replace the pending snapshot, never the write already in flight.
 */
export function createVersionedSaveQueue<T>(options: {
  delayMs: number;
  equal: (before: T, after: T) => boolean;
  save: (key: string, value: T, version: number) => Promise<void>;
  onError?: (error: unknown) => void;
}) {
  const entries = new Map<string, Entry<T>>();
  let disposed = false;
  let nextVersion = 0;
  const dirty = (entry: Entry<T>) => entry.saved !== entry.latest.version;
  const cancelTimer = (entry: Entry<T>) => {
    if (entry.timer !== undefined) clearTimeout(entry.timer);
    entry.timer = undefined;
  };
  function run(key: string, entry: Entry<T>): Promise<void> {
    cancelTimer(entry);
    if (entry.running) return entry.running;
    const work = async () => {
      while (!disposed && entries.get(key) === entry && dirty(entry)) {
        const snapshot = entry.latest;
        await options.save(key, snapshot.value, snapshot.version);
        entry.saved = snapshot.version;
      }
    };
    // Install the running promise before invoking user code, including a save
    // callback that updates the document or synchronously throws.
    entry.running = Promise.resolve().then(work).finally(() => { entry.running = undefined; });
    return entry.running;
  }
  return {
    update(key: string, value: T) {
      if (disposed) return;
      let entry = entries.get(key);
      if (entry && options.equal(entry.latest.value, value)) return;
      if (!entry) {
        entry = { latest: { version: ++nextVersion, value }, saved: 0 };
        entries.set(key, entry);
      } else entry.latest = { version: ++nextVersion, value };
      cancelTimer(entry);
      if (!entry.running) entry.timer = setTimeout(() => {
        void run(key, entry!).catch(error => options.onError?.(error));
      }, options.delayMs);
    },
    hasPending() { return [...entries.values()].some(dirty); },
    isCurrent(key: string, version: number) { return entries.get(key)?.latest.version === version; },
    async flush() {
      // Re-scan after each await: another page or revision may arrive while
      // saving. A rejection leaves the revision dirty for an explicit retry.
      while (!disposed) {
        const pending = [...entries].filter(([, entry]) => dirty(entry));
        if (!pending.length) return;
        await Promise.all(pending.map(([key, entry]) => run(key, entry)));
      }
    },
    async remove(key: string) {
      const entry = entries.get(key);
      if (!entry) return;
      cancelTimer(entry);
      entries.delete(key);
      // Deletion must wait for a write already sent to the backend, otherwise
      // that write could resurrect the removed page.
      await entry.running?.catch(() => {});
    },
    dispose() {
      disposed = true;
      for (const entry of entries.values()) cancelTimer(entry);
      entries.clear();
    },
  };
}
