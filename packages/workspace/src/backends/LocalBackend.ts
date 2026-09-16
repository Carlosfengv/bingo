/*
 * Local backend.
 *
 * Implements the editor backend contract through the local Electron store.
 *
 * Return shapes preserve the editor backend contract:
 * callers branch on `success`, read `error`, and in several places treat the
 * result as raw JSON. Diverging here breaks them silently.
 *
 * `projectId` is the project's absolute folder path in local mode.
 */
import { queryClient } from "../queryClient";

const invoke = (op, root, args = {}) =>
  window.api.invoke("bingo:store", { op, root, ...args });

function createLocalBackend(projectId, options = {}) {
  const root = projectId;
  const componentFilePaths = new Map();
  const canvasRevisions = new Map();

  /** Paths arrive either bare or prefixed with the project id. */
  const rel = (filePath) => {
    const value = String(filePath || "");
    const prefix = `${projectId}/`;
    return value.startsWith(prefix) ? value.slice(prefix.length) : value;
  };

  return {
    // ---------------------------------------------------------------- files
    loadFile: async (filePath) => {
      const raw = await invoke("read-file", root, { rel: rel(filePath) });
      if (raw == null) {
        return { success: false, error: `Failed to load ${filePath}: not found` };
      }
      return { success: true, filePath: rel(filePath), raw };
    },

    saveFile: async (opts) => {
      const target = rel(opts?.filePath);
      if (!target || opts?.code == null) {
        return { success: false, error: "Missing filePath or code" };
      }
      await invoke("write-file", root, { rel: target, content: opts.code });
      options.onFileChanged?.(target, opts.code);
      return { success: true, filePath: target, code: opts.code, instanceProps: opts.instanceProps };
    },

    readFileRaw: async (filePath) => {
      const raw = await invoke("read-file", root, { rel: rel(filePath) });
      if (raw == null) throw new Error(`Failed to read ${filePath}`);
      return raw;
    },

    writeFileRaw: async (filePath, content) => {
      await invoke("write-file", root, { rel: rel(filePath), content });
    },

    listFiles: async (dir = "", pattern = "") => {
      const files = await invoke("list-files", root, { dir: rel(dir), pattern });
      return files || [];
    },

    // Nothing to watch: the local compiler pushes its own change events.
    watchFiles: () => () => {},

    listFileVersions: async (componentName, filePath) => {
      const target = rel(filePath || componentFilePaths.get(componentName) || componentName);
      if (filePath) componentFilePaths.set(componentName, target);
      const versions = await invoke("file-versions", root, { rel: target });
      return { success: true, versions: versions || [] };
    },

    getFileVersionContent: async (_componentName, versionFilename, filePath) => {
      const content = await invoke("file-version-content", root, {
        rel: rel(filePath || componentFilePaths.get(_componentName) || _componentName),
        versionId: versionFilename,
      });
      if (content == null) return { success: false, error: "Version not found" };
      return { success: true, content };
    },

    restoreFileVersion: async (componentName, versionFilename, filePath) => {
      const result = await invoke("restore-file-version", root, {
        rel: rel(filePath || componentName),
        versionId: versionFilename,
      });
      return result?.success ? { success: true } : { success: false, error: result?.error };
    },

    // --------------------------------------------------------------- drafts
    loadDraft: async (componentName) => {
      const draft = await invoke("load-draft", root, { componentName });
      if (!draft) return { success: true, draft: null, sourceModifiedSinceDraft: false };
      return { success: true, draft, sourceModifiedSinceDraft: false };
    },

    saveDraft: async (params) => {
      const draft = await invoke("save-draft", root, { params });
      return { success: true, draft };
    },

    deleteDraft: async (componentName) => {
      await invoke("delete-draft", root, { componentName });
      return { success: true };
    },

    listDrafts: async () => {
      const drafts = await invoke("list-drafts", root);
      return { success: true, drafts: drafts || [] };
    },

    listDraftVersions: async (componentName) => {
      const versions = await invoke("draft-versions", root, { componentName });
      return { success: true, versions: versions || [] };
    },

    getDraftVersion: async (_componentName, versionFilename) => {
      const version = await invoke("draft-version", root, {
        componentName: _componentName,
        versionId: versionFilename,
      });
      if (!version) return { success: false, error: "Version not found" };
      return { success: true, version };
    },

    restoreDraftVersion: async (componentName, versionFilename) => {
      const result = await invoke("restore-draft-version", root, {
        componentName,
        versionId: versionFilename,
      });
      return result?.success ? result : { success: false, error: result?.error || "Version not found" };
    },

    // -------------------------------------------------------------- canvases
    createPage: async (params) => {
      const page = await invoke("create-page", root, { params });
      if (!page?.id) {
        return { success: false, error: "Local store created a page without an id" };
      }
      if (page._revision) canvasRevisions.set(page.id, page._revision);
      return { success: true, page, id: page?.id };
    },

    deletePage: async (pageId) => {
      await invoke("delete-page", root, { pageId });
      canvasRevisions.delete(pageId);
      return { success: true };
    },

    savePreview: async (dataUrl) => {
      await invoke("save-preview", root, { dataUrl });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      return { success: true };
    },

    saveCanvas: async (params) => {
      if (!params?.id) return { success: false, error: "Canvas id is required" };
      try {
        const canvas = await invoke("save-canvas", root, {
          params: { ...params, _expectedRevision: canvasRevisions.get(params.id) }
        });
        if (canvas?._revision) canvasRevisions.set(params.id, canvas._revision);
        return { success: true, canvas };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },

    loadCanvas: async (canvasId) => {
      const canvas = await invoke("load-canvas", root, { pageId: canvasId });
      if (!canvas) return { success: false, error: "Canvas not found" };
      if (canvas._revision) canvasRevisions.set(canvasId, canvas._revision);
      return { success: true, canvas };
    },

    listCanvases: async () => {
      try {
        const rows = await invoke("list-canvases", root);
        for (const page of rows || []) if (page?._revision) canvasRevisions.set(page.id, page._revision);
        const canvases = (rows || []).map((p) => ({ ...(p.canvas || {}), id: p.id, name: p.name, sortOrder: p.sortOrder }));
        return { success: true, canvases };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error), canvases: [] };
      }
    },

    reorderPages: async (order) => {
      await invoke("reorder-pages", root, { order });
      return { success: true };
    },

    createComponent: async (params) => {
      const result = await invoke("create-component", root, {
        path: params?.path ?? params?.filePath,
        content: params?.code ?? params?.content ?? "",
        componentName: params?.componentName,
      });
      return { success: true, componentName: params?.componentName, path: result?.path };
    },

    listCanvasVersions: async (canvasId) => {
      const versions = await invoke("canvas-versions", root, { pageId: canvasId });
      return { success: true, versions: versions || [] };
    },

    getCanvasVersion: async (_canvasId, versionFilename) => {
      const version = await invoke("canvas-version", root, { pageId: _canvasId, versionId: versionFilename });
      if (!version) return { success: false, error: "Version not found" };
      return { success: true, version };
    },

    restoreCanvasVersion: async (canvasId, versionFilename) => {
      const result = await invoke("restore-canvas-version", root, {
        pageId: canvasId,
        versionId: versionFilename,
      });
      return result?.success ? { success: true, canvas: result } : { success: false, error: result?.error };
    },

    // -------------------------------------------------------------- assets
    uploadAsset: async (file, filename) => {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const saved = await invoke("upload-asset", root, {
        filename,
        dataBase64: btoa(binary),
      });
      return { success: true, url: saved?.url };
    },

    // --------------------------------------------------------------- chats
    // `chat` is deliberately absent: ElectronBackend adds the selected AI agent,
    // streaming from the local Claude CLI. An async generator here would make
    // the bundler inject Babel's `_OverloadYield` helper -- see RECOVERY.md.

    chatPersistenceMode: "main-v2",

    listChats: async (opts) => {
      const chats = await invoke("list-chats", root, { opts });
      if (!Array.isArray(chats)) return [];
      return Promise.all(chats.map(async (chat) => {
        try {
          return await invoke("get-chat", root, { chatId: chat.id, opts: { limit: 500 } });
        } catch {
          return chat;
        }
      }));
    },

    getChat: async (chatId, opts) => {
      return invoke("get-chat", root, { chatId, opts });
    },

    getChatMessage: (chatId, messageId) => invoke("get-chat-message", root, { chatId, messageId }),
    getChatMessageBody: (chatId, messageId, opts) => invoke("get-chat-message-body", root, { chatId, messageId, opts }),

    createChat: async (input) => {
      const chat = await invoke("create-chat", root, { input });
      return chat;
    },

    editChatMessage: async (chatId, input) => {
      return invoke("edit-chat-message", root, { chatId, ...input });
    },

    deleteChatMessage: async (chatId, input) => {
      return invoke("delete-chat-message", root, { chatId, ...input });
    },

    pinChatConstraint: async (chatId, input) => {
      return invoke("pin-chat-constraint", root, { chatId, input });
    },

    resolveChatConstraint: async (chatId, input) => {
      return invoke("resolve-chat-constraint", root, { chatId, input });
    },

    updateChatTitle: async (chatId, title) => {
      await invoke("update-chat-title", root, { chatId, title });
    },

    archiveChat: async (chatId) => {
      await invoke("archive-chat", root, { chatId });
    },

    restoreChat: async (chatId) => {
      return invoke("restore-chat", root, { chatId });
    },

    deleteChat: async (chatId, options) => {
      await invoke("delete-chat", root, { chatId, ...options });
    },

    listProjectMemory: async (opts) => invoke("list-project-memory", root, { opts }),
    getProjectMemory: async (id) => invoke("get-project-memory", root, { id }),
    upsertProjectMemory: async (input) => invoke("upsert-project-memory", root, { input }),
    deleteProjectMemory: async (input) => invoke("delete-project-memory", root, { input }),
    undoProjectMemory: async (input) => invoke("undo-project-memory", root, { input }),
  };
}

export { createLocalBackend };
