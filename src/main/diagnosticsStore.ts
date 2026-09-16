import { app } from "electron";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { selectIncidentEvents } from "./diagnosticCorrelation";

const SCHEMA_VERSION = 1;
const MAX_EVENT_BYTES = 32 * 1024;
const MAX_SNAPSHOT_EVENTS = 500;
const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
const MAX_RECENT_EVENTS = 2_000;
const MAX_EVENT_FILE_BYTES = 5 * 1024 * 1024;
const MAX_EVENTS_TOTAL_BYTES = 100 * 1024 * 1024;
const MAX_INCIDENTS_TOTAL_BYTES = 200 * 1024 * 1024;
const MAX_TOMBSTONES = 5_000;
const MAX_PENDING_EVENT_WRITES = 5_000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const INCIDENT_RE = /^inc_[0-9a-f-]{36}$/i;
const appSessionId = `app_${crypto.randomUUID()}`;

let sequence = 0;
let writeQueue = Promise.resolve();
const recentEvents: any[] = [];
const emergencyWriteFailures: any[] = [];
const submissionIds = new Map<string, string>();
let lastCleanupAt = 0;
let pendingEventWrites = 0;
let droppedEventWrites = 0;

function diagnosticsRoot() {
  return path.join(app.getPath("userData"), "diagnostics");
}

function projectKey(projectId?: string | null) {
  if (!projectId) return null;
  return crypto.createHash("sha256").update(path.resolve(projectId)).digest("hex").slice(0, 32);
}

function cleanString(value: unknown, limit = 16_384) {
  if (value == null) return value;
  const text = String(value)
    .replace(/(authorization|cookie|token|password|secret|api[-_]?key)\s*[:=]\s*([^\s,;]+)/gi, "$1=[REDACTED]")
    .replace(/(?:sk|pk)-[A-Za-z0-9_-]{16,}/g, "[REDACTED_KEY]");
  return text.length > limit ? `${text.slice(0, limit)}…[truncated]` : text;
}

function sanitize(value: any, depth = 0): any {
  if (depth > 6) return "[depth-limited]";
  if (typeof value === "string") return cleanString(value);
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) {
    return {
      name: cleanString(value.name, 256),
      message: cleanString(value.message),
      stack: cleanString(value.stack, 24_576),
      cause: sanitize((value as any).cause, depth + 1),
    };
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((entry) => sanitize(entry, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, entry] of Object.entries(value).slice(0, 100)) {
      if (/^(authorization|cookie|password|secret|token|api[-_]?key)$/i.test(key)) out[key] = "[REDACTED]";
      else if (/url/i.test(key) && typeof entry === "string") {
        try {
          const url = new URL(entry);
          url.search = "";
          url.hash = "";
          out[key] = url.toString();
        } catch {
          out[key] = cleanString(entry);
        }
      } else out[key] = sanitize(entry, depth + 1);
    }
    return out;
  }
  return cleanString(value);
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function atomicJson(file: string, value: unknown) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.promises.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.promises.rename(temporary, file);
}

async function appendJsonl(file: string, value: unknown) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  let line = JSON.stringify(value);
  if (Buffer.byteLength(line) > MAX_EVENT_BYTES) {
    line = JSON.stringify({
      ...(value as any),
      payload: { summary: cleanString(JSON.stringify((value as any).payload), 8_192), truncated: true },
    });
  }
  await fs.promises.appendFile(file, `${line}\n`, { mode: 0o600 });
}

async function treeSize(target: string): Promise<number> {
  try {
    const stat = await fs.promises.stat(target);
    if (!stat.isDirectory()) return stat.size;
    const names = await fs.promises.readdir(target);
    return (await Promise.all(names.map((name) => treeSize(path.join(target, name))))).reduce((sum, size) => sum + size, 0);
  } catch {
    return 0;
  }
}

async function tombstones() {
  try {
    const value = JSON.parse(await fs.promises.readFile(path.join(diagnosticsRoot(), "tombstones.json"), "utf8"));
    return Array.isArray(value?.tombstones) ? value.tombstones : [];
  } catch {
    return [];
  }
}

