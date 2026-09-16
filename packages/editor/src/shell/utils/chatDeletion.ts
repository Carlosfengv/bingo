/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/chatDeletion.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/** Pending deletions survive closing the archive; successful ones stay hidden from stale lists. */
var ChatDeletionQueue = class {
  constructor(backend) {
    this.backend = backend;
    this.hiddenIds = new Set();
    this.listeners = new Set();
    this.getSnapshot = () => this.hiddenIds;
    this.subscribe = listener => {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    };
  }
  hide(id, hidden) {
    const next = new Set(this.hiddenIds);
    if (hidden) next.add(id);else next.delete(id);
    this.hiddenIds = next;
    this.listeners.forEach(listener => listener());
  }
  begin(id) {
    const remove = this.backend?.deleteChat;
    if (!remove || this.hiddenIds.has(id)) return null;
    this.hide(id, true);
    let status = "waiting";
    return {
      undo: () => {
        if (status !== "waiting") return;
        status = "cancelled";
        this.hide(id, false);
      },
      commit: async () => {
        if (status !== "waiting") return;
        status = "committing";
        try {
          await remove.call(this.backend, id);
          status = "done";
        } catch (error) {
          status = "done";
          this.hide(id, false);
          throw error;
        }
      }
    };
  }
};
var queues = new WeakMap();
var unavailableQueue = new ChatDeletionQueue(null);
function getChatDeletionQueue(backend) {
  if (!backend) return unavailableQueue;
  let queue = queues.get(backend);
  if (!queue) {
    queue = new ChatDeletionQueue(backend);
    queues.set(backend, queue);
  }
  return queue;
}

export { getChatDeletionQueue };
