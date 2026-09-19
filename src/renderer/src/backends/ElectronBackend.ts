import { acquireProjectRender, waitForProjectRenderReady } from "@bingo/editor";
/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: src/renderer/src/backends/ElectronBackend.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { createLocalBackend } from "@bingo/workspace";
import { captureElementImage } from "@bingo/editor";

/**
* Electron backend: local storage plus the selected local/API coding agent.
*/
/**
* Strip non-serializable values (functions) from a flat list of FEElement
* (used for `attachedElements` on chat options — those are individual
* elements from selections, not a Store payload).
*
* For canvas wire payloads (StoreWireV2), `toWire` already strips at the
* conversion boundary; callers don't need to re-strip.
*/
function stripNonSerializable(elements) {
  return elements.map(el => {
    const cleaned = {};
    for (const key of Object.keys(el)) {
      if (key === "componentRef" || key === "isRegistered") continue;
      const val = el[key];
      if (typeof val === "function") continue;
      if (key === "children" && Array.isArray(val)) cleaned.children = stripNonSerializable(val);else if (key === "props" && val && typeof val === "object") {
        const cleanedProps = {};
        for (const [pk, pv] of Object.entries(val)) if (typeof pv !== "function") cleanedProps[pk] = pv;
        cleaned.props = cleanedProps;
      } else cleaned[key] = val;
    }
    return cleaned;
  });
}
function createElectronBackend(projectId, options = {}) {
  const local = createLocalBackend(projectId, options);
  const unsubFileChanged = window.api.on("file_changed", event => {
    if (String(event.projectId) === String(projectId) && event.filePath && event.content) options.onFileChanged?.(event.filePath, event.content, event.isNew);
  });
  const unsubSettingsChanged = window.api.on("settings_changed", event => {
    if (String(event.projectId) === String(projectId) && event.key) options.onSettingsChanged?.(event.key);
  });
  return {
    ...local,
    dispose: () => {
      unsubFileChanged();
      unsubSettingsChanged();
    },
    saveFile: async opts => {
      try {
        const elements = Array.isArray(opts.elements) ? stripNonSerializable(opts.elements) : opts.elements;
        const result = await window.api.invoke("save_file", {
          projectId,
          options: {
            ...opts,
            elements
          }
        });
        if (result.success && result.code && result.filePath) await options.onFileChanged?.(result.filePath, result.code);
        return result;
      } catch (error) {
        return {
          success: false,
          error: String(error)
        };
      }
    },
    generateChatTitle: input => window.api.invoke("ai_chat_title", input),
    async *chat(messages, _tools, chatOptions) {
      const eventChannel = `chat-stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const sessionId = crypto.randomUUID();
      const queue = [];
      let resolve = null;
      let finished = false;
      const wake = () => {
        if (resolve) {
          resolve();
          resolve = null;
        }
      };
      const onAbort = () => {
        window.api.invoke("ai_chat_cancel", {
          sessionId
        });
        finished = true;
        queue.push({
          type: "done"
        });
        wake();
      };
      if (chatOptions?.signal?.aborted) return;
      chatOptions?.signal?.addEventListener("abort", onAbort);
      const unsub = window.api.on(eventChannel, event => {
        if (event.type === "run_started") queue.push({
          type: "run_started",
          chatId: event.chatId,
          chatTabId: event.chatTabId,
          runId: event.runId,
          assistantMessageId: event.assistantMessageId,
          revision: event.revision
        });else if (event.type === "run_saved") queue.push({
          type: "run_saved",
          chatId: event.chatId,
          runId: event.runId,
          assistantMessageId: event.assistantMessageId,
          revision: event.revision
        });else if (event.type === "persistence_error") queue.push({
          type: "persistence_error",
          message: event.message
        });else if (event.type === "text") queue.push({
          type: "text",
          text: event.content
        });else if (event.type === "thinking") queue.push({
          type: "thinking",
          text: event.content
        });else if (event.type === "thinking_progress") queue.push({
          type: "thinking_progress",
          tokens: event.tokens
        });else if (event.type === "tool_activity") queue.push({
          type: "tool_use",
          id: event.id || "",
          name: event.name,
          input: event.input
        });else if (event.type === "tool_approval") queue.push({
          type: "tool_approval",
          approvalId: event.approvalId,
          toolName: event.toolName,
          args: event.args,
          origin: event.origin
        });else if (event.type === "mcp_tool_result") queue.push({
          type: "mcp_tool_result",
          name: event.name,
          args: event.args,
          success: event.success,
          error: event.error,
          createdElementIds: event.createdElementIds,
          operation: event.operation,
          reason: event.reason
        });else if (event.type === "done" || event.type === "cancelled") {
          queue.push({
            type: "done"
          });
          finished = true;
        } else if (event.type === "error") {
          queue.push({
            type: "error",
            error: event.message || event.error || "Unknown error",
            errorInfo: event.errorInfo
          });
          finished = true;
        } else if (event.type === "screenshot_request") {
          const captureScreenshot = async () => {
            const releaseRender = acquireProjectRender();
            try {
              await waitForProjectRenderReady();
              const elementId = event.elementId;
              let el = null;
              if (elementId) {
                el = document.querySelector(`[data-element-id="${elementId}"]`);
                if (!el) for (const iframe of Array.from(document.querySelectorAll("iframe"))) try {
                  const iframeDoc = iframe.contentDocument;
                  if (iframeDoc) {
                    const found = iframeDoc.querySelector(`[data-element-id="${elementId}"]`);
                    if (found) {
                      el = found;
                      break;
                    }
                  }
                } catch {}
              }
              if (!el) {
                window.api.send("screenshot_result", {
                  requestId: event.requestId,
                  dataUrl: null
                });
                return;
              }
              const iframeEl = el.querySelector("iframe");
              const iframeSrc = iframeEl?.src;
              let isCrossOrigin = false;
              if (iframeEl) {
                try {
                  iframeEl.contentDocument;
                } catch {
                  isCrossOrigin = true;
                }
                if (!iframeEl.contentDocument) isCrossOrigin = true;
              }
              if (!isCrossOrigin) try {
                const dataUrl = await captureElementImage(el);
                window.api.send("screenshot_result", {
                  requestId: event.requestId,
                  dataUrl
                });
                return;
              } catch {}
              if (iframeSrc) {
                const iframeWidth = iframeEl.offsetWidth || 1200;
                const iframeHeight = iframeEl.offsetHeight || 800;
                window.api.send("screenshot_result", {
                  requestId: event.requestId,
                  iframeUrl: iframeSrc,
                  iframeSize: {
                    width: iframeWidth,
                    height: iframeHeight
                  }
                });
              } else window.api.send("screenshot_result", {
                requestId: event.requestId,
                dataUrl: null
              });
            } catch (err) {
              console.warn("[Screenshot] Screenshot failed:", err);
              window.api.send("screenshot_result", {
                requestId: event.requestId,
                dataUrl: null
              });
            } finally { releaseRender(); }
          };
          captureScreenshot();
        } else if (event.type === "folder_access_needed") queue.push({
          type: "folder_access_needed",
          requestId: event.requestId,
          path: event.path
        });else if (event.type === "screenshot_captured") queue.push({
          type: "screenshot",
          dataUrl: event.dataUrl,
          elementId: event.elementId
        });else if (event.type === "debug") {}
        wake();
      });
      try {
        const {
          signal: _signal,
          ...ipcOptions
        } = chatOptions ?? {};
        window.api.invoke("ai_chat", {
          projectId,
          messages,
          sessionId,
          options: {
            ...ipcOptions,
            elements: chatOptions?.elements ? Array.isArray(chatOptions.elements) ? stripNonSerializable(chatOptions.elements) : chatOptions.elements : void 0,
            attachedElements: chatOptions?.attachedElements ? stripNonSerializable(chatOptions.attachedElements) : void 0
          },
          eventChannel
        }).catch(err => {
          queue.push({
            type: "error",
            error: String(err)
          });
          finished = true;
          wake();
        });
        while (!finished || queue.length > 0) {
          if (chatOptions?.signal?.aborted) return;
          if (queue.length === 0) await new Promise(r => {
            resolve = r;
          });
          while (queue.length > 0) {
            if (chatOptions?.signal?.aborted) return;
            const event = queue.shift();
            if (event.type === "done") {
              if (chatOptions?.signal?.aborted) return;
              await new Promise(r => setTimeout(r, 150));
              while (queue.length > 0) {
                const late = queue.shift();
                if (late.type !== "done") yield late;
              }
              return;
            }
            yield event;
          }
        }
      } finally {
        chatOptions?.signal?.removeEventListener("abort", onAbort);
        unsub();
      }
    }
  };
}

export { createElectronBackend };
