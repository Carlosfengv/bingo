/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: src/main/claudeBinary.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as child_process from "child_process";
import * as fs from "fs";
import * as fs_promises from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as util from "util";

/**
* Locating and invoking the Claude Code CLI, across macOS, Linux and Windows.
*
* Kept free of Electron imports so it can be exercised directly in tests.
*/
var execFileAsync$2 = (0, util.promisify)(child_process.execFile);
/** Compile-time constant in Node; read through a function so tests can vary it. */
function isWindows() {
  return process.platform === "win32";
}
var resolvedClaudePath = null;
var claudePathResolved = false;
var resolvedShellEnv = null;
/** Home directory. Windows exports USERPROFILE, not HOME. */
function userHome() {
  return process.env.HOME || process.env.USERPROFILE || (0, os.homedir)();
}
/** Strip OSC/ANSI control sequences that interactive shells (iTerm, Cursor) inject into stdout. */
function sanitizeShellOutput(raw) {
  return raw.replace(/\x1b\][^\x07]*\x07/g, "").replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "").trim();
}
var shellExecEnv = () => ({
  HOME: process.env.HOME,
  USER: process.env.USER,
  SHELL: process.env.SHELL || "/bin/zsh"
});
function parseEnvOutput(stdout) {
  const env = {};
  for (const line of sanitizeShellOutput(stdout).split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0) env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}
