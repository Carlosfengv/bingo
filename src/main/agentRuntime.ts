import { ClientSideConnection, PROTOCOL_VERSION, ndJsonStream } from "@agentclientprotocol/sdk";
import { spawn, execFile } from "node:child_process";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable, Writable } from "node:stream";
import { promisify } from "node:util";
import { getShellEnv$1, isWindows, sanitizeShellOutput, userHome } from "./claudeBinary";

const execFileAsync = promisify(execFile);

import { AGENT_IDS, AGENT_INFO, normalizeAgentId, type AgentId, type AgentModel } from "../shared/codingAgents";
export { AGENT_IDS, AGENT_INFO, normalizeAgentId, type AgentId, type AgentModel } from "../shared/codingAgents";

export async function discoverAgents() {
  return Promise.all(AGENT_IDS.map(async (agent) => ({
    agent,
    displayName: AGENT_INFO[agent].name,
    installed: !!(await findAgentBinary(agent)),
    installCommand: AGENT_INFO[agent].install,
    loginCommand: AGENT_INFO[agent].login,
  })));
}

function executableExtensions() {
  return isWindows()
    ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)
    : [""];
}

async function isExecutable(candidate: string) {
  try {
    await fsPromises.access(candidate, fs.constants.X_OK);
    return (await fsPromises.stat(candidate)).isFile();
  } catch {
    return false;
  }
}

function knownAgentPaths(agent: AgentId) {
  const home = userHome();
  const command = AGENT_INFO[agent].command;
  const common = [
    path.join(home, ".local", "bin", command),
    path.join(home, ".bun", "bin", command),
    path.join(home, ".volta", "bin", command),
    path.join(home, `.${command}`, "bin", command),
    `/opt/homebrew/bin/${command}`,
    `/usr/local/bin/${command}`,
  ];
  if (agent === "codex" && process.platform === "darwin") {
    common.unshift("/Applications/Codex.app/Contents/Resources/codex", "/Applications/ChatGPT.app/Contents/Resources/codex");
  }
  if (isWindows()) {
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    common.push(
      path.join(appData, "npm", `${command}.cmd`),
      path.join(localAppData, "Programs", command, `${command}.exe`),
    );
  }
  return common;
}

export async function findAgentBinary(agent: AgentId) {
  const info = AGENT_INFO[agent];
  const shellEnv = await getShellEnv$1();
  for (const entry of String(shellEnv.PATH || process.env.PATH || "").split(isWindows() ? ";" : ":")) {
    if (!entry) continue;
    for (const extension of executableExtensions()) {
      const candidate = path.join(entry.replace(/^"|"$/g, ""), info.command + extension);
      if (await isExecutable(candidate)) return candidate;
    }
  }
  for (const candidate of knownAgentPaths(agent)) {
    if (await isExecutable(candidate)) return candidate;
  }
  return null;
}

function invocation(binary: string, args: string[]) {
  if (isWindows() && /\.(cmd|bat)$/i.test(binary)) {
    return { file: process.env.COMSPEC || "cmd.exe", args: ["/d", "/s", "/c", binary, ...args] };
  }
  return { file: binary, args };
}

export async function getAgentStatus(agentValue: unknown) {
  const agent = normalizeAgentId(agentValue);
  const info = AGENT_INFO[agent];
  const binary = await findAgentBinary(agent);
  if (!binary) {
    return { agent, displayName: info.name, installed: false, loggedIn: false, installCommand: info.install, loginCommand: info.login };
  }
  let version: string | undefined;
  try {
    const call = invocation(binary, ["--version"]);
    const { stdout, stderr } = await execFileAsync(call.file, call.args, {
      timeout: 5000,
      windowsHide: true,
      env: await getShellEnv$1(),
    });
    const clean = sanitizeShellOutput(String(stdout || stderr));
    version = clean.match(/\d+\.\d+\.\d+(?:[-+][\w.-]+)?/)?.[0] || clean || undefined;
  } catch {}

  let loggedIn = true;
  if (agent === "codex") {
    try {
      const call = invocation(binary, ["login", "status"]);
      await execFileAsync(call.file, call.args, { timeout: 8000, windowsHide: true, env: await getShellEnv$1() });
    } catch {
      loggedIn = false;
    }
  } else if (agent === "opencode") {
    try {
      const call = invocation(binary, ["auth", "list"]);
      const { stdout } = await execFileAsync(call.file, call.args, { timeout: 8000, windowsHide: true, env: await getShellEnv$1() });
      loggedIn = /\S/.test(sanitizeShellOutput(stdout));
    } catch {
      loggedIn = false;
    }
  } else if (agent === "grok") {
    // Grok Build versions do not expose one consistent auth-status command.
    // Let the first run return its actionable authentication error instead.
    loggedIn = true;
  }
  return { agent, displayName: info.name, installed: true, loggedIn, version, binary, installCommand: info.install, loginCommand: info.login };
}

