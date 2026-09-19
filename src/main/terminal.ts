/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: src/main/terminal.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getProjectAllowedPaths } from "./mcpServer";
import { projectForWebContents, windowForWebContents } from "./windowManager";
import * as electron from "electron";
import * as fs from "fs";
import * as node_pty from "node-pty";
import * as os from "os";
import * as path from "path";

/**
* On POSIX, node-pty spawns shells through a `spawn-helper` binary shipped in
* its prebuilds dir. Some installs leave that file without the executable bit
* (pnpm skipping the package's install scripts), which makes spawning fail with
* the opaque "posix_spawnp failed". Re-mark it executable defensively so a
* botched install can't take the integrated terminal down.
*/
function ensureSpawnHelperExecutable() {
  if (process.platform === "win32") return;
  try {
    const nodePtyRoot = path.join(require.resolve("node-pty"), "..", "..");
    const helperPath = path.join(nodePtyRoot, "prebuilds", `${process.platform}-${process.arch}`, "spawn-helper");
    const stat = fs.statSync(helperPath);
    if ((stat.mode & 73) === 0) fs.chmodSync(helperPath, stat.mode | 493);
  } catch {}
}
var sessions = new Map();
const pendingExits = new Set<{ pty: any; exited: Promise<void> }>();
let quitting = false;
var nextId = 1;
function makeSessionId() {
  return `term-${Date.now().toString(36)}-${nextId++}`;
}
/** Pick the shell to launch. Honors the user's login shell on POSIX. */
function resolveShell() {
  if (process.platform === "win32") return {
    file: process.env.COMSPEC || "powershell.exe",
    args: []
  };
  return {
    file: process.env.SHELL || "/bin/zsh",
    args: ["-l"]
  };
}
/**
* Default working directory for a window's terminal: the first allowed local
* path the user wired up for the open project (that's the codebase they're
* editing), falling back to the home directory.
*/
function resolveCwd(projectId) {
  if (projectId) for (const p of getProjectAllowedPaths(projectId)) try {
    if (fs.statSync(p).isDirectory()) return p;
  } catch {}
  return os.homedir();
}
function disposeSession(id) {
  const session = sessions.get(id);
  if (!session) return;
  sessions.delete(id);
  try {
    session.pty.kill();
  } catch {}
}
/** Kill every PTY owned by a window (window closed or renderer reloaded). */
function disposeTerminalsForWindow(winId) {
  for (const [id, session] of sessions) if (session.winId === winId) disposeSession(id);
}
function disposeTerminalsForRenderer(contentsId) {
  for (const [id, session] of sessions) if (session.senderId === contentsId) disposeSession(id);
}
/** Let node-pty deliver its native exit callbacks before Electron tears down V8. */
async function drainTerminalsForQuit(timeoutMs = 3000) {
  quitting = true;
  for (const id of sessions.keys()) disposeSession(id);
  let forceTimer, deadline;
  try {
    forceTimer = setTimeout(() => {
      for (const { pty } of pendingExits) try { pty.kill("SIGKILL"); } catch {}
    }, timeoutMs / 2);
    await Promise.race([
      Promise.all([...pendingExits].map(entry => entry.exited)),
      new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error("Terminal processes have not finished closing. Please try quitting again.")), timeoutMs); }),
    ]);
    await new Promise(resolve => setImmediate(resolve));
  } catch (error) { quitting = false; throw error; }
  finally { clearTimeout(forceTimer); clearTimeout(deadline); }
}
function sendToRenderer(sender, channel, payload) {
  if (sender.isDestroyed()) return false;
  try {
    if (!sender.mainFrame || sender.mainFrame.detached) return false;
    sender.send(channel, payload);
    return true;
  }
  catch { return false; }
}
function registerTerminalIPC() {
  electron.ipcMain.handle("terminal:create", (event, args) => {
    if (quitting) return { ok: false, error: "Application is quitting" };
    const win = windowForWebContents(event.sender);
    if (!win) return {
      ok: false,
      error: "No window"
    };
    const cwd = resolveCwd(projectForWebContents(event.sender));
    const {
      file,
      args: shellArgs
    } = resolveShell();
    const id = makeSessionId();
    const sender = event.sender;
    let proc;
    try {
      ensureSpawnHelperExecutable();
      proc = node_pty.spawn(file, shellArgs, {
        name: "xterm-256color",
        cols: args?.cols && args.cols > 0 ? args.cols : 80,
        rows: args?.rows && args.rows > 0 ? args.rows : 24,
        cwd,
        env: {
          ...process.env,
          TERM: "xterm-256color"
        }
      });
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
    sessions.set(id, {
      pty: proc,
      winId: win.id,
      senderId: event.sender.id
    });
    let finishExit: () => void;
    const pending = { pty: proc, exited: new Promise<void>(resolve => { finishExit = resolve; }) };
    pendingExits.add(pending);
    proc.onData(data => {
      if (!sendToRenderer(sender, "terminal:data", {
        id,
        data
      })) disposeSession(id);
    });
    proc.onExit(({
      exitCode
    }) => {
      pendingExits.delete(pending);
      finishExit();
      sendToRenderer(sender, "terminal:exit", {
        id,
        exitCode
      });
      sessions.delete(id);
    });
    const initial = args?.initialCommand?.trim();
    if (initial) proc.write(`${initial}\r`);
    return {
      ok: true,
      id,
      cwd,
      shell: file
    };
  });
  electron.ipcMain.on("terminal:input", (event, args) => {
    const session = sessions.get(args?.id);
    if (!session || session.senderId !== event.sender.id || typeof args?.data !== "string") return;
    session.pty.write(args.data.slice(0, 64 * 1024));
  });
  electron.ipcMain.on("terminal:resize", (event, args) => {
    const session = sessions.get(args?.id);
    if (!session || session.senderId !== event.sender.id || !args.cols || !args.rows) return;
    try {
      session.pty.resize(Math.min(500, Math.max(1, Math.floor(args.cols))), Math.min(300, Math.max(1, Math.floor(args.rows))));
    } catch {}
  });
  electron.ipcMain.on("terminal:dispose", (event, args) => {
    if (sessions.get(args?.id)?.senderId !== event.sender.id) return;
    disposeSession(args?.id);
  });
}

export { disposeTerminalsForWindow, disposeTerminalsForRenderer, drainTerminalsForQuit, registerTerminalIPC };
