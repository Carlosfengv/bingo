import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { createPortableDesign, hasPortableDesign, listPortablePages, portableAssetName } from "./projectDesignStore";

const DATA_VERSION = 1;
const MARKER = "data-storage.json";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Device permissions and application credentials must not become repository grants.
const ENTRIES = ["project.json", "preview.json", "canvases", "files", "drafts", "chats", "chat-data", "assets", "memory.json", "design-backups", "prototype-theme-preferences.json"];

export function legacyProjectDataPath(root, userDataRoot) {
  const key = crypto.createHash("sha256").update(path.resolve(root)).digest("hex").slice(0, 32);
  return path.join(userDataRoot, "local-project-data", key);
}

export function projectDesignDataPath(root) {
  return path.join(root, ".bingo", "design");
}

/** Only remove design data. Never initialize storage or follow a directory link. */
export function deleteProjectDesignData(root, userDataRoot) {
  root = path.resolve(root);
  const directory = projectDesignDataPath(root);
  if (fs.existsSync(root) && fs.realpathSync(root) !== root) throw new Error("The project folder changed location. Add it again before deleting its data.");
  checkPath(root, directory);
  const legacy = legacyProjectDataPath(root, userDataRoot);
  const targets = ENTRIES.map(entry => path.join(legacy, entry));
  for (const target of targets) checkPath(path.resolve(userDataRoot), target);
  if (fs.existsSync(path.join(root, ".bingo", ".design-data-migration.lock")) || fs.existsSync(path.join(directory, ".write.lock"))) {
    throw new Error("Project design data is being written. Close other Bingo instances and retry.");
  }
  // Clear legacy copies first so adding the project again cannot resurrect them.
  for (const target of targets) fs.rmSync(target, { recursive: true, force: true });
  fs.rmSync(directory, { recursive: true, force: true });
}

function checkPath(root, target) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Design data must stay inside the project.");
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Design data cannot use symbolic links: ${current}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function atomicWrite(file, bytes) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, bytes, { flag: "wx", mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

/** Copy once, retaining the original app data as a recovery copy. Project files win. */
export function ensureProjectDesignData(root, userDataRoot) {
  root = fs.realpathSync(root);
  const directory = projectDesignDataPath(root);
  const marker = path.join(directory, MARKER);
  checkPath(root, marker);
  if (fs.existsSync(marker)) {
    const value = JSON.parse(fs.readFileSync(marker, "utf8"));
    if (value.schemaVersion !== DATA_VERSION) throw new Error("Unsupported project design data version.");
    if (!hasPortableDesign(root)) throw new Error("Project design is missing. Restore .bingo/design/manifest.json from Git or a backup.");
    return directory;
  }

  const source = legacyProjectDataPath(root, userDataRoot);
  // An exclusive migration lock prevents two app instances importing at once.
  const lock = path.join(root, ".bingo", ".design-data-migration.lock");
  checkPath(root, lock);
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  let descriptor;
  try {
    descriptor = fs.openSync(lock, "wx", 0o600);
  }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    let owner;
    try { owner = JSON.parse(fs.readFileSync(lock, "utf8")); } catch {}
    let dead = false;
    if (owner?.hostname === os.hostname() && Number.isInteger(owner.pid) && owner.pid > 0) {
      try { process.kill(owner.pid, 0); } catch (cause) { dead = cause.code === "ESRCH"; }
    }
    if (!dead) throw new Error(`Design data migration is locked. Close other Bingo instances before removing ${lock} and retrying.`);
    fs.unlinkSync(lock);
    descriptor = fs.openSync(lock, "wx", 0o600);
  }
  try {
    fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, hostname: os.hostname() }));
    const assets = new Map();
    const convert = value => {
      if (Array.isArray(value)) return value.map(convert);
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, convert(item)]));
      if (typeof value !== "string") return value;
      return value.replace(/file:\/\/[^'"\s)]+/g, url => {
        let file;
        try { file = fileURLToPath(url); } catch { return url; }
        const assetRoot = path.join(source, "assets");
        if (!file.startsWith(assetRoot + path.sep)) return url;
        checkPath(source, file);
        const bytes = fs.readFileSync(file);
        const name = portableAssetName(file, bytes);
        assets.set(name, { filename: file, name, bytes });
        return `bingo-asset:${name}`;
      });
    };
    const copy = (from, to, transform = false) => {
      checkPath(source, from);
      checkPath(root, to);
      if (!fs.existsSync(from)) return;
      if (fs.statSync(from).isDirectory()) {
        for (const entry of fs.readdirSync(from)) copy(path.join(from, entry), path.join(to, entry), transform);
        return;
      }
      const bytes = transform && from.endsWith(".json")
        ? Buffer.from(JSON.stringify(convert(JSON.parse(fs.readFileSync(from, "utf8"))), null, 2) + "\n")
        : fs.readFileSync(from);
      if (!fs.existsSync(to)) atomicWrite(to, bytes);
      else if (!fs.readFileSync(to).equals(bytes)) {
        // Preserve a conflicting legacy record without replacing repository data.
        const backup = path.join(directory, "design-backups", "legacy-import", path.relative(source, from));
        checkPath(root, backup);
        if (!fs.existsSync(backup)) atomicWrite(backup, bytes);
      }
    };
    for (const entry of ENTRIES) copy(path.join(source, entry), path.join(directory, entry), ["canvases", "drafts"].includes(entry));
    for (const asset of assets.values()) {
      const target = path.join(directory, "assets", asset.name);
      checkPath(root, target);
      if (!fs.existsSync(target)) atomicWrite(target, asset.bytes);
    }
    if (!hasPortableDesign(root)) {
      const canvases = path.join(directory, "canvases");
      const pages = fs.existsSync(canvases) ? fs.readdirSync(canvases).filter(file => file.endsWith(".json"))
        .map(file => {
          const page = JSON.parse(fs.readFileSync(path.join(canvases, file), "utf8"));
          if (!UUID_RE.test(String(page?.id || ""))) {
            // Older builds saved undefined.json. A deterministic ID keeps
            // interrupted migrations and their version history consistent.
            const hash = crypto.createHash("sha256").update(file).digest("hex");
            page.id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
            const oldVersions = path.join(canvases, `${file.slice(0, -5)}.versions`);
            if (fs.existsSync(oldVersions)) for (const version of fs.readdirSync(oldVersions).filter(name => name.endsWith(".json"))) {
              const target = path.join(canvases, `${page.id}.versions`, version);
              checkPath(root, target);
              if (!fs.existsSync(target)) atomicWrite(target, JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(oldVersions, version), "utf8")), pageId: page.id }, null, 2) + "\n");
            }
          }
          return page;
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : [];
      createPortableDesign(root, pages);
    } else listPortablePages(root); // Fail visibly on corrupt repository data.
    atomicWrite(marker, JSON.stringify({ schemaVersion: DATA_VERSION }, null, 2) + "\n");
    return directory;
  } finally {
    fs.closeSync(descriptor);
    fs.unlinkSync(lock);
  }
}
