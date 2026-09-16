import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const CACHE_SCHEMA_VERSION = 1;
const COMPILER_SIGNATURE = "local-compiler-v2-compiled-css";
const MAX_IDLE_PROJECTS = 3;
const MAX_CACHE_BYTES = 256 * 1024 * 1024;
const MAX_DISK_CACHE_BYTES = 1024 * 1024 * 1024;
const MAX_DISK_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const entries = new Map();
let diskCacheRoot = null;
let cacheEpoch = 0;

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function projectKey(root) {
  return crypto.createHash("sha256").update(path.resolve(root)).digest("hex").slice(0, 32);
}

function contentHash(contents) {
  return crypto.createHash("sha256").update(contents).digest("hex");
}

function snapshotByteSize(snapshot) {
  let total = Buffer.byteLength(JSON.stringify(snapshot.componentIndex || {}));
  total += Buffer.byteLength(snapshot.cssUrl || "");
  for (const module of snapshot.modules || []) {
    total += Buffer.byteLength(module.path || "");
    total += Buffer.byteLength(module.codeUrl || "");
  }
  return total;
}

function trimProjectBuildCache() {
  const ordered = [...entries.entries()].sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
  let totalBytes = ordered.reduce((sum, [, entry]) => sum + entry.byteSize, 0);
  while (ordered.length > MAX_IDLE_PROJECTS || totalBytes > MAX_CACHE_BYTES) {
    const [root, entry] = ordered.shift();
    entries.delete(root);
    totalBytes -= entry.byteSize;
  }
}

function remember(root, snapshot, fingerprint, source = "memory") {
  const entry = {
    snapshot,
    fingerprint,
    source,
    byteSize: snapshotByteSize(snapshot),
    lastUsedAt: Date.now(),
  };
  entries.set(root, entry);
  trimProjectBuildCache();
  return entries.get(root) || null;
}

function decodeDataUrl(url) {
  const comma = typeof url === "string" ? url.indexOf(",") : -1;
  if (comma === -1) throw new Error("Invalid cached data URL");
  const header = url.slice(0, comma);
  const payload = url.slice(comma + 1);
  return header.endsWith(";base64") ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload));
}

function dataUrl(contents, type) {
  return `data:${type};base64,${contents.toString("base64")}`;
}

function snapshotPaths(root, snapshotId) {
  if (!/^[a-zA-Z0-9_-]+$/.test(snapshotId)) throw new Error("Invalid build cache snapshot ID");
  const projectDirectory = path.join(diskCacheRoot, projectKey(root));
  return {
    projectDirectory,
    currentFile: path.join(projectDirectory, "current.json"),
    snapshotDirectory: path.join(projectDirectory, "snapshots", snapshotId),
  };
}

