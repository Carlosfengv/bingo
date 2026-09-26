import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { recoverDeadDesignWriteLock } from "./projectDesignStore";

const digest = (value: Buffer | string) => crypto.createHash("sha256").update(value).digest("hex");
const journalPath = (userDataRoot: string, root: string) => path.join(userDataRoot, "project-registration", `${digest(root)}.json`);
const designPath = (root: string) => path.join(root, ".bingo", "design");
const activeRegistrations = new Set<string>();

function writeJournal(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    const handle = fs.openSync(temporary, "wx", 0o600);
    try { fs.writeFileSync(handle, JSON.stringify(value)); fs.fsyncSync(handle); }
    finally { fs.closeSync(handle); }
    fs.renameSync(temporary, file);
  } finally { try { fs.unlinkSync(temporary); } catch {} }
}

function treeSnapshot(directory: string) {
  if (!fs.existsSync(directory)) return null;
  if (!fs.lstatSync(directory).isDirectory()) throw new Error(`Registration data is not a directory: ${directory}`);
  const files: Record<string, string> = {};
  const visit = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Registration data contains a symbolic link: ${file}`);
      if (entry.isDirectory()) { files[`${path.relative(directory, file)}/`] = "directory"; visit(file); }
      else if (entry.isFile()) files[path.relative(directory, file)] = digest(fs.readFileSync(file));
      else throw new Error(`Registration data contains an unsupported entry: ${file}`);
    }
  };
  visit(directory);
  return files;
}

function sameFiles(a: Record<string, string> | null, b: Record<string, string> | null) {
  return JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort());
}

function recordedDesignFile(root: string, relative: string) {
  const directory = designPath(root);
  const target = path.resolve(directory, relative);
  if (!relative || path.isAbsolute(relative) || target === directory || !target.startsWith(directory + path.sep)) {
    throw new Error(`Invalid project registration file: ${relative}`);
  }
  return target;
}

function assertRecordedPathSafe(directory: string, target: string) {
  let current = directory;
  for (const part of path.relative(directory, target).split(path.sep)) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Registration recovery needs review: ${current}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

function removeRecordedDesignFiles(root: string, value: any) {
  const directory = designPath(root);
  const recorded = value.createdFiles ?? {};
  const paths = Object.entries(recorded).map(([relative, hash]) => {
    if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Invalid project registration file hash: ${relative}`);
    return { relative, target: recordedDesignFile(root, relative), hash };
  });
  if (value.designInitiallyAbsent) {
    const expected = new Set<string>();
    for (const { relative } of paths) {
      expected.add(relative);
      let parent = path.dirname(relative);
      while (parent !== ".") { expected.add(`${parent}/`); parent = path.dirname(parent); }
    }
    for (const entry of Object.keys(treeSnapshot(directory) ?? {})) {
      if (!expected.has(entry)) throw new Error(`Registration recovery needs review: ${path.join(directory, entry)}`);
    }
  }
  for (const { target, hash } of paths) {
    assertRecordedPathSafe(directory, target);
    if (!fs.existsSync(target)) continue;
    if (!fs.lstatSync(target).isFile() || digest(fs.readFileSync(target)) !== hash) {
      throw new Error(`Registration recovery needs review: ${target}`);
    }
  }
  for (const { target } of paths) {
    assertRecordedPathSafe(directory, target);
    if (fs.existsSync(target)) fs.unlinkSync(target);
    let parent = path.dirname(target);
    while (parent !== directory && parent.startsWith(directory + path.sep)) {
      if (!fs.existsSync(parent) || fs.readdirSync(parent).length !== 0) break;
      fs.rmdirSync(parent);
      parent = path.dirname(parent);
    }
  }
  if (value.designInitiallyAbsent && fs.existsSync(directory) && fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
  const bingo = path.join(root, ".bingo");
  if (value.designInitiallyAbsent && fs.existsSync(bingo) && fs.readdirSync(bingo).length === 0) fs.rmdirSync(bingo);
}

