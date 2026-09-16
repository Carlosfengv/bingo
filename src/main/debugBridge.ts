/*
 * Debug bridge (development only).
 *
 * Added on top of the recovered tree. Driving this app's UI is otherwise
 * awkward: it is a GUI, and Electron's DevTools-protocol endpoint in this build
 * opens a websocket but never delivers responses, so a CDP client cannot read
 * anything back.
 *
 * When BINGO_DEBUG_BRIDGE=1, the main process polls a script file, runs it
 * in the renderer via `webContents.executeJavaScript`, and writes the result
 * next to it. That makes the running app scriptable from the shell:
 *
 *   echo 'document.title' > /tmp/bingo-debug/in.js
 *   cat /tmp/bingo-debug/in.js.out
 *
 * Inert unless the environment variable is set, so it is never part of normal
 * behaviour.
 */

import { BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";

const SCRIPT = process.env.BINGO_DEBUG_SCRIPT || "/tmp/bingo-debug/in.js";
const RESULT = `${SCRIPT}.out`;

function writeResult(payload) {
  try {
    fs.mkdirSync(path.dirname(RESULT), { recursive: true });
    fs.writeFileSync(RESULT, JSON.stringify(payload, null, 2));
  } catch {}
}

export function registerDebugBridge() {
  if (!process.env.BINGO_DEBUG_BRIDGE) return;
  fs.mkdirSync(path.dirname(SCRIPT), { recursive: true });

  let lastRun = "";
  setInterval(async () => {
    let source = "";
    try {
      source = fs.readFileSync(SCRIPT, "utf8");
    } catch {
      return;
    }
    if (!source.trim() || source === lastRun) return;
    lastRun = source;

    const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
    if (!win) return;
    try {
      const result = await win.webContents.executeJavaScript(source, true);
      writeResult({ ok: true, result: result === undefined ? null : result });
    } catch (error) {
      writeResult({ ok: false, error: String(error?.message || error) });
    }
  }, 400);

  console.log(`[DebugBridge] watching ${SCRIPT}`);
}
