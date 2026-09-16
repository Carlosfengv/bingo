import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { getLoginShellEnv } from "./claudeBinary";

const pendingPreparations = new Map();

function readPackage(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function hasWorkspaceDeclaration(root) {
  if (fs.existsSync(path.join(root, "pnpm-workspace.yaml"))) return true;
  const pkg = readPackage(path.join(root, "package.json"));
  return Array.isArray(pkg?.workspaces) || Array.isArray(pkg?.workspaces?.packages);
}

function findWorkspaceRoot(projectRoot) {
  let current = fs.realpathSync(projectRoot);
  for (;;) {
    if (hasWorkspaceDeclaration(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return fs.realpathSync(projectRoot);
    current = parent;
  }
}

function packageManagerFor(root, projectRoot) {
  const candidates = [
    ["pnpm", "pnpm-lock.yaml"],
    ["yarn", "yarn.lock"],
    ["bun", "bun.lock"],
    ["bun", "bun.lockb"],
    ["npm", "package-lock.json"],
  ];
  for (const directory of [...new Set([root, projectRoot])]) {
    for (const [manager, lock] of candidates) if (fs.existsSync(path.join(directory, lock))) return { manager, lockFile: path.join(directory, lock) };
  }
  const pkg = readPackage(path.join(root, "package.json"));
  const declared = typeof pkg?.packageManager === "string" ? pkg.packageManager.split("@")[0] : null;
  return { manager: ["pnpm", "yarn", "bun", "npm"].includes(declared) ? declared : "npm", lockFile: null };
}

function installCommand(manager, lockFile) {
  if (manager === "pnpm") return { file: "pnpm", args: ["install", ...(lockFile ? ["--frozen-lockfile"] : [])] };
  if (manager === "yarn") return { file: "yarn", args: ["install", ...(lockFile ? ["--frozen-lockfile"] : [])] };
  if (manager === "bun") return { file: "bun", args: ["install", ...(lockFile ? ["--frozen-lockfile"] : [])] };
  return lockFile ? { file: "npm", args: ["ci"] } : { file: "npm", args: ["install"] };
}

function dependencyNames(pkg) {
  return [...new Set([
    ...Object.keys(pkg?.dependencies || {}),
    ...Object.keys(pkg?.devDependencies || {}),
  ])].sort();
}

function dependencyDirectory(base, name) {
  return path.join(base, "node_modules", ...name.split("/"));
}

function inspectProjectEnvironment(root) {
  const projectRoot = fs.realpathSync(root);
  const packageFile = path.join(projectRoot, "package.json");
  const pkg = readPackage(packageFile);
  if (!pkg) return {
    status: "no-package",
    projectRoot,
    workspaceRoot: projectRoot,
    packageManager: null,
    missingDependencies: [],
    installPlan: null,
  };
  const workspaceRoot = findWorkspaceRoot(projectRoot);
  const { manager, lockFile } = packageManagerFor(workspaceRoot, projectRoot);
  const names = dependencyNames(pkg);
  const missingProjectDependencies = names.filter(name =>
    !fs.existsSync(dependencyDirectory(projectRoot, name)) && !fs.existsSync(dependencyDirectory(workspaceRoot, name))
  );
  // Shared build tools are often declared only in the workspace root.
  const workspaceNames = workspaceRoot === projectRoot ? [] : dependencyNames(readPackage(path.join(workspaceRoot, "package.json")));
  const missingWorkspaceDependencies = workspaceNames.filter(name => !fs.existsSync(dependencyDirectory(workspaceRoot, name)));
  const missingDependencies = [...new Set([...missingProjectDependencies, ...missingWorkspaceDependencies])].sort();
  const command = installCommand(manager, lockFile);
  const needsInstall = missingDependencies.length > 0;
  return {
    status: needsInstall ? "needs-install" : "ready",
    projectRoot,
    workspaceRoot,
    packageManager: manager,
    lockFile,
    dependencyCount: new Set([...names, ...workspaceNames]).size,
    missingDependencies,
    installPlan: needsInstall ? { ...command, cwd: workspaceRoot } : null,
    productionBuildRequired: false,
  };
}

async function runDependencyInstall({ file, args, cwd }) {
  const env = { ...process.env, ...await getLoginShellEnv() };
  // macOS GUI processes and non-interactive login shells can both omit Bun's
  // installer path. Retain inherited paths and probe normal user tool locations.
  env.PATH = [...new Set([
    ...String(env.PATH || "").split(path.delimiter),
    ...String(process.env.PATH || "").split(path.delimiter),
    env.BUN_INSTALL && path.join(env.BUN_INSTALL, "bin"), env.PNPM_HOME,
    path.join(os.homedir(), ".bun", "bin"), path.join(os.homedir(), "Library", "pnpm"),
    path.join(os.homedir(), ".local", "share", "pnpm"), path.join(os.homedir(), ".volta", "bin"),
    "/opt/homebrew/bin", "/usr/local/bin",
  ].filter(Boolean))].join(path.delimiter);
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { cwd, shell: false, windowsHide: true, env });
    let text = "";
    const append = chunk => { text = `${text}${chunk}`.slice(-128 * 1024); };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.once("error", reject);
    child.once("close", code => code === 0 ? resolve(text) : reject(Object.assign(new Error(text.trim() || `${file} exited with code ${code}`), { code: "ENVIRONMENT_PREPARE_FAILED" })));
  });
}

async function prepareProjectEnvironment(root, options = {}) {
  const inspection = inspectProjectEnvironment(root);
  const existingPreparation = pendingPreparations.get(inspection.workspaceRoot);
  if (!inspection.installPlan && !existingPreparation) return { success: true, inspection, output: "Dependencies are already available." };
  if (!inspection.installPlan) {
    const output = await existingPreparation;
    const next = inspectProjectEnvironment(root);
    if (next.status !== "ready") throw Object.assign(new Error("Project dependencies are still unavailable."), { code: "DEPENDENCIES_MISSING" });
    return { success: true, inspection: next, output };
  }
  // The preparation button shows this exact workspace path. Its confirmation
  // authorizes this installation only, without widening editor/agent access.
  const confirmedWorkspace = typeof options.confirmedWorkspaceRoot === "string"
    && path.isAbsolute(options.confirmedWorkspaceRoot)
    && fs.realpathSync(options.confirmedWorkspaceRoot) === inspection.workspaceRoot;
  if (typeof options.isAllowedRoot === "function" && !options.isAllowedRoot(inspection.installPlan.cwd) && !confirmedWorkspace) {
    const error = new Error(`Dependency installation needs access to the workspace root: ${inspection.installPlan.cwd}`);
    error.code = "OUTSIDE_PROJECT_ROOT";
    error.details = { workspaceRoot: inspection.installPlan.cwd };
    throw error;
  }
  const { cwd } = inspection.installPlan;
  let pending = pendingPreparations.get(cwd);
  if (!pending) {
    pending = Promise.resolve().then(() => (options.runInstall || runDependencyInstall)(inspection.installPlan))
      .finally(() => { if (pendingPreparations.get(cwd) === pending) pendingPreparations.delete(cwd); });
    pendingPreparations.set(cwd, pending);
  }
  const output = await pending;
  const next = inspectProjectEnvironment(root);
  if (next.status !== "ready") {
    const error = new Error(`Project preparation finished but ${next.missingDependencies.length} declared dependencies are still unavailable.`);
    error.code = "DEPENDENCIES_MISSING";
    error.details = { missingDependencies: next.missingDependencies };
    throw error;
  }
  return { success: true, inspection: next, output };
}

export { inspectProjectEnvironment, prepareProjectEnvironment };