function uniqueModels(models: AgentModel[]) {
  const seen = new Set<string>();
  return models.filter((model) => {
    if (!model.id || seen.has(model.id)) return false;
    seen.add(model.id);
    return true;
  });
}

function flattenAcpModelOptions(entries: any[]): any[] {
  return entries.flatMap((entry) => Array.isArray(entry?.options) ? flattenAcpModelOptions(entry.options) : [entry]);
}

async function listGrokModels(binary: string): Promise<AgentModel[]> {
  const call = invocation(binary, ["agent", "stdio"]);
  const child = spawn(call.file, call.args, {
    cwd: process.cwd(),
    shell: false,
    windowsHide: true,
    env: await getShellEnv$1(),
  });
  const output = Writable.toWeb(child.stdin) as WritableStream<Uint8Array>;
  const input = Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>;
  const connection = new ClientSideConnection(() => ({
    requestPermission() {
      return { outcome: { outcome: "cancelled" } };
    },
    sessionUpdate() {},
  }), ndJsonStream(output, input));

  const discovery = (async () => {
    await connection.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: {},
      clientInfo: { name: "Bingo", version: "0.0.146" },
    });
    const session = await connection.newSession({ cwd: process.cwd(), additionalDirectories: [], mcpServers: [] });
    const option = session.configOptions?.find((entry: any) => entry.category === "model" || /model/i.test(entry.name));
    if (option?.type !== "select") return [];
    return flattenAcpModelOptions(option.options || []).map((entry: any) => ({
      id: String(entry.value ?? entry.id ?? ""),
      label: String(entry.name ?? entry.label ?? entry.value ?? entry.id ?? ""),
      description: typeof entry.description === "string" ? entry.description : undefined,
    }));
  })();

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<AgentModel[]>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timed out while loading Grok models.")), 12_000);
    });
    return uniqueModels(await Promise.race([discovery, timeout]));
  } finally {
    if (timer) clearTimeout(timer);
    try { child.kill(); } catch {}
  }
}

export async function getAgentModels(agentValue: unknown): Promise<AgentModel[]> {
  const agent = normalizeAgentId(agentValue);
  if (agent === "claude") return [];
  const binary = await findAgentBinary(agent);
  if (!binary) throw new Error(`${AGENT_INFO[agent].name} is not installed.`);

  if (agent === "grok") return listGrokModels(binary);

  const args = agent === "codex" ? ["debug", "models"] : ["models"];
  const call = invocation(binary, args);
  const { stdout, stderr } = await execFileAsync(call.file, call.args, {
    timeout: 20_000,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
    env: await getShellEnv$1(),
  });

  if (agent === "codex") {
    const parsed = JSON.parse(String(stdout));
    const models = Array.isArray(parsed) ? parsed : parsed?.models;
    if (!Array.isArray(models)) throw new Error("Codex returned an invalid model catalog.");
    return uniqueModels(models
      .filter((entry: any) => entry?.slug && entry?.visibility !== "hide")
      .sort((a: any, b: any) => (a.priority ?? 999) - (b.priority ?? 999))
      .map((entry: any) => ({
        id: String(entry.slug),
        label: String(entry.display_name || entry.slug),
        description: typeof entry.description === "string" ? entry.description : undefined,
      })));
  }

  const lines = sanitizeShellOutput(String(stdout || stderr)).split(/\r?\n/).map((line) => line.trim());
  return uniqueModels(lines
    .filter((line) => /^[^\s/]+\/[^\s]+$/.test(line))
    .map((id) => ({ id, label: id, provider: id.split("/", 1)[0] })));
}

export type AgentEvent =
  | { type: "text"; content: string }
  | { type: "thinking"; content: string }
  | { type: "tool_activity"; name: string; input?: unknown; id?: string }
  | { type: "debug"; message: string };

export type AgentRunOptions = {
  agent: AgentId;
  prompt: string;
  model?: string;
  effort?: string;
  workDir: string;
  extraDirs?: string[];
  mcpUrl?: string;
  images?: Array<{ base64: string; mediaType: string }>;
  autoApprove?: boolean;
  emit: (event: AgentEvent) => void;
  onSpawn: (process: ReturnType<typeof spawn>) => void;
};

function textFromContent(content: unknown) {
  if (!content || typeof content !== "object") return "";
  const block = content as Record<string, unknown>;
  return block.type === "text" && typeof block.text === "string" ? block.text : "";
}