async function addTombstone(incidentId: string, reason: string) {
  if (!INCIDENT_RE.test(incidentId)) return;
  const entries = await tombstones();
  const cutoff = Date.now() - 90 * 86_400_000;
  const next = [{ incidentId, deletedAt: new Date().toISOString(), reason }, ...entries.filter((entry: any) => entry.incidentId !== incidentId && Date.parse(entry.deletedAt) >= cutoff)]
    .slice(0, MAX_TOMBSTONES);
  await atomicJson(path.join(diagnosticsRoot(), "tombstones.json"), { schemaVersion: SCHEMA_VERSION, tombstones: next });
}

export async function sourceFingerprint(projectId?: string | null) {
  if (!projectId) return null;
  const root = path.resolve(projectId);
  const names = ["package.json", "pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock", "bun.lockb"];
  const parts: string[] = [];
  for (const name of names) {
    const file = path.join(root, name);
    try {
      const stat = await fs.promises.stat(file);
      if (!stat.isFile()) continue;
      const body = await fs.promises.readFile(file);
      parts.push(`${name}:${stat.size}:${crypto.createHash("sha256").update(body).digest("hex")}`);
    } catch {}
  }
  if (!parts.length) return null;
  return {
    algorithm: "sha256",
    value: crypto.createHash("sha256").update(parts.join("\n")).digest("hex"),
    files: parts.map((entry) => entry.split(":", 1)[0]),
  };
}

async function oldestChildren(root: string) {
  let names: string[] = [];
  try { names = await fs.promises.readdir(root); } catch { return []; }
  return (await Promise.all(names.map(async (name) => {
    const target = path.join(root, name);
    try {
      const stat = await fs.promises.stat(target);
      return { name, target, mtimeMs: stat.mtimeMs, size: await treeSize(target) };
    } catch {
      return null;
    }
  }))).filter(Boolean).sort((a: any, b: any) => a.mtimeMs - b.mtimeMs) as any[];
}

async function trimFolder(root: string, maxBytes: number, reason: string, incidentFolders = false) {
  const entries = await oldestChildren(root);
  let total = entries.reduce((sum, entry) => sum + entry.size, 0);
  for (const entry of entries) {
    if (total <= maxBytes) break;
    if (incidentFolders) await addTombstone(entry.name, reason);
    await fs.promises.rm(entry.target, { recursive: true, force: true });
    total -= entry.size;
  }
}

async function cleanupDiagnostics() {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;
  for (const [folder, maxAge] of [["events", 7 * 86_400_000], ["incidents", 30 * 86_400_000]] as const) {
    const root = path.join(diagnosticsRoot(), folder);
    let names: string[] = [];
    try { names = await fs.promises.readdir(root); } catch { continue; }
    for (const name of names) {
      const target = path.join(root, name);
      try {
        const stat = await fs.promises.stat(target);
        if (now - stat.mtimeMs > maxAge) {
          if (folder === "incidents") await addTombstone(name, "retention_age");
          await fs.promises.rm(target, { recursive: true, force: true });
        }
      } catch {}
    }
  }
  await trimFolder(path.join(diagnosticsRoot(), "events"), MAX_EVENTS_TOTAL_BYTES, "capacity");
  await trimFolder(path.join(diagnosticsRoot(), "incidents"), MAX_INCIDENTS_TOTAL_BYTES, "capacity", true);
}

async function ensureStoreMetadata() {
  const file = path.join(diagnosticsRoot(), "store.json");
  try { await fs.promises.access(file); } catch { await atomicJson(file, diagnosticInfo()); }
}

async function updateIndex(report: any) {
  const file = path.join(diagnosticsRoot(), "index.json");
  let current: any = { schemaVersion: SCHEMA_VERSION, incidents: [] };
  try { current = JSON.parse(await fs.promises.readFile(file, "utf8")); } catch {}
  const summary = {
    incidentId: report.incidentId,
    createdAt: report.createdAt,
    kind: report.kind,
    status: report.status,
    projectKey: report.projectKey,
    projectName: report.projectName,
    summary: report.summary,
    submissionKey: report.submissionKey,
  };
  current.incidents = [summary, ...(current.incidents || []).filter((entry: any) => entry.incidentId !== report.incidentId)].slice(0, 5_000);
  await atomicJson(file, current);
}

