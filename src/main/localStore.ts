/*
 * Local store.
 *
 * Added on top of the recovered tree. Replaces everything the shipped app kept
 * on the vendor's servers: the project list, canvases, drafts, file and canvas
 * version history, chat transcripts and uploaded assets.
 *
 * Project data follows the repository inside .bingo/design. The app directory
 * only retains the project registry, device preferences and legacy backups.
 *
 *   .bingo/design/pages/<pageId>.json
 *   .bingo/design/canvases/<pageId>.versions/<version>.json
 *   .bingo/design/files/<hash>/<id>.json
 *   .bingo/design/drafts/<key>.json
 *   .bingo/design/chats/<chatId>.json
 *   .bingo/design/chat-data/<chatId>/...
 *   .bingo/design/assets/<filename>
 */

import { app, BrowserWindow, dialog, ipcMain } from "electron";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { configureProjectAccess, subscribeProjectAccessChanges } from "./projectAccess";
import { ChatStore } from "./chatStore";
import { ProjectMemoryStore } from "./projectMemory";
import { createIncident, recordDiagnosticEvent } from "./diagnosticsStore";
import {
  addProjectIconLibraries,
  applyProjectConfiguration,
  inspectProjectConfiguration,
  prepareProjectConfiguration,
  readEffectiveConfiguration,
  writeProjectConfiguration,
} from "./projectConfiguration";
import { readPrototypeThemePreference, writePrototypeThemePreference } from "./prototypeThemePreferences";
import { readProjectVariables, writeProjectVariables } from "./projectVariables";
import {
  deletePortablePage,
  hasPortableDesign,
  inspectPortableDesign,
  listPortablePages,
  readPortablePage,
  reorderPortablePages,
  savePortableAsset,
  savePortablePage,
} from "./projectDesignStore";
import { tNative } from "./localization";
import { watchPortableDesign } from "./projectDesignWatcher";
import { deleteProjectDesignData, ensureProjectDesignData, legacyProjectDataPath, projectDesignDataPath } from "./projectDesignData";
import { ensureProjectDesignIgnored } from "./projectGitIgnore";
import { discoverProjectIconLibraries } from "./projectIconDiscovery";
import { discoverProjectCandidates } from "./projectDiscovery";
import { getProjectAccessContext, getProjectAllowedPaths, setProjectAccessMode, setProjectAllowedPaths } from "./projectAccess";
import { inspectProjectEnvironment, prepareProjectEnvironment } from "./projectEnvironment";
import { inspectProjectPortability } from "./projectPortability";
import { projectForWebContents, windowForWebContents, broadcastToEditors } from "./windowManager";

const META = ".bingo";
const SKIP_DIRS = new Set(["node_modules", ".git", META, "dist", "build", "out", ".next"]);
const SOURCE_EXT = [
  ".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs",
  ".css", ".scss", ".sass", ".less",
  ".json", ".html", ".md", ".mdx", ".vue", ".svelte",
];
let chatLifecycleHook = null;

function setChatLifecycleHook(hook) {
  chatLifecycleHook = typeof hook === "function" ? hook : null;
}

// ---------------------------------------------------------------------------
// paths
// ---------------------------------------------------------------------------

const registryPath = () => path.join(app.getPath("userData"), "local-projects.json");

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function readRegistry() {
  const file = registryPath();
  if (!fs.existsSync(file)) return [];
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`The local project registry is damaged: ${String(error?.message || error)}`);
  }
  if (!Array.isArray(value)) throw new Error("The local project registry is damaged: expected a project list.");
  return value;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, "wx", 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, file);
  } finally {
    if (descriptor !== undefined) try { fs.closeSync(descriptor); } catch {}
    try { fs.unlinkSync(temporary); } catch {}
  }
}

function isInside(root, candidate) {
  return candidate === root || candidate.startsWith(root + path.sep);
}

/**
 * Resolve a renderer-supplied relative path without following a symbolic link
 * outside the project. For a new leaf, the closest existing parent is checked.
 */
function safeJoin(root, rel) {
  if (typeof rel !== "string" || rel.includes("\0")) throw new Error("A valid relative path is required.");
  const base = fs.realpathSync(root);
  const abs = path.resolve(base, rel || ".");
  if (!isInside(base, abs)) {
    throw new Error(`path escapes project root: ${rel}`);
  }
  let existing = abs;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  const realExisting = fs.realpathSync(existing);
  if (!isInside(base, realExisting)) throw new Error(`path escapes project root through a symbolic link: ${rel}`);
  if (fs.existsSync(abs)) {
    const realTarget = fs.realpathSync(abs);
    if (!isInside(base, realTarget)) throw new Error(`path escapes project root through a symbolic link: ${rel}`);
  }
  return abs;
}

const metaDir = (root) =>
  ensureProjectDesignData(root, app.getPath("userData"));
const metaPath = (root, ...parts) => path.join(metaDir(root), ...parts);
const chatStores = new Map();
const projectMemoryStores = new Map();
const removingProjects = new Set();
const pendingStoreOperations = new Map();

function chatStoreForRoot(root) {
  const verifiedRoot = assertRegisteredProjectRoot(root);
  const directory = metaDir(verifiedRoot);
  let store = chatStores.get(directory);
  if (!store) {
    store = new ChatStore(directory);
    chatStores.set(directory, store);
  }
  return store;
}

function projectMemoryStoreForRoot(root) {
  const verifiedRoot = assertRegisteredProjectRoot(root);
  const directory = metaDir(verifiedRoot);
  let store = projectMemoryStores.get(directory);
  if (!store) {
    store = new ProjectMemoryStore(directory, {
      evidenceResolver: async (authorization, evidence) => {
        const source = (evidence ?? []).find(ref => ref?.kind === "message" && ref.messageId === authorization.messageId && typeof ref.chatId === "string");
        if (!source) return false;
        const result = await chatStoreForRoot(verifiedRoot).searchHistory(source.chatId, { messageId: source.messageId });
        const message = result.results?.[0]?.message;
        return message?.role === "user" && typeof message.content === "string" && message.content.trim() === authorization.quote.trim();
      },
      dependencyResolver: async relativePath => {
        try {
          const content = await fs.promises.readFile(safeJoin(verifiedRoot, relativePath));
          return crypto.createHash("sha256").update(content).digest("hex");
        } catch {
          return null;
        }
      }
    });
    projectMemoryStores.set(directory, store);
  }
  return store;
}

const PROJECT_DISCOVERY_TTL_MS = 5 * 60 * 1000;
const discoveryRequests = new Map();
const configurationWatchers = new Map();
const designWatchers = new Map();
const variableSources = new Map();

function assertRegisteredProjectRoot(root) {
  if (typeof root !== "string" || !root) throw new Error("A project folder is required.");
  const canonical = canonicalPath(root);
  const registered = readRegistry().some((row) => {
    const candidate = row?.canonicalRoot || row?.rootPath || row?.id;
    return typeof candidate === "string" && canonicalPath(candidate) === canonical;
  });
  if (!registered) throw new Error("This project is not registered with Bingo.");
  return canonical;
}

