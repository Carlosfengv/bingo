import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { validateThemeManifest } from "@bingo/compiler";

import {
  PROJECT_CONFIGURATION_GIT_PREFERENCES,
  PROJECT_CONFIGURATION_SCHEMA_VERSION,
  PROJECT_CONFIGURATION_STORAGE_MODES,
} from "../shared/projectConfiguration";
import { CONFIG_RELATIVE_PATH, ensureProjectConfigIgnored, inspectProjectGit } from "./projectGitIgnore";

const CONFIG_SCHEMA_VERSION = PROJECT_CONFIGURATION_SCHEMA_VERSION;
const POLICY_SCHEMA_VERSION = 1;
const PLAN_TTL_MS = 10 * 60 * 1000;
const PROJECT_DATA_DIR = "local-project-data";

const plans = new Map();
const writeQueues = new Map();

class ProjectConfigurationError extends Error {
  code;
  details;

  constructor(code, message, details = {}) {
    super(message);
    this.name = "ProjectConfigurationError";
    this.code = code;
    this.details = details;
  }
}

function configurationError(error, fallbackCode = "CONFIG_NOT_WRITABLE") {
  if (error instanceof ProjectConfigurationError) return error;
  return new ProjectConfigurationError(error?.code || fallbackCode, String(error?.message || error));
}

function projectStorageKey(root) {
  return crypto.createHash("sha256").update(path.resolve(root)).digest("hex").slice(0, 32);
}

function pathsFor(root, userDataRoot) {
  const projectRoot = path.resolve(root);
  const appDataDir = path.join(userDataRoot, PROJECT_DATA_DIR, projectStorageKey(projectRoot));
  return {
    projectRoot,
    projectConfig: path.join(projectRoot, CONFIG_RELATIVE_PATH),
    projectConfigDir: path.join(projectRoot, path.dirname(CONFIG_RELATIVE_PATH)),
    appDataDir,
    appSettings: path.join(appDataDir, "settings.json"),
    policy: path.join(appDataDir, "storage-policy.json"),
    transaction: path.join(appDataDir, "storage-transaction.json"),
  };
}

function readText(file) {
  try {
    return { exists: true, text: fs.readFileSync(file, "utf8") };
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, text: null };
    throw new ProjectConfigurationError("CONFIG_NOT_WRITABLE", `Could not read ${file}: ${error?.message || error}`, { path: file });
  }
}

function revisionOfText(text) {
  return text == null ? "missing" : crypto.createHash("sha256").update(text).digest("hex");
}

function normalizeIconLibraries(value, { legacy = false } = {}) {
  if (legacy && (value == null || value === undefined)) return [];
  if (!Array.isArray(value)) {
    throw new ProjectConfigurationError("CONFIG_INVALID", "iconLibraries must be an array of package names.", {
      field: "iconLibraries",
    });
  }
  const output = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !entry.trim()) {
      throw new ProjectConfigurationError("CONFIG_INVALID", "Every icon library must be a non-empty string.", {
        field: "iconLibraries",
      });
    }
    const normalized = entry.trim();
    if (!output.includes(normalized)) output.push(normalized);
  }
  return output;
}

function normalizePrototypeTheme(value) {
  if (value == null) return undefined;
  try {
    return validateThemeManifest(value);
  } catch (error) {
    throw new ProjectConfigurationError(error?.code === "THEME_VERSION_UNSUPPORTED" ? "CONFIG_VERSION_UNSUPPORTED" : "CONFIG_INVALID", error?.message || "Invalid prototype theme configuration.", {
      field: "prototypeTheme",
      themeCode: error?.code,
      ...(error?.details || {})
    });
  }
}

