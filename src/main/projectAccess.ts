import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SCHEMA_VERSION = 1;
const PROJECT_DATA_DIR = "local-project-data";

let userDataRoot = null;
let resolveProjectRoot = () => null;
const listeners = new Set();

function configureProjectAccess(options = {}) {
  userDataRoot = typeof options.userDataRoot === "string" ? path.resolve(options.userDataRoot) : null;
  resolveProjectRoot = typeof options.resolveProjectRoot === "function" ? options.resolveProjectRoot : () => null;
}

function canonicalDirectory(value) {
  if (typeof value !== "string" || !path.isAbsolute(value)) return null;
  try {
    const real = fs.realpathSync(value);
    return fs.statSync(real).isDirectory() ? real : null;
  } catch {
    return null;
  }
}

function verifiedProjectRoot(projectId) {
  try {
    return canonicalDirectory(resolveProjectRoot(projectId));
  } catch {
    return null;
  }
}

function projectStorageKey(root) {
  return crypto.createHash("sha256").update(path.resolve(root)).digest("hex").slice(0, 32);
}

function accessFile(root) {
  if (!userDataRoot) return null;
  return path.join(userDataRoot, PROJECT_DATA_DIR, projectStorageKey(root), "project-access.json");
}

function hasProjectAccessRecord(projectId) {
  const root = verifiedProjectRoot(projectId);
  const file = root ? accessFile(root) : null;
  return !!file && fs.existsSync(file);
}

function readRecord(root) {
  const file = accessFile(root);
  const editableDefault = { schemaVersion: SCHEMA_VERSION, mode: "edit", extraRoots: [] };
  const restrictedFallback = { schemaVersion: SCHEMA_VERSION, mode: "disabled", extraRoots: [], integrity: "invalid" };
  if (!file || !fs.existsSync(file)) return editableDefault;
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (value?.schemaVersion !== SCHEMA_VERSION) return restrictedFallback;
    if (!["edit", "read-only", "disabled"].includes(value.mode)) return restrictedFallback;
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: value.mode,
      extraRoots: Array.isArray(value.extraRoots) ? value.extraRoots.filter(item => typeof item === "string") : [],
    };
  } catch {
    return restrictedFallback;
  }
}

function writeRecord(root, record) {
  const file = accessFile(root);
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const text = `${JSON.stringify(record, null, 2)}\n`;
  try {
    if (fs.readFileSync(file, "utf8") === text) return;
  } catch {}
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, "wx", 0o600);
    fs.writeFileSync(descriptor, text, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, file);
  } finally {
    if (descriptor !== undefined) try { fs.closeSync(descriptor); } catch {}
    try { fs.unlinkSync(temporary); } catch {}
  }
}

function normalizeExtraRoots(root, values) {
  const output = [];
  for (const value of Array.isArray(values) ? values : []) {
    const candidate = canonicalDirectory(value);
    if (!candidate || candidate === root || output.includes(candidate)) continue;
    output.push(candidate);
  }
  return output;
}

function getProjectAccessContext(projectId) {
  const projectRoot = verifiedProjectRoot(projectId);
  if (!projectRoot) {
    return { projectRoot: null, mode: "disabled", extraRoots: [], allowedPaths: [] };
  }
  const record = readRecord(projectRoot);
  const extraRoots = normalizeExtraRoots(projectRoot, record.extraRoots);
  return {
    projectRoot,
    mode: record.mode,
    extraRoots,
    allowedPaths: record.mode === "disabled" ? [] : [projectRoot, ...extraRoots],
    ...(record.integrity ? { integrity: record.integrity } : {}),
  };
}

function getProjectAllowedPaths(projectId) {
  return getProjectAccessContext(projectId).allowedPaths;
}

function getProjectExtraPaths(projectId) {
  return getProjectAccessContext(projectId).extraRoots;
}

function setProjectAllowedPaths(projectId, paths) {
  const projectRoot = verifiedProjectRoot(projectId);
  if (!projectRoot) return [];
  const previous = getProjectAccessContext(projectId);
  const current = readRecord(projectRoot);
  const extraRoots = normalizeExtraRoots(projectRoot, paths);
  writeRecord(projectRoot, { schemaVersion: SCHEMA_VERSION, mode: current.mode, extraRoots });
  const next = getProjectAccessContext(projectId);
  for (const listener of listeners) listener({ projectId: projectRoot, reason: "paths", previous, next });
  return extraRoots;
}

function grantProjectPath(projectId, value) {
  const context = getProjectAccessContext(projectId);
  if (!context.projectRoot) return false;
  const candidate = canonicalDirectory(value);
  if (!candidate) return false;
  if (candidate === context.projectRoot || context.extraRoots.includes(candidate)) return true;
  setProjectAllowedPaths(projectId, [...context.extraRoots, candidate]);
  return true;
}

function setProjectAccessMode(projectId, mode) {
  if (!["edit", "read-only", "disabled"].includes(mode)) throw new Error(`Invalid project access mode: ${mode}`);
  const projectRoot = verifiedProjectRoot(projectId);
  if (!projectRoot) throw new Error("This project is not registered with Bingo.");
  const previous = getProjectAccessContext(projectId);
  const current = readRecord(projectRoot);
  writeRecord(projectRoot, { schemaVersion: SCHEMA_VERSION, mode, extraRoots: normalizeExtraRoots(projectRoot, current.extraRoots) });
  const next = getProjectAccessContext(projectId);
  for (const listener of listeners) listener({ projectId: projectRoot, reason: "mode", previous, next });
  return next;
}

function subscribeProjectAccessChanges(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export {
  configureProjectAccess,
  getProjectAccessContext,
  getProjectAllowedPaths,
  getProjectExtraPaths,
  hasProjectAccessRecord,
  grantProjectPath,
  setProjectAccessMode,
  setProjectAllowedPaths,
  subscribeProjectAccessChanges,
};