function resolveRegisteredProjectRoot(root) {
  try {
    if (typeof root === "string" && removingProjects.has(canonicalPath(root))) return null;
    return assertRegisteredProjectRoot(root);
  } catch {
    return null;
  }
}

function assertProjectWriteAllowed(root) {
  const context = getProjectAccessContext(root);
  if (!context.projectRoot || context.mode !== "edit") {
    const error = new Error(context.mode === "read-only" ? "This project is open in read-only mode." : "Project file access is disabled.");
    error.code = "ACCESS_REVOKED";
    error.details = { mode: context.mode };
    throw error;
  }
}

function broadcastSettingsChanged(projectId, reason = "configuration", key = "configuration") {
  broadcastToEditors("settings_changed", { projectId, key, reason });
}

function broadcastDesignChanged(projectId, payload = {}) {
  broadcastToEditors("design_storage_changed", { projectId, ...payload });
}

function inspectDesignStorage(root) {
  metaDir(root);
  return { ...inspectPortableDesign(root), selected: true, health: "ready", projectAvailable: true };
}

function ensureDesignWatcher(root) {
  const projectRoot = canonicalPath(root);
  if (designWatchers.has(projectRoot) || !fs.existsSync(projectRoot)) return;
  try {
    const watcher = watchPortableDesign(projectRoot, event => {
      let status;
      let error = null;
      try { status = inspectDesignStorage(projectRoot); } catch (cause) {
        error = { code: cause?.code || "DESIGN_INVALID", message: cause?.message || String(cause), path: cause?.details?.path };
      }
      broadcastDesignChanged(projectRoot, {
        reason: "external-design-change",
        revision: event.revision,
        stable: event.stable,
        valid: !error && status?.health === "ready",
        ...(status || {}),
        ...(error ? { error } : {}),
      });
    }, { onFileChange: filePath => {
      if (filePath === variableSources.get(projectRoot)) broadcastToEditors("file_changed", { projectId: projectRoot, filePath });
    } });
    designWatchers.set(projectRoot, watcher);
  } catch {}
}

function acknowledgeDesignState(root) {
  designWatchers.get(canonicalPath(root))?.acknowledge();
}

function ensureConfigurationWatcher(root) {
  const projectRoot = canonicalPath(root);
  if (configurationWatchers.has(projectRoot) || !fs.existsSync(projectRoot)) return;
  const state = { rootWatcher: null, configWatcher: null, timer: null };
  const notify = () => {
    clearTimeout(state.timer);
    state.timer = setTimeout(() => broadcastSettingsChanged(projectRoot, "external-configuration-change"), 75);
  };
  const watchConfigDirectory = () => {
    if (state.configWatcher) return;
    const directory = path.join(projectRoot, META);
    if (!fs.existsSync(directory)) return;
    try {
      state.configWatcher = fs.watch(directory, (_event, filename) => {
        if (!filename || String(filename) === "config.json") notify();
      });
      state.configWatcher.on("error", () => {
        state.configWatcher?.close();
        state.configWatcher = null;
      });
    } catch {}
  };
  try {
    state.rootWatcher = fs.watch(projectRoot, (_event, filename) => {
      if (!filename || String(filename) === META) {
        watchConfigDirectory();
        notify();
      }
    });
    state.rootWatcher.on("error", () => {
      state.rootWatcher?.close();
      state.configWatcher?.close();
      clearTimeout(state.timer);
      configurationWatchers.delete(projectRoot);
    });
    watchConfigDirectory();
    configurationWatchers.set(projectRoot, state);
  } catch {}
}

function pruneDiscoveryRequests() {
  const now = Date.now();
  for (const [requestId, request] of discoveryRequests) {
    if (request.expiresAt > now) continue;
    request.controller.abort();
    discoveryRequests.delete(requestId);
  }
}

function discoveryRequestFor(event, requestId) {
  pruneDiscoveryRequests();
  const request = discoveryRequests.get(requestId);
  if (!request || request.senderId !== event.sender.id) {
    throw new Error("This project scan has expired. Choose the folder again.");
  }
  request.expiresAt = Date.now() + PROJECT_DISCOVERY_TTL_MS;
  return request;
}

function createDiscoveryRequest(selectedRoot, senderId) {
  const requestId = crypto.randomUUID();
  const normalizedRoot = canonicalPath(selectedRoot);
  discoveryRequests.set(requestId, {
    requestId,
    selectedRoot: normalizedRoot,
    senderId,
    controller: new AbortController(),
    result: null,
    expiresAt: Date.now() + PROJECT_DISCOVERY_TTL_MS,
  });
  return { requestId, selectedRoot: normalizedRoot };
}

function hashKey(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 16);
}