function parseProjectConfigText(text, file) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new ProjectConfigurationError("CONFIG_INVALID", `Project configuration is not valid JSON: ${error.message}`, { path: file });
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProjectConfigurationError("CONFIG_INVALID", "Project configuration must be a JSON object.", { path: file });
  }
  if (value.schemaVersion !== CONFIG_SCHEMA_VERSION) {
    throw new ProjectConfigurationError(
      "CONFIG_VERSION_UNSUPPORTED",
      `Unsupported project configuration version: ${String(value.schemaVersion)}`,
      { path: file, schemaVersion: value.schemaVersion },
    );
  }
  const prototypeTheme = normalizePrototypeTheme(value.prototypeTheme);
  return {
    ...value,
    iconLibraries: normalizeIconLibraries(value.iconLibraries),
    ...(prototypeTheme ? { prototypeTheme } : {})
  };
}

function settingsFromProjectConfig(value) {
  const prototypeTheme = normalizePrototypeTheme(value.prototypeTheme);
  return {
    iconLibraries: normalizeIconLibraries(value.iconLibraries),
    ...(prototypeTheme ? { prototypeTheme } : {})
  };
}

function readLegacySettings(file) {
  const source = readText(file);
  if (!source.exists) return { value: { iconLibraries: [] }, revision: "missing", exists: false };
  try {
    const parsed = JSON.parse(source.text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("settings must be an object");
    const iconLibraries = normalizeIconLibraries(parsed.iconLibraries, { legacy: true });
    const prototypeTheme = normalizePrototypeTheme(parsed.prototypeTheme);
    return {
      value: { ...parsed, iconLibraries, ...(prototypeTheme ? { prototypeTheme } : {}) },
      revision: revisionOfText(source.text),
      exists: true
    };
  } catch (error) {
    throw new ProjectConfigurationError("CONFIG_INVALID", `Local settings are invalid: ${error.message}`, { path: file });
  }
}

function readPolicy(file) {
  const source = readText(file);
  if (!source.exists) return { value: null, revision: "missing" };
  try {
    const value = JSON.parse(source.text);
    if (value?.schemaVersion !== POLICY_SCHEMA_VERSION || !PROJECT_CONFIGURATION_STORAGE_MODES.includes(value?.mode)) {
      throw new Error("unsupported storage policy");
    }
    return { value, revision: revisionOfText(source.text) };
  } catch (error) {
    throw new ProjectConfigurationError("CONFIG_INVALID", `Storage policy is invalid: ${error.message}`, { path: file });
  }
}

function readProjectConfig(file) {
  const source = readText(file);
  if (!source.exists) return { value: null, revision: "missing", exists: false };
  return {
    value: parseProjectConfigText(source.text, file),
    revision: revisionOfText(source.text),
    exists: true,
  };
}

function ensureSafeWriteTarget(file, allowedRoot) {
  const root = path.resolve(allowedRoot);
  const resolved = path.resolve(file);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new ProjectConfigurationError("PATH_UNSAFE", `Path escapes its allowed root: ${file}`, { path: file });
  }
  let current = resolved;
  while (current !== root) {
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) {
        throw new ProjectConfigurationError("PATH_UNSAFE", `Refusing to write through symbolic link: ${current}`, { path: current });
      }
      if (current === resolved && !stat.isFile()) {
        throw new ProjectConfigurationError("PATH_UNSAFE", `Configuration target is not a regular file: ${current}`, { path: current });
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    current = path.dirname(current);
  }
}

