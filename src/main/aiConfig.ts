import { app } from "electron";
import { AgentStatusCache } from "./agentStatusCache";
import { broadcastToEditors } from "./windowManager";
import fs from "node:fs";
import path from "node:path";
import { discoverAgents, getAgentModels, getAgentStatus, normalizeAgentId } from "./agentRuntime";

import { AGENT_IDS, selectInstalledAgent } from "../shared/codingAgents";

const configPath = () => path.join(app.getPath("userData"), "ai-provider.json");

let cached = null;
let cachedMtime = 0;

function readConfig() {
  const file = configPath();
  let mtime = 0;
  try {
    mtime = fs.statSync(file).mtimeMs;
  } catch {
    // No file yet: that is the default state, not an error.
    cached = {};
    cachedMtime = 0;
    return cached;
  }
  if (cached && mtime === cachedMtime) return cached;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    cached = typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    cached = {};
  }
  cachedMtime = mtime;
  return cached;
}

function writeConfig(patch) {
  agentCatalogCache.invalidate();
  const next = { ...readConfig(), ...patch };
  // An empty string means "stop overriding", so drop the key entirely.
  for (const key of Object.keys(next)) {
    if (next[key] === "" || next[key] == null) delete next[key];
  }
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2));
  cached = next;
  try {
    cachedMtime = fs.statSync(configPath()).mtimeMs;
  } catch {
    cachedMtime = 0;
  }
  return next;
}

// Agent credentials, endpoints and model defaults belong to the installed CLI.
// Older override fields remain on disk for recovery, but are no longer injected.
function withAiEnv(env) { return env; }

const agentCatalogCache = new AgentStatusCache(async () => {
  const agents = await discoverAgents();
  return { agents, selectedAgent: selectInstalledAgent(agents, readConfig().agent) };
}, value => value.agents.some(agent => agent.installed));
async function getLocalAgents(force = false) { return agentCatalogCache.get(force); }

async function testProvider() {
  const { selectedAgent } = await getLocalAgents();
  if (!selectedAgent) return { ok: false, error: "No supported coding agent is installed." };
  const status = await getAgentStatus(selectedAgent);
  return status.installed && status.loggedIn
    ? { ok: true, detail: `${status.displayName} is ready.` }
    : { ok: false, error: `Run: ${status.loginCommand}` };
}

function registerAiConfig(ipcMainRef, options = {}) {
  // Both patched getShellEnv functions read this global. A global rather than an
  // import because one of them lives in packages/compiler, which must not depend
  // on the application. It is a deliberate, single seam — see RECOVERY.md.
  globalThis.__lunaAiEnv = withAiEnv;

  ipcMainRef.handle("agent:list", (_event, args) => getLocalAgents(args?.force === true));

  ipcMainRef.handle("agent:models", async (_event, args) => {
    if (!AGENT_IDS.includes(args?.agent)) throw new Error("Unsupported coding agent.");
    const catalog = await getLocalAgents();
    if (!catalog.agents.some(entry => entry.agent === args.agent && entry.installed)) {
      throw new Error("The selected coding agent is not installed.");
    }
    return { agent: args.agent, models: await getAgentModels(args.agent) };
  });

  ipcMainRef.handle("ai-config:get", () => {
    const config = readConfig();
    return {
      agent: normalizeAgentId(config.agent),
      autoSummarizeChats: config.autoSummarizeChats === true,
      boundedProjectContext: config.boundedProjectContext !== false,
      projectMemoryEnabled: config.projectMemoryEnabled !== false,
      path: configPath(),
    };
  });

  ipcMainRef.handle("ai-config:set", (_event, patch) => {
    const next = {};
    if (typeof patch?.agent === "string") {
      if (!AGENT_IDS.includes(patch.agent)) throw new Error("Unsupported coding agent.");
      next.agent = patch.agent;
    }
    if (typeof patch?.autoSummarizeChats === "boolean") next.autoSummarizeChats = patch.autoSummarizeChats;
    if (typeof patch?.boundedProjectContext === "boolean") next.boundedProjectContext = patch.boundedProjectContext;
    if (typeof patch?.projectMemoryEnabled === "boolean") next.projectMemoryEnabled = patch.projectMemoryEnabled;
    const updated = writeConfig(next);
    options.onChange?.(updated, patch);
    broadcastToEditors("ai-config:changed", undefined);
    return { ok: true, path: configPath() };
  });

  ipcMainRef.handle("ai-config:test", () => testProvider());
}

export {
  getLocalAgents,
  readConfig as getAiConfig,
  registerAiConfig,
  writeConfig as setAiConfig,
  withAiEnv,
};
