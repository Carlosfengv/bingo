import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes } from "node:crypto";

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
let starting = null;
const eventClients = new Set();
const grants = new Map();
const readOperations = new Set(["list-canvases", "load-canvas", "read-settings", "read-file", "load-draft", "list-drafts", "read-variable-library", "read-prototype-theme-preference"]);

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
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
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("Preview request is too large");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function invokeBrowserBridge(channel, args, grant) {
  if (args?.root && args.root !== grant.projectId) throw new Error("Preview project mismatch");
  if (channel === "bingo:api-fetch") {
    const requestedPath = new URL(args?.path || "/", "http://bingo.local").pathname;
    if ((args?.init?.method || "GET").toUpperCase() !== "GET" ||
        !decodeURIComponent(requestedPath).startsWith(`/projects/${grant.projectId}/`)) throw new Error("Preview is read-only");
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
  if (channel === "bingo:store") {
    if (args?.op === "list-chats") return [];
    if (!readOperations.has(args?.op)) throw new Error("Preview is read-only");
    return invokeLocalStore({ ...args, root: grant.projectId });
  }
  if (channel === "bingo:builder-connect" || channel === "bingo:builder-disconnect") {
    if (typeof args?.sessionId !== "string" || !args.sessionId) throw new Error("Missing preview session");
    const sessionId = `${grant.token}:${args.sessionId}`;
    const params = { root: grant.projectId, sessionId };
    if (channel === "bingo:builder-connect") {
      grant.sessions.add(sessionId);
      return connectLocalBuilder(params);
    }
    grant.sessions.delete(sessionId);
    return disconnectLocalBuilder(params);
  }
  if (channel === "bingo:load-module") return loadLocalModule({ ...args, root: grant.projectId });
  if (channel === "bingo:locale-get") return { resolvedLocale: grant.locale, revision: 0 };
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
      "Referrer-Policy": "same-origin",
    });
    res.end(data);
  });
}

async function serveProjectAsset(res, grant, assetPath) {
  const portable = /^bingo-asset:([a-f0-9]{64}\.[a-z0-9]{1,12})$/i.exec(assetPath);
  const root = await fs.promises.realpath(grant.projectId);
  const assetRoot = await fs.promises.realpath(path.join(root, portable ? ".bingo/design/assets" : "public"));
  const file = await fs.promises.realpath(path.join(assetRoot, portable ? portable[1] : assetPath.replace(/^\/+/, "")));
  if (!assetRoot.startsWith(root + path.sep) || !file.startsWith(assetRoot + path.sep)) throw new Error("Forbidden asset path");
  const bytes = await fs.promises.readFile(file);
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(bytes);
}

function broadcastBrowserEvent(channel, event) {
  for (const client of eventClients) {
    if (event.projectId !== client.grant.projectId) continue;
    if (event.sessionId && !client.grant.sessions.has(event.sessionId)) continue;
    const next = event.sessionId ? { ...event, sessionId: event.sessionId.slice(client.grant.token.length + 1) } : event;
    client.res.write(`data: ${JSON.stringify({ channel, args: [next] })}\n\n`);
  }
}

subscribeLocalBuilderEvents(event => broadcastBrowserEvent("bingo:builder-event", event));

async function startPresentationServer(rendererRoot) {
  if (server && port) return port;
  if (starting) return starting;
  server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (req.headers.host !== `127.0.0.1:${port}`) return sendJson(res, 403, { error: "Invalid preview host" });
      if (req.headers.origin && req.headers.origin !== `http://127.0.0.1:${port}`) return sendJson(res, 403, { error: "Invalid preview origin" });
      const token = req.headers.authorization?.replace(/^Bearer /, "") || url.searchParams.get("token");
      const grant = grants.get(token);
      if (url.pathname.startsWith("/__luna/") && !grant) return sendJson(res, 403, { error: "Preview expired. Reopen it from Bingo." });
      if (req.method === "GET" && url.pathname === "/__luna/asset") {
        await serveProjectAsset(res, grant, url.searchParams.get("path") || "");
        return;
      }
      if (req.method === "GET" && url.pathname === "/__luna/events") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        res.write(": connected\n\n");
        const client = { res, grant };
        eventClients.add(client);
        req.on("close", () => {
          eventClients.delete(client);
          if (![...eventClients].some(other => other.grant === grant)) {
            for (const sessionId of grant.sessions) disconnectLocalBuilder({ root: grant.projectId, sessionId });
            grant.sessions.clear();
          }
        });
        return;
      }
      if (req.method === "POST" && url.pathname === "/__luna/invoke") {
        const { channel, args } = await readJson(req);
        sendJson(res, 200, { result: await invokeBrowserBridge(channel, args, grant) });
        return;
      }
      if (req.method === "GET") {
        // Compiled components can contain plain /image.png URLs, bypassing the canvas resolver.
        const referringUrl = req.headers.referer ? new URL(req.headers.referer) : null;
        const assetGrant = referringUrl?.origin === `http://127.0.0.1:${port}` ? grants.get(referringUrl.searchParams.get("token")) : null;
        const rendererAsset = /\/(assets|next-shims)\//.test(url.pathname) && fs.existsSync(rendererFile(rendererRoot, url.pathname));
        if (assetGrant && !rendererAsset && !url.pathname.startsWith("/proto/")) {
          await serveProjectAsset(res, assetGrant, decodeURIComponent(url.pathname));
          return;
        }
        serveRenderer(res, rendererRoot, url.pathname);
        return;
      }
      sendJson(res, 405, { error: "Method not allowed" });
    } catch (error) {
      sendJson(res, 500, { error: String(error?.message || error) });
    }
  });
  starting = new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      port = server.address().port;
      resolve(port);
    });
  });
  try { return await starting; }
  finally { starting = null; }
}

function stopPresentationServer() {
  for (const grant of grants.values()) {
    for (const sessionId of grant.sessions) disconnectLocalBuilder({ root: grant.projectId, sessionId });
  }
  for (const client of eventClients) client.res.end();
  eventClients.clear();
  grants.clear();
  server?.close();
  server = null;
  port = 0;
}

async function getPresentationUrl(rendererRoot, params) {
  const activePort = await startPresentationServer(rendererRoot);
  const token = randomBytes(24).toString("hex");
  grants.set(token, { ...params, token, sessions: new Set() });
  const url = new URL(`/proto/${encodeURIComponent(params.projectId)}`, `http://127.0.0.1:${activePort}`);
  url.searchParams.set("presentation", "1");
  url.searchParams.set("token", token);
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
