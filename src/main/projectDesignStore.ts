import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DESIGN_SCHEMA_VERSION = 1;
const DESIGN_RELATIVE_DIR = path.join(".bingo", "design");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ProjectDesignError extends Error {
  code;
  details;

  constructor(code, message, details = {}) {
    super(message);
    this.name = "ProjectDesignError";
    this.code = code;
    this.details = details;
  }
}

function pathsFor(root) {
  const projectRoot = fs.realpathSync(root);
  const designRoot = path.join(projectRoot, DESIGN_RELATIVE_DIR);
  return {
    projectRoot,
    designRoot,
    manifest: path.join(designRoot, "manifest.json"),
    pages: path.join(designRoot, "pages"),
    assets: path.join(designRoot, "assets"),
    lock: path.join(designRoot, ".write.lock"),
  };
}

function assertSafeDesignPath(paths, target) {
  const relative = path.relative(paths.projectRoot, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ProjectDesignError("OUTSIDE_PROJECT_ROOT", "Design path escapes the project root.", { path: target });
  }
  let current = paths.projectRoot;
  for (const part of relative.split(path.sep).slice(0, -1)) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) {
        throw new ProjectDesignError("DESIGN_INVALID", "Portable design directories cannot be symbolic links.", { path: current });
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      break;
    }
  }
}

function readJson(file, missingCode = "DESIGN_MISSING") {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") throw new ProjectDesignError(missingCode, `Design file is missing: ${file}`, { path: file });
    throw new ProjectDesignError("DESIGN_INVALID", `Could not read design file: ${error?.message || error}`, { path: file });
  }
  try {
    return { value: JSON.parse(text), revision: crypto.createHash("sha256").update(text).digest("hex") };
  } catch {
    throw new ProjectDesignError("DESIGN_INVALID", `Design file contains invalid JSON: ${file}`, { path: file });
  }
}

function atomicWriteJson(paths, file, value) {
  assertSafeDesignPath(paths, file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const text = `${JSON.stringify(value, null, 2)}\n`;
  let current = null;
  try { current = fs.readFileSync(file, "utf8"); } catch {}
  if (current === text) return crypto.createHash("sha256").update(text).digest("hex");
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, "wx", 0o644);
    fs.writeFileSync(descriptor, text, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, file);
  } catch (error) {
    throw new ProjectDesignError("SAVE_FAILED", `Could not save design file: ${error?.message || error}`, { path: file });
  } finally {
    if (descriptor !== undefined) try { fs.closeSync(descriptor); } catch {}
    try { fs.unlinkSync(temporary); } catch {}
  }
  return crypto.createHash("sha256").update(text).digest("hex");
}

