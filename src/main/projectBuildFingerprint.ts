import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

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
    const listing = entries
      .map((entry) => `${entry.name}:${entry.isDirectory() ? "d" : entry.isSymbolicLink() ? "l" : "f"}`)
      .sort()
      .join("\n");
    return crypto.createHash("sha256").update(listing).digest("hex");
  } catch (error) {
    return `unreadable:${error?.code || "unknown"}`;
  }
}

async function currentInputState(root, workspaceRoot, trackedFiles, trackedDirectories) {
  const [projectInputs, workspaceConfigs] = await Promise.all([
    collectFiles(root, (name) => PROJECT_INPUT_EXTENSIONS.has(path.extname(name))),
    collectFiles(workspaceRoot, (name) => CONFIG_NAMES.has(name) || CONFIG_PATTERN.test(name)),
  ]);
  const files = [...new Set([...trackedFiles, ...projectInputs, ...workspaceConfigs])].sort();
  const directories = [...new Set([
    ...trackedDirectories,
    ...projectInputs.map((file) => path.dirname(file)),
    ...workspaceConfigs.map((file) => path.dirname(file)),
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
    version: 1,
    workspaceRoot: compiled.workspaceRoot,
    trackedFiles,
    trackedDirectories,
    digest: digestInputState(state),
  };
}

async function validateProjectBuildFingerprint(root, fingerprint) {
  if (!fingerprint || fingerprint.version !== 1) return false;
  const state = await currentInputState(
    root,
    fingerprint.workspaceRoot,
    fingerprint.trackedFiles,
    fingerprint.trackedDirectories,
  );
  return digestInputState(state) === fingerprint.digest;
}

export { captureProjectBuildFingerprint, validateProjectBuildFingerprint };
