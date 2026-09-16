/*
 * Stable stdio bridge for Bingo's dynamically allocated HTTP MCP server.
 *
 * MCP clients configure this process once.  Every request re-reads the small
 * discovery file written by the desktop app, so an app restart (and therefore
 * a new loopback port) does not require rewriting Claude/Codex/OpenCode/Grok
 * configuration.
 */
import fs from "node:fs/promises";
import readline from "node:readline";

const endpointFlag = process.argv.indexOf("--endpoint-file");
const endpointFile = endpointFlag >= 0 ? process.argv[endpointFlag + 1] : "";

let sessionId = "";
let sessionUrl = "";

function writeJson(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function rpcError(id, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32000, message },
  };
}

async function readEndpoint() {
  if (!endpointFile) throw new Error("Missing --endpoint-file");
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(endpointFile, "utf8"));
  } catch {
    throw new Error("Bingo is not running. Open the desktop app and try again.");
  }
  if (typeof parsed?.url !== "string") {
    throw new Error("Bingo MCP discovery file is invalid.");
  }
  const url = new URL(parsed.url);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    throw new Error("Refusing a non-loopback Bingo MCP endpoint.");
  }
  return url.toString();
}

function parseSse(body) {
  const messages = [];
  let data = [];
  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    if (!line && data.length) {
      try {
        messages.push(JSON.parse(data.join("\n")));
      } catch {}
      data = [];
    }
  }
  if (data.length) {
    try {
      messages.push(JSON.parse(data.join("\n")));
    } catch {}
  }
  return messages;
}

async function forward(message) {
  const url = await readEndpoint();
  if (url !== sessionUrl) {
    sessionUrl = url;
    sessionId = "";
  }
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  const protocolVersion = message?.params?.protocolVersion;
  if (typeof protocolVersion === "string") headers["mcp-protocol-version"] = protocolVersion;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(message),
  });
  const nextSessionId = response.headers.get("mcp-session-id");
  if (nextSessionId) sessionId = nextSessionId;
  const body = await response.text();
  if (!response.ok) {
    throw new Error(body || `Bingo MCP returned HTTP ${response.status}`);
  }
  if (!body) return [];
  if ((response.headers.get("content-type") || "").includes("text/event-stream")) {
    return parseSse(body);
  }
  try {
    return [JSON.parse(body)];
  } catch {
    throw new Error("Bingo MCP returned malformed JSON.");
  }
}

if (!endpointFile) {
  process.stderr.write("Usage: mcpBridge --endpoint-file <path>\n");
  process.exitCode = 2;
} else {
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  // Preserve request order. Some clients initialize and immediately send the
  // initialized notification; serial forwarding keeps the negotiated session.
  let chain = Promise.resolve();
  input.on("line", (line) => {
    if (!line.trim()) return;
    chain = chain.then(async () => {
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        writeJson(rpcError(null, "Invalid JSON received by Bingo MCP bridge."));
        return;
      }
      try {
        for (const response of await forward(message)) writeJson(response);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        if (message.id !== undefined) writeJson(rpcError(message.id, detail));
        else process.stderr.write(`[Bingo MCP] ${detail}\n`);
      }
    });
  });
}