function restoreJournal(file: string, value: any, isRegistered: (root: string) => boolean) {
  const root = value?.root;
  if (typeof root !== "string" || !path.isAbsolute(root) || path.resolve(root) !== root) throw new Error(`Invalid project registration journal: ${file}`);
  if (!value.priorRegistered && isRegistered(root)) { fs.unlinkSync(file); return; }
  const bingo = path.join(root, ".bingo");
  if (fs.existsSync(bingo) && fs.lstatSync(bingo).isSymbolicLink()) throw new Error(`Registration recovery needs review: ${bingo}`);
  const design = designPath(root);
  if (fs.existsSync(design) && !fs.lstatSync(design).isDirectory()) throw new Error(`Registration recovery needs review: ${design}`);
  if (value.ignore) {
    const target = path.join(root, ".gitignore");
    const current = fs.existsSync(target) ? fs.lstatSync(target) : null;
    if (current?.isSymbolicLink() || current && !current.isFile()) throw new Error(`Registration recovery needs review: ${target}`);
    const bytesNow = current ? fs.readFileSync(target) : null;
    const bytesBefore = value.ignore.previousBytes === null ? null : Buffer.from(value.ignore.previousBytes, "base64");
    if (bytesNow && bytesBefore && bytesNow.equals(bytesBefore) || bytesNow === null && bytesBefore === null) {
      // The process stopped after recording intent but before replacing the file.
    } else if (!current || bytesNow?.toString("utf8") !== value.ignore.writtenContent) throw new Error(`Registration recovery needs review: ${target}`);
    else if (bytesBefore === null) fs.unlinkSync(target);
    else {
      const temporary = `${target}.${crypto.randomUUID()}.restore.tmp`;
      try { fs.writeFileSync(temporary, bytesBefore, { flag: "wx", mode: current.mode & 0o777 }); fs.renameSync(temporary, target); }
      finally { try { fs.unlinkSync(temporary); } catch {} }
    }
    delete value.ignore;
    writeJournal(file, value);
  }
  if (value.stamp) {
    const target = path.join(designPath(root), "project.json");
    if (fs.existsSync(target)) {
      if (fs.lstatSync(target).isSymbolicLink() || digest(fs.readFileSync(target)) !== value.stamp) throw new Error(`Registration recovery needs review: ${target}`);
      fs.unlinkSync(target);
    }
    delete value.stamp;
    writeJournal(file, value);
  }
  if (value.designInitiallyAbsent && value.createdDesign) {
    const directory = designPath(root);
    recoverDeadDesignWriteLock(root);
    const current = treeSnapshot(directory);
    if (current && !sameFiles(current, value.createdDesign)) throw new Error(`Registration recovery needs review: ${directory}`);
    if (current) fs.rmSync(directory, { recursive: true });
    if (fs.existsSync(bingo) && fs.readdirSync(bingo).length === 0) fs.rmdirSync(bingo);
  } else {
    if (value.designInitiallyAbsent) recoverDeadDesignWriteLock(root);
    removeRecordedDesignFiles(root, value);
  }
  fs.unlinkSync(file);
}

export function beginProjectRegistration(userDataRoot: string, root: string, isRegistered: (root: string) => boolean) {
  root = fs.realpathSync(root);
  const file = journalPath(userDataRoot, root);
  if (activeRegistrations.has(file)) throw new Error("This project is already being registered.");
  if (fs.existsSync(file)) {
    const prior = JSON.parse(fs.readFileSync(file, "utf8"));
    if (prior.ownerPid !== process.pid && prior.hostname === os.hostname()) {
      try { process.kill(prior.ownerPid, 0); throw new Error(`Project registration is active in process ${prior.ownerPid}`); }
      catch (error) { if (error?.code !== "ESRCH") throw error; }
    }
    restoreJournal(file, prior, isRegistered);
  }
  const value: any = { root, ownerPid: process.pid, hostname: os.hostname(), priorRegistered: isRegistered(root), designInitiallyAbsent: !fs.existsSync(designPath(root)) };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const handle = fs.openSync(file, "wx", 0o600);
  try { fs.writeFileSync(handle, JSON.stringify(value)); fs.fsyncSync(handle); }
  finally { fs.closeSync(handle); }
  activeRegistrations.add(file);
  return {
    recordIgnore(change: { previousBytes: Buffer | null; writtenContent: string }) {
      value.ignore = { previousBytes: change.previousBytes?.toString("base64") ?? null, writtenContent: change.writtenContent };
      writeJournal(file, value);
    },
    recordDesign() {
      if (value.designInitiallyAbsent) { value.createdDesign = treeSnapshot(designPath(root)); writeJournal(file, value); }
    },
    recordCreatedFile(target: string, bytes: Buffer) {
      const relative = path.relative(designPath(root), target);
      recordedDesignFile(root, relative);
      value.createdFiles ??= {};
      value.createdFiles[relative] = digest(bytes);
      writeJournal(file, value);
    },
    recordStamp(bytes: Buffer) { value.stamp = digest(bytes); writeJournal(file, value); },
    finish() { try { fs.unlinkSync(file); } finally { activeRegistrations.delete(file); } },
    rollback() { try { restoreJournal(file, value, isRegistered); } finally { activeRegistrations.delete(file); } },
  };
}

export function recoverProjectRegistrations(userDataRoot: string, isRegistered: (root: string) => boolean) {
  const directory = path.join(userDataRoot, "project-registration");
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory).filter(name => name.endsWith(".json"))) {
    const file = path.join(directory, entry);
    try {
      const value = JSON.parse(fs.readFileSync(file, "utf8"));
      if (value.hostname === os.hostname() && Number.isInteger(value.ownerPid) && value.ownerPid > 0) {
        try { process.kill(value.ownerPid, 0); continue; }
        catch (error) { if (error?.code !== "ESRCH") continue; }
      } else continue;
      restoreJournal(file, value, isRegistered);
    } catch (error) { console.warn(`[registration] Could not recover ${file}:`, error); }
  }
}
