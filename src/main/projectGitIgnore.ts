import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { PROJECT_CONFIGURATION_RELATIVE_PATH } from "../shared/projectConfiguration";

const execFileAsync = promisify(execFile);

const CONFIG_RELATIVE_PATH = PROJECT_CONFIGURATION_RELATIVE_PATH;
const IGNORE_COMMENT = "# Bingo project configuration";
const IGNORE_RULE = "/.bingo/config.json";
const IGNORE_BLOCK = `${IGNORE_COMMENT}\n${IGNORE_RULE}`;

class GitIgnoreError extends Error {
  code;
  details;

  constructor(code, message, details = {}) {
    super(message);
    this.name = "GitIgnoreError";
    this.code = code;
    this.details = details;
  }
}

function assertRegularWritableTarget(file) {
  try {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) {
      throw new GitIgnoreError("PATH_UNSAFE", `Refusing to write through symbolic link: ${file}`, { path: file });
    }
    if (!stat.isFile()) {
      throw new GitIgnoreError("PATH_UNSAFE", `Git ignore target is not a regular file: ${file}`, { path: file });
    }
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}

async function runGit(projectRoot, args, { allowExitOne = false } = {}) {
  try {
    const result = await execFileAsync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 5_000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    return { ok: true, stdout: result.stdout || "", stderr: result.stderr || "", exitCode: 0 };
  } catch (error) {
    if (allowExitOne && error?.code === 1) {
      return { ok: false, stdout: error.stdout || "", stderr: error.stderr || "", exitCode: 1 };
    }
    if (error?.code === "ENOENT") {
      throw new GitIgnoreError("GIT_CHECK_FAILED", "Git is not installed or is not available to Bingo.", {
        reason: "git-unavailable",
      });
    }
    throw new GitIgnoreError("GIT_CHECK_FAILED", String(error?.stderr || error?.message || error), {
      reason: error?.killed ? "timeout" : "git-error",
      exitCode: typeof error?.code === "number" ? error.code : undefined,
    });
  }
}

async function findGitRoot(projectRoot) {
  const result = await runGit(projectRoot, ["rev-parse", "--show-toplevel"], { allowExitOne: true }).catch((error) => {
    if (error?.code === "GIT_CHECK_FAILED" && /not a git repository/i.test(error.message)) return null;
    throw error;
  });
  if (!result || !result.ok) {
    if (/not a git repository/i.test(result?.stderr || "")) return null;
    if (result?.exitCode === 1) return null;
  }
  const value = result?.stdout?.trim();
  return value ? path.resolve(value) : null;
}

function parseIgnoreSource(stdout, gitRoot) {
  const line = String(stdout || "").split(/\r?\n/).find(Boolean);
  if (!line) return null;
  const match = line.match(/^(.*?):(\d+):(.*?)\t/);
  if (!match) return { raw: line };
  const source = match[1];
  return {
    path: path.isAbsolute(source) ? source : path.resolve(gitRoot, source),
    line: Number(match[2]),
    pattern: match[3],
  };
}

async function inspectProjectGit(projectRoot) {
  const root = fs.realpathSync.native(path.resolve(projectRoot));
  const configPath = path.join(root, CONFIG_RELATIVE_PATH);
  const gitignorePath = path.join(root, ".gitignore");
  let gitRoot;
  try {
    gitRoot = await findGitRoot(root);
  } catch (error) {
    return {
      status: "unavailable",
      tracked: false,
      ignored: false,
      configPath,
      gitignorePath,
      error: { code: error.code || "GIT_CHECK_FAILED", message: error.message },
    };
  }
  if (!gitRoot) {
    return { status: "not-repository", tracked: false, ignored: false, configPath, gitignorePath };
  }

  gitRoot = fs.realpathSync.native(gitRoot);
  const relativeFromGitRoot = path.relative(gitRoot, configPath).split(path.sep).join("/");
  if (relativeFromGitRoot.startsWith("../") || path.isAbsolute(relativeFromGitRoot)) {
    return {
      status: "unavailable",
      tracked: false,
      ignored: false,
      configPath,
      gitignorePath,
      gitRoot,
      error: { code: "PATH_UNSAFE", message: "The configuration path is outside the Git repository." },
    };
  }

  try {
    const [trackedResult, ignoredResult] = await Promise.all([
      runGit(gitRoot, ["ls-files", "-z", "--", relativeFromGitRoot]),
      runGit(gitRoot, ["check-ignore", "-v", "--no-index", "--", relativeFromGitRoot], { allowExitOne: true }),
    ]);
    const tracked = trackedResult.stdout.length > 0;
    const ignored = ignoredResult.ok && ignoredResult.stdout.length > 0;
    return {
      status: tracked ? "tracked" : ignored ? "ignored" : "untracked",
      tracked,
      ignored,
      ignoreSource: ignored ? parseIgnoreSource(ignoredResult.stdout, gitRoot) : null,
      configPath,
      gitignorePath,
      gitRoot,
      relativeFromGitRoot,
    };
  } catch (error) {
    return {
      status: "unavailable",
      tracked: false,
      ignored: false,
      configPath,
      gitignorePath,
      gitRoot,
      error: { code: error.code || "GIT_CHECK_FAILED", message: error.message },
    };
  }
}