function acquireProjectLock(pathInfo, operationId) {
  ensureSafeWriteTarget(pathInfo.projectConfig, pathInfo.projectRoot);
  fs.mkdirSync(pathInfo.projectConfigDir, { recursive: true });
  const lockPath = path.join(pathInfo.projectConfigDir, ".config-write.lock");
  const token = crypto.randomUUID();
  const tryCreate = () => {
    const descriptor = fs.openSync(lockPath, "wx", 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, operationId, token, createdAt: new Date().toISOString() })}\n`);
    fs.closeSync(descriptor);
  };
  try {
    tryCreate();
  } catch (error) {
    if (error?.code !== "EEXIST") {
      throw new ProjectConfigurationError("CONFIG_NOT_WRITABLE", `Could not lock project configuration: ${error?.message || error}`, { path: lockPath });
    }
    let stale = false;
    try {
      const owner = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      if (!Number.isInteger(owner?.pid) || owner.pid <= 0) stale = true;
      else {
        try { process.kill(owner.pid, 0); } catch (cause) { if (cause?.code === "ESRCH") stale = true; }
      }
    } catch {}
    if (!stale) {
      throw new ProjectConfigurationError("WRITE_IN_PROGRESS", "Another Bingo process is writing this project configuration.", { path: lockPath });
    }
    try { fs.unlinkSync(lockPath); } catch {}
    try {
      tryCreate();
    } catch (cause) {
      throw new ProjectConfigurationError("WRITE_IN_PROGRESS", "Another process acquired the project configuration lock.", { path: lockPath });
    }
  }
  return () => {
    try {
      const owner = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      if (owner?.token === token) fs.unlinkSync(lockPath);
    } catch {}
  };
}

function atomicWriteJson(file, value, allowedRoot, defaultMode = 0o600) {
  ensureSafeWriteTarget(file, allowedRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const nextText = `${JSON.stringify(value, null, 2)}\n`;
  const current = readText(file);
  if (current.exists && current.text === nextText) return { changed: false, revision: revisionOfText(current.text) };
  let mode = defaultMode;
  if (current.exists) {
    try { mode = fs.statSync(file).mode & 0o777; } catch {}
  }
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temp, "wx", mode);
    fs.writeFileSync(descriptor, nextText, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temp, file);
  } catch (error) {
    if (descriptor !== undefined) try { fs.closeSync(descriptor); } catch {}
    try { fs.unlinkSync(temp); } catch {}
    throw new ProjectConfigurationError("CONFIG_NOT_WRITABLE", `Could not write ${file}: ${error?.message || error}`, { path: file });
  }
  return { changed: true, revision: revisionOfText(nextText) };
}

function serializeProjectConfig(settings, existing = {}) {
  const prototypeTheme = normalizePrototypeTheme(settings.prototypeTheme);
  const result = {
    ...existing,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    iconLibraries: normalizeIconLibraries(settings.iconLibraries, { legacy: true }),
  };
  if (prototypeTheme) result.prototypeTheme = prototypeTheme;
  else delete result.prototypeTheme;
  return result;
}

function mergeSettings(current, patch) {
  const unsupported = Object.keys(patch || {}).filter((key) => key !== "iconLibraries" && key !== "prototypeTheme");
  if (unsupported.length) {
    throw new ProjectConfigurationError("CONFIG_INVALID", `Unsupported project setting: ${unsupported.join(", ")}`, {
      fields: unsupported,
    });
  }
  return {
    ...current,
    ...(Object.prototype.hasOwnProperty.call(patch || {}, "iconLibraries")
      ? { iconLibraries: normalizeIconLibraries(patch.iconLibraries, { legacy: true }) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(patch || {}, "prototypeTheme")
      ? { prototypeTheme: normalizePrototypeTheme(patch.prototypeTheme) }
      : {})
  };
}

function readEffectiveConfiguration(root, userDataRoot) {
  const paths = pathsFor(root, userDataRoot);
  const policy = readPolicy(paths.policy);
  const project = readProjectConfig(paths.projectConfig);
  const local = readLegacySettings(paths.appSettings);

  if (policy.value?.mode === "app") {
    return { settings: local.value, mode: "app", source: "policy", revision: local.revision, paths, policy: policy.value };
  }
  if (policy.value?.mode === "project") {
    if (!project.exists) {
      throw new ProjectConfigurationError("CONFIG_MISSING", "This project is configured to use a project file, but that file is missing.", {
        path: paths.projectConfig,
      });
    }
    return { settings: settingsFromProjectConfig(project.value), mode: "project", source: "policy", revision: project.revision, paths, policy: policy.value };
  }
  if (project.exists) {
    return { settings: settingsFromProjectConfig(project.value), mode: "project", source: "discovered", revision: project.revision, paths, policy: null };
  }
  return { settings: local.value, mode: "unselected", source: local.exists ? "legacy-local" : "default", revision: local.revision, paths, policy: null };
}

async function inspectProjectConfiguration(root, userDataRoot) {
  const effective = readEffectiveConfiguration(root, userDataRoot);
  const gitStatus = await inspectProjectGit(root);
  let pendingTransaction = null;
  try {
    const source = readText(effective.paths.transaction);
    if (source.exists) pendingTransaction = JSON.parse(source.text);
  } catch {}
  return {
    mode: effective.mode,
    source: effective.source,
    configPath: effective.paths.projectConfig,
    localSettingsPath: effective.paths.appSettings,
    revision: effective.revision,
    initializationRequired: effective.mode === "unselected",
    gitStatus,
    settings: effective.settings,
    issues: pendingTransaction ? [{ code: "MIGRATION_INCOMPLETE", transaction: pendingTransaction }] : [],
  };
}

function prunePlans() {
  const now = Date.now();
  for (const [id, plan] of plans) if (plan.expiresAt <= now) plans.delete(id);
}

async function prepareProjectConfiguration(root, userDataRoot, options) {
  prunePlans();
  const mode = options?.mode;
  const gitPreference = mode === "app" ? "not-applicable" : options?.gitPreference || "unchanged";
  if (!PROJECT_CONFIGURATION_STORAGE_MODES.includes(mode)) {
    throw new ProjectConfigurationError("CONFIG_INVALID", "Choose project or local storage before continuing.");
  }
  if (!PROJECT_CONFIGURATION_GIT_PREFERENCES.includes(gitPreference)) {
    throw new ProjectConfigurationError("CONFIG_INVALID", "Invalid Git preference.");
  }
  const inspected = await inspectProjectConfiguration(root, userDataRoot);
  const settings = mergeSettings(inspected.settings, options?.initialPatch || {});
  const pathInfo = pathsFor(root, userDataRoot);
  const revisions = {
    projectConfig: revisionOfText(readText(pathInfo.projectConfig).text),
    appSettings: revisionOfText(readText(pathInfo.appSettings).text),
    policy: revisionOfText(readText(pathInfo.policy).text),
    gitignore: revisionOfText(readText(path.join(pathInfo.projectRoot, ".gitignore")).text),
  };
  const planId = `cfgplan_${crypto.randomUUID()}`;
  const plan = {
    planId,
    root: pathInfo.projectRoot,
    userDataRoot: path.resolve(userDataRoot),
    mode,
    gitPreference,
    settings,
    revisions,
    expiresAt: Date.now() + PLAN_TTL_MS,
  };
  plans.set(planId, plan);
  return {
    planId,
    expiresAt: plan.expiresAt,
    mode,
    gitPreference,
    configPath: pathInfo.projectConfig,
    gitignorePath: path.join(pathInfo.projectRoot, ".gitignore"),
    files: mode === "app"
      ? [{ path: pathInfo.appSettings, action: "update-local-settings" }]
      : [
          ...(gitPreference === "ignore" ? [{ path: path.join(pathInfo.projectRoot, ".gitignore"), action: "ensure-ignore-rule" }] : []),
          { path: pathInfo.projectConfig, action: fs.existsSync(pathInfo.projectConfig) ? "update-project-config" : "create-project-config" },
        ],
    settings,
    gitStatus: inspected.gitStatus,
  };
}

function assertPlanRevisions(plan) {
  const pathInfo = pathsFor(plan.root, plan.userDataRoot);
  const current = {
    projectConfig: revisionOfText(readText(pathInfo.projectConfig).text),
    appSettings: revisionOfText(readText(pathInfo.appSettings).text),
    policy: revisionOfText(readText(pathInfo.policy).text),
    gitignore: revisionOfText(readText(path.join(pathInfo.projectRoot, ".gitignore")).text),
  };
  const keys = plan.mode === "app" ? ["appSettings", "policy"] : ["projectConfig", "policy", ...(plan.gitPreference === "ignore" ? ["gitignore"] : [])];
  const changed = keys.filter((key) => current[key] !== plan.revisions[key]);
  if (changed.length) {
    throw new ProjectConfigurationError("CONFIG_CONFLICT", "The configuration changed after the preview was created. Review it again before saving.", {
      changed,
    });
  }
}

function queueForProject(root, work) {
  const key = path.resolve(root);
  const previous = writeQueues.get(key) || Promise.resolve();
  const current = previous.then(work, work);
  writeQueues.set(key, current.then(() => {}, () => {}));
  return current;
}

async function applyProjectConfiguration(root, userDataRoot, { planId, operationId }) {
  prunePlans();
  const plan = plans.get(planId);
  if (!plan || plan.expiresAt <= Date.now()) {
    plans.delete(planId);
    if (operationId) {
      const pathInfo = pathsFor(root, userDataRoot);
      const policy = readPolicy(pathInfo.policy).value;
      if (policy?.migration?.operationId === operationId && policy.migration.phase === "complete") {
        const effective = readEffectiveConfiguration(root, userDataRoot);
        return {
          success: true,
          mode: effective.mode,
          settings: effective.settings,
          revision: effective.revision,
          configPath: pathInfo.projectConfig,
          gitStatus: await inspectProjectGit(root),
          modifiedFiles: [],
          replayed: true,
        };
      }
    }
    throw new ProjectConfigurationError("PLAN_EXPIRED", "This configuration preview expired. Review the files again before saving.");
  }
  if (plan.root !== path.resolve(root) || plan.userDataRoot !== path.resolve(userDataRoot)) {
    throw new ProjectConfigurationError("PATH_UNSAFE", "This configuration preview belongs to a different project.");
  }

  return queueForProject(root, async () => {
    assertPlanRevisions(plan);
    const pathInfo = pathsFor(root, userDataRoot);
    const resolvedOperationId = operationId || `cfg_${crypto.randomUUID()}`;
    const transaction = {
      schemaVersion: 1,
      operationId: resolvedOperationId,
      mode: plan.mode,
      gitPreference: plan.gitPreference,
      phase: "prepared",
      revisions: plan.revisions,
      updatedAt: new Date().toISOString(),
    };
    atomicWriteJson(pathInfo.transaction, transaction, pathInfo.appDataDir);
    let releaseLock = null;
    if (plan.mode === "project") releaseLock = acquireProjectLock(pathInfo, resolvedOperationId);
    let gitResult = null;
    try {
      if (plan.mode === "project" && plan.gitPreference === "ignore") {
        gitResult = await ensureProjectConfigIgnored(pathInfo.projectRoot);
        transaction.phase = "ignore-written";
        transaction.updatedAt = new Date().toISOString();
        atomicWriteJson(pathInfo.transaction, transaction, pathInfo.appDataDir);
      }

      let writeResult;
      if (plan.mode === "project") {
        const existing = readProjectConfig(pathInfo.projectConfig).value || {};
        writeResult = atomicWriteJson(pathInfo.projectConfig, serializeProjectConfig(plan.settings, existing), pathInfo.projectRoot, 0o644);
      } else {
        const local = readLegacySettings(pathInfo.appSettings).value;
        writeResult = atomicWriteJson(pathInfo.appSettings, {
          ...local,
          iconLibraries: normalizeIconLibraries(plan.settings.iconLibraries, { legacy: true }),
        }, pathInfo.appDataDir);
      }
      transaction.phase = "config-written";
      transaction.updatedAt = new Date().toISOString();
      atomicWriteJson(pathInfo.transaction, transaction, pathInfo.appDataDir);

      const policy = {
        schemaVersion: POLICY_SCHEMA_VERSION,
        mode: plan.mode,
        gitPreference: plan.mode === "app" ? "not-applicable" : plan.gitPreference,
        decisionAt: new Date().toISOString(),
        migration: {
          operationId: resolvedOperationId,
          phase: "complete",
          sourceHash: revisionOfText(JSON.stringify(plan.settings)),
          targetHash: writeResult.revision,
        },
      };
      atomicWriteJson(pathInfo.policy, policy, pathInfo.appDataDir);
      try { fs.unlinkSync(pathInfo.transaction); } catch {}
      plans.delete(planId);
      const effective = readEffectiveConfiguration(root, userDataRoot);
      return {
        success: true,
        mode: plan.mode,
        settings: effective.settings,
        revision: effective.revision,
        configPath: pathInfo.projectConfig,
        gitStatus: await inspectProjectGit(root),
        modifiedFiles: [
          ...(gitResult?.changed ? [gitResult.gitignorePath] : []),
          plan.mode === "project" ? pathInfo.projectConfig : pathInfo.appSettings,
          pathInfo.policy,
        ],
      };
    } finally {
      releaseLock?.();
    }
  }).catch((error) => {
    throw configurationError(error);
  });
}

async function writeProjectConfiguration(root, userDataRoot, patch, expectedRevision) {
  return queueForProject(root, async () => {
    const effective = readEffectiveConfiguration(root, userDataRoot);
    if (effective.mode === "unselected") {
      throw new ProjectConfigurationError(
        "CONFIG_INITIALIZATION_REQUIRED",
        "Choose where Bingo should save this project's configuration before changing it.",
        { configPath: effective.paths.projectConfig },
      );
    }
    if (expectedRevision && expectedRevision !== effective.revision) {
      throw new ProjectConfigurationError("CONFIG_CONFLICT", "The configuration changed before it could be saved.");
    }
    const settings = mergeSettings(effective.settings, patch || {});
    let releaseLock = null;
    if (effective.mode === "project") releaseLock = acquireProjectLock(effective.paths, `settings_${crypto.randomUUID()}`);
    try {
      if (effective.mode === "project") {
        if (!effective.policy) {
          atomicWriteJson(effective.paths.policy, {
            schemaVersion: POLICY_SCHEMA_VERSION,
            mode: "project",
            gitPreference: "unchanged",
            decisionAt: new Date().toISOString(),
          }, effective.paths.appDataDir);
        }
        const existing = readProjectConfig(effective.paths.projectConfig).value || {};
        atomicWriteJson(effective.paths.projectConfig, serializeProjectConfig(settings, existing), effective.paths.projectRoot, 0o644);
      } else {
        atomicWriteJson(effective.paths.appSettings, settings, effective.paths.appDataDir);
      }
    } finally {
      releaseLock?.();
    }
    return readEffectiveConfiguration(root, userDataRoot).settings;
  }).catch((error) => {
    throw configurationError(error);
  });
}

async function addProjectIconLibraries(root, userDataRoot, libraries) {
  return queueForProject(root, async () => {
    const effective = readEffectiveConfiguration(root, userDataRoot);
    if (effective.mode === "unselected") {
      throw new ProjectConfigurationError("CONFIG_INITIALIZATION_REQUIRED", "Choose where to save project configuration first.", {
        configPath: effective.paths.projectConfig,
      });
    }
    const additions = normalizeIconLibraries(libraries);
    const iconLibraries = Array.from(new Set([...normalizeIconLibraries(effective.settings.iconLibraries, { legacy: true }), ...additions]));
    const settings = { ...effective.settings, iconLibraries };
    let releaseLock = null;
    if (effective.mode === "project") releaseLock = acquireProjectLock(effective.paths, `icons_${crypto.randomUUID()}`);
    try {
      if (effective.mode === "project") {
        if (!effective.policy) {
          atomicWriteJson(effective.paths.policy, {
            schemaVersion: POLICY_SCHEMA_VERSION,
            mode: "project",
            gitPreference: "unchanged",
            decisionAt: new Date().toISOString(),
          }, effective.paths.appDataDir);
        }
        atomicWriteJson(effective.paths.projectConfig, serializeProjectConfig(settings, effective.settings), effective.paths.projectRoot, 0o644);
      } else {
        atomicWriteJson(effective.paths.appSettings, settings, effective.paths.appDataDir);
      }
    } finally {
      releaseLock?.();
    }
    return readEffectiveConfiguration(root, userDataRoot).settings;
  }).catch((error) => {
    throw configurationError(error);
  });
}

export {
  CONFIG_SCHEMA_VERSION,
  ProjectConfigurationError,
  addProjectIconLibraries,
  applyProjectConfiguration,
  inspectProjectConfiguration,
  pathsFor as projectConfigurationPaths,
  prepareProjectConfiguration,
  readEffectiveConfiguration,
  writeProjectConfiguration,
};