async function runShellCommand(args) {
  const shell = process.env.SHELL || "/bin/zsh";
  try {
    const {
      stdout
    } = await execFileAsync$2(shell, args, {
      timeout: 5e3,
      env: shellExecEnv()
    });
    const line = sanitizeShellOutput(stdout).split("\n").find(l => l.startsWith("/"));
    return line && !line.includes("not found") ? line : null;
  } catch {
    return null;
  }
}
async function isExecutable(path$38) {
  try {
    await (0, fs_promises.access)(path$38, fs.constants.X_OK);
    return (await (0, fs_promises.stat)(path$38)).isFile();
  } catch {
    return false;
  }
}
/** Extensions that make a file runnable. Windows needs one appended; POSIX doesn't. */
function executableExtensions() {
  if (!isWindows()) return [""];
  return (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean);
}
/** Resolve a bare command name against a PATH value, without spawning anything. */
async function findOnPath(name, pathValue) {
  if (!pathValue) return null;
  const extensions = executableExtensions();
  for (const entry of pathValue.split(isWindows() ? ";" : ":")) {
    const dir = entry.trim().replace(/^"|"$/g, "");
    if (!dir) continue;
    for (const ext of extensions) {
      const candidate = (0, path.join)(dir, name + ext);
      if (await isExecutable(candidate)) return candidate;
    }
  }
  return null;
}
/** Windows fallback: let the OS resolve it. Costs a subprocess, so it goes last. */
async function findClaudeViaWhere() {
  try {
    const {
      stdout
    } = await execFileAsync$2("where.exe", ["claude"], {
      timeout: 5e3,
      windowsHide: true
    });
    const hits = sanitizeShellOutput(stdout).split("\n").map(l => l.trim()).filter(l => /^[a-z]:\\/i.test(l));
    return hits.find(h => h.toLowerCase().endsWith(".exe")) ?? hits[0] ?? null;
  } catch {
    return null;
  }
}
/** nvm keeps one bin dir per Node version; a global install lands in whichever was active. */
async function nvmClaudePaths(home) {
  const versionsDir = (0, path.join)(home, ".nvm", "versions", "node");
  try {
    return (await (0, fs_promises.readdir)(versionsDir)).sort().reverse().map(v => (0, path.join)(versionsDir, v, "bin", "claude"));
  } catch {
    return [];
  }
}
/** Install locations to probe when PATH resolution comes up empty. */
async function knownInstallPaths(home) {
  if (isWindows()) {
    const appData = process.env.APPDATA || (0, path.join)(home, "AppData", "Roaming");
    const localAppData = process.env.LOCALAPPDATA || (0, path.join)(home, "AppData", "Local");
    return [(0, path.join)(home, ".local", "bin", "claude.exe"), (0, path.join)(localAppData, "Programs", "claude", "claude.exe"), (0, path.join)(appData, "npm", "claude.exe"), (0, path.join)(appData, "npm", "claude.cmd")];
  }
  return [(0, path.join)(home, ".local/bin/claude"), "/opt/homebrew/bin/claude", "/usr/local/bin/claude", (0, path.join)(home, ".bun/bin/claude"), (0, path.join)(home, ".volta/bin/claude"), ...(await nvmClaudePaths(home))];
}
async function getShellEnv$1Raw() {
  if (resolvedShellEnv) return resolvedShellEnv;
  if (isWindows()) {
    resolvedShellEnv = {
      ...process.env
    };
    return resolvedShellEnv;
  }
  const shell = process.env.SHELL || "/bin/zsh";
  for (const args of [["-lc", "env"], ["-ilc", "env"]]) try {
    const {
      stdout
    } = await execFileAsync$2(shell, args, {
      timeout: 5e3,
      env: shellExecEnv()
    });
    const env = parseEnvOutput(stdout);
    if (Object.keys(env).length > 0) {
      resolvedShellEnv = env;
      return env;
    }
  } catch {}
  return {
    ...process.env
  };
}
/**
* Locate the Claude CLI.
*
* macOS launches GUI apps from launchd with a stripped PATH, so the user's login
* shell is the only place their real PATH lives — hence the shell probe, which
* stays first there. Windows and Linux hand Electron the full user PATH, so
* scanning it directly is both faster and more reliable than spawning anything;
* Windows has no POSIX shell to probe at all.
*/
async function findClaudeBinary(forceRefresh = false) {
  if (!forceRefresh && claudePathResolved) return resolvedClaudePath || "claude";
  const home = userHome();
  let found = isWindows() ? null : (await runShellCommand(["-lc", "command -v claude"])) ?? (await runShellCommand(["-ilc", "command -v claude"]));
  found ??= await findOnPath("claude", process.env.PATH);
  if (!found) {
    for (const candidate of await knownInstallPaths(home)) if (await isExecutable(candidate)) {
      found = candidate;
      break;
    }
  }
  if (!found && isWindows()) found = await findClaudeViaWhere();
  if (found) {
    resolvedClaudePath = found;
    console.log(`[AI Chat] Found claude CLI at: ${found}`);
  } else {
    resolvedClaudePath = null;
    console.log("[AI Chat] Could not find claude CLI via PATH or known install paths");
  }
  claudePathResolved = true;
  return resolvedClaudePath || "claude";
}
/**
* Windows refuses to spawn .cmd/.bat shims directly (Node's CVE-2024-27980 fix),
* so an npm-installed CLI has to go through cmd.exe. Passing the arguments as
* separate argv entries rather than using `shell: true` keeps Node's quoting,
* which matters for temp paths under a "First Last" user directory.
*/
function claudeInvocation(bin, args) {
  if (isWindows() && /\.(cmd|bat)$/i.test(bin)) return {
    file: process.env.COMSPEC || "cmd.exe",
    args: ["/d", "/s", "/c", bin, ...args]
  };
  return {
    file: bin,
    args
  };
}
/** The path resolved by the last findClaudeBinary() call, or null when none was found. */
function resolvedClaudeBinary() {
  return resolvedClaudePath;
}

/** Provider overrides installed by the app; see tools/assets.py. */
function withAiEnv(env) {
  const apply = globalThis.__lunaAiEnv;
  return typeof apply === 'function' ? apply(env) : env;
}

// The CLI's environment is the single place provider settings are applied: every
// chat spawn reads its env from here.
async function getShellEnv$1() {
  return withAiEnv(await getShellEnv$1Raw());
}

export { claudeInvocation, findClaudeBinary, getShellEnv$1, getShellEnv$1Raw as getLoginShellEnv, isWindows, resolvedClaudeBinary, sanitizeShellOutput, userHome };