function withDesignWriteLock(paths, operation) {
  assertSafeDesignPath(paths, paths.lock);
  fs.mkdirSync(paths.designRoot, { recursive: true });
  const token = crypto.randomUUID();
  let descriptor;
  try {
    descriptor = fs.openSync(paths.lock, "wx", 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify({ token, pid: process.pid })}\n`, "utf8");
    fs.closeSync(descriptor);
    descriptor = undefined;
  } catch (error) {
    if (descriptor !== undefined) try { fs.closeSync(descriptor); } catch {}
    if (error?.code === "EEXIST") throw new ProjectDesignError("WRITE_IN_PROGRESS", "Another Bingo process is writing this project design.", { path: paths.lock });
    throw error;
  }
  try {
    return operation();
  } finally {
    try {
      const current = JSON.parse(fs.readFileSync(paths.lock, "utf8"));
      if (current?.token === token) fs.unlinkSync(paths.lock);
    } catch {}
  }
}

function assetName(filename, bytes) {
  const extension = path.extname(path.basename(filename || "")).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 12) || ".bin";
  return `${crypto.createHash("sha256").update(bytes).digest("hex")}${extension}`;
}

function writeAsset(paths, filename, bytes) {
  const name = assetName(filename, bytes);
  const file = path.join(paths.assets, name);
  assertSafeDesignPath(paths, file);
  fs.mkdirSync(paths.assets, { recursive: true });
  if (!fs.existsSync(file)) {
    const temporary = path.join(paths.assets, `.${name}.${process.pid}.${crypto.randomUUID()}.tmp`);
    try {
      fs.writeFileSync(temporary, bytes, { flag: "wx", mode: 0o644 });
      fs.renameSync(temporary, file);
    } finally {
      try { fs.unlinkSync(temporary); } catch {}
    }
  }
  return name;
}

function validateManifest(value, file) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProjectDesignError("DESIGN_INVALID", "Design manifest must be an object.", { path: file });
  }
  if (value.schemaVersion !== DESIGN_SCHEMA_VERSION) {
    throw new ProjectDesignError("DESIGN_VERSION_UNSUPPORTED", `Unsupported design schema version: ${String(value.schemaVersion)}`, { path: file });
  }
  if (!UUID_RE.test(String(value.documentId || ""))) {
    throw new ProjectDesignError("DESIGN_INVALID", "Design manifest has an invalid documentId.", { path: file });
  }
  if (!Array.isArray(value.pages)) throw new ProjectDesignError("DESIGN_INVALID", "Design manifest pages must be an array.", { path: file });
  const pages = [];
  for (const entry of value.pages) {
    const id = typeof entry === "string" ? entry : entry?.id;
    if (!UUID_RE.test(String(id || "")) || pages.some(item => item.id === id)) {
      throw new ProjectDesignError("DESIGN_INVALID", "Design manifest contains an invalid or duplicate page id.", { path: file });
    }
    pages.push({ id });
  }
  return { ...value, pages };
}

function validatePage(value, expectedId, file) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.schemaVersion !== DESIGN_SCHEMA_VERSION) {
    throw new ProjectDesignError("DESIGN_INVALID", "Design page has an invalid schema.", { path: file });
  }
  if (value.id !== expectedId || !UUID_RE.test(String(value.id || ""))) {
    throw new ProjectDesignError("DESIGN_INVALID", "Design page id does not match its manifest entry.", { path: file });
  }
  if (!value.canvas || typeof value.canvas !== "object" || Array.isArray(value.canvas)) {
    throw new ProjectDesignError("DESIGN_INVALID", "Design page canvas must be an object.", { path: file });
  }
  return value;
}

function hasPortableDesign(root) {
  try {
    return fs.statSync(pathsFor(root).manifest).isFile();
  } catch {
    return false;
  }
}

function portableDesignRevision(root) {
  const paths = pathsFor(root);
  if (!fs.existsSync(paths.designRoot)) return "missing";
  assertSafeDesignPath(paths, paths.manifest);
  const hash = crypto.createHash("sha256");
  const addDirectory = (directory, includeContents) => {
    let entries = [];
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch (error) {
      hash.update(`missing:${path.relative(paths.designRoot, directory)}:${error?.code || "error"}\n`);
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".")) continue;
      const file = path.join(directory, entry.name);
      if (!entry.isFile()) continue;
      hash.update(`${path.relative(paths.designRoot, file)}\0`);
      try {
        if (includeContents) hash.update(fs.readFileSync(file));
        else {
          const stat = fs.statSync(file);
          hash.update(`${stat.size}:${stat.mtimeMs}`);
        }
      } catch (error) {
        hash.update(`unreadable:${error?.code || "error"}`);
      }
      hash.update("\n");
    }
  };
  try { hash.update(fs.readFileSync(paths.manifest)); } catch (error) { hash.update(`manifest:${error?.code || "error"}`); }
  hash.update("\n");
  addDirectory(paths.pages, true);
  addDirectory(paths.assets, false);
  return hash.digest("hex");
}

function inspectPortableDesign(root) {
  const paths = pathsFor(root);
  if (!hasPortableDesign(root)) {
    return { mode: "app", designPath: paths.designRoot, documentId: null, pageCount: 0, assetCount: 0 };
  }
  const { value: manifest } = readManifest(root);
  let assetCount = 0;
  try { assetCount = fs.readdirSync(paths.assets, { withFileTypes: true }).filter(entry => entry.isFile() && !entry.name.startsWith(".")).length; } catch {}
  return {
    mode: "project",
    designPath: paths.designRoot,
    documentId: manifest.documentId,
    pageCount: manifest.pages.length,
    assetCount,
  };
}

function readManifest(root) {
  const paths = pathsFor(root);
  assertSafeDesignPath(paths, paths.manifest);
  const source = readJson(paths.manifest);
  return { ...source, value: validateManifest(source.value, paths.manifest), paths };
}

function portablePageFile(paths, pageId) {
  if (!UUID_RE.test(String(pageId || ""))) throw new ProjectDesignError("DESIGN_INVALID", "Canvas id must be a UUID.");
  return path.join(paths.pages, `${pageId}.json`);
}

function readPortablePage(root, pageId) {
  const { paths } = readManifest(root);
  const file = portablePageFile(paths, pageId);
  const source = readJson(file);
  return { ...validatePage(source.value, pageId, file), _revision: source.revision };
}

function listPortablePages(root) {
  const { value: manifest, paths } = readManifest(root);
  return manifest.pages.map((entry, sortOrder) => {
    const file = portablePageFile(paths, entry.id);
    const source = readJson(file);
    return { ...validatePage(source.value, entry.id, file), sortOrder, _revision: source.revision };
  });
}

function pageRecord(params, existing = {}) {
  return {
    ...existing,
    schemaVersion: DESIGN_SCHEMA_VERSION,
    id: params.id,
    name: params.name ?? existing.name ?? "Page",
    canvas: {
      ...(existing.canvas || {}),
      elements: params.elements ?? existing.canvas?.elements ?? { schemaVersion: 2, byId: {}, childrenByParent: { ROOT: [] } },
      zoom: params.zoom ?? existing.canvas?.zoom,
      pan: params.pan ?? existing.canvas?.pan,
      backgroundColor: params.backgroundColor ?? existing.canvas?.backgroundColor,
      backgroundToken: params.backgroundToken ?? existing.canvas?.backgroundToken,
      metadata: params.metadata ?? existing.canvas?.metadata,
    },
    newClasses: params.newClasses ?? existing.newClasses ?? [],
  };
}

function savePortablePage(root, params, expectedRevision) {
  const paths = pathsFor(root);
  return withDesignWriteLock(paths, () => {
    const { value: manifest } = readManifest(root);
    const file = portablePageFile(paths, params?.id);
    const present = manifest.pages.some(entry => entry.id === params.id);
    let existing = {};
    if (present) existing = readPortablePage(root, params.id);
    if (present && expectedRevision && existing._revision !== expectedRevision) {
      throw new ProjectDesignError("DESIGN_CONFLICT", "This design page changed outside Bingo. Your current edit was not written.", {
        pageId: params.id,
        expectedRevision,
        actualRevision: existing._revision,
      });
    }
    const next = pageRecord(params, existing);
    delete next._revision;
    const revision = atomicWriteJson(paths, file, next);
    if (!present) atomicWriteJson(paths, paths.manifest, { ...manifest, pages: [...manifest.pages, { id: params.id }] });
    return { ...next, sortOrder: present ? manifest.pages.findIndex(entry => entry.id === params.id) : manifest.pages.length, _revision: revision };
  });
}

function deletePortablePage(root, pageId) {
  const paths = pathsFor(root);
  return withDesignWriteLock(paths, () => {
    const { value: manifest } = readManifest(root);
    const nextPages = manifest.pages.filter(entry => entry.id !== pageId);
    if (nextPages.length === manifest.pages.length) return { success: true };
    atomicWriteJson(paths, paths.manifest, { ...manifest, pages: nextPages });
    const file = portablePageFile(paths, pageId);
    assertSafeDesignPath(paths, file);
    try { fs.unlinkSync(file); } catch (error) { if (error?.code !== "ENOENT") throw error; }
    return { success: true };
  });
}

function reorderPortablePages(root, order) {
  const paths = pathsFor(root);
  return withDesignWriteLock(paths, () => {
    const { value: manifest } = readManifest(root);
    const requested = [...(order || [])]
      .sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0))
      .map(entry => typeof entry === "string" ? entry : entry?.id)
      .filter(id => manifest.pages.some(page => page.id === id));
    const ids = [...new Set([...requested, ...manifest.pages.map(page => page.id)])];
    atomicWriteJson(paths, paths.manifest, { ...manifest, pages: ids.map(id => ({ id })) });
    return { success: true };
  });
}

function createPortableDesign(root, pages = [], options = {}) {
  const paths = pathsFor(root);
  if (hasPortableDesign(root)) throw new ProjectDesignError("DESIGN_CONFLICT", "This project already contains a portable design.");
  return withDesignWriteLock(paths, () => {
    assertSafeDesignPath(paths, paths.manifest);
    const normalized = pages.map(page => {
      const id = UUID_RE.test(String(page?.id || "")) ? page.id : crypto.randomUUID();
      return pageRecord({ ...page, ...(page?.canvas || {}), id });
    });
    for (const asset of options.assets || []) {
      if (!asset || !Buffer.isBuffer(asset.bytes)) throw new ProjectDesignError("DESIGN_INVALID", "Portable asset bytes are required.");
      const written = writeAsset(paths, asset.filename, asset.bytes);
      if (asset.name && written !== asset.name) throw new ProjectDesignError("DESIGN_INVALID", "Portable asset hash does not match its prepared reference.");
    }
    for (const page of normalized) atomicWriteJson(paths, portablePageFile(paths, page.id), page);
    atomicWriteJson(paths, paths.manifest, {
      schemaVersion: DESIGN_SCHEMA_VERSION,
      documentId: UUID_RE.test(String(options.documentId || "")) ? options.documentId : crypto.randomUUID(),
      pages: normalized.map(page => ({ id: page.id })),
    });
    return listPortablePages(root);
  });
}

function savePortableAsset(root, { filename, dataBase64 }) {
  const paths = pathsFor(root);
  return withDesignWriteLock(paths, () => {
    readManifest(root);
    const bytes = Buffer.from(dataBase64 || "", "base64");
    const name = writeAsset(paths, filename, bytes);
    return { url: `bingo-asset:${name}` };
  });
}

export {
  DESIGN_RELATIVE_DIR,
  ProjectDesignError,
  createPortableDesign,
  deletePortablePage,
  hasPortableDesign,
  inspectPortableDesign,
  assetName as portableAssetName,
  listPortablePages,
  portableDesignRevision,
  readPortablePage,
  reorderPortablePages,
  savePortableAsset,
  savePortablePage,
};