export function diagnosticInfo() {
  return {
    schemaVersion: SCHEMA_VERSION,
    storeId: crypto.createHash("sha256").update(diagnosticsRoot()).digest("hex").slice(0, 16),
    appSessionId,
    dataDir: diagnosticsRoot(),
    retention: {
      rollingDays: 7,
      rollingMaxBytes: MAX_EVENTS_TOTAL_BYTES,
      incidentDays: 30,
      incidentMaxBytes: MAX_INCIDENTS_TOTAL_BYTES,
      snapshotMaxBytes: MAX_SNAPSHOT_BYTES,
      tombstoneDays: 90,
    },
    storeHealth: {
      pendingEventWrites,
      droppedEventWrites,
      emergencyWriteFailureCount: emergencyWriteFailures.length,
      lastWriteFailure: emergencyWriteFailures.at(-1) || null,
    },
  };
}

async function rollingEventFile() {
  const dir = path.join(diagnosticsRoot(), "events", appSessionId);
  await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
  let names: string[] = [];
  try { names = await fs.promises.readdir(dir); } catch {}
  const indexes = names.flatMap((name) => {
    const match = /^events(?:\.(\d+))?\.jsonl$/.exec(name);
    return match ? [Number(match[1] || 0)] : [];
  });
  let index = indexes.length ? Math.max(...indexes) : 0;
  let file = path.join(dir, index ? `events.${index}.jsonl` : "events.jsonl");
  try {
    if ((await fs.promises.stat(file)).size >= MAX_EVENT_FILE_BYTES) {
      index += 1;
      file = path.join(dir, `events.${index}.jsonl`);
    }
  } catch {}
  return file;
}

