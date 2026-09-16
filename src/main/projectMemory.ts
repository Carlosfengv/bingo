import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { atomicWrite, bytes, hash, storeError } from "./chatStore";

const MEMORY_SCHEMA_VERSION = 1;
const MEMORY_TEXT_MAX_CHARS = 2_000;
const MEMORY_ITEM_MAX_BYTES = 16 * 1024;
const MEMORY_LIST_MAX_BYTES = 16 * 1024;
const MEMORY_CONTEXT_MAX_BYTES = 1_000;

function validRelativePath(value) {
  if (typeof value !== "string" || !value || path.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  return normalized !== ".." && !normalized.startsWith("../") && normalized === value.replaceAll("\\", "/");
}

function encodeCursor(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCursor(value) {
  try { return JSON.parse(Buffer.from(String(value), "base64url").toString("utf8")); } catch { return null; }
}

function memoryAuthorizationId(item) {
  if (item.authorization?.kind === "user-action") return `action:${item.authorization.actionId}`;
  if (item.authorization?.kind === "explicit-message") return `message:${item.authorization.messageId}`;
  return null;
}

function normalizeItem(raw, current) {
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!text || text.length > MEMORY_TEXT_MAX_CHARS) throw storeError("INVALID_MEMORY", `Memory text must contain 1-${MEMORY_TEXT_MAX_CHARS} characters.`);
  const kind = ["preference", "convention", "decision"].includes(raw.kind) ? raw.kind : "preference";
  const strength = raw.strength === "must" ? "must" : "prefer";
  const scope = raw.scope?.kind === "paths" ? { kind: "paths", paths: [...new Set((raw.scope.paths ?? []).map(value => String(value).replaceAll("\\", "/")))].sort() } : { kind: "project" };
  if (scope.kind === "paths" && (!scope.paths.length || !scope.paths.every(validRelativePath))) throw storeError("INVALID_SCOPE", "Memory paths must be normalized project-relative paths without '..'.");
  const authorization = raw.authorization ?? { kind: "proposal" };
  if (!["proposal", "user-action", "explicit-message"].includes(authorization.kind)) throw storeError("INVALID_AUTHORIZATION", "Unknown memory authorization.");
  if (authorization.kind === "user-action" && (typeof authorization.actionId !== "string" || !authorization.actionId)) throw storeError("INVALID_AUTHORIZATION", "A user action id is required.");
  if (authorization.kind === "explicit-message" && (typeof authorization.messageId !== "string" || typeof authorization.quote !== "string" || !authorization.quote)) throw storeError("INVALID_AUTHORIZATION", "An explicit source message and quote are required.");
  let status = ["candidate", "active", "superseded", "stale"].includes(raw.status) ? raw.status : "candidate";
  if (authorization.kind === "proposal") status = "candidate";
  const origin = ["user-explicit", "user-edited", "agent-proposed"].includes(raw.origin) ? raw.origin : authorization.kind === "proposal" ? "agent-proposed" : "user-edited";
  const now = new Date().toISOString();
  const item = {
    id: current?.id ?? raw.id ?? `memory-${randomUUID()}`,
    kind,
    text,
    strength,
    scope,
    tags: [...new Set((Array.isArray(raw.tags) ? raw.tags : []).filter(value => typeof value === "string").map(value => value.slice(0, 100)))].slice(0, 30),
    status,
    origin,
    evidence: Array.isArray(raw.evidence) ? raw.evidence.slice(0, 50) : [],
    authorization,
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies.filter(dep => validRelativePath(dep?.path) && typeof dep.contentHash === "string").slice(0, 50) : [],
    supersedes: Array.isArray(raw.supersedes) ? [...new Set(raw.supersedes.filter(value => typeof value === "string"))].slice(0, 50) : [],
    conflictsWith: Array.isArray(raw.conflictsWith) ? [...new Set(raw.conflictsWith.filter(value => typeof value === "string"))].slice(0, 50) : [],
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  };
  if (bytes(item) > MEMORY_ITEM_MAX_BYTES) throw storeError("MEMORY_TOO_LARGE", "Serialized memory item exceeds 16 KiB.");
  return item;
}

class ProjectMemoryStore {
  constructor(projectDataDirectory, options = {}) {
    if (typeof projectDataDirectory !== "string" || !path.isAbsolute(projectDataDirectory)) throw new Error("ProjectMemoryStore requires an absolute, verified project data directory.");
    this.file = path.join(projectDataDirectory, "memory.json");
    this.queue = Promise.resolve();
    this.evidenceResolver = options.evidenceResolver;
    this.dependencyResolver = options.dependencyResolver;
    this.hooks = options.hooks;
  }

  enqueue(operation) {
    const current = this.queue.catch(() => {}).then(operation);
    this.queue = current;
    return current;
  }

  async read() {
    let raw;
    try { raw = await fs.readFile(this.file, "utf8"); } catch (error) {
      if (error?.code === "ENOENT") return { schemaVersion: MEMORY_SCHEMA_VERSION, revision: 0, items: [], revokedSourceIds: [], mutations: [], undoStack: [] };
      throw error;
    }
    let memory;
    try { memory = JSON.parse(raw); } catch { throw storeError("CORRUPT", "Project memory is not valid JSON."); }
    if (memory?.schemaVersion !== MEMORY_SCHEMA_VERSION) throw storeError("UNSUPPORTED_VERSION", `Unsupported project memory schema version: ${memory?.schemaVersion}`);
    return memory;
  }

  async commit(memory, step = "memory-manifest") {
    await atomicWrite(this.file, JSON.stringify(memory, null, 2), this.hooks, step);
    return memory;
  }

  async list(options = {}) {
    const memory = await this.read();
    const statuses = options.status ? new Set([].concat(options.status)) : null;
    const filtered = memory.items.filter(item => !statuses || statuses.has(item.status));
    let offset = 0;
    if (options.cursor) {
      const cursor = decodeCursor(options.cursor);
      if (!cursor || cursor.revision !== memory.revision || !Number.isInteger(cursor.offset)) throw storeError("INVALID_CURSOR", "Project memory cursor is stale or invalid.");
      offset = cursor.offset;
    }
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
    const items = [];
    for (const item of filtered.slice(offset, offset + limit)) {
      if (bytes(items) + bytes(item) > MEMORY_LIST_MAX_BYTES) break;
      items.push(item);
    }
    const nextOffset = offset + items.length;
    return { schemaVersion: MEMORY_SCHEMA_VERSION, revision: memory.revision, items, nextCursor: nextOffset < filtered.length ? encodeCursor({ revision: memory.revision, offset: nextOffset }) : null, total: filtered.length };
  }

  async get(id) {
    const memory = await this.read();
    const item = memory.items.find(candidate => candidate.id === id);
    if (!item) throw storeError("NOT_FOUND", `Project memory not found: ${id}`);
    return { schemaVersion: MEMORY_SCHEMA_VERSION, revision: memory.revision, item };
  }

  async upsert(input) {
    if (!input?.mutationId || !Number.isInteger(input.expectedRevision)) throw storeError("INVALID_MUTATION", "mutationId and expectedRevision are required.");
    return this.enqueue(async () => {
      const memory = await this.read();
      memory.mutations ??= [];
      const mutationHash = hash({ type: "upsert", item: input.item });
      const prior = memory.mutations.find(entry => entry.mutationId === input.mutationId);
      if (prior) {
        if (prior.mutationHash !== mutationHash) throw storeError("IDEMPOTENCY_CONFLICT", "This mutation id was already used for a different memory change.");
        return { schemaVersion: MEMORY_SCHEMA_VERSION, revision: memory.revision, item: memory.items.find(item => item.id === prior.itemId), replay: true };
      }
      if (memory.revision !== input.expectedRevision) throw storeError("CONFLICT", `Expected revision ${input.expectedRevision}, found ${memory.revision}.`);
      const existing = input.item?.id ? memory.items.find(item => item.id === input.item.id) : null;
      if (existing?.status === "active" && input.item?.authorization?.kind === "proposal") {
        throw storeError("INVALID_AUTHORIZATION", "An agent proposal cannot replace or downgrade an active project memory. The user must edit it in project settings.");
      }
      const item = normalizeItem(input.item ?? {}, existing);
      const authId = memoryAuthorizationId(item);
      if (authId && memory.revokedSourceIds.includes(authId)) throw storeError("REVOKED_SOURCE", "This old authorization was revoked; a new user authorization is required.");
      if (item.authorization.kind === "explicit-message") {
        const valid = await this.evidenceResolver?.(item.authorization, item.evidence);
        if (!valid) throw storeError("INVALID_AUTHORIZATION", "The explicit user-message authorization could not be verified.");
      }
      if (item.strength === "must" && item.authorization.kind === "proposal") throw storeError("INVALID_AUTHORIZATION", "A must memory requires user authorization.");
      if (item.status === "active" && item.conflictsWith.some(id => memory.items.some(candidate => candidate.id === id && candidate.status === "active")) && item.supersedes.length === 0) item.status = "candidate";
      const snapshot = { items: structuredClone(memory.items), revision: memory.revision };
      if (existing) memory.items[memory.items.indexOf(existing)] = item; else memory.items.push(item);
      if (item.status === "active" && item.authorization.kind !== "proposal") {
        for (const supersededId of item.supersedes) {
          const superseded = memory.items.find(candidate => candidate.id === supersededId && candidate.id !== item.id);
          if (superseded) superseded.status = "superseded";
        }
      }
      memory.revision += 1;
      memory.mutations.push({ mutationId: input.mutationId, mutationHash, itemId: item.id, revision: memory.revision });
      memory.undoStack ??= [];
      memory.undoStack.push({ mutationId: input.mutationId, snapshot });
      memory.undoStack = memory.undoStack.slice(-10);
      await this.commit(memory);
      return { schemaVersion: MEMORY_SCHEMA_VERSION, revision: memory.revision, item, replay: false };
    });
  }

  async delete(input) {
    if (!input?.id || !input?.mutationId || !Number.isInteger(input.expectedRevision)) throw storeError("INVALID_MUTATION", "id, mutationId and expectedRevision are required.");
    return this.enqueue(async () => {
      const memory = await this.read();
      memory.mutations ??= [];
      const mutationHash = hash({ type: "delete", id: input.id });
      const prior = memory.mutations.find(entry => entry.mutationId === input.mutationId);
      if (prior) {
        if (prior.mutationHash !== mutationHash) throw storeError("IDEMPOTENCY_CONFLICT", "This mutation id was already used for another deletion.");
        return { schemaVersion: MEMORY_SCHEMA_VERSION, revision: memory.revision, replay: true };
      }
      if (memory.revision !== input.expectedRevision) throw storeError("CONFLICT", `Expected revision ${input.expectedRevision}, found ${memory.revision}.`);
      const item = memory.items.find(candidate => candidate.id === input.id);
      if (!item) throw storeError("NOT_FOUND", `Project memory not found: ${input.id}`);
      memory.items = memory.items.filter(candidate => candidate.id !== input.id);
      const authId = memoryAuthorizationId(item);
      if (authId) memory.revokedSourceIds = [...new Set([...memory.revokedSourceIds, authId])];
      memory.revision += 1;
      memory.mutations.push({ mutationId: input.mutationId, mutationHash, itemId: input.id, revision: memory.revision, permanent: true });
      memory.undoStack = [];
      await this.commit(memory, "memory-delete-manifest");
      return { schemaVersion: MEMORY_SCHEMA_VERSION, revision: memory.revision, replay: false };
    });
  }

  async handleChatDeletion(chatId, options = {}) {
    return this.enqueue(async () => {
      const memory = await this.read();
      const sourced = memory.items.filter(item => (item.evidence ?? []).some(ref => ref?.kind === "message" && ref.chatId === chatId));
      if (!sourced.length) return { schemaVersion: MEMORY_SCHEMA_VERSION, revision: memory.revision, affected: 0 };
      if (options.preserve === true) {
        if (!options.actionId) throw storeError("INVALID_AUTHORIZATION", "Preserving memories from a deleted chat requires a user action id.");
        for (const item of sourced) {
          item.authorization = { kind: "user-action", actionId: options.actionId };
          item.evidence = item.evidence.map(ref => ref?.kind === "message" && ref.chatId === chatId ? { ...ref, sourceDeleted: true } : ref);
          item.updatedAt = new Date().toISOString();
        }
      } else {
        const ids = new Set(sourced.map(item => item.id));
        for (const item of sourced) {
          const authId = memoryAuthorizationId(item);
          if (authId) memory.revokedSourceIds = [...new Set([...memory.revokedSourceIds, authId])];
        }
        memory.items = memory.items.filter(item => !ids.has(item.id));
        memory.undoStack = [];
      }
      memory.revision += 1;
      memory.mutations ??= [];
      memory.mutations.push({ mutationId: options.actionId || `chat-delete:${chatId}:${memory.revision}`, mutationHash: hash({ type: "chat-delete", chatId, preserve: options.preserve === true }), revision: memory.revision, permanent: options.preserve !== true });
      await this.commit(memory, "memory-chat-delete-manifest");
      return { schemaVersion: MEMORY_SCHEMA_VERSION, revision: memory.revision, affected: sourced.length, preserved: options.preserve === true };
    });
  }

  async undo(input) {
    if (!input?.actionId || !Number.isInteger(input.expectedRevision)) throw storeError("INVALID_MUTATION", "actionId and expectedRevision are required.");
    return this.enqueue(async () => {
      const memory = await this.read();
      if (memory.revision !== input.expectedRevision) throw storeError("CONFLICT", `Expected revision ${input.expectedRevision}, found ${memory.revision}.`);
      const undo = memory.undoStack?.pop();
      if (!undo) throw storeError("NOT_FOUND", "There is no reversible memory change.");
      memory.items = undo.snapshot.items;
      memory.revision += 1;
      memory.mutations.push({ mutationId: input.actionId, mutationHash: hash({ type: "undo", mutationId: undo.mutationId }), revision: memory.revision });
      await this.commit(memory, "memory-undo-manifest");
      return { schemaVersion: MEMORY_SCHEMA_VERSION, revision: memory.revision, items: memory.items };
    });
  }

  async selectForContext(options = {}) {
    let memory = await this.read();
    const paths = new Set((options.paths ?? []).filter(validRelativePath));
    const request = String(options.currentRequest ?? "").toLocaleLowerCase();
    const applies = item => item.status === "active" && (item.scope.kind === "project" || item.scope.paths.some(rulePath => [...paths].some(target => target === rulePath || target.startsWith(`${rulePath}/`) || rulePath.startsWith(`${target}/`))));
    const candidates = memory.items.filter(applies);
    if (this.dependencyResolver && candidates.some(item => item.dependencies?.length)) {
      await this.enqueue(async () => {
        const current = await this.read();
        let changed = false;
        for (const item of current.items.filter(candidate => candidates.some(selected => selected.id === candidate.id) && candidate.status === "active")) {
          for (const dependency of item.dependencies ?? []) {
            const currentHash = await this.dependencyResolver(dependency.path);
            if (currentHash === dependency.contentHash) continue;
            item.status = "stale";
            item.updatedAt = new Date().toISOString();
            changed = true;
            break;
          }
        }
        if (changed) {
          current.revision += 1;
          await this.commit(current, "memory-stale-manifest");
        }
      });
      memory = await this.read();
    }
    const active = memory.items.filter(applies);
    const score = item => (item.scope.kind === "paths" ? 10 : 0) + item.tags.filter(tag => request.includes(tag.toLocaleLowerCase())).length * 2 + (request.includes(item.text.toLocaleLowerCase().slice(0, 30)) ? 1 : 0);
    const must = active.filter(item => item.strength === "must").sort((a, b) => score(b) - score(a));
    const prefer = active.filter(item => item.strength !== "must").sort((a, b) => score(b) - score(a));
    const maxBytes = Math.max(512, Number(options.maxBytes) || MEMORY_CONTEXT_MAX_BYTES);
    const selected = [];
    let text = "";
    for (const item of must) {
      const line = `- [must:${item.id}] ${item.text}`;
      if (bytes(text ? `${text}\n${line}` : line) > maxBytes) throw storeError("CONTEXT_CAPACITY", "Applicable must project memories exceed the context budget.");
      selected.push(item);
      text = text ? `${text}\n${line}` : line;
    }
    for (const item of prefer) {
      const line = `- [prefer:${item.id}] ${item.text}`;
      if (bytes(text ? `${text}\n${line}` : line) > maxBytes) continue;
      selected.push(item);
      text = text ? `${text}\n${line}` : line;
    }
    return { schemaVersion: MEMORY_SCHEMA_VERSION, revision: memory.revision, items: selected, text, selectedIds: selected.map(item => item.id), omittedPrefer: prefer.length - selected.filter(item => item.strength !== "must").length };
  }
}

export { MEMORY_CONTEXT_MAX_BYTES, MEMORY_ITEM_MAX_BYTES, MEMORY_LIST_MAX_BYTES, MEMORY_SCHEMA_VERSION, MEMORY_TEXT_MAX_CHARS, ProjectMemoryStore, memoryAuthorizationId, normalizeItem, validRelativePath };
