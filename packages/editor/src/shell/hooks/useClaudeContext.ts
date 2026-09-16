/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/useClaudeContext.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { BINGO_SLASH_COMMANDS } from "@bingo/compiler";

function getBridge() {
  if (typeof window === "undefined") return null;
  const api = window.api;
  return api && typeof api.invoke === "function" ? api : null;
}
/** MCP servers the user's Claude Code loads, read from their config on disk. Empty off-desktop. */
async function fetchClaudeConnections(cwd) {
  const bridge = getBridge();
  if (!bridge) return [];
  try {
    return await bridge.invoke("claude:list-connections", {
      cwd
    });
  } catch {
    return [];
  }
}
/** Skills and custom commands the user can type after `/`. Empty off-desktop. */
async function fetchSlashCommands(cwd) {
  const bridge = getBridge();
  if (!bridge) return [];
  try {
    return await bridge.invoke("claude:list-commands", {
      cwd
    });
  } catch {
    return [];
  }
}
/** Bingo's own slash commands, listed ahead of the user's skills. */
var BINGO_COMMANDS = BINGO_SLASH_COMMANDS.map(c => ({
  name: c.name,
  description: c.description,
  scope: "bingo"
}));
/** Rank commands for a `/query`: prefix matches first, then substring matches, then description hits. */
function filterSlashCommands(commands, query) {
  const q = query.toLowerCase();
  if (!q) return commands;
  const rank = c => {
    const name = c.name.toLowerCase();
    if (name.startsWith(q)) return 0;
    if (name.includes(q)) return 1;
    if (c.description.toLowerCase().includes(q)) return 2;
    return -1;
  };
  return commands.map(c => ({
    c,
    r: rank(c)
  })).filter(({
    r
  }) => r >= 0).sort((a, b) => a.r - b.r || a.c.name.localeCompare(b.c.name)).map(({
    c
  }) => c);
}
/** Message-scoped guidance; preserve full MCP names so plugins resolve unambiguously. */
function buildConnectionPrompt(names) {
  if (names.length === 0) return "";
  return "\n[Connections for this message]\n" + [...new Set(names)].map(name => `- ${JSON.stringify(name)}`).join("\n") + "\nThe user selected these MCP connections for this request. Use them when relevant. If a selected connection is unavailable, say so. Other available connections may still be used as needed; existing permissions still apply.";
}
/** Friendly presentation only; names sent to the CLI always keep their original spelling. */
function connectionDisplayName(connection) {
  if (connection.displayName?.trim()) return connection.displayName.trim();
  const name = (connection.name.split(":").pop() || connection.name).replace(/[-_](?:mcp[-_])?server$/i, "").replace(/[-_]mcp$/i, "");
  return {
    uidotsh: "ui.sh",
    github: "GitHub",
    gitlab: "GitLab",
    openai: "OpenAI"
  }[name.toLowerCase()] ?? name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").replace(/\b[a-z]/g, char => char.toUpperCase());
}

export { BINGO_COMMANDS, buildConnectionPrompt, connectionDisplayName, fetchClaudeConnections, fetchSlashCommands, filterSlashCommands };
