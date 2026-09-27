import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { designStyleSources } from "./projectDesignStyles";

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".bingo", "dist", "build", "out", ".next", "coverage",
]);
const PROJECT_INPUT_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js", ".css"]);
const CONFIG_NAMES = new Set([
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
]);
const CONFIG_PATTERN = /\.config\.[cm]?[jt]s$/;

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

async function collectFiles(root, include) {
  const output = [];
  async function walk(directory) {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    await Promise.all(entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) return;
        await walk(absolute);
      } else if (entry.isFile() && include(entry.name)) {
        output.push(absolute);
      }
    }));
  }
  await walk(root);
  return output.sort();
}

async function hashFile(file) {
  try {
    const contents = await fs.readFile(file);
    return `${contents.length}:${crypto.createHash("sha256").update(contents).digest("hex")}`;
  } catch (error) {
    return `unreadable:${error?.code || "unknown"}`;
  }
}

async function hashDirectory(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const listing = (await mapWithConcurrency(entries, 32, async (entry) => {
      if (!entry.isSymbolicLink()) return `${entry.name}:${entry.isDirectory() ? "d" : "f"}`;
      // Dependency managers can retarget an installed package symlink while
      // leaving the old package contents and lockfile in place.
      const target = await fs.readlink(path.join(directory, entry.name)).catch(() => "unreadable");
      return `${entry.name}:l:${target}`;
    })).sort().join("\n");
    return crypto.createHash("sha256").update(listing).digest("hex");
  } catch (error) {
    return `unreadable:${error?.code || "unknown"}`;
  }
}

async function dependencyDirectories(root, workspaceRoot) {
  const roots = [...new Set([path.join(root, "node_modules"), path.join(workspaceRoot, "node_modules")])];
  const directories = [...roots];
  for (const directory of roots) {
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); }
    catch { continue; }
    for (const entry of entries) {
      if ((entry.name.startsWith("@") || entry.name === ".pnpm") && entry.isDirectory()) {
        directories.push(path.join(directory, entry.name));
      }
    }
  }
  return directories;
}

async function currentInputState(root, workspaceRoot, trackedFiles, trackedDirectories) {
  const [projectInputs, workspaceConfigs, dependencyRoots] = await Promise.all([
    collectFiles(root, (name) => PROJECT_INPUT_EXTENSIONS.has(path.extname(name))),
    collectFiles(workspaceRoot, (name) => CONFIG_NAMES.has(name) || CONFIG_PATTERN.test(name)),
    dependencyDirectories(root, workspaceRoot),
  ]);
  const files = [...new Set([...trackedFiles, ...projectInputs, ...workspaceConfigs, ...designStyleSources(root)])].sort();
  const directories = [...new Set([
    ...trackedDirectories,
    ...projectInputs.map((file) => path.dirname(file)),
    ...workspaceConfigs.map((file) => path.dirname(file)),
    ...dependencyRoots,
  ])].sort();
  const [fileHashes, directoryHashes] = await Promise.all([
    mapWithConcurrency(files, 32, async (file) => [file, await hashFile(file)]),
    mapWithConcurrency(directories, 32, async (directory) => [directory, await hashDirectory(directory)]),
  ]);
  return { files: fileHashes, directories: directoryHashes };
}

function digestInputState(state) {
  const hash = crypto.createHash("sha256");
  for (const [file, digest] of state.files) hash.update(`f\0${file}\0${digest}\0`);
  for (const [directory, digest] of state.directories) hash.update(`d\0${directory}\0${digest}\0`);
  return hash.digest("hex");
}

async function captureProjectBuildFingerprint(root, compiled) {
  const trackedFiles = [...new Set([
    ...(compiled.buildInputFiles || []),
    ...(compiled.cssFiles || []),
  ])].sort();
  const trackedDirectories = [...new Set(trackedFiles.map((file) => path.dirname(file)))].sort();
  const state = await currentInputState(root, compiled.workspaceRoot, trackedFiles, trackedDirectories);
  return {
    version: 2,
    workspaceRoot: compiled.workspaceRoot,
    trackedFiles,
    trackedDirectories,
    digest: digestInputState(state),
    inputState: state,
  };
}

function changedEntries(previous, current) {
  const before = new Map(previous);
  const after = new Map(current);
  return [...new Set([...before.keys(), ...after.keys()])]
    .filter(file => before.get(file) !== after.get(file));
}

async function inspectProjectBuildFingerprint(root, fingerprint) {
  if (
    !fingerprint || fingerprint.version !== 2 ||
    !Array.isArray(fingerprint.inputState?.files) ||
    !Array.isArray(fingerprint.inputState?.directories)
  ) return { valid: false, incremental: false, changedPaths: ["*"], reason: "unsupported_fingerprint" };
  const state = await currentInputState(
    root,
    fingerprint.workspaceRoot,
    fingerprint.trackedFiles,
    fingerprint.trackedDirectories,
  );
  if (digestInputState(state) === fingerprint.digest) {
    return { valid: true, incremental: false, changedPaths: [], reason: "unchanged" };
  }
  const changedPaths = changedEntries(fingerprint.inputState.files, state.files);
  const changedDirectories = changedEntries(fingerprint.inputState.directories, state.directories);
  // A directory changed without a known input appearing or disappearing in it.
  // It may change package resolution, so a per-entry rebuild is not safe.
  const unexplainedDirectoryChange = changedDirectories.some(directory =>
    !changedPaths.some(file => path.dirname(file) === directory)
  );
  return {
    valid: false,
    incremental: changedPaths.length > 0 && !unexplainedDirectoryChange,
    changedPaths: unexplainedDirectoryChange ? ["*"] : changedPaths,
    reason: unexplainedDirectoryChange ? "directory_changed" : "inputs_changed",
  };
}

async function validateProjectBuildFingerprint(root, fingerprint) {
  return (await inspectProjectBuildFingerprint(root, fingerprint)).valid;
}

export { captureProjectBuildFingerprint, inspectProjectBuildFingerprint, validateProjectBuildFingerprint };