function nowId() {
  // Saves can occur more than once in the same millisecond (restore snapshots
  // are a common example). Keep the timestamp readable but add entropy so a
  // later snapshot can never overwrite an earlier version file.
  return `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;
}

// ---------------------------------------------------------------------------
// project registry
// ---------------------------------------------------------------------------

function listProjects() {
  const rows = readRegistry();
  return rows.map((row) => {
    const root = row?.rootPath || row?.id;
    if (typeof root !== "string" || !fs.existsSync(root)) {
      return { ...row, previewUrl: null, previewSavedAt: null };
    }
    const preview = readJson(path.join(projectDesignDataPath(root), "preview.json"), null)
      ?? readJson(path.join(legacyProjectDataPath(root, app.getPath("userData")), "preview.json"), null);
    const previewUrl = typeof preview?.dataUrl === "string" && preview.dataUrl.startsWith("data:image/png;base64,")
      ? preview.dataUrl
      : null;
    const previewSavedAt = Number.isFinite(preview?.savedAt) ? preview.savedAt : null;
    return { ...row, previewUrl, previewSavedAt };
  });
}

function saveProjects(rows) {
  // Preview data belongs only in each project's preview.json. Never duplicate
  // the (potentially large) PNG data URL into the lightweight project registry.
  writeJson(registryPath(), rows.map(({ previewUrl, previewSavedAt, ...row }) => row));
}

function projectEntry(root) {
  return (
    listProjects().find((p) => p.id === root) || {
      id: root,
      name: path.basename(root),
      rootPath: root,
      addedAt: Date.now(),
    }
  );
}

function canonicalPath(root) {
  try {
    return fs.realpathSync(root);
  } catch {
    return path.resolve(root);
  }
}

function registerProjectCandidate(candidate) {
  const root = canonicalPath(candidate.projectRoot);
  const rows = listProjects();
  const existing = rows.find((row) => {
    const existingRoot = row?.canonicalRoot || row?.rootPath || row?.id;
    return typeof existingRoot === "string" && canonicalPath(existingRoot) === root;
  });
  if (existing) {
    existing.canonicalRoot = root;
    existing.workspaceRoot = candidate.workspaceRoot || existing.workspaceRoot;
    existing.relativePath = candidate.relativePath || existing.relativePath;
    existing.kind = candidate.kind || existing.kind;
    existing.framework = candidate.framework || existing.framework;
    saveProjects(rows);
    stampProject(existing.rootPath || existing.id);
    return existing;
  }

  const row = {
    id: root,
    name: candidate.name || path.basename(root),
    rootPath: root,
    canonicalRoot: root,
    workspaceRoot: candidate.workspaceRoot,
    relativePath: candidate.relativePath,
    kind: candidate.kind,
    framework: candidate.framework,
    addedAt: Date.now(),
  };
  rows.push(row);
  saveProjects(rows);
  stampProject(root);
  return row;
}

/** Keep project identity with its design data. */
function stampProject(root) {
  const file = metaPath(root, "project.json");
  if (!fs.existsSync(file)) {
    writeJson(file, { id: root, name: path.basename(root), createdAt: Date.now() });
  }
}

// ---------------------------------------------------------------------------
// files
// ---------------------------------------------------------------------------

function listFiles(root, { dir = "", pattern = "" } = {}) {
  const start = safeJoin(root, dir);
  const out = [];
  const walk = (current) => {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".bingo") {
        if (entry.isDirectory()) continue;
      }
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(abs);
        continue;
      }
      const rel = path.relative(path.resolve(root), abs).split(path.sep).join("/");
      if (rel.startsWith(META + "/")) continue;
      if (!SOURCE_EXT.some((ext) => rel.endsWith(ext))) continue;
      if (pattern && !rel.includes(pattern)) continue;
      out.push(rel);
    }
  };
  walk(start);
  return out.sort();
}

function readFile(root, rel) {
  try {
    root = assertRegisteredProjectRoot(root);
    if (getProjectAccessContext(root).mode === "disabled") return null;
    return fs.readFileSync(safeJoin(root, rel), "utf8");
  } catch {
    return null;
  }
}

/**
 * Write a source file, keeping the previous contents as a version first.
 * Version history is what the editor's "restore" UI reads, so it has to exist
 * before the overwrite rather than after.
 */
function writeFile(root, rel, content, options = {}) {
  root = assertRegisteredProjectRoot(root);
  assertProjectWriteAllowed(root);
  const abs = safeJoin(root, rel);
  if (options.expectedHash) {
    let current;
    try { current = fs.readFileSync(abs); } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      current = Buffer.alloc(0);
    }
    const currentHash = crypto.createHash("sha256").update(current).digest("hex");
    if (currentHash !== options.expectedHash) {
      const error = new Error(`Source changed while the edit was being prepared: ${rel}`);
      error.code = "SOURCE_CONFLICT";
      error.details = { path: rel, expectedHash: options.expectedHash, actualHash: currentHash };
      throw error;
    }
  }
  if (fs.existsSync(abs)) {
    snapshotFileVersion(root, rel, fs.readFileSync(abs, "utf8"));
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  safeJoin(root, rel);
  fs.writeFileSync(abs, content ?? "");
  return { success: true };
}

function writeBinaryFile(root, rel, content) {
  root = assertRegisteredProjectRoot(root);
  assertProjectWriteAllowed(root);
  const abs = safeJoin(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  safeJoin(root, rel);
  fs.writeFileSync(abs, content, { flag: "w", mode: 0o600 });
  return { success: true, path: rel };
}

function deleteFile(root, rel) {
  assertProjectWriteAllowed(root);
  const abs = safeJoin(root, rel);
  if (!fs.existsSync(abs)) return { success: false, error: "File not found" };
  snapshotFileVersion(root, rel, fs.readFileSync(abs, "utf8"));
  fs.unlinkSync(abs);
  return { success: true };
}

function versionDir(root, rel) {
  return metaPath(root, "files", hashKey(rel));
}

function snapshotFileVersion(root, rel, content) {
  const dir = versionDir(root, rel);
  const id = nowId();
  writeJson(path.join(dir, `${id}.json`), { id, path: rel, savedAt: Date.now(), content });
  return id;
}

function fileVersions(root, rel) {
  const dir = versionDir(root, rel);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson(path.join(dir, f), null))
    .filter(Boolean)
    .map((v) => ({ id: v.id, filename: v.id, savedAt: v.savedAt, size: (v.content || "").length }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

function fileVersionContent(root, rel, versionId) {
  return readJson(path.join(versionDir(root, rel), `${versionId}.json`), null)?.content ?? null;
}

function restoreFileVersion(root, rel, versionId) {
  assertProjectWriteAllowed(root);
  const content = fileVersionContent(root, rel, versionId);
  if (content == null) return { success: false, error: "Version not found" };
  const abs = safeJoin(root, rel);
  snapshotFileVersion(root, rel, fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return { success: true };
}

// ---------------------------------------------------------------------------
// canvases (the editor calls them pages)
// ---------------------------------------------------------------------------

const CANVAS_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function listCanvases(root) {
  metaDir(root);
  return listPortablePages(root);
}

function loadCanvas(root, pageId) {
  metaDir(root);
  try { return readPortablePage(root, pageId); }
  catch (error) {
    if (error.code === "DESIGN_MISSING") {
      // A new page is absent from the manifest. A missing existing page is
      // corruption and must not be silently replaced with an empty canvas.
      listPortablePages(root);
      return null;
    }
    throw error;
  }
}

/**
 * Persist a page.
 *
 * The canvas payload shape is `{elements, zoom, pan, backgroundColor,
 * backgroundToken, metadata}` at `params.*` — copied from what the cloud
 * backend PATCHes. The editor reads `elements` straight off the list result, so
 * getting this name wrong yields a silently empty canvas.
 */
function saveCanvas(root, params) {
  assertProjectWriteAllowed(root);
  if (!CANVAS_ID_RE.test(String(params?.id || ""))) {
    throw new Error("Canvas id must be a UUID");
  }
  const existing = loadCanvas(root, params.id) || {};
  const prev = existing.canvas || {};
  const next = {
    ...existing,
    id: params.id,
    name: params.name ?? existing.name ?? "Page",
    sortOrder: existing.sortOrder ?? listCanvases(root).length,
    canvas: {
      elements: params.elements ?? prev.elements ?? [],
      zoom: params.zoom ?? prev.zoom,
      pan: params.pan ?? prev.pan,
      backgroundColor: params.backgroundColor ?? prev.backgroundColor,
      backgroundToken: params.backgroundToken ?? prev.backgroundToken,
      metadata: params.metadata ?? prev.metadata,
    },
    newClasses: params.newClasses ?? existing.newClasses ?? [],
  };
  if (existing.canvas) {
    snapshotCanvasVersion(root, params.id, existing);
  }
  try {
    const saved = savePortablePage(root, {
      id: next.id,
      name: next.name,
      ...(next.canvas || {}),
      newClasses: next.newClasses,
    }, params._expectedRevision);
    acknowledgeDesignState(root);
    return saved;
  } catch (error) {
    if (error?.code === "DESIGN_CONFLICT") {
      const directory = metaPath(root, "design-backups", "conflicts");
      const backup = path.join(directory, `${Date.now()}-${params.id}.json`);
      writeJson(backup, { savedAt: Date.now(), reason: error.message, page: next });
      error.details = { ...(error.details || {}), recoveryPath: backup };
    }
    throw error;
  }
}

function canvasVersions(root, pageId) {
  const dir = metaPath(root, "canvases", `${pageId}.versions`);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson(path.join(dir, f), null))
    .filter(Boolean)
    .map((v) => ({ id: v.id, filename: v.id, savedAt: v.savedAt }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

function snapshotCanvasVersion(root, pageId, canvas) {
  const id = nowId();
  writeJson(metaPath(root, "canvases", `${pageId}.versions`, `${id}.json`), {
    id,
    pageId,
    savedAt: Date.now(),
    name: canvas.name,
    canvas: canvas.canvas,
  });
  return id;
}

function canvasVersion(root, pageId, versionId) {
  return readJson(
    metaPath(root, "canvases", `${pageId}.versions`, `${versionId}.json`),
    null
  );
}

// ---------------------------------------------------------------------------
// drafts
// ---------------------------------------------------------------------------

const draftDir = (root) => metaPath(root, "drafts");
const draftFile = (root, key) => path.join(draftDir(root), `${hashKey(key)}.json`);

function listDrafts(root) {
  const dir = draftDir(root);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson(path.join(dir, f), null))
    .filter(Boolean);
}

function loadDraft(root, componentName) {
  return readJson(draftFile(root, componentName), null);
}

function saveDraft(root, params) {
  const key = params.componentName ?? params.name ?? "draft";
  const previous = loadDraft(root, key);
  if (previous) {
    const id = nowId();
    writeJson(metaPath(root, "drafts", `${hashKey(key)}.versions`, `${id}.json`), {
      ...previous,
      id,
      savedAt: Date.now(),
    });
  }
  const next = { ...previous, ...params, componentName: key, savedAt: Date.now() };
  writeJson(draftFile(root, key), next);
  return next;
}

function deleteDraft(root, componentName) {
  const file = draftFile(root, componentName);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return { success: true };
}

function draftVersions(root, componentName) {
  const dir = metaPath(root, "drafts", `${hashKey(componentName)}.versions`);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson(path.join(dir, f), null))
    .filter(Boolean)
    .map((v) => ({ id: v.id, filename: v.id, savedAt: v.savedAt }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

function draftVersion(root, componentName, versionId) {
  return readJson(
    metaPath(root, "drafts", `${hashKey(componentName)}.versions`, `${versionId}.json`),
    null
  );
}

function restoreDraftVersion(root, componentName, versionId) {
  const version = draftVersion(root, componentName, versionId);
  if (!version) return { success: false, error: "Version not found" };
  const { id: _versionId, savedAt: _versionSavedAt, ...draft } = version;
  return { success: true, draft: saveDraft(root, { ...draft, componentName }) };
}

// ---------------------------------------------------------------------------
// chats
// ---------------------------------------------------------------------------

const chatDir = (root) => metaPath(root, "chats");
const chatFile = (root, chatId) => path.join(chatDir(root), `${chatId}.json`);

function listChats(root, opts = {}) {
  const dir = chatDir(root);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson(path.join(dir, f), null))
    .filter(Boolean)
    .filter((c) => opts.includeArchived || !c.archived)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

function createChat(root, input) {
  const id = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const chat = {
    id,
    title: input?.title ?? "New chat",
    messages: input?.messages ?? [],
    archived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  writeJson(chatFile(root, id), chat);
  return chat;
}

function patchChat(root, chatId, patch) {
  const chat = readJson(chatFile(root, chatId), null);
  if (!chat) return null;
  const next = { ...chat, ...patch, updatedAt: Date.now() };
  writeJson(chatFile(root, chatId), next);
  return next;
}

// ---------------------------------------------------------------------------
// assets
// ---------------------------------------------------------------------------

function saveAsset(root, { filename, dataBase64 }) {
  assertProjectWriteAllowed(root);
  metaDir(root);
  const result = savePortableAsset(root, { filename, dataBase64 });
  acknowledgeDesignState(root);
  return result;
}

// ---------------------------------------------------------------------------
// project settings
// ---------------------------------------------------------------------------

async function readSettings(root) {
  root = assertRegisteredProjectRoot(root);
  ensureConfigurationWatcher(root);
  const effective = readEffectiveConfiguration(root, app.getPath("userData"));
  const iconDiscovery = discoverProjectIconLibraries(root, effective.settings);
  return {
    ...effective.settings,
    effectiveIconLibraries: iconDiscovery.enabled,
    _iconDiscovery: iconDiscovery,
    _configuration: {
      mode: effective.mode,
      source: effective.source,
      revision: effective.revision,
      configPath: effective.paths.projectConfig,
      initializationRequired: effective.mode === "unselected",
    },
  };
}

async function writeSettings(root, patch, expectedRevision) {
  root = assertRegisteredProjectRoot(root);
  assertProjectWriteAllowed(root);
  const settings = await writeProjectConfiguration(root, app.getPath("userData"), patch, expectedRevision);
  const keys = Object.keys(patch || {});
  if (keys.length === 1) broadcastSettingsChanged(canonicalPath(root), "configuration", keys[0]);
  else broadcastSettingsChanged(canonicalPath(root));
  return settings;
}

async function addIconLibraries(root, libraries) {
  root = assertRegisteredProjectRoot(root);
  assertProjectWriteAllowed(root);
  const settings = await addProjectIconLibraries(root, app.getPath("userData"), libraries);
  broadcastSettingsChanged(canonicalPath(root), "configuration", "iconLibraries");
  return settings;
}

/** File records in the shape the app expects from its files listing. */
function listFileRecords(root) {
  return listFiles(root).map((rel) => {
    let size = 0;
    try {
      size = fs.statSync(safeJoin(root, rel)).size;
    } catch {}
    return { id: encodeURIComponent(rel), path: rel, size, fileType: "other" };
  });
}

// ---------------------------------------------------------------------------
// first-run page
// ---------------------------------------------------------------------------

/**
 * Give a project with no pages an empty starting page. Discovering source
 * components makes them available for insertion; it must not add canvas layers.
 */
function bootstrapCanvas(root) {
  const id = crypto.randomUUID();
  const page = {
    id,
    name: "Page 1",
    sortOrder: 0,
    canvas: {
      elements: { schemaVersion: 2, byId: {}, childrenByParent: { ROOT: [] } },
      zoom: 1,
      pan: { x: 0, y: 0 },
    },
    newClasses: [],
  };
  metaDir(root);
  const saved = savePortablePage(root, { id, name: page.name, ...page.canvas, newClasses: [] });
  acknowledgeDesignState(root);
  console.log(`[store] created an empty starting page for ${root}`);
  return saved;
}

// ---------------------------------------------------------------------------
// op dispatch
// ---------------------------------------------------------------------------

const OPS = {
  "list-projects": () => listProjects(),
  "get-project": (root) => projectEntry(root),

  "list-files": (root, args) => listFiles(root, args),
  "read-file": (root, args, a) => readFile(root, a.rel),
  "write-file": (root, args, a) => writeFile(root, a.rel, a.content),
  "delete-file": (root, args, a) => deleteFile(root, a.rel),
  "file-versions": (root, args, a) => fileVersions(root, a.rel),
  "file-version-content": (root, args, a) => fileVersionContent(root, a.rel, a.versionId),
  "restore-file-version": (root, args, a) => restoreFileVersion(root, a.rel, a.versionId),

  "list-canvases": (root) => {
    root = assertRegisteredProjectRoot(root);
    ensureDesignWatcher(root);
    const pages = listCanvases(root);
    // Keep existing designs intact; only projects without pages need a blank one.
    return pages.length ? pages : [bootstrapCanvas(root)];
  },
  // The cloud endpoint returns the canvas object itself, not the page record
  // that wraps it; callers read `.elements` straight off the result.
  "load-canvas": (root, args, a) => {
    const page = loadCanvas(root, a.pageId);
    return page ? { ...(page.canvas || {}), ...(page._revision ? { _revision: page._revision } : {}) } : null;
  },
  "save-canvas": (root, args, a) => saveCanvas(root, a.params),
  "create-page": (root, args, a) => saveCanvas(root, {
    ...a.params,
    id: CANVAS_ID_RE.test(String(a.params?.id || "")) ? a.params.id : crypto.randomUUID(),
  }),
  "delete-page": (root, args, a) => {
    assertProjectWriteAllowed(root);
    metaDir(root);
    const result = deletePortablePage(root, a.pageId);
    acknowledgeDesignState(root);
    return result;
  },
  "reorder-pages": (root, args, a) => {
    assertProjectWriteAllowed(root);
    metaDir(root);
    const result = reorderPortablePages(root, a.order);
    acknowledgeDesignState(root);
    return result;
  },
  "enable-portable-design": (root) => {
    root = assertRegisteredProjectRoot(root);
    assertProjectWriteAllowed(root);
    const alreadyEnabled = hasPortableDesign(root);
    metaDir(root);
    acknowledgeDesignState(root);
    return { success: true, pages: listPortablePages(root), alreadyEnabled };
  },
  "canvas-versions": (root, args, a) => canvasVersions(root, a.pageId),
  "canvas-version": (root, args, a) => canvasVersion(root, a.pageId, a.versionId),
  "restore-canvas-version": (root, args, a) => {
    const version = canvasVersion(root, a.pageId, a.versionId);
    if (!version) return { success: false, error: "Version not found" };
    // Snapshot the version's fields back into the payload shape saveCanvas reads.
    return saveCanvas(root, { id: a.pageId, name: version.name, ...(version.canvas || {}) });
  },
  "save-preview": (root, args, a) => {
    if (typeof a.dataUrl !== "string" || !a.dataUrl.startsWith("data:image/png;base64,")) {
      throw new Error("Project preview must be a PNG data URL");
    }
    writeJson(metaPath(root, "preview.json"), { dataUrl: a.dataUrl, savedAt: Date.now() });
    return { success: true };
  },

  "list-drafts": (root) => listDrafts(root),
  "load-draft": (root, args, a) => loadDraft(root, a.componentName),
  "save-draft": (root, args, a) => saveDraft(root, a.params),
  "delete-draft": (root, args, a) => deleteDraft(root, a.componentName),
  "draft-versions": (root, args, a) => draftVersions(root, a.componentName),
  "draft-version": (root, args, a) => draftVersion(root, a.componentName, a.versionId),
  "restore-draft-version": (root, args, a) => restoreDraftVersion(root, a.componentName, a.versionId),

  "list-chats": (root, args, a) => chatStoreForRoot(root).listChats(a?.opts),
  "get-chat": (root, args, a) => a?.opts?.legacy ? chatStoreForRoot(root).readAll(a.chatId) : chatStoreForRoot(root).readChat(a.chatId, a?.opts),
  "get-chat-message": (root, args, a) => chatStoreForRoot(root).readMessage(a.chatId, a.messageId),
  "get-chat-message-body": (root, args, a) => chatStoreForRoot(root).readMessageBody(a.chatId, a.messageId, a.opts),
  "create-chat": (root, args, a) => chatStoreForRoot(root).createChat(a.input),
  "update-chat-messages": (root, args, a) => chatStoreForRoot(root).replaceMessagesLegacy(a.chatId, a.messages),
  "edit-chat-message": (root, args, a) => chatStoreForRoot(root).mutateMessage(a.chatId, { type: "edit", messageId: a.messageId, patch: a.patch, mutationId: a.mutationId, expectedRevision: a.expectedRevision }),
  "delete-chat-message": (root, args, a) => chatStoreForRoot(root).mutateMessage(a.chatId, { type: "delete", messageId: a.messageId, mutationId: a.mutationId, expectedRevision: a.expectedRevision }),
  "pin-chat-constraint": (root, args, a) => chatStoreForRoot(root).pinConstraint(a.chatId, a.input),
  "resolve-chat-constraint": (root, args, a) => chatStoreForRoot(root).resolveConstraint(a.chatId, a.input),
  "update-chat-title": (root, args, a) => chatStoreForRoot(root).patchMetadata(a.chatId, { title: a.title }, a.expectedRevision),
  "archive-chat": async (root, args, a) => {
    const chats = chatStoreForRoot(root);
    const resolvedChatId = await chats.resolveChatId(a.chatId);
    let expectedRevision = a.expectedRevision;
    if (resolvedChatId) {
      await chatLifecycleHook?.({ projectId: root, chatId: resolvedChatId, action: "archive" });
      const cancelled = await chats.cancelActiveRun(resolvedChatId);
      if (cancelled && expectedRevision !== void 0) expectedRevision = cancelled.revision;
    }
    return chats.patchMetadata(a.chatId, { archived: true }, expectedRevision);
  },
  "restore-chat": async (root, args, a) => {
    const store = chatStoreForRoot(root);
    const metadata = await store.patchMetadata(a.chatId, { archived: false }, a.expectedRevision);
    return store.readAll(metadata.id);
  },
  "delete-chat": async (root, args, a) => {
    const chats = chatStoreForRoot(root);
    const resolvedChatId = await chats.resolveChatId(a.chatId);
    if (resolvedChatId) {
      await chatLifecycleHook?.({ projectId: root, chatId: resolvedChatId, action: "delete" });
      await chats.cancelActiveRun(resolvedChatId);
      const memoryResult = await projectMemoryStoreForRoot(root).handleChatDeletion(resolvedChatId, { preserve: a.preserveMemory === true, actionId: a.memoryActionId });
      if (memoryResult.affected > 0) void recordDiagnosticEvent({ projectId: root, source: "project-memory", eventName: "memory.project.changed", payload: { action: a.preserveMemory === true ? "chat-delete-preserve" : "chat-delete-revoke", chatId: resolvedChatId, affected: memoryResult.affected, revision: memoryResult.revision } });
    }
    return chats.deleteChat(a.chatId);
  },
  "list-project-memory": (root, args, a) => projectMemoryStoreForRoot(root).list(a?.opts),
  "get-project-memory": (root, args, a) => projectMemoryStoreForRoot(root).get(a.id),
  "upsert-project-memory": async (root, args, a) => {
    const result = await projectMemoryStoreForRoot(root).upsert(a.input);
    void recordDiagnosticEvent({ projectId: root, source: "project-memory", eventName: "memory.project.changed", payload: { action: "upsert", itemId: result.item?.id, status: result.item?.status, revision: result.revision, replay: result.replay } });
    return result;
  },
  "delete-project-memory": async (root, args, a) => {
    const result = await projectMemoryStoreForRoot(root).delete(a.input);
    void recordDiagnosticEvent({ projectId: root, source: "project-memory", eventName: "memory.project.changed", payload: { action: "delete", itemId: a.input?.id, revision: result.revision, replay: result.replay } });
    return result;
  },
  "undo-project-memory": async (root, args, a) => {
    const result = await projectMemoryStoreForRoot(root).undo(a.input);
    void recordDiagnosticEvent({ projectId: root, source: "project-memory", eventName: "memory.project.changed", payload: { action: "undo", revision: result.revision } });
    return result;
  },

  "upload-asset": (root, args, a) => saveAsset(root, a),
  "read-settings": (root) => readSettings(root),
  "read-variable-library": (root) => {
    root = assertRegisteredProjectRoot(root);
    const result = readProjectVariables(root, readEffectiveConfiguration(root, app.getPath("userData")).settings.prototypeTheme);
    variableSources.set(canonicalPath(root), result.source.replace(/\\/g, "/").replace(/^\.\//, ""));
    ensureDesignWatcher(root);
    return result;
  },
  "write-variable-library": (root, args, a) => {
    root = assertRegisteredProjectRoot(root);
    assertProjectWriteAllowed(root);
    const result = writeProjectVariables(root, a, readEffectiveConfiguration(root, app.getPath("userData")).settings.prototypeTheme);
    broadcastToEditors("file_changed", { projectId: root, filePath: result.source });
    return result;
  },
  "write-settings": (root, args, a) => writeSettings(root, a.patch || {}, a.expectedRevision),
  "add-icon-libraries": (root, args, a) => addIconLibraries(root, a.libraries || []),
  "read-prototype-theme-preference": (root) => {
    root = assertRegisteredProjectRoot(root);
    return readPrototypeThemePreference(root, app.getPath("userData"));
  },
  "write-prototype-theme-preference": (root, args, a) => {
    root = assertRegisteredProjectRoot(root);
    return writePrototypeThemePreference(root, app.getPath("userData"), a.selection);
  },
  "create-component": (root, args, a) => {
    const rel = a.path || a.filePath;
    writeFile(root, rel, a.content ?? a.code ?? "");
    return { success: true, path: rel, componentName: a.componentName };
  },
};

async function invokeLocalStore(payload) {
  const { op, root, ...args } = payload || {};
  if (process.env.BINGO_STORE_LOG) console.log(`[store] ${op}`);
  const handler = OPS[op];
  if (!handler) throw new Error(`unknown bingo:store op: ${op}`);
  const key = typeof root === "string" ? canonicalPath(root) : null;
  const operation = Promise.resolve().then(() => handler(root, args, args));
  if (key) {
    if (!pendingStoreOperations.has(key)) pendingStoreOperations.set(key, new Set());
    pendingStoreOperations.get(key).add(operation);
  }
  try { return await operation; }
  finally {
    if (key) {
      const pending = pendingStoreOperations.get(key);
      pending?.delete(operation);
      if (!pending?.size) pendingStoreOperations.delete(key);
    }
  }
}

/**
 * Point the project-access layer at this app's storage and project registry.
 *
 * Nothing else calls `configureProjectAccess`, and without it the layer treats
 * every project as unregistered, so `assertProjectWriteAllowed` rejects all
 * writes with "Project file access is disabled" -- pages and files silently stop
 * saving. Local mode has no accounts, so the registry of opened folders is the
 * authority on which roots exist.
 */
function configureProjectAccessForLocalMode() {
  configureProjectAccess({
    userDataRoot: app.getPath("userData"),
    resolveProjectRoot: (projectId) => {
      const rows = listProjects();
      const match = rows.find((entry) => entry.id === projectId);
      return match ? match.rootPath : null;
    },
  });
  // Keep an explicit grant in step with the registry: adding a folder from the
  // projects page is the user's consent for Bingo to work in it.
  subscribeProjectAccessChanges(({ projectId, next }) => {
    broadcastSettingsChanged(projectId, "access", "access");
    broadcastToEditors("project_access_changed", { projectId, mode: next.mode });
  });
}

function assertRendererOwnsProject(event, root) {
  const resolvedRoot = assertRegisteredProjectRoot(root);
  const ownedRoot = projectForWebContents(event.sender);
  if (!ownedRoot || canonicalPath(ownedRoot) !== canonicalPath(resolvedRoot)) {
    throw new Error("This window does not own the project.");
  }
  return resolvedRoot;
}

function registerHandlers({ prepareProjectRemoval = async () => true } = {}) {
  configureProjectAccessForLocalMode();
  ipcMain.handle("bingo:save-feedback", async (_event, args) => {
    const message = typeof args?.message === "string" ? args.message.trim() : "";
    if (!message || message.length > 4000) throw new Error("A note between 1 and 4000 characters is required.");
    const directory = path.join(app.getPath("userData"), "feedback");
    const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(3).toString("hex")}.json`;
    writeJson(path.join(directory, filename), { schemaVersion: 1, createdAt: Date.now(), message });
    return { success: true, filename };
  });
  ipcMain.handle("bingo:store", async (event, payload) => {
    const operationId = `op_${crypto.randomUUID()}`;
    const startedAt = Date.now();
    const projectId = typeof payload?.root === "string" ? payload.root : null;
    if (projectId) assertRendererOwnsProject(event, projectId);
    const op = String(payload?.op || "unknown");
    void recordDiagnosticEvent({ projectId, operationId, source: "local-store", eventName: "store.started", payload: { op } });
    try {
      const result = await invokeLocalStore(payload);
      void recordDiagnosticEvent({ projectId, operationId, source: "local-store", eventName: "store.completed", durationMs: Date.now() - startedAt, payload: { op } });
      return result;
    } catch (error) {
      void recordDiagnosticEvent({ projectId, operationId, level: "error", source: "local-store", eventName: "store.failed", durationMs: Date.now() - startedAt, payload: { op, error } });
      const report = await createIncident({ projectId, operationId, kind: "error", category: "local-store", severity: "error", summary: `Local operation failed: ${op}`, error, context: { op } });
      throw new Error(`${String(error?.message || error)} (Error ID: ${report.incidentId})`);
    }
  });

  ipcMain.handle("bingo:configuration-inspect", async (event, args) => {
    const root = assertRendererOwnsProject(event, args?.root);
    ensureConfigurationWatcher(root);
    return inspectProjectConfiguration(root, app.getPath("userData"));
  });

  ipcMain.handle("bingo:configuration-prepare", async (event, args) => {
    const root = assertRendererOwnsProject(event, args?.root);
    return prepareProjectConfiguration(root, app.getPath("userData"), args);
  });

  ipcMain.handle("bingo:configuration-apply", async (event, args) => {
    const root = assertRendererOwnsProject(event, args?.root);
    assertProjectWriteAllowed(root);
    const result = await applyProjectConfiguration(root, app.getPath("userData"), args);
    ensureConfigurationWatcher(root);
    broadcastSettingsChanged(root);
    return result;
  });

  ipcMain.handle("bingo:design-storage-inspect", async (event, args) => {
    const root = assertRendererOwnsProject(event, args?.root);
    ensureDesignWatcher(root);
    return inspectDesignStorage(root);
  });

  ipcMain.handle("bingo:design-storage-enable", async (event, args) => {
    const root = assertRendererOwnsProject(event, args?.root);
    assertProjectWriteAllowed(root);
    ensureDesignWatcher(root);
    const alreadyEnabled = hasPortableDesign(root);
    metaDir(root);
    acknowledgeDesignState(root);
    const result = inspectDesignStorage(root);
    broadcastDesignChanged(root, { reason: "storage-mode-changed", valid: true, ...result });
    return { success: true, ...result, alreadyEnabled };
  });

  ipcMain.handle("bingo:design-storage-use-app", async (event, args) => {
    assertRendererOwnsProject(event, args?.root);
    throw new Error("Design data is stored in .bingo/design. Use Git ignore to keep it out of commits.");
  });

  ipcMain.handle("bingo:design-portability-inspect", async (event, args) => {
    const root = assertRendererOwnsProject(event, args?.root);
    return inspectProjectPortability(root);
  });

  ipcMain.handle("bingo:project-access-get", async (event, args) => {
    const root = assertRendererOwnsProject(event, args?.projectId);
    return getProjectAccessContext(root);
  });

  ipcMain.handle("bingo:project-access-set-mode", async (event, args) => {
    const root = assertRendererOwnsProject(event, args?.projectId);
    return setProjectAccessMode(root, args?.mode);
  });

  ipcMain.handle("bingo:project-access-set-paths", async (event, args) => {
    const root = assertRendererOwnsProject(event, args?.projectId);
    return { extraRoots: setProjectAllowedPaths(root, args?.paths) };
  });

  ipcMain.handle("bingo:environment-inspect", async (event, args) => {
    const root = assertRendererOwnsProject(event, args?.root);
    return inspectProjectEnvironment(root);
  });

  ipcMain.handle("bingo:environment-prepare", async (event, args) => {
    const root = assertRendererOwnsProject(event, args?.root);
    assertProjectWriteAllowed(root);
    const allowed = getProjectAllowedPaths(root).map(candidate => canonicalPath(candidate));
    return prepareProjectEnvironment(root, {
      confirmedWorkspaceRoot: args?.workspaceRoot,
      isAllowedRoot: candidate => {
        const target = canonicalPath(candidate);
        return allowed.some(base => target === base || target.startsWith(base + path.sep));
      },
    });
  });

  ipcMain.handle("bingo:ensure-settings-storage", async (event, args) => {
    const root = assertRendererOwnsProject(event, args?.root);
    const inspected = await inspectProjectConfiguration(root, app.getPath("userData"));
    if (!inspected.initializationRequired) return { ready: true, ...inspected };
    const parent = windowForWebContents(event.sender) || BrowserWindow.getFocusedWindow();
    const result = await dialog.showMessageBox(parent ?? undefined, {
      type: "question",
      title: tNative("dialog.configurationTitle"),
      message: tNative("dialog.configurationMessage"),
      detail: tNative("dialog.configurationDetail", {
        configPath: path.join(root, ".bingo", "config.json"),
        gitignorePath: path.join(root, ".gitignore"),
      }),
      buttons: [tNative("dialog.saveInProject"), tNative("dialog.saveInProjectIgnored"), tNative("dialog.saveOnComputer"), tNative("dialog.cancel")],
      defaultId: 0,
      cancelId: 3,
      noLink: true,
    });
    if (result.response === 3) return { ready: false, cancelled: true };
    const mode = result.response === 2 ? "app" : "project";
    const gitPreference = result.response === 1 ? "ignore" : mode === "app" ? "not-applicable" : "unchanged";
    const prepared = await prepareProjectConfiguration(root, app.getPath("userData"), {
      mode,
      gitPreference,
      initialPatch: args?.initialPatch || {},
    });
    const applied = await applyProjectConfiguration(root, app.getPath("userData"), {
      planId: prepared.planId,
      operationId: args?.operationId || `cfg_${crypto.randomUUID()}`,
    });
    ensureConfigurationWatcher(root);
    broadcastSettingsChanged(root);
    return { ready: true, initialized: true, ...applied };
  });

  ipcMain.handle("bingo:choose-project-folder", async (event) => {
    pruneDiscoveryRequests();
    const parent = windowForWebContents(event.sender) || BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(parent ?? undefined, {
      properties: ["openDirectory"],
      title: tNative("dialog.openProjectFolder"),
    });
    if (result.canceled || !result.filePaths.length) return { cancelled: true };
    return { cancelled: false, ...createDiscoveryRequest(result.filePaths[0], event.sender.id) };
  });

  ipcMain.handle("bingo:prepare-project-discovery", async (event, args) => {
    const row = listProjects().find((project) => project.id === args?.projectId);
    if (!row) throw new Error("This project is no longer in your files list.");
    const selectedRoot = row.workspaceRoot || row.rootPath || row.id;
    if (!fs.existsSync(selectedRoot)) throw new Error("This project folder is no longer available.");
    return { cancelled: false, ...createDiscoveryRequest(selectedRoot, event.sender.id) };
  });

  ipcMain.handle("bingo:discover-projects", async (event, args) => {
    const request = discoveryRequestFor(event, args?.requestId);
    if (canonicalPath(args?.selectedRoot || "") !== request.selectedRoot) {
      throw new Error("The selected project folder does not match this scan.");
    }
    const operationId = `op_${crypto.randomUUID()}`;
    const startedAt = Date.now();
    void recordDiagnosticEvent({ projectId: request.selectedRoot, operationId, source: "project-discovery", eventName: "discovery.started", payload: { requestId: request.requestId } });
    let result;
    try {
      result = await discoverProjectCandidates(request.selectedRoot, {
        requestId: request.requestId,
        signal: request.controller.signal,
        onProgress: (progress) => {
          if (request.controller.signal.aborted || event.sender.isDestroyed()) return;
          event.sender.send("bingo:project-discovery-progress", {
            requestId: request.requestId,
            ...progress,
          });
        },
      });
    } catch (error) {
      void recordDiagnosticEvent({ projectId: request.selectedRoot, operationId, level: "error", source: "project-discovery", eventName: "discovery.failed", durationMs: Date.now() - startedAt, payload: { requestId: request.requestId, error } });
      const report = await createIncident({ projectId: request.selectedRoot, operationId, kind: "error", category: "project-discovery", severity: "error", summary: "Project discovery failed", error, context: { requestId: request.requestId } });
      throw new Error(`${String(error?.message || error)} (Error ID: ${report.incidentId})`);
    }
    void recordDiagnosticEvent({
      projectId: request.selectedRoot,
      operationId,
      level: result.status === "failed" ? "error" : result.status === "partial" ? "warning" : "info",
      source: "project-discovery",
      eventName: result.status === "failed" ? "discovery.failed" : result.status === "cancelled" ? "discovery.cancelled" : "discovery.completed",
      durationMs: Date.now() - startedAt,
      payload: { requestId: request.requestId, status: result.status, candidateCount: result.candidates?.length || 0, diagnostics: result.diagnostics },
    });
    if (result.status === "failed") {
      const report = await createIncident({
        projectId: request.selectedRoot,
        operationId,
        kind: "error",
        category: "project-discovery",
        severity: "error",
        summary: result.diagnostics?.[0]?.message || "Project discovery failed",
        error: { message: result.diagnostics?.[0]?.message || "Project discovery failed" },
        context: { requestId: request.requestId, diagnostics: result.diagnostics },
      });
      result = { ...result, incidentId: report.incidentId };
    }
    if (result.status === "cancelled") {
      discoveryRequests.delete(request.requestId);
      return result;
    }
    request.result = result;
    request.expiresAt = Date.now() + PROJECT_DISCOVERY_TTL_MS;
    return result;
  });

  ipcMain.handle("bingo:cancel-project-discovery", async (event, args) => {
    const request = discoveryRequests.get(args?.requestId);
    if (!request || request.senderId !== event.sender.id) return { cancelled: true };
    request.controller.abort();
    discoveryRequests.delete(args.requestId);
    return { cancelled: true };
  });

  ipcMain.handle("bingo:register-project", async (event, args) => {
    const request = discoveryRequestFor(event, args?.requestId);
    const result = request.result;
    if (!result || result.status === "cancelled" || result.status === "failed") {
      throw new Error("This project scan is not ready. Scan the folder again.");
    }
    const candidate = result.candidates.find((item) => item.candidateId === args?.candidateId);
    if (!candidate || !candidate.canOpen) throw new Error("This project cannot be opened by the local compiler.");
    if (!fs.existsSync(candidate.projectRoot) || !fs.existsSync(path.join(candidate.projectRoot, "package.json"))) {
      throw new Error("This project moved or is no longer available. Scan the folder again.");
    }
    // The filesystem may change while the chooser is open. Re-run the cheap
    // single-project inspection instead of trusting a stale renderer choice.
    const validation = await discoverProjectCandidates(candidate.projectRoot, {
      requestId: `${request.requestId}:validation`,
      signal: request.controller.signal,
      explicitRoot: true,
    });
    const validatedCandidate = validation.candidates.find((item) =>
      item.canonicalRoot === candidate.canonicalRoot && item.canOpen
    );
    if (!validatedCandidate) {
      throw new Error("This project changed and can no longer be opened. Scan the folder again.");
    }
    if (args?.ignoreDesignInGit != null && typeof args.ignoreDesignInGit !== "boolean") throw new Error("Invalid Git ignore option.");
    if (args?.ignoreDesignInGit === true) await ensureProjectDesignIgnored(candidate.projectRoot);
    metaDir(candidate.projectRoot);
    const row = registerProjectCandidate({
      ...validatedCandidate,
      workspaceRoot: candidate.workspaceRoot,
      relativePath: candidate.relativePath,
    });
    discoveryRequests.delete(request.requestId);
    return row;
  });

  // Adding a project is picking a folder, so it needs the dialog rather than
  // the plain op dispatch.
  ipcMain.handle("bingo:add-project", async (event) => {
    const parent = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(parent ?? undefined, {
      properties: ["openDirectory"],
      title: tNative("dialog.openProjectFolder"),
    });
    if (result.canceled || !result.filePaths.length) return null;
    const root = result.filePaths[0];
    const storage = await dialog.showMessageBox(parent ?? undefined, {
      type: "question",
      title: tNative("dialog.addProject"),
      message: tNative("dialog.designStorageMessage"),
      detail: tNative("dialog.designStorageDetail"),
      checkboxLabel: tNative("dialog.ignoreDesignInGit"),
      checkboxChecked: false,
      buttons: [tNative("dialog.addProject"), tNative("dialog.cancel")],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (storage.response !== 0) return null;
    if (storage.checkboxChecked) await ensureProjectDesignIgnored(root);
    metaDir(root);
    const rows = listProjects();
    if (!rows.some((p) => p.id === root)) {
      rows.push({ id: root, name: path.basename(root), rootPath: root, addedAt: Date.now() });
      saveProjects(rows);
    }
    stampProject(root);
    return projectEntry(root);
  });

  ipcMain.handle("bingo:list-projects", async () => listProjects());

  ipcMain.handle("bingo:get-project", async (_event, projectId) => projectEntry(projectId));

  ipcMain.handle("bingo:remove-project", async (event, input) => {
    const win = windowForWebContents(event.sender);
    if (!win || win.webContents.id !== event.sender.id) throw new Error("Only the project list can remove projects.");
    const projectId = typeof input === "string" ? input : input?.projectId;
    const deleteDesignData = typeof input === "string" ? false : input?.deleteDesignData ?? false;
    if (typeof projectId !== "string" || typeof deleteDesignData !== "boolean") throw new Error("Invalid project removal options.");
    const row = readRegistry().find(project => project.id === projectId);
    if (!row) throw new Error("This project is not registered with Bingo.");
    const root = path.resolve(row.canonicalRoot || row.rootPath || row.id);
    if (removingProjects.has(root)) throw new Error("This project is already being removed.");
    removingProjects.add(root);
    try {
      if (!(await prepareProjectRemoval(root))) return { success: false, cancelled: true };
      // Closing the editor flushes its pending saves; wait for main-process
      // writes too before clearing the files and cached persistence objects.
      while (pendingStoreOperations.get(root)?.size) await Promise.allSettled([...pendingStoreOperations.get(root)]);
      const directory = projectDesignDataPath(root);
      const chats = chatStores.get(directory);
      if (chats) await Promise.allSettled([...chats.queues.values()]);
      await projectMemoryStores.get(directory)?.queue;
      designWatchers.get(root)?.close();
      designWatchers.delete(root);
      variableSources.delete(root);
      if (deleteDesignData) deleteProjectDesignData(root, app.getPath("userData"));
      saveProjects(readRegistry().filter(project => project.id !== projectId));
      chatStores.delete(directory);
      projectMemoryStores.delete(directory);
      return { success: true, deletedDesignData: deleteDesignData };
    } finally {
      removingProjects.delete(root);
    }
  });

  ipcMain.handle("bingo:rename-project", async (_event, body) => {
    const rows = listProjects();
    const row = rows.find((p) => p.id === body?.projectId);
    if (row) {
      row.name = body.name;
      saveProjects(rows);
    }
    return { success: true };
  });

  app.once("before-quit", () => {
    for (const state of configurationWatchers.values()) {
      state.rootWatcher?.close();
      state.configWatcher?.close();
      clearTimeout(state.timer);
    }
    configurationWatchers.clear();
    for (const watcher of designWatchers.values()) watcher.close();
    designWatchers.clear();
    variableSources.clear();
  });
}

export {
  registerHandlers as registerLocalStore,
  invokeLocalStore,
  // Used by the save-to-code path (src/main/localSaveToCode.ts).
  readFile as readProjectFile,
  writeFile as writeProjectFile,
  writeBinaryFile as writeProjectBinaryFile,
  deleteFile as deleteProjectFile,
  // Used by the local API router (src/main/localApiFetch.ts).
  listFileRecords as listProjectFiles,
  projectEntry,
  readSettings as readProjectSettings,
  writeSettings as writeProjectSettings,
  addIconLibraries as addProjectIconLibrarySettings,
  listCanvases as listProjectCanvases,
  chatStoreForRoot,
  projectMemoryStoreForRoot,
  resolveRegisteredProjectRoot,
  setChatLifecycleHook,
  safeJoin,
};