export function recordDiagnosticEvent(input: any) {
  const event = sanitize({
    schemaVersion: SCHEMA_VERSION,
    eventId: `evt_${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    receivedSequence: ++sequence,
    appSessionId,
    level: input?.level || "info",
    source: input?.source || "app",
    eventName: input?.eventName || "diagnostic.event",
    projectKey: projectKey(input?.projectId),
    projectId: input?.projectId || null,
    runId: input?.runId || null,
    attemptId: input?.attemptId || null,
    operationId: input?.operationId || null,
    parentOperationId: input?.parentOperationId || null,
    chatId: input?.chatId || null,
    durationMs: input?.durationMs ?? null,
    payload: input?.payload || {},
  });
  recentEvents.push(event);
  if (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.splice(0, recentEvents.length - MAX_RECENT_EVENTS);
  if (pendingEventWrites >= MAX_PENDING_EVENT_WRITES && (event.level === "debug" || event.level === "info")) {
    droppedEventWrites += 1;
    return Promise.resolve({ ...event, persistence: "dropped", reason: "write_queue_overload" });
  }
  pendingEventWrites += 1;
  return enqueue(async () => {
    await cleanupDiagnostics();
    await ensureStoreMetadata();
    const file = await rollingEventFile();
    await appendJsonl(file, event);
    return event;
  }).catch((error) => {
    emergencyWriteFailures.push({ timestamp: new Date().toISOString(), message: cleanString(error?.message || error, 1_000) });
    if (emergencyWriteFailures.length > 100) emergencyWriteFailures.shift();
    return { ...event, persistence: "failed" };
  }).finally(() => {
    pendingEventWrites = Math.max(0, pendingEventWrites - 1);
  });
}

function normalizedError(input: any) {
  const error = input?.error;
  if (!error) return null;
  if (typeof error === "string") return { name: "Error", message: cleanString(error), stack: null, cause: null };
  return sanitize({
    code: error.code || input?.code || null,
    name: error.name || "Error",
    message: error.message || String(error),
    stack: error.stack || null,
    cause: error.cause || null,
    location: error.location || null,
  });
}

function boundedSnapshot(events: any[]) {
  const selected: any[] = [];
  let bytes = 0;
  for (let index = events.length - 1; index >= 0 && selected.length < MAX_SNAPSHOT_EVENTS; index -= 1) {
    const lineBytes = Buffer.byteLength(JSON.stringify(events[index])) + 1;
    if (selected.length && bytes + lineBytes > MAX_SNAPSHOT_BYTES) break;
    if (lineBytes > MAX_SNAPSHOT_BYTES) continue;
    selected.unshift(events[index]);
    bytes += lineBytes;
  }
  return { events: selected, bytes, truncated: selected.length < events.length };
}

function incidentDir(incidentId: string) {
  if (!INCIDENT_RE.test(incidentId)) throw Object.assign(new Error("Invalid incident id"), { code: "INVALID_ID" });
  return path.join(diagnosticsRoot(), "incidents", incidentId);
}

async function incidentForSubmission(submissionKey: string, pKey: string | null) {
  const lookupKey = `${pKey || "app"}:${submissionKey}`;
  const inMemory = submissionIds.get(lookupKey);
  if (inMemory) return inMemory;
  let names: string[] = [];
  try { names = await fs.promises.readdir(path.join(diagnosticsRoot(), "incidents")); } catch {}
  for (const name of names) {
    if (!INCIDENT_RE.test(name)) continue;
    try {
      const report = JSON.parse(await fs.promises.readFile(path.join(incidentDir(name), "report.json"), "utf8"));
      if (report.submissionKey === submissionKey && report.projectKey === pKey) {
        submissionIds.set(lookupKey, name);
        return name;
      }
    } catch {}
  }
  return null;
}

export function createIncident(input: any) {
  return enqueue(async () => {
    await cleanupDiagnostics();
    await ensureStoreMetadata();
    const submissionKey = typeof input?.submissionKey === "string" ? input.submissionKey.slice(0, 200) : null;
    const pKey = projectKey(input?.projectId);
    const known = submissionKey && await incidentForSubmission(submissionKey, pKey);
    if (known) return getIncident(known);

    const incidentId = `inc_${crypto.randomUUID()}`;
    const snapshotId = `snapshot_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const fingerprint = await sourceFingerprint(input?.projectId);
    const selection = selectIncidentEvents(recentEvents, input, pKey, appSessionId);
    const allRelated = selection.events;
    const snapshot = boundedSnapshot(allRelated);
    const related = snapshot.events;
    const dir = incidentDir(incidentId);
    const snapshotDir = path.join(dir, "snapshots", snapshotId);
    const reportPath = path.join(dir, "report.json");
    const report = sanitize({
      schemaVersion: SCHEMA_VERSION,
      incidentId,
      kind: input?.kind || (input?.error ? "error" : "feedback"),
      category: input?.category || "general",
      severity: input?.severity || (input?.error ? "error" : "info"),
      status: "open",
      createdAt,
      appSessionId,
      projectKey: pKey,
      projectName: input?.projectName || (input?.projectId ? path.basename(input.projectId) : null),
      runId: input?.runId || null,
      relatedRuns: [...new Set([input?.runId, ...related.map((event) => event.runId)].filter(Boolean))],
      attemptId: input?.attemptId || null,
      operationId: input?.operationId || null,
      chatId: input?.chatId || null,
      summary: cleanString(input?.summary || input?.message || input?.error?.message || "Problem reported", 2_000),
      userDescription: cleanString(input?.userDescription || input?.message || null, 4_000),
      error: normalizedError(input),
      environment: {
        appVersion: app.getVersion(),
        buildId: process.env.BINGO_BUILD_ID || app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        agent: input?.agent || null,
        model: input?.model || null,
        projectFingerprint: fingerprint,
      },
      evidence: {
        eventIds: related.map((event) => event.eventId),
        snapshotId,
        from: related[0]?.timestamp || createdAt,
        to: related.at(-1)?.timestamp || createdAt,
        captureStatus: related.length && !snapshot.truncated ? "complete" : "partial",
        missing: related.length ? snapshot.truncated ? ["snapshot_truncated"] : [] : ["no_related_events"],
        byteSize: snapshot.bytes,
        truncated: snapshot.truncated,
      },
      submissionKey,
      reportPath,
      resolution: selection.recovery ? {
        ...selection.recovery,
        recordedAt: createdAt
      } : null,
      verification: null,
    });
    report.evidence.eventIds = related.map((event) => event.eventId).filter(Boolean);
    await fs.promises.mkdir(snapshotDir, { recursive: true, mode: 0o700 });
    await fs.promises.writeFile(path.join(snapshotDir, "events.jsonl"), related.map((event) => JSON.stringify(event)).join("\n") + (related.length ? "\n" : ""), { mode: 0o600 });
    await atomicJson(path.join(snapshotDir, "context.json"), sanitize({ projectId: input?.projectId || null, ...input?.context }));
    await atomicJson(reportPath, report);
    await updateIndex(report);
    if (submissionKey) submissionIds.set(`${pKey || "app"}:${submissionKey}`, incidentId);
    return report;
  });
}

