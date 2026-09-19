import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import os from "node:os";
import { getProjectAccessContext } from "./projectAccess";

export const RESULT_MAX_BYTES = 32 * 1024;
export const RESULT_SCAN_BYTES = 16 * 1024 * 1024;
const MAX_PROJECTS = 4096;
const DISCOVERY_MS = 3000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export type ToolReadContext = {
  source: "in-app" | "external";
  projectId: string;
  chatTabId?: string;
  chatRunId?: string;
};
type ResultScope = Required<Omit<ToolReadContext, "source">> & {
  claudeSessionId: string;
  claudeConfigDir: string;
  workDir: string;
};
type Directory = { path: string; dev: number; ino: number };
type Scope = ResultScope & { token: symbol; directories?: Directory[]; discovery?: Promise<Directory[]> };
const scopes = new Map<string, Scope>();
// Classification information survives revocation; it never grants access.
const configRoots = new Set([path.join(os.homedir(), ".claude")]);
const keyFor = (ctx: ToolReadContext | ResultScope) => JSON.stringify([ctx.projectId, ctx.chatTabId, ctx.chatRunId]);

export class AgentResultError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
const fail = (code: string, message: string): never => { throw new AgentResultError(code, message); };
export function agentResultErrorResult(error: unknown) {
  const reason = error instanceof AgentResultError ? error.code : "AGENT_RESULT_UNSAFE_PATH";
  return { isError: true, reason, content: [{ type: "text", text: `${reason}: ${error instanceof AgentResultError ? error.message : "Cannot safely read this tool result."} Do not request folder access to the coding agent's cache.` }] };
}

export function claudeResultConfigDir(env: NodeJS.ProcessEnv): string {
  const home = env.HOME || env.USERPROFILE;
  const value = env.CLAUDE_CONFIG_DIR || (home ? path.join(home, ".claude") : undefined);
  if (!value || !path.isAbsolute(value)) return fail("AGENT_RESULT_LAYOUT_UNSUPPORTED", "Claude's configuration directory must be known and absolute.");
  return path.resolve(value);
}

export function registerClaudeResultScope(input: ResultScope) {
  if (!input.chatRunId || !input.chatTabId || !UUID.test(input.claudeSessionId) || !path.isAbsolute(input.claudeConfigDir)) {
    return fail("AGENT_RESULT_LAYOUT_UNSUPPORTED", "Invalid internal Claude result scope.");
  }
  const scope: Scope = { ...input, claudeConfigDir: path.resolve(input.claudeConfigDir), token: Symbol() };
  configRoots.add(scope.claudeConfigDir);
  const key = keyFor(scope);
  scopes.set(key, scope);
  return () => { if (scopes.get(key) === scope) scopes.delete(key); };
}

export function revokeResultScopesForRun(chatRunId: string) {
  for (const [key, scope] of scopes) if (scope.chatRunId === chatRunId) scopes.delete(key);
}
export function revokeAllResultScopes() { scopes.clear(); }

function assertActive(scope: Scope) {
  if (scopes.get(keyFor(scope)) !== scope) fail("AGENT_RESULT_EXPIRED", "This run has ended. Repeat the original query in the current run.");
  const access = getProjectAccessContext(scope.projectId);
  if (!access.projectRoot || access.mode === "disabled") fail("PROJECT_ACCESS_DISABLED", "Project file access is disabled.");
}

function relativeParts(root: string, file: string) {
  const relative = path.relative(root, file);
  return relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) ? [] : relative.split(path.sep);
}
function isNamespace(root: string, file: string) {
  const parts = relativeParts(root, file);
  return parts[0] === "projects" && parts.length >= 4 && parts[3] === "tool-results";
}
async function nearestRealPath(file: string): Promise<string> {
  try { return await fs.realpath(file); } catch (error) {
    if (!["ENOENT", "ENOTDIR"].includes(error.code)) throw error;
    const parent = path.dirname(file);
    if (parent === file) return file;
    return path.join(await nearestRealPath(parent), path.basename(file));
  }
}

