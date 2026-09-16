/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/chatPersistence.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/** Serializes saves and archive operations so a late save cannot recreate a closed chat. */
var ChatPersistence = class {
  constructor(backend) {
    this.backend = backend;
    this.mainV2 = backend?.chatPersistenceMode === "main-v2";
    this.ids = new Map();
    this.queues = new Map();
    this.archived = new Set();
    this.renamedTitles = new Map();
  }
  idFor(id) {
    return this.ids.get(id) ?? (id.startsWith("local-") ? null : id);
  }
  isArchived(id) {
    return this.archived.has(id);
  }
  enqueue(id, run) {
    const result = (this.queues.get(id) ?? Promise.resolve()).catch(() => {}).then(run);
    this.queues.set(id, result);
    const cleanup = () => {
      if (this.queues.get(id) === result) this.queues.delete(id);
    };
    result.then(cleanup, cleanup);
    return result;
  }
  async saveNow(tab, limit = 500) {
    const title = this.renamedTitles.get(tab.id) ?? tab.title;
    const messages = tab.messages.slice(-limit).map(({
      screenshots: _screenshots,
      ...message
    }) => message);
    const id = this.idFor(tab.id);
    if (!id && this.backend?.createChat) {
      const result = await this.backend.createChat({
        title: title ?? void 0,
        messages
      });
      this.ids.set(tab.id, result.id);
      return result.id;
    }
    if (id && this.backend?.updateChatMessages) {
      await this.backend.updateChatMessages(id, messages);
      if (title && this.backend.updateChatTitle) await this.backend.updateChatTitle(id, title);
    }
    return id;
  }
  save(tab) {
    if (this.mainV2) return Promise.resolve(this.idFor(tab.id));
    return this.enqueue(tab.id, () => this.archived.has(tab.id) ? Promise.resolve(this.idFor(tab.id)) : this.saveNow(tab));
  }
  rename(tab, title) {
    this.renamedTitles.set(tab.id, title);
    if (this.mainV2) return this.backend?.updateChatTitle ? this.backend.updateChatTitle(this.idFor(tab.id) ?? tab.id, title) : Promise.resolve(this.idFor(tab.id));
    return this.save({
      ...tab,
      title
    });
  }
  async archive(tab) {
    if (!this.backend?.archiveChat || !this.backend.restoreChat) throw new Error("Chat archiving is unavailable.");
    if (this.archived.has(tab.id)) throw new Error("This chat is already being archived.");
    this.archived.add(tab.id);
    try {
      return await this.enqueue(tab.id, async () => {
        const id = this.mainV2 ? this.idFor(tab.id) ?? tab.id : await this.saveNow(tab, 500);
        if (!id) throw new Error("Could not save the chat before archiving.");
        await this.backend.archiveChat(id);
        return id;
      });
    } catch (error) {
      this.archived.delete(tab.id);
      throw error;
    }
  }
  async restore(id) {
    if (!this.backend?.restoreChat) throw new Error("Chat restore is unavailable.");
    const chat = await this.backend.restoreChat(id);
    this.archived.delete(id);
    for (const [localId, dbId] of this.ids) if (dbId === id) this.archived.delete(localId);
    return chat;
  }
};

export { ChatPersistence };