function parseCodexEvent(event: any, emit: AgentRunOptions["emit"]) {
  const item = event?.item;
  if (event?.type === "item.completed" && item) {
    if (item.type === "agent_message" && typeof item.text === "string") emit({ type: "text", content: item.text });
    else if (item.type === "reasoning" && typeof item.text === "string") emit({ type: "thinking", content: item.text });
  } else if (event?.type === "item.started" && item && !["agent_message", "reasoning"].includes(item.type)) {
    emit({ type: "tool_activity", name: item.name || item.tool || item.type || "tool", input: item.command || item.arguments || item.input, id: item.id });
  }
}

function parseOpenCodeEvent(event: any, emit: AgentRunOptions["emit"]) {
  const part = event?.part || event?.data?.part || event;
  if ((event?.type === "text" || part?.type === "text") && typeof part?.text === "string") {
    emit({ type: "text", content: part.text });
  } else if ((part?.type === "reasoning" || part?.type === "thinking") && typeof part?.text === "string") {
    emit({ type: "thinking", content: part.text });
  } else if (["tool", "tool_use", "tool_call"].includes(part?.type)) {
    emit({ type: "tool_activity", name: part.tool || part.name || "tool", input: part.state?.input || part.input, id: part.callID || part.id });
  }
}

async function writeTempImages(images: AgentRunOptions["images"]) {
  if (!images?.length) return { dir: "", files: [] as string[] };
  const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "bingo-agent-images-"));
  const files: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const ext = images[i].mediaType.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const file = path.join(dir, `image-${i + 1}.${ext}`);
    await fsPromises.writeFile(file, Buffer.from(images[i].base64, "base64"));
    files.push(file);
  }
  return { dir, files };
}

async function runJsonProcess(options: AgentRunOptions, binary: string, args: string[], parser: (event: any, emit: AgentRunOptions["emit"]) => void, envPatch?: Record<string, string>) {
  const call = invocation(binary, args);
  const child = spawn(call.file, call.args, {
    cwd: options.workDir,
    shell: false,
    windowsHide: true,
    env: { ...(await getShellEnv$1()), ...envPatch },
  });
  options.onSpawn(child);
  child.stdin.end();
  return new Promise<void>((resolve, reject) => {
    let buffer = "";
    let stderr = "";
    let structuredError = "";
    child.stdout.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event?.type === "error") structuredError += `${event.error?.data?.message || event.error?.message || event.message || line}\n`;
          else parser(event, options.emit);
        } catch { stderr += line + "\n"; }
      }
    });
    child.stderr.on("data", (data) => { stderr += data.toString(); });
    child.once("error", reject);
    child.once("close", (code) => {
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (event?.type === "error") structuredError += event.error?.data?.message || event.error?.message || event.message || buffer;
          else parser(event, options.emit);
        } catch { stderr += buffer; }
      }
      if (code === 0 && !structuredError.trim()) resolve();
      else reject(new Error(structuredError.trim() || stderr.trim() || `${AGENT_INFO[options.agent].name} exited with code ${code}`));
    });
  });
}

