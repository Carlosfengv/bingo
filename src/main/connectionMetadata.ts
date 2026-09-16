/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: src/main/connectionMetadata.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { Client } from "@modelcontextprotocol/sdk/client";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import * as node_crypto from "node:crypto";

function cleanTitle(value) {
  if (typeof value !== "string") return void 0;
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || void 0;
}
/** Expand only the environment placeholders supported by connection configuration. */
function expand(value, pluginRoot) {
  return value.replace(/\$\{([\w]+)(?::-([^}]*))?\}/g, (_, key, fallback) => {
    const replacement = key === "CLAUDE_PLUGIN_ROOT" ? pluginRoot : process.env[key];
    if (replacement !== void 0) return replacement;
    if (fallback !== void 0) return fallback;
    throw new Error("Missing connection environment variable");
  });
}
function expandValues(values = {}, pluginRoot) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, expand(value, pluginRoot)]));
}
/** Read initialization metadata only: never list/call tools or start an OAuth flow. */
async function readConnectionTitle(config, cwd, pluginRoot, timeoutMs = 2e3) {
  const configuredTitle = cleanTitle(config.title);
  if (configuredTitle) return configuredTitle;
  const client = new Client({
    name: "bingo-connection-labels",
    version: "1.0.0"
  }, {
    capabilities: {}
  });
  const controller = new AbortController();
  let transport;
  const timer = setTimeout(() => {
    controller.abort();
    client.close().catch(() => {});
  }, timeoutMs);
  try {
    if (config.url) {
      const url = new URL(expand(config.url, pluginRoot));
      if (url.protocol !== "http:" && url.protocol !== "https:") return void 0;
      const options = {
        requestInit: {
          headers: expandValues(config.headers, pluginRoot)
        },
        fetch: (input, init) => fetch(input, {
          ...init,
          redirect: "error",
          signal: init?.signal ? AbortSignal.any([controller.signal, init.signal]) : controller.signal
        })
      };
      transport = config.type === "sse" ? new SSEClientTransport(url, options) : new StreamableHTTPClientTransport(url, options);
    } else if (config.command) transport = new StdioClientTransport({
      command: expand(config.command, pluginRoot),
      args: config.args?.map(arg => expand(arg, pluginRoot)),
      env: {
        ...getDefaultEnvironment(),
        ...expandValues(config.env, pluginRoot)
      },
      cwd,
      stderr: "ignore"
    });else return void 0;
    await client.connect(transport, {
      signal: controller.signal,
      timeout: timeoutMs
    });
    return cleanTitle(client.getServerVersion()?.title);
  } catch {
    return;
  } finally {
    clearTimeout(timer);
    if (transport instanceof StreamableHTTPClientTransport && !controller.signal.aborted) {
      const cleanup = setTimeout(() => controller.abort(), 250);
      try {
        await transport.terminateSession();
      } catch {} finally {
        clearTimeout(cleanup);
      }
    }
    await client.close().catch(() => {});
  }
}
/** Cache by complete configuration and cwd, including failed lookups, without exposing secrets. */
function createConnectionTitleCache(readTitle = readConnectionTitle) {
  const entries = new Map();
  return (config, cwd, pluginRoot) => {
    const key = (0, node_crypto.createHash)("sha256").update(JSON.stringify([config, cwd, pluginRoot])).digest("hex");
    const cached = entries.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    for (const [oldKey, entry] of entries) if (entry.expires <= Date.now()) entries.delete(oldKey);
    const value = readTitle(config, cwd, pluginRoot).catch(() => void 0);
    entries.set(key, {
      expires: Date.now() + 3e5,
      value
    });
    return value;
  };
}

export { createConnectionTitleCache };