export async function getIncident(incidentId: string) {
  try {
    return JSON.parse(await fs.promises.readFile(path.join(incidentDir(incidentId), "report.json"), "utf8"));
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      const expired = (await tombstones()).find((entry: any) => entry.incidentId === incidentId);
      if (expired) throw Object.assign(new Error(`Incident ${incidentId} expired (${expired.reason})`), { code: "EXPIRED", details: expired });
      throw Object.assign(new Error(`Incident ${incidentId} was not found`), { code: "NOT_FOUND" });
    }
    if (error instanceof SyntaxError) throw Object.assign(new Error(`Incident ${incidentId} is corrupt`), { code: "CORRUPT_REPORT" });
    throw error;
  }
}

export async function getIncidentEvents(incidentId: string, options: any = {}) {
  const report = await getIncident(incidentId);
  const file = path.join(incidentDir(incidentId), "snapshots", report.evidence.snapshotId, "events.jsonl");
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const offset = Math.max(Number(options.cursor) || 0, 0);
  let entries: any[] = [];
  try {
    entries = (await fs.promises.readFile(file, "utf8")).split("\n").filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }
  entries = entries.filter((entry) => !options.source || entry.source === options.source)
    .filter((entry) => !options.level || entry.level === options.level)
    .filter((entry) => !options.runId || entry.runId === options.runId);
  const page: any[] = [];
  let responseBytes = 0;
  const maxResponseBytes = 128 * 1024;
  for (const entry of entries.slice(offset, offset + limit)) {
    const bytes = Buffer.byteLength(JSON.stringify(entry));
    if (page.length && responseBytes + bytes > maxResponseBytes) break;
    page.push(entry);
    responseBytes += bytes;
  }
  const nextOffset = offset + page.length;
  return {
    incidentId,
    events: page,
    returnedCount: page.length,
    nextCursor: nextOffset < entries.length ? String(nextOffset) : null,
    totalCount: entries.length,
    truncated: nextOffset < Math.min(offset + limit, entries.length),
  };
}

export async function listIncidents(options: any = {}) {
  const root = path.join(diagnosticsRoot(), "incidents");
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
  let names: string[] = [];
  try { names = await fs.promises.readdir(root); } catch {}
  const reports = (await Promise.all(names.filter((name) => INCIDENT_RE.test(name)).map((name) => getIncident(name).catch(() => null))))
    .filter(Boolean)
    .filter((report: any) => !options.strictProject && !options.projectId || report.projectKey === projectKey(options.projectId))
    .filter((report: any) => !options.kind || report.kind === options.kind)
    .filter((report: any) => !options.status || report.status === options.status)
    .filter((report: any) => !options.since || report.createdAt >= options.since)
    .filter((report: any) => {
      if (!options.search) return true;
      const needle = String(options.search).toLowerCase();
      return [report.incidentId, report.summary, report.projectName, report.category]
        .some((value) => String(value || "").toLowerCase().includes(needle));
    })
    .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((report: any) => ({ incidentId: report.incidentId, createdAt: report.createdAt, kind: report.kind, status: report.status, projectName: report.projectName, summary: report.summary }));
  return reports;
}

export function updateIncident(incidentId: string, patch: any) {
  return enqueue(async () => {
    const report = await getIncident(incidentId);
    const allowedStatus = new Set(["open", "investigating", "resolved", "wont_fix"]);
    const nextStatus = patch?.status == null ? report.status : String(patch.status);
    if (!allowedStatus.has(nextStatus)) throw Object.assign(new Error("Invalid incident status"), { code: "INVALID_STATUS" });
    const updatedAt = new Date().toISOString();
    const next = sanitize({
      ...report,
      status: nextStatus,
      updatedAt,
      analysis: patch?.analysis === undefined ? report.analysis || null : {
        recordedAt: updatedAt,
        summary: cleanString(patch.analysis?.summary || patch.analysis, 4_000),
        confidence: cleanString(patch.analysis?.confidence || null, 100),
        evidenceEventIds: Array.isArray(patch.analysis?.evidenceEventIds)
          ? patch.analysis.evidenceEventIds.filter((id: any) => /^evt_[0-9a-f-]{36}$/i.test(String(id))).slice(0, 100)
          : [],
      },
      verification: patch?.verification === undefined ? report.verification || null : {
        recordedAt: updatedAt,
        outcome: ["passed", "failed", "not_run"].includes(patch.verification?.outcome) ? patch.verification.outcome : "not_run",
        notes: cleanString(patch.verification?.notes || "", 4_000),
        runId: cleanString(patch.verification?.runId || null, 200),
      },
    });
    await atomicJson(path.join(incidentDir(incidentId), "report.json"), next);
    await updateIndex(next);
    return next;
  });
}