async function runCodex(options: AgentRunOptions, binary: string) {
  const temp = await writeTempImages(options.images);
  try {
    const args = [
      "exec", "--json", "--skip-git-repo-check", "--sandbox", options.autoApprove === false ? "read-only" : "workspace-write",
      "-C", options.workDir,
      ...(!options.mcpUrl ? ["--ignore-user-config"] : []),
      ...(options.mcpUrl ? [
        "-c", `mcp_servers.bingo.url=${JSON.stringify(options.mcpUrl)}`,
        "-c", "mcp_servers.bingo.enabled=true",
        "-c", 'mcp_servers.bingo.default_tools_approval_mode="approve"',
      ] : []),
      ...(options.extraDirs?.flatMap((dir) => ["--add-dir", dir]) || []),
      ...(options.model ? ["--model", options.model] : []),
      ...(temp.files.length ? ["--image", ...temp.files] : []),
      "-",
    ];
    const call = invocation(binary, args);
    const child = spawn(call.file, call.args, { cwd: options.workDir, shell: false, windowsHide: true, env: await getShellEnv$1() });
    options.onSpawn(child);
    child.stdin.end(options.prompt);
    await new Promise<void>((resolve, reject) => {
      let buffer = "";
      let stderr = "";
      child.stdout.on("data", (data) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) if (line.trim()) {
          try { parseCodexEvent(JSON.parse(line), options.emit); } catch { stderr += line + "\n"; }
        }
      });
      child.stderr.on("data", (data) => { stderr += data.toString(); });
      child.once("error", reject);
      child.once("close", (code) => code === 0 ? resolve() : reject(new Error(stderr.trim() || `Codex CLI exited with code ${code}`)));
    });
  } finally {
    if (temp.dir) await fsPromises.rm(temp.dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runOpenCode(options: AgentRunOptions, binary: string) {
  const temp = await writeTempImages(options.images);
  try {
    const config = options.mcpUrl ? {
      mcp: { bingo: { type: "remote", url: options.mcpUrl, enabled: true } },
    } : {};
    const args = [
      "run", "--format", "json", "--dir", options.workDir,
      ...(!options.mcpUrl ? ["--pure"] : []),
      ...(options.autoApprove === false ? [] : ["--auto"]),
      ...(options.model ? ["--model", options.model] : []),
      ...(options.effort ? ["--variant", options.effort] : []),
      ...temp.files.flatMap((file) => ["--file", file]),
      options.prompt,
    ];
    await runJsonProcess(options, binary, args, parseOpenCodeEvent, {
      OPENCODE_CONFIG_CONTENT: JSON.stringify(config),
    });
  } finally {
    if (temp.dir) await fsPromises.rm(temp.dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runGrokAcp(options: AgentRunOptions, binary: string) {
  const args = ["agent", ...(options.autoApprove === false ? [] : ["--always-approve"]), "stdio"];
  const call = invocation(binary, args);
  const child = spawn(call.file, call.args, {
    cwd: options.workDir,
    shell: false,
    windowsHide: true,
    env: await getShellEnv$1(),
  });
  options.onSpawn(child);
  let stderr = "";
  child.stderr.on("data", (data) => { stderr += data.toString(); });
  const output = Writable.toWeb(child.stdin) as WritableStream<Uint8Array>;
  const input = Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>;
  const connection = new ClientSideConnection(() => ({
    requestPermission(params: any) {
      const allowed = options.autoApprove === false
        ? params.options.find((option: any) => option.kind === "reject_once")
        : params.options.find((option: any) => option.kind === "allow_always") || params.options.find((option: any) => option.kind === "allow_once");
      return allowed ? { outcome: { outcome: "selected", optionId: allowed.optionId } } : { outcome: { outcome: "cancelled" } };
    },
    sessionUpdate(params: any) {
      const update = params.update;
      if (update.sessionUpdate === "agent_message_chunk") {
        const content = textFromContent(update.content);
        if (content) options.emit({ type: "text", content });
      } else if (update.sessionUpdate === "agent_thought_chunk") {
        const content = textFromContent(update.content);
        if (content) options.emit({ type: "thinking", content });
      } else if (update.sessionUpdate === "tool_call") {
        options.emit({ type: "tool_activity", name: update.name || update.title || "tool", input: update.rawInput, id: update.toolCallId });
      }
    },
  }), ndJsonStream(output, input));
  try {
    await connection.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: {},
      clientInfo: { name: "Bingo", version: "0.0.146" },
    });
    const session = await connection.newSession({
      cwd: options.workDir,
      additionalDirectories: options.extraDirs || [],
      mcpServers: options.mcpUrl ? [{ name: "bingo", type: "http", url: options.mcpUrl, headers: [] }] : [],
    });
    if (options.model) {
      const modelOption = session.configOptions?.find((option: any) => option.category === "model" || /model/i.test(option.name));
      if (modelOption?.type !== "select") throw new Error("This Grok CLI session does not expose model selection.");
      const values = flattenAcpModelOptions(modelOption.options || []);
      const selected = values.find((entry: any) => entry.value === options.model || entry.name === options.model);
      if (!selected) throw new Error(`Grok model "${options.model}" is not available in this session.`);
      await connection.setSessionConfigOption({ sessionId: session.sessionId, configId: modelOption.id, value: selected.value });
    }
    const prompt: any[] = (options.images || []).map((image) => ({ type: "image", data: image.base64, mimeType: image.mediaType }));
    prompt.push({ type: "text", text: options.prompt });
    await connection.prompt({ sessionId: session.sessionId, prompt });
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}${stderr.trim() ? `\n${stderr.trim()}` : ""}`);
  } finally {
    try { child.kill(); } catch {}
  }
}

export async function runAgent(options: AgentRunOptions) {
  if (options.agent === "claude") throw new Error("Claude is handled by the legacy adapter");
  const binary = await findAgentBinary(options.agent);
  if (!binary) throw new Error(`${AGENT_INFO[options.agent].name} is not installed. ${AGENT_INFO[options.agent].install}`);
  options.emit({ type: "debug", message: `agent: ${options.agent}` });
  if (options.agent === "codex") return runCodex(options, binary);
  if (options.agent === "opencode") return runOpenCode(options, binary);
  return runGrokAcp(options, binary);
}