function appendIgnoreRule(projectRoot, rule = IGNORE_RULE, comment = IGNORE_COMMENT) {
  const gitignorePath = path.join(path.resolve(projectRoot), ".gitignore");
  assertRegularWritableTarget(gitignorePath);
  const exists = fs.existsSync(gitignorePath);
  const original = exists ? fs.readFileSync(gitignorePath, "utf8") : "";
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const normalizedLines = original.split(/\r?\n/).map((line) => line.trim());
  if (normalizedLines.includes(rule)) {
    return { changed: false, gitignorePath, previousContent: original };
  }

  let separator = "";
  if (original.length > 0) {
    separator = original.endsWith("\n") || original.endsWith("\r") ? "" : newline;
    const lastMeaningful = original.split(/\r?\n/).filter((line) => line.trim()).at(-1);
    if (lastMeaningful && lastMeaningful !== comment) separator += newline;
  }
  const next = `${original}${separator}${comment}${newline}${rule}${newline}`;
  const temp = `${gitignorePath}.bingo-${process.pid}-${Date.now()}.tmp`;
  try {
    let mode = 0o644;
    if (exists) try { mode = fs.statSync(gitignorePath).mode & 0o777; } catch {}
    fs.writeFileSync(temp, next, { encoding: "utf8", flag: "wx", mode });
    fs.renameSync(temp, gitignorePath);
  } catch (error) {
    try { fs.unlinkSync(temp); } catch {}
    throw new GitIgnoreError("GITIGNORE_NOT_WRITABLE", `Could not update ${gitignorePath}: ${error?.message || error}`, {
      path: gitignorePath,
    });
  }
  return { changed: true, gitignorePath, previousContent: original };
}

async function ensureProjectConfigIgnored(projectRoot) {
  const before = await inspectProjectGit(projectRoot);
  if (before.status === "unavailable") {
    throw new GitIgnoreError(before.error?.code || "GIT_CHECK_FAILED", before.error?.message || "Could not inspect Git.", before);
  }
  if (before.tracked) {
    throw new GitIgnoreError(
      "IGNORE_NOT_EFFECTIVE",
      "The configuration file is already tracked by Git. Adding an ignore rule would not stop tracking it.",
      before,
    );
  }
  if (before.ignored) return { changed: false, before, after: before };

  const write = appendIgnoreRule(projectRoot);
  const after = await inspectProjectGit(projectRoot);
  if (after.status !== "not-repository" && !after.ignored) {
    throw new GitIgnoreError("IGNORE_NOT_EFFECTIVE", "The Git ignore rule was written but Git does not apply it.", {
      before,
      after,
      gitignorePath: write.gitignorePath,
    });
  }
  return { changed: write.changed, before, after, gitignorePath: write.gitignorePath };
}

async function ensureProjectDesignIgnored(projectRoot) {
  const root = fs.realpathSync(projectRoot);
  const gitRoot = await findGitRoot(root);
  const relative = gitRoot ? path.relative(gitRoot, path.join(root, ".bingo", "design")).split(path.sep).join("/") : null;
  if (gitRoot) {
    const tracked = await runGit(gitRoot, ["ls-files", "-z", "--", relative]);
    if (tracked.stdout) throw new GitIgnoreError("IGNORE_NOT_EFFECTIVE", "Design data is already tracked by Git. An ignore rule cannot stop tracking existing files; uncheck this option to continue.");
  }
  const result = appendIgnoreRule(root, "/.bingo/design/", "# Bingo design data (pages, history, chats and assets)");
  if (gitRoot) {
    const ignored = await runGit(gitRoot, ["check-ignore", "-q", "--no-index", "--", `${relative}/`], { allowExitOne: true });
    if (!ignored.ok) throw new GitIgnoreError("IGNORE_NOT_EFFECTIVE", "The design ignore rule was written, but other Git rules override it.");
  }
  return result;
}

export {
  CONFIG_RELATIVE_PATH,
  GitIgnoreError,
  IGNORE_BLOCK,
  IGNORE_RULE,
  appendIgnoreRule,
  ensureProjectConfigIgnored,
  ensureProjectDesignIgnored,
  inspectProjectGit,
};
