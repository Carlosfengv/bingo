/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: src/renderer/src/main.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import "./presentationBridge";
import { App } from "./App";
import { queryClient } from "@bingo/workspace";
import { createInteropJsxRuntime } from "@bingo/compiler";
import { captureElementImage, resolveCaptureElement, acquireProjectRender, waitForProjectRenderReady } from "@bingo/editor";
import { appI18n, changeLanguage, I18nextProvider, initializeI18n, normalizeSupportedLocale } from "@bingo/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import * as import_react from "react";
import * as import_react_dom from "react-dom";
import * as import_client from "react-dom/client";
import * as import_server_browser from "react-dom/server";
import * as import_jsx_runtime from "react/jsx-runtime";

var ReactDOM = {
  ...import_react_dom,
  ...import_client
};
window.React = import_react.default;
window.ReactDOM = import_react_dom;
window.ReactDOMClient = import_client;
window.__BINGO_REACT_DOM_SERVER__ = import_server_browser;
window.__BINGO_REACT_JSX_RUNTIME__ = createInteropJsxRuntime(import_jsx_runtime, {
  resolveAsset: url => window.__BINGO_RESOLVE_ASSET__?.(url) ?? url
});
async function boot() {
  let latestLocaleState = null;
  let initialized = false;
  window.api?.on?.("bingo:locale-changed", state => {
    if (!state || (latestLocaleState && state.revision <= latestLocaleState.revision)) return;
    latestLocaleState = state;
    if (initialized) void changeLanguage(state.resolvedLocale);
  });

  let initialLocaleState = null;
  try {
    initialLocaleState = await window.api?.invoke?.("bingo:locale-get");
  } catch (error) {
    console.warn("[i18n] Could not read the saved language preference:", error);
  }
  if (!latestLocaleState || (initialLocaleState?.revision ?? -1) > latestLocaleState.revision) {
    latestLocaleState = initialLocaleState;
  }
  const fallbackLocale = (navigator.languages ?? [navigator.language])
    .map(normalizeSupportedLocale)
    .find(Boolean) ?? "en";
  await initializeI18n(latestLocaleState?.resolvedLocale ?? fallbackLocale);
  initialized = true;
  if (latestLocaleState?.resolvedLocale && appI18n.resolvedLanguage !== latestLocaleState.resolvedLocale) {
    await changeLanguage(latestLocaleState.resolvedLocale);
  }

  ReactDOM.createRoot(document.getElementById("bingo-root")).render(
    <import_react.StrictMode>
      <I18nextProvider i18n={appI18n}>
        <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
      </I18nextProvider>
    </import_react.StrictMode>
  );
}
boot().catch(err => {
  console.error("[boot] Failed to initialize:", err);
  const root = document.getElementById("bingo-root");
  if (root) root.textContent = appI18n.isInitialized
    ? appI18n.t("error.startup", { ns: "app" })
    : "Bingo couldn't start. Restart the app and try again.";
});
/**
* Bounds in the top-level renderer viewport for Electron's native capturePage.
* Elements commonly live in the same-origin canvas iframe, so accumulate each
* containing frame's offset before clipping to the visible window.
*/
function nativeCaptureRect(el) {
  el = resolveCaptureElement(el);
  const rect = el.getBoundingClientRect();
  let left = rect.left;
  let top = rect.top;
  let ownerWindow = el.ownerDocument.defaultView;
  while (ownerWindow && ownerWindow !== window) {
    const frame = ownerWindow.frameElement;
    if (!frame) return null;
    const frameRect = frame.getBoundingClientRect();
    left += frameRect.left + frame.clientLeft;
    top += frameRect.top + frame.clientTop;
    ownerWindow = frame.ownerDocument.defaultView;
  }
  const x = Math.max(0, Math.floor(left));
  const y = Math.max(0, Math.floor(top));
  const right = Math.min(window.innerWidth, Math.ceil(left + rect.width));
  const bottom = Math.min(window.innerHeight, Math.ceil(top + rect.height));
  if (right <= x || bottom <= y) return null;
  return {
    x,
    y,
    width: right - x,
    height: bottom - y
  };
}
if (window.api?.on) window.api.on("screenshot_request_mcp", async event => {
  const releaseRender = acquireProjectRender();
  try {
    await waitForProjectRenderReady();
    let el = null;
    if (event.elementId) {
      el = document.querySelector(`[data-element-id="${event.elementId}"]`);
      if (!el) for (const iframe of Array.from(document.querySelectorAll("iframe"))) try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
          const found = iframeDoc.querySelector(`[data-element-id="${event.elementId}"]`);
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
      const dataUrl = await captureElementImage(el, {
        timeoutMs: 7e3
      });
      window.api.send("screenshot_result", {
        requestId: event.requestId,
        dataUrl
      });
      return;
    } catch (err) {
      console.warn("[MCP Screenshot] DOM capture failed:", err);
      window.api.send("screenshot_result", {
        requestId: event.requestId,
        nativeCaptureRect: nativeCaptureRect(el),
        captureError: err instanceof Error ? err.message : String(err)
      });
      return;
    }
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
    console.warn("[MCP Screenshot] Failed:", err);
    window.api.send("screenshot_result", {
      requestId: event.requestId,
      dataUrl: null
    });
  } finally { releaseRender(); }
});
