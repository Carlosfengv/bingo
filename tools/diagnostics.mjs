#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const INCIDENT_RE = /^inc_[0-9a-f-]{36}$/i;
const [, , command, ...argv] = process.argv;

function option(name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 && index + 1 < argv.length ? argv[index + 1] : fallback;
}

function incidentArgument() {
  return argv.find((value) => INCIDENT_RE.test(value));
}

function explicitDataDir() {
  const value = option("--data-dir", process.env.BINGO_DIAGNOSTICS_DIR);
  return value ? path.resolve(value) : null;
}

function candidateDataDirs() {
  const home = os.homedir();
  const bases = process.platform === "darwin"
    ? [path.join(home, "Library", "Application Support", "Bingo")]
    : process.platform === "win32"
      ? [path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), "Bingo")]
      : [path.join(process.env.XDG_CONFIG_HOME || path.join(home, ".config"), "Bingo")];
  return bases.flatMap((base) => [path.join(base, "diagnostics"), path.join(base, "dev", "diagnostics")]);
}

async function resolveDataDir(incidentId) {
  const explicit = explicitDataDir();
  if (explicit) return explicit;
  if (!incidentId) throw new Error("--data-dir is required when listing recent incidents.");
  const matches = [];
  for (const candidate of candidateDataDirs()) {
    try {
      await fs.access(path.join(candidate, "incidents", incidentId, "report.json"));
      matches.push(candidate);
      continue;
    } catch {}
    try {
      const entries = (await readJson(path.join(candidate, "tombstones.json"))).tombstones || [];
      if (entries.some((entry) => entry.incidentId === incidentId)) matches.push(candidate);
    } catch {}
  }
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`Incident exists in multiple stores. Pass --data-dir: ${matches.join(", ")}`);
  throw new Error("Incident was not found in Bingo's existing data directories. Pass --data-dir from the copied diagnostic info.");
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function report(dataDir, incidentId) {
  if (!INCIDENT_RE.test(incidentId || "")) throw new Error("A valid inc_<UUID> incident ID is required.");
  const file = path.join(dataDir, "incidents", incidentId, "report.json");
  const resolved = path.resolve(file);
  if (!resolved.startsWith(`${dataDir}${path.sep}`)) throw new Error("Incident path escaped the diagnostics directory.");
  try {
    return await readJson(resolved);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    try {
      const entries = (await readJson(path.join(dataDir, "tombstones.json"))).tombstones || [];
      const expired = entries.find((entry) => entry.incidentId === incidentId);
      if (expired) throw Object.assign(new Error(`EXPIRED: ${incidentId} was removed (${expired.reason}) at ${expired.deletedAt}`), { diagnosticCode: "EXPIRED" });
    } catch (tombstoneError) {
      if (tombstoneError.diagnosticCode) throw tombstoneError;
    }
    throw new Error(`NOT_FOUND: ${incidentId} is not present in this diagnostics store.`);
  }
}

async function readEvents(dataDir, incidentId) {
  const item = await report(dataDir, incidentId);
  const file = path.join(dataDir, "incidents", incidentId, "snapshots", item.evidence.snapshotId, "events.jsonl");
  let rows = [];
  try {
    rows = (await fs.readFile(file, "utf8")).split("\n").filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return { item, rows };
}

async function events(dataDir, incidentId) {
  const { rows } = await readEvents(dataDir, incidentId);
  const limit = Math.min(Math.max(Number(option("--limit", "50")) || 50, 1), 200);
  const cursor = Math.max(Number(option("--cursor", "0")) || 0, 0);
  const page = rows.slice(cursor, cursor + limit);
  return {
    incidentId,
    events: page,
    returnedCount: page.length,
    totalCount: rows.length,
    nextCursor: cursor + limit < rows.length ? String(cursor + limit) : null,
  };
}

async function recent(dataDir) {
  const root = path.join(dataDir, "incidents");
  const limit = Math.min(Math.max(Number(option("--limit", "20")) || 20, 1), 100);
  let names = [];
  try { names = await fs.readdir(root); } catch {}
  const rows = await Promise.all(names.filter((name) => INCIDENT_RE.test(name)).map((name) => report(dataDir, name).catch(() => null)));
  const projectKey = option("--project-key");
  const status = option("--status");
  const kind = option("--kind");
  const search = option("--search")?.toLowerCase();
  return rows.filter(Boolean)
    .filter((item) => !projectKey || item.projectKey === projectKey)
    .filter((item) => !status || item.status === status)
    .filter((item) => !kind || item.kind === kind)
    .filter((item) => !search || [item.incidentId, item.summary, item.projectName, item.category].some((value) => String(value || "").toLowerCase().includes(search)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(({ incidentId, createdAt, kind, status, projectName, summary, reportPath }) => ({ incidentId, createdAt, kind, status, projectName, summary, reportPath }));
}

async function bundle(dataDir, incidentId) {
  const { item, rows } = await readEvents(dataDir, incidentId);
  let context = {};
  try {
    context = await readJson(path.join(dataDir, "incidents", incidentId, "snapshots", item.evidence.snapshotId, "context.json"));
  } catch {}
  let store = {};
  try { store = await readJson(path.join(dataDir, "store.json")); } catch {}
  return {
    format: "bingo-diagnostic-bundle",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    originStoreId: store.storeId || null,
    report: item,
    context,
    events: rows,
    evidenceCompleteness: { returnedCount: rows.length, totalCount: rows.length, truncated: Boolean(item.evidence?.truncated) },
  };
}

async function main() {
  const incidentId = incidentArgument();
  const dataDir = await resolveDataDir(incidentId);
  let result;
  if (command === "show") result = await report(dataDir, incidentId);
  else if (command === "events") result = await events(dataDir, incidentId);
  else if (command === "recent") result = await recent(dataDir);
  else if (command === "bundle") result = await bundle(dataDir, incidentId);
  else throw new Error("Usage: diagnostics.mjs show|events|bundle <incident-id> [--data-dir <path>] [--limit N] [--cursor N]; recent [--project-key KEY] [--status STATUS] [--search TEXT]");
  const output = option("--output");
  if (output) await fs.writeFile(path.resolve(output), `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
  else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Diagnostics error: ${error.message}\n`);
  process.exitCode = 1;
});
