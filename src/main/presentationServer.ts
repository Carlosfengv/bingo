import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";

import { localApiFetch } from "./localApiFetch";
import { invokeLocalStore } from "./localStore";
import {
  connectLocalBuilder,
  disconnectLocalBuilder,
  loadLocalModule,
  subscribeLocalBuilderEvents,
} from "./localCompiler";

let server = null;
let port = 0;
const eventClients = new Set();

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function invokeBrowserBridge(channel, args) {
  if (channel === "bingo:api-fetch") {
    const result = await localApiFetch(args?.path || "/", args?.init);
    const response = result ?? {
      status: 501,
      text: async () => JSON.stringify({ error: `Unavailable local route: ${args?.path || "/"}` }),
    };
    return {
      status: response.status,
      body: await response.text(),
      headers: { "Content-Type": "application/json" },
    };
  }
  if (channel === "bingo:store") return invokeLocalStore(args);
  if (channel === "bingo:builder-connect") return connectLocalBuilder(args);
  if (channel === "bingo:builder-disconnect") return disconnectLocalBuilder(args);
  if (channel === "bingo:load-module") return loadLocalModule(args);
  if (channel === "get_app_info") return { name: "Bingo", version: "local", isDevBuild: false };
  if (channel === "ai-config:get") return { agent: "claude" };
  if (channel === "agent:check-status") return null;
  if (channel === "get:mcp-info") return { healthy: false, url: "" };
  if (channel === "get_pending_deep_link" || channel === "get-pending-update") return null;
  if (channel === "set_project_id" || channel === "set_allowed_paths") return { success: true };
  return null;
}

function rendererFile(rendererRoot, pathname) {
  const assetsAt = pathname.indexOf("/assets/");
  if (assetsAt >= 0) return path.join(rendererRoot, pathname.slice(assetsAt + 1));
  const shimsAt = pathname.indexOf("/next-shims/");
  if (shimsAt >= 0) return path.join(rendererRoot, pathname.slice(shimsAt + 1));
  return path.join(rendererRoot, "index.html");
}

function serveRenderer(res, rendererRoot, pathname) {
  const file = rendererFile(rendererRoot, pathname);
  const resolved = path.resolve(file);
  if (!resolved.startsWith(`${path.resolve(rendererRoot)}${path.sep}`) && resolved !== path.resolve(rendererRoot, "index.html")) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  fs.readFile(resolved, (error, data) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(resolved)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

function broadcastBrowserEvent(channel, ...args) {
  const payload = `data: ${JSON.stringify({ channel, args })}\n\n`;
  for (const client of eventClients) client.write(payload);
}

subscribeLocalBuilderEvents(event => broadcastBrowserEvent("bingo:builder-event", event));

async function startPresentationServer(rendererRoot) {
  if (server && port) return port;
  server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (req.method === "GET" && url.pathname === "/__luna/events") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        res.write(": connected\n\n");
        eventClients.add(res);
        req.on("close", () => eventClients.delete(res));
        return;
      }
      if (req.method === "POST" && url.pathname === "/__luna/invoke") {
        const { channel, args } = await readJson(req);
        sendJson(res, 200, { result: await invokeBrowserBridge(channel, args) });
        return;
      }
      if (req.method === "GET") {
        serveRenderer(res, rendererRoot, url.pathname);
        return;
      }
      sendJson(res, 405, { error: "Method not allowed" });
    } catch (error) {
      sendJson(res, 500, { error: String(error?.message || error) });
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  port = server.address().port;
  console.log(`[Presentation] Server listening on http://127.0.0.1:${port}`);
  return port;
}

function stopPresentationServer() {
  for (const client of eventClients) client.end();
  eventClients.clear();
  server?.close();
  server = null;
  port = 0;
}

async function getPresentationUrl(rendererRoot, params) {
  const activePort = await startPresentationServer(rendererRoot);
  const url = new URL(`/proto/${encodeURIComponent(params.projectId)}`, `http://127.0.0.1:${activePort}`);
  url.searchParams.set("presentation", "1");
  url.searchParams.set("project", params.projectId);
  if (params.elementId) url.searchParams.set("element", params.elementId);
  if (params.pageId) url.searchParams.set("page", params.pageId);
  const theme = themeSelectionQueryValue(params.themeSelection);
  if (theme) url.searchParams.set("theme", theme);
  return url.toString();
}

function themeSelectionQueryValue(selection) {
  if (selection?.kind === "system") return "system";
  if (selection?.kind === "theme" && typeof selection.themeId === "string" && selection.themeId) return selection.themeId;
  return null;
}

export { getPresentationUrl, startPresentationServer, stopPresentationServer, themeSelectionQueryValue };
