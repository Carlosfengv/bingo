/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: src/main/claudeContext.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { createConnectionTitleCache } from "./connectionMetadata";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
* Reads the user's Claude Code setup from disk so the chat can show what the
* agent already has: MCP servers (connections) and user-invocable skills and
* commands (slash commands). Mirrors what the CLI loads for a session started
* in `cwd`. Connection titles are fetched separately from initialization metadata.
*/
var CLAUDE_DIR = (0, path.join)((0, os.homedir)(), ".claude");
function readJson(path$34) {
  try {
    return JSON.parse((0, fs.readFileSync)(path$34, "utf-8"));
  } catch {
    return null;
  }
}
function isDir(path$35) {
  try {
    return (0, fs.statSync)(path$35).isDirectory();
  } catch {
    return false;
  }
}
function listDir(path$36) {
  try {
    return (0, fs.readdirSync)(path$36);
  } catch {
    return [];
  }
}
/** Minimal frontmatter reader: `key: value` lines between the first two `---` lines. */
function readFrontmatter(path$37) {
  let text;
  try {
    text = (0, fs.readFileSync)(path$37, "utf-8");
  } catch {
    return {};
  }
  if (!text.startsWith("---")) return {};
  const end = text.indexOf("\n---", 3);
  if (end < 0) return {};
  const out = {};
  for (const line of text.slice(3, end).split("\n")) {
    const m = /^([\w-]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith("\"") && value.endsWith("\"") || value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    out[m[1]] = value;
  }
  return out;
}
function enabledPlugins() {
  const installed = readJson((0, path.join)(CLAUDE_DIR, "plugins", "installed_plugins.json"));
  const enabled = readJson((0, path.join)(CLAUDE_DIR, "settings.json"))?.enabledPlugins ?? {};
  const out = [];
  for (const [key, entries] of Object.entries(installed?.plugins ?? {})) {
    if (enabled[key] === false) continue;
    const installPath = (Array.isArray(entries) ? entries[0] : entries)?.installPath;
    if (typeof installPath !== "string" || !isDir(installPath)) continue;
    const manifest = readJson((0, path.join)(installPath, ".claude-plugin", "plugin.json"));
    const name = typeof manifest?.name === "string" && manifest.name ? manifest.name : key.split("@")[0];
    out.push({
      name,
      installPath
    });
  }
  return out;
}
function serversOf(config) {
  const servers = config?.mcpServers;
  return servers && typeof servers === "object" ? Object.entries(servers) : [];
}
function transportOf(entry) {
  if (typeof entry?.type === "string") return entry.type;
  if (typeof entry?.url === "string") return "http";
  return "stdio";
}
/**
* MCP servers the CLI would load for a session in `cwd`: user scope, the
* project's own, and enabled plugins'. The user's own Bingo entry is
* skipped because the chat always supplies its own.
*/
var connectionTitle = createConnectionTitleCache();
async function listClaudeConnections(cwd) {
  const seen = new Set();
  const out = [];
  const push = (c, config, pluginRoot) => {
    if (c.name === "bingo" || seen.has(c.name)) return;
    seen.add(c.name);
    out.push(connectionTitle(config, cwd, pluginRoot).then(displayName => ({
      ...c,
      displayName
    })));
  };
  const claudeJson = readJson((0, path.join)((0, os.homedir)(), ".claude.json"));
  for (const [name, entry] of serversOf(claudeJson)) push({
    name,
    scope: "user",
    transport: transportOf(entry)
  }, entry);
  if (cwd) {
    for (const [name, entry] of serversOf(claudeJson?.projects?.[cwd])) push({
      name,
      scope: "project",
      transport: transportOf(entry)
    }, entry);
    for (const [name, entry] of serversOf(readJson((0, path.join)(cwd, ".mcp.json")))) push({
      name,
      scope: "project",
      transport: transportOf(entry)
    }, entry);
  }
  for (const plugin of enabledPlugins()) {
    const config = readJson((0, path.join)(plugin.installPath, ".mcp.json")) ?? readJson((0, path.join)(plugin.installPath, "mcp.json")) ?? readJson((0, path.join)(plugin.installPath, ".claude-plugin", "plugin.json"));
    for (const [name, entry] of serversOf(config)) push({
      name: `plugin:${plugin.name}:${name}`,
      scope: "plugin",
      plugin: plugin.name,
      transport: transportOf(entry)
    }, entry, plugin.installPath);
  }
  return Promise.all(out);
}
function skillsIn(dir, scope, prefix = "", plugin) {
  const out = [];
  for (const entry of listDir(dir)) {
    const file = (0, path.join)(dir, entry, "SKILL.md");
    if (!(0, fs.existsSync)(file)) continue;
    const fm = readFrontmatter(file);
    if (fm["user-invocable"] === "false") continue;
    out.push({
      name: `${prefix}${fm.name || entry}`,
      description: fm.description ?? "",
      scope,
      plugin
    });
  }
  return out;
}
/** `commands/foo.md` → `foo`; `commands/dir/foo.md` → `dir:foo`, as the CLI namespaces them. */
function commandsIn(dir, scope, prefix = "", plugin) {
  const out = [];
  const walk = (current, namespace) => {
    for (const entry of listDir(current)) {
      const full = (0, path.join)(current, entry);
      if (isDir(full)) walk(full, `${namespace}${entry}:`);else if (entry.endsWith(".md")) {
        const fm = readFrontmatter(full);
        out.push({
          name: `${prefix}${namespace}${(0, path.basename)(entry, ".md")}`,
          description: fm.description ?? "",
          scope,
          plugin
        });
      }
    }
  };
  walk(dir, "");
  return out;
}
/** Skills and custom commands the user can type after `/`, as the CLI would resolve them for a session in `cwd`. */
function listClaudeSlashCommands(cwd) {
  const all = [...skillsIn((0, path.join)(CLAUDE_DIR, "skills"), "user"), ...commandsIn((0, path.join)(CLAUDE_DIR, "commands"), "user")];
  if (cwd) {
    all.push(...skillsIn((0, path.join)(cwd, ".claude", "skills"), "project"));
    all.push(...commandsIn((0, path.join)(cwd, ".claude", "commands"), "project"));
  }
  for (const plugin of enabledPlugins()) {
    all.push(...skillsIn((0, path.join)(plugin.installPath, "skills"), "plugin", `${plugin.name}:`, plugin.name));
    all.push(...commandsIn((0, path.join)(plugin.installPath, "commands"), "plugin", `${plugin.name}:`, plugin.name));
  }
  const seen = new Set();
  return all.filter(c => seen.has(c.name) ? false : (seen.add(c.name), true)).map(c => ({
    ...c,
    description: c.description.replace(/[*`_]+/g, "").replace(/\s+/g, " ").trim()
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export { listClaudeConnections, listClaudeSlashCommands };