/** Match both configured paths and aliases; never infer authorization from a path. */
export async function isAgentToolResultPath(file: unknown): Promise<boolean> {
  if (typeof file !== "string" || !path.isAbsolute(file)) return false;
  const resolved = path.resolve(file);
  let real: string;
  try { real = await nearestRealPath(resolved); } catch { real = resolved; }
  for (const root of configRoots) {
    const canonical = await nearestRealPath(root).catch(() => root);
    if (isNamespace(root, resolved) || isNamespace(canonical, real)) return true;
    // Keep traversal out of the ordinary-folder fallback as well.
    for (const prefix of [root, canonical]) if (file.startsWith(prefix + path.sep)) {
      const rawParts = file.slice(prefix.length + 1).split(path.sep);
      if (rawParts[0] === "projects" && rawParts[3] === "tool-results") return true;
    }
  }
  return false;
}

async function directory(file: string): Promise<Directory> {
  const stat = await fs.lstat(file);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail("AGENT_RESULT_UNSAFE_PATH", "Tool result directories cannot be symbolic links.");
  return { path: file, dev: stat.dev, ino: stat.ino };
}
async function verifyDirectories(entries: Directory[]) {
  for (const entry of entries) {
    const current = await directory(entry.path);
    if (entry.dev !== current.dev || entry.ino !== current.ino || await fs.realpath(entry.path) !== entry.path) {
      fail("AGENT_RESULT_UNSAFE_PATH", "The tool result directory changed during this run.");
    }
  }
}
async function discover(scope: Scope): Promise<Directory[]> {
  const started = Date.now();
  const root = await fs.realpath(scope.claudeConfigDir);
  const projects = await directory(path.join(root, "projects"));
  const matches: Directory[][] = [];
  let count = 0;
  const iterator = await fs.opendir(projects.path);
  for await (const entry of iterator) {
    assertActive(scope);
    if (++count > MAX_PROJECTS || Date.now() - started > DISCOVERY_MS) fail("AGENT_RESULT_LAYOUT_UNSUPPORTED", "Tool result directory discovery exceeded its limit. Narrow the original query.");
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const projectPath = path.join(projects.path, entry.name);
    const sessionPath = path.join(projectPath, scope.claudeSessionId);
    try {
      // Check only the known session; unrelated projects are not inspected.
      await fs.lstat(sessionPath);
      matches.push([projects, await directory(projectPath), await directory(sessionPath)]);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  if (matches.length !== 1) fail("AGENT_RESULT_LAYOUT_UNSUPPORTED", "The current Claude result directory is missing or ambiguous. Narrow and repeat the original query.");
  const entries = [...matches[0], await directory(path.join(matches[0][2].path, "tool-results"))];
  await verifyDirectories(entries);
  assertActive(scope);
  return entries;
}
async function scopeDirectories(scope: Scope) {
  if (scope.directories) { await verifyDirectories(scope.directories); return scope.directories; }
  if (!scope.discovery) scope.discovery = discover(scope);
  try { scope.directories = await scope.discovery; return scope.directories; }
  finally { scope.discovery = undefined; } // A directory may be created after the first request.
}

export async function classifyToolResultPath(ctx: ToolReadContext | undefined, file: string) {
  if (!await isAgentToolResultPath(file)) return { kind: "ordinary" as const };
  const scope = ctx?.source === "in-app" ? scopes.get(keyFor(ctx)) : undefined;
  if (!scope) fail("AGENT_RESULT_SCOPE_MISMATCH", "This tool result does not belong to an active run. Repeat the original query in the current run.");
  assertActive(scope);
  try {
    const canonicalConfig = await nearestRealPath(scope.claudeConfigDir);
    const target = await nearestRealPath(file);
    const parts = relativeParts(canonicalConfig, target);
    if (parts[0] !== "projects" || parts[2] !== scope.claudeSessionId || parts[3] !== "tool-results") fail("AGENT_RESULT_SCOPE_MISMATCH", "This result belongs to a different Claude session.");
    const directories = await scopeDirectories(scope);
    const root = directories[directories.length - 1].path;
    const real = await fs.realpath(file);
    if (path.dirname(real) !== root) fail("AGENT_RESULT_SCOPE_MISMATCH", "Only the current run's own result files can be read.");
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) fail("AGENT_RESULT_UNSAFE_PATH", "The result must be a regular, unlinked file.");
    // Accept a configured root symlink, but reject aliases below it.
    const configuredRoot = path.resolve(scope.claudeConfigDir);
    const canonicalRoot = await fs.realpath(configuredRoot);
    const normalized = path.resolve(file);
    const mapped = path.join(canonicalRoot, path.relative(configuredRoot, normalized));
    if (normalized !== real && mapped !== real) fail("AGENT_RESULT_UNSAFE_PATH", "Result path aliases are not supported.");
    if (file.split(path.sep).includes("..")) fail("AGENT_RESULT_UNSAFE_PATH", "Result paths cannot contain parent traversal.");
    assertActive(scope);
    return { kind: "owned" as const, scope, real, stat };
  } catch (error) {
    if (error.code === "ENOENT") fail("AGENT_RESULT_EXPIRED", "The result file is not available. Narrow and repeat the original query.");
    throw error;
  }
}

/** Bounded line reading; no whole-file allocation, including very long lines. */
export function validateResultRange(options: { offset?: number; limit?: number }) {
  const offset = options.offset === undefined ? 1 : options.offset;
  const limit = options.limit === undefined ? 200 : options.limit;
  if (!Number.isSafeInteger(offset) || offset < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 2000) fail("AGENT_RESULT_INVALID_RANGE", "Use a positive integer offset and a limit between 1 and 2000.");
  return { offset, limit };
}
export async function readOwnedToolResult(ctx: ToolReadContext | undefined, file: string, options: { offset?: number; limit?: number }, budget: { remaining: number }) {
  const { offset, limit } = validateResultRange(options);
  const owned = await classifyToolResultPath(ctx, file);
  if (owned.kind !== "owned") fail("AGENT_RESULT_SCOPE_MISMATCH", "This is not an owned tool result.");
  const { scope, real, stat } = owned;
  if (budget.remaining < 16) return { text: `File: ${file}\n[Not read: batch response budget reached. Read this file separately.]`, assertActive: () => assertActive(scope) };
  const handle = await fs.open(real, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  const assertReadable = () => assertActive(scope);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.ino !== stat.ino || opened.dev !== stat.dev || opened.nlink !== 1) fail("AGENT_RESULT_UNSAFE_PATH", "The result file changed before reading.");
    const buffer = Buffer.alloc(16 * 1024);
    let scanned = 0, line = 1, lines = 0;
    let pending = Buffer.alloc(0);
    let eof = false, partial = false, stopped = false;
    const output: string[] = [];
    const flush = () => {
      if (line >= offset) {
        const prefix = `${line}\t`;
        const available = Math.max(0, budget.remaining - Buffer.byteLength(prefix) - 1);
        const complete = pending.length <= available;
        const text = new TextDecoder().decode(pending.subarray(0, available), { stream: !complete });
        const rendered = `${prefix}${text}\n`;
        if (budget.remaining >= Buffer.byteLength(rendered)) {
          output.push(rendered);
          budget.remaining -= Buffer.byteLength(rendered);
        }
        partial ||= !complete;
        lines++;
      }
      pending = Buffer.alloc(0);
      line++;
      if (partial || lines >= limit || budget.remaining < 16) stopped = true;
    };
    while (!stopped && scanned < RESULT_SCAN_BYTES) {
      assertReadable();
      const { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, RESULT_SCAN_BYTES - scanned), null);
      if (!bytesRead) { eof = true; if (pending.length) flush(); break; }
      scanned += bytesRead;
      let start = 0;
      while (start < bytesRead && !stopped) {
        const newline = buffer.subarray(0, bytesRead).indexOf(10, start);
        const end = newline < 0 ? bytesRead : newline;
        if (line >= offset) {
          const segment = buffer.subarray(start, end);
          const remaining = Math.max(0, budget.remaining + 1 - pending.length);
          pending = Buffer.concat([pending, segment.subarray(0, remaining)]);
          if (pending.length > budget.remaining) { partial = true; flush(); break; }
        }
        if (newline >= 0) flush();
        start = end + 1;
      }
    }
    if (!stopped && !eof && scanned >= RESULT_SCAN_BYTES) fail("AGENT_RESULT_INVALID_RANGE", "Scanning exceeded 16 MiB. Narrow the original query.");
    await verifyDirectories(scope.directories!);
    const after = await handle.stat();
    const current = await fs.lstat(real);
    if (after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || current.ino !== opened.ino || current.dev !== opened.dev || current.isSymbolicLink()) fail("AGENT_RESULT_UNSAFE_PATH", "The result changed while reading.");
    assertReadable();
    const note = partial ? "\n[Line incomplete: response budget reached. Narrow the original query.]" : !eof ? `\n[More content may remain. Read with offset=${line}; total lines unknown.]` : output.length ? "\n[End of file]" : "(empty file or offset beyond end)";
    return { text: `File: ${file}\n${output.join("")}${note}`, assertActive: assertReadable };
  } finally { await handle.close(); }
}