async function writeJsonAtomic(file, value, epoch) {
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomUUID()}`;
  await fs.writeFile(temporary, JSON.stringify(value));
  if (cacheEpoch !== epoch) {
    await fs.rm(temporary, { force: true });
    return false;
  }
  await fs.rename(temporary, file);
  return true;
}

async function directorySize(directory) {
  let total = 0;
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) total += await directorySize(absolute);
    else {
      try {
        total += (await fs.stat(absolute)).size;
      } catch {}
    }
  }
  return total;
}

async function pruneDiskCache(protectedRoot) {
  if (!diskCacheRoot) return;
  let directories;
  try {
    directories = await fs.readdir(diskCacheRoot, { withFileTypes: true });
  } catch {
    return;
  }
  const protectedKeys = new Set([...entries.keys()].map(projectKey));
  if (protectedRoot) protectedKeys.add(projectKey(protectedRoot));
  const projects = [];
  const now = Date.now();
  for (const directory of directories) {
    if (!directory.isDirectory()) continue;
    const absolute = path.join(diskCacheRoot, directory.name);
    let lastUsedAt = 0;
    try {
      const current = JSON.parse(await fs.readFile(path.join(absolute, "current.json"), "utf8"));
      lastUsedAt = Number(current.lastUsedAt || 0);
    } catch {}
    if (!protectedKeys.has(directory.name) && now - lastUsedAt > MAX_DISK_CACHE_AGE_MS) {
      await fs.rm(absolute, { recursive: true, force: true });
      continue;
    }
    projects.push({ key: directory.name, absolute, lastUsedAt, bytes: await directorySize(absolute) });
  }
  let totalBytes = projects.reduce((sum, project) => sum + project.bytes, 0);
  for (const project of projects.sort((a, b) => a.lastUsedAt - b.lastUsedAt)) {
    if (totalBytes <= MAX_DISK_CACHE_BYTES) break;
    if (protectedKeys.has(project.key)) continue;
    await fs.rm(project.absolute, { recursive: true, force: true });
    totalBytes -= project.bytes;
  }
}

async function persistProjectBuildCache(root, snapshot, fingerprint) {
  if (!diskCacheRoot) return;
  const epoch = cacheEpoch;
  const snapshotId = fingerprint.digest;
  const paths = snapshotPaths(root, snapshotId);
  const temporaryDirectory = `${paths.snapshotDirectory}.tmp-${process.pid}-${crypto.randomUUID()}`;
  const moduleRecords = [];
  try {
    await fs.mkdir(path.join(temporaryDirectory, "modules"), { recursive: true });
    for (const module of snapshot.modules || []) {
      const contents = decodeDataUrl(module.codeUrl);
      const hash = contentHash(contents);
      await fs.writeFile(path.join(temporaryDirectory, "modules", `${hash}.js`), contents);
      moduleRecords.push({ path: module.path, hash, cssImports: module.cssImports || [] });
    }
    let css = null;
    if (snapshot.cssUrl) {
      const contents = decodeDataUrl(snapshot.cssUrl);
      css = { hash: contentHash(contents) };
      await fs.writeFile(path.join(temporaryDirectory, "stylesheet.css"), contents);
    }
    const manifest = {
      schemaVersion: CACHE_SCHEMA_VERSION,
      compilerSignature: COMPILER_SIGNATURE,
      root: path.resolve(root),
      snapshotId,
      fingerprint,
      componentIndex: snapshot.componentIndex,
      modules: moduleRecords,
      css,
      dependencyFiles: snapshot.dependencyFiles || [],
      buildInputFiles: snapshot.buildInputFiles || [],
      cssFiles: snapshot.cssFiles || [],
      entryInputs: snapshot.entryInputs || {},
      workspaceRoot: snapshot.workspaceRoot,
      complete: snapshot.complete === true,
      createdAt: Date.now(),
    };
    await fs.writeFile(path.join(temporaryDirectory, "manifest.json"), JSON.stringify(manifest));
    if (cacheEpoch !== epoch) return;
    await fs.mkdir(path.dirname(paths.snapshotDirectory), { recursive: true });
    try {
      await fs.rename(temporaryDirectory, paths.snapshotDirectory);
    } catch (error) {
      if (error?.code !== "EEXIST" && error?.code !== "ENOTEMPTY") throw error;
    }
    await fs.mkdir(paths.projectDirectory, { recursive: true });
    const current = {
      schemaVersion: CACHE_SCHEMA_VERSION,
      compilerSignature: COMPILER_SIGNATURE,
      snapshotId,
      lastUsedAt: Date.now(),
    };
    await writeJsonAtomic(paths.currentFile, current, epoch);
    const snapshotsDirectory = path.dirname(paths.snapshotDirectory);
    for (const entry of await fs.readdir(snapshotsDirectory, { withFileTypes: true })) {
      if (entry.name === snapshotId) continue;
      await fs.rm(path.join(snapshotsDirectory, entry.name), { recursive: true, force: true });
    }
    await pruneDiskCache(root);
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true }).catch(() => {});
  }
}

async function loadProjectBuildCache(root) {
  if (!diskCacheRoot) return null;
  const projectDirectory = path.join(diskCacheRoot, projectKey(root));
  try {
    const current = JSON.parse(await fs.readFile(path.join(projectDirectory, "current.json"), "utf8"));
    if (
      current.schemaVersion !== CACHE_SCHEMA_VERSION ||
      current.compilerSignature !== COMPILER_SIGNATURE ||
      typeof current.snapshotId !== "string"
    ) return null;
    const snapshotDirectory = path.join(projectDirectory, "snapshots", current.snapshotId);
    const manifest = JSON.parse(await fs.readFile(path.join(snapshotDirectory, "manifest.json"), "utf8"));
    if (
      manifest.schemaVersion !== CACHE_SCHEMA_VERSION ||
      manifest.compilerSignature !== COMPILER_SIGNATURE ||
      manifest.root !== path.resolve(root) ||
      manifest.snapshotId !== current.snapshotId ||
      manifest.complete !== true
    ) return null;
    const modules = await mapWithConcurrency(manifest.modules || [], 16, async (module) => {
      if (!/^[a-f0-9]{64}$/.test(module.hash || "")) throw new Error("Invalid cached module hash");
      const contents = await fs.readFile(path.join(snapshotDirectory, "modules", `${module.hash}.js`));
      if (contentHash(contents) !== module.hash) throw new Error("Cached module checksum mismatch");
      return {
        path: module.path,
        codeUrl: dataUrl(contents, "text/javascript"),
        cssImports: module.cssImports || [],
      };
    });
    let cssUrl = null;
    if (manifest.css) {
      if (!/^[a-f0-9]{64}$/.test(manifest.css.hash || "")) throw new Error("Invalid cached stylesheet hash");
      const contents = await fs.readFile(path.join(snapshotDirectory, "stylesheet.css"));
      if (contentHash(contents) !== manifest.css.hash) throw new Error("Cached stylesheet checksum mismatch");
      cssUrl = dataUrl(contents, "text/css");
    }
    const restored = remember(root, {
      modules,
      componentIndex: manifest.componentIndex || {},
      cssUrl,
      dependencyFiles: manifest.dependencyFiles || [],
      buildInputFiles: manifest.buildInputFiles || [],
      cssFiles: manifest.cssFiles || [],
      entryInputs: manifest.entryInputs || {},
      workspaceRoot: manifest.workspaceRoot || manifest.fingerprint?.workspaceRoot || root,
      complete: true,
      buildFailures: [],
    }, manifest.fingerprint, "disk");
    void writeJsonAtomic(path.join(projectDirectory, "current.json"), {
      ...current,
      lastUsedAt: Date.now(),
    }, cacheEpoch).catch(() => {});
    return restored;
  } catch {
    await fs.rm(projectDirectory, { recursive: true, force: true }).catch(() => {});
    return null;
  }
}

function configureProjectBuildCache(userDataRoot) {
  diskCacheRoot = userDataRoot ? path.join(userDataRoot, "build-cache", `v${CACHE_SCHEMA_VERSION}`) : null;
}

async function getProjectBuildCache(root) {
  const entry = entries.get(root);
  if (entry) {
    entry.lastUsedAt = Date.now();
    return entry;
  }
  return loadProjectBuildCache(root);
}

async function setProjectBuildCache(root, snapshot, fingerprint) {
  const entry = remember(root, snapshot, fingerprint);
  if (!entry) return null;
  await persistProjectBuildCache(root, snapshot, fingerprint).catch((error) => {
    console.warn(`[projectBuildCache] Could not persist build cache: ${error?.message || error}`);
  });
  return entry;
}

async function deleteProjectBuildCache(root, options = {}) {
  entries.delete(root);
  if (options.disk === true && diskCacheRoot) {
    await fs.rm(path.join(diskCacheRoot, projectKey(root)), { recursive: true, force: true });
  }
}

async function clearProjectBuildCache(options = {}) {
  cacheEpoch += 1;
  entries.clear();
  if (options.disk === true && diskCacheRoot) {
    await fs.rm(diskCacheRoot, { recursive: true, force: true });
  }
}

function projectBuildCacheStats() {
  const values = [...entries.values()];
  return {
    projects: values.length,
    bytes: values.reduce((sum, entry) => sum + entry.byteSize, 0),
  };
}

export {
  clearProjectBuildCache,
  configureProjectBuildCache,
  deleteProjectBuildCache,
  getProjectBuildCache,
  projectBuildCacheStats,
  setProjectBuildCache,
};