export async function exportIncident(incidentId: string) {
  const report = await getIncident(incidentId);
  const dir = incidentDir(incidentId);
  let context = {};
  try {
    context = JSON.parse(await fs.promises.readFile(path.join(dir, "snapshots", report.evidence.snapshotId, "context.json"), "utf8"));
  } catch {}
  const exportedEvents: any[] = [];
  let cursor: string | null = null;
  let totalCount = 0;
  do {
    const page = await getIncidentEvents(incidentId, { limit: 200, cursor });
    exportedEvents.push(...page.events);
    totalCount = page.totalCount;
    cursor = page.nextCursor;
  } while (cursor && exportedEvents.length < MAX_SNAPSHOT_EVENTS);
  return sanitize({
    format: "bingo-diagnostic-bundle",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    originStoreId: diagnosticInfo().storeId,
    report,
    context,
    events: exportedEvents,
    evidenceCompleteness: {
      returnedCount: exportedEvents.length,
      totalCount,
      truncated: Boolean(cursor),
    },
  });
}

export function importIncident(bundle: any, targetProjectId?: string | null, bindToCurrentScope = false) {
  return enqueue(async () => {
    if (bundle?.format !== "bingo-diagnostic-bundle" || bundle?.schemaVersion !== SCHEMA_VERSION) {
      throw Object.assign(new Error("Unsupported diagnostic bundle"), { code: "SCHEMA_UNSUPPORTED" });
    }
    const incidentId = bundle?.report?.incidentId;
    if (!INCIDENT_RE.test(incidentId || "")) throw Object.assign(new Error("Invalid incident bundle ID"), { code: "INVALID_ID" });
    try { return await getIncident(incidentId); } catch (error: any) { if (!['NOT_FOUND', 'EXPIRED'].includes(error?.code)) throw error; }
    const snapshotId = `snapshot_${crypto.randomUUID()}`;
    const dir = incidentDir(incidentId);
    const snapshotDir = path.join(dir, "snapshots", snapshotId);
    const events = boundedSnapshot(Array.isArray(bundle.events) ? bundle.events.map((event: any) => sanitize(event)) : []);
    const report = sanitize({
      ...bundle.report,
      schemaVersion: SCHEMA_VERSION,
      originProjectKey: bundle.report.projectKey || null,
      projectKey: bindToCurrentScope ? projectKey(targetProjectId) : bundle.report.projectKey || null,
      projectName: bindToCurrentScope ? (targetProjectId ? path.basename(targetProjectId) : null) : bundle.report.projectName || null,
      reportPath: path.join(dir, "report.json"),
      importedAt: new Date().toISOString(),
      originStoreId: cleanString(bundle.originStoreId, 100),
      evidence: { ...bundle.report.evidence, snapshotId, byteSize: events.bytes, truncated: events.truncated || bundle.evidenceCompleteness?.truncated },
    });
    await fs.promises.mkdir(snapshotDir, { recursive: true, mode: 0o700 });
    await fs.promises.writeFile(path.join(snapshotDir, "events.jsonl"), events.events.map((event: any) => JSON.stringify(event)).join("\n") + (events.events.length ? "\n" : ""), { mode: 0o600 });
    await atomicJson(path.join(snapshotDir, "context.json"), sanitize(bundle.context || {}));
    await atomicJson(path.join(dir, "report.json"), report);
    await updateIndex(report);
    return report;
  });
}

export async function flushDiagnostics() {
  await writeQueue;
}

export { appSessionId, projectKey };
