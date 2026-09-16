import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { hasPortableDesign, listPortablePages } from "./projectDesignStore";

const execFileAsync = promisify(execFile);
const ASSET_RE = /bingo-asset:([a-f0-9]{64}\.[a-z0-9]{1,12})/gi;

async function git(root, args, allowFailure = false) {
  try {
    const result = await execFileAsync("git", args, { cwd: root, encoding: "utf8", timeout: 5000, maxBuffer: 1024 * 1024, windowsHide: true });
    return { ok: true, stdout: result.stdout || "", stderr: result.stderr || "" };
  } catch (error) {
    if (allowFailure) return { ok: false, stdout: error?.stdout || "", stderr: error?.stderr || error?.message || "" };
    throw error;
  }
}

function collectReferences(value, state) {
  if (Array.isArray(value)) return value.forEach(item => collectReferences(item, state));
  if (value && typeof value === "object") return Object.values(value).forEach(item => collectReferences(item, state));
  if (typeof value !== "string") return;
  for (const match of value.matchAll(ASSET_RE)) state.assets.add(match[1]);
  if (value.startsWith("file:") || path.isAbsolute(value)) state.localPaths.add(value);
  if (/^https?:\/\//i.test(value)) state.externalUrls.add(value);
}

async function inspectGit(root) {
  const top = await git(root, ["rev-parse", "--show-toplevel"], true);
  if (!top.ok) return { status: "not-repository", tracked: false, dirty: false, remoteSync: "not-verified" };
  const gitRoot = path.resolve(top.stdout.trim());
  const design = path.join(root, ".bingo", "design");
  const relative = path.relative(gitRoot, design).split(path.sep).join("/");
  if (!relative || relative.startsWith("../")) return { status: "outside-repository", tracked: false, dirty: false, remoteSync: "not-verified" };
  const [tracked, status, ignored] = await Promise.all([
    git(gitRoot, ["ls-files", "-z", "--", relative]),
    git(gitRoot, ["status", "--porcelain=v1", "--", relative]),
    git(gitRoot, ["check-ignore", "-q", "--no-index", "--", relative], true),
  ]);
  const isTracked = tracked.stdout.length > 0;
  const dirty = status.stdout.trim().length > 0;
  return {
    status: ignored.ok && !isTracked ? "ignored" : !isTracked ? "untracked" : dirty ? "modified" : "tracked-clean",
    tracked: isTracked,
    dirty,
    ignored: ignored.ok,
    gitRoot,
    remoteSync: "not-verified",
  };
}

async function inspectProjectPortability(root) {
  const projectRoot = fs.realpathSync(root);
  if (!hasPortableDesign(projectRoot)) return {
    status: "local-only",
    pageCount: 0,
    assetCount: 0,
    missingAssets: [],
    localPaths: [],
    externalUrls: [],
    git: await inspectGit(projectRoot),
  };
  const pages = listPortablePages(projectRoot);
  const references = { assets: new Set(), localPaths: new Set(), externalUrls: new Set() };
  pages.forEach(page => collectReferences(page, references));
  const assetRoot = path.join(projectRoot, ".bingo", "design", "assets");
  const missingAssets = [...references.assets].filter(name => {
    try { return !fs.statSync(path.join(assetRoot, name)).isFile(); } catch { return true; }
  });
  const localPaths = [...references.localPaths];
  const gitState = await inspectGit(projectRoot);
  const contentComplete = missingAssets.length === 0 && localPaths.length === 0;
  return {
    status: contentComplete ? "files-portable" : "needs-content",
    pageCount: pages.length,
    assetCount: references.assets.size,
    missingAssets,
    localPaths,
    externalUrls: [...references.externalUrls],
    git: gitState,
  };
}

export { inspectProjectPortability };
