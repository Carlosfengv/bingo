import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { coveredPrefixHash, validateSummaryCandidate } from "./aiMemory";

const CHAT_SCHEMA_VERSION = 2;
const TAIL_MAX_FINALIZED_MESSAGES = 100;
const TAIL_TARGET_FINALIZED_MESSAGES = 80;
const TAIL_MAX_BYTES = 512 * 1024;
const BODY_MAX_INLINE_BYTES = 32 * 1024;
const READ_DEFAULT_LIMIT = 50;
const READ_MAX_BYTES = 64 * 1024;
const SEARCH_BATCH_MAX_BYTES = 256 * 1024;
const SEARCH_OUTPUT_MAX_BYTES = 16 * 1024;
const HISTORY_CONTEXT_MAX_BYTES = 6 * 1024;
const CONSTRAINT_CONTEXT_MAX_BYTES = 2 * 1024;

function bytes(value) {
  return Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value), "utf8");
}

function hash(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function storeError(code, message) {
  return Object.assign(new Error(message), { code });
}

function assertChatId(chatId) {
  if (typeof chatId !== "string" || chatId === "." || chatId === ".." || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(chatId)) {
    throw storeError("INVALID_ID", "Invalid chat id.");
  }
  return chatId;
}

const CONTENT_HASH_PATTERN = /^[a-f0-9]{64}$/;

function isPathInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function assertNoInternalReferences(value, seen = new Set()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) throw storeError("INVALID_MESSAGE", "Chat messages cannot contain circular values.");
  seen.add(value);
  if (Object.prototype.hasOwnProperty.call(value, "__bingoBodyRef")
    || Object.prototype.hasOwnProperty.call(value, "__bingoAttachmentRef")) {
    throw storeError("INVALID_MESSAGE", "Chat messages cannot supply internal storage references.");
  }
  for (const item of Object.values(value)) assertNoInternalReferences(item, seen);
  seen.delete(value);
}

function operationIdFromToolResult(result) {
  return result?.payload?.operationId ?? result?.operation?.operationId ?? null;
}

function correctToolResult(result, fact) {
  if (!result || typeof result !== "object") return result;
  const success = fact.applied === true ? true : fact.applied === false ? false : result.payload?.success ?? result.success;
  const createdElementIds = Array.isArray(fact.createdElementIds) ? fact.createdElementIds : result.createdElementIds;
  if (result.payload && typeof result.payload === "object" && !Array.isArray(result.payload)) {
    const corrected = {
      ...result,
      payload: {
        ...result.payload,
        operationId: fact.operationId,
        applied: fact.applied,
        success,
        error: fact.error ?? null,
        canvasId: fact.resolvedCanvasId ?? result.payload.canvasId ?? null
      },
      ...(createdElementIds ? { createdElementIds, createdElementId: createdElementIds[0] } : {})
    };
    if (fact.applied !== null) delete corrected.recoveryIssue;
    return corrected;
  }
  return {
    ...result,
    success,
    error: fact.error ?? null,
    ...(createdElementIds ? { createdElementIds } : {}),
    operation: {
      ...(result.operation && typeof result.operation === "object" ? result.operation : {}),
      operationId: fact.operationId,
      state: fact.state,
      applied: fact.applied,
      resolvedCanvasId: fact.resolvedCanvasId ?? null,
      createdElementIds: createdElementIds ?? []
    }
  };
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function syncDirectory(directory) {
  try {
    const handle = await fs.open(directory, "r");
    try { await handle.sync(); } finally { await handle.close(); }
  } catch {}
}

async function validateContentAddressedFile(file, expectedHash, expectedBytes) {
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size !== expectedBytes) throw storeError("CORRUPT", "Saved chat data size failed validation.");
  const digest = createHash("sha256");
  const handle = await fs.open(file, "r");
  try {
    const buffer = Buffer.alloc(64 * 1024);
    let position = 0;
    while (position < stat.size) {
      const { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, stat.size - position), position);
      if (!bytesRead) break;
      digest.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
    if (position !== stat.size || digest.digest("hex") !== expectedHash) throw storeError("CORRUPT", "Saved chat data hash failed validation.");
  } finally {
    await handle.close();
  }
}

async function atomicWrite(file, content, hooks, step) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`);
  const handle = await fs.open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => {});
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
  await handle.close();
  await hooks?.beforeStep?.(step, { file, temporary });
  await fs.rename(temporary, file);
  await syncDirectory(path.dirname(file));
}

async function writeContentAddressed(file, content, expectedHash, hooks, step) {
  if (await pathExists(file)) {
    const current = await fs.readFile(file, "utf8");
    if (hash(current) !== expectedHash) throw storeError("CORRUPT", `Content-addressed file failed validation: ${path.basename(file)}`);
    return;
  }
  await atomicWrite(file, content, hooks, step);
  const published = await fs.readFile(file, "utf8");
  if (hash(published) !== expectedHash) throw storeError("CORRUPT", `Published file failed validation: ${path.basename(file)}`);
}

class ChatStore {
  constructor(projectDataDirectory, options = {}) {
    if (typeof projectDataDirectory !== "string" || !path.isAbsolute(projectDataDirectory)) throw new Error("ChatStore requires an absolute, verified project data directory.");
    this.projectDataDirectory = projectDataDirectory;
    this.chatsDirectory = path.join(projectDataDirectory, "chats");
    this.dataDirectory = path.join(projectDataDirectory, "chat-data");
    this.queues = new Map();
    this.hooks = options.hooks;
  }

  chatFile(chatId) {
    return path.join(this.chatsDirectory, `${assertChatId(chatId)}.json`);
  }

  chatDataDirectory(chatId) {
    return path.join(this.dataDirectory, assertChatId(chatId));
  }

  async resolveStoredFile(chatId, relativeFile, expectedRelative, errorCode) {
    if (typeof relativeFile !== "string" || relativeFile !== expectedRelative) {
      throw storeError(errorCode, "Invalid saved chat data reference.");
    }
    const root = this.chatDataDirectory(chatId);
    const file = path.resolve(root, relativeFile);
    if (!isPathInside(root, file)) throw storeError(errorCode, "Saved chat data resolves outside its chat directory.");
    let rootReal;
    let fileReal;
    try {
      const stat = await fs.lstat(file);
      if (stat.isSymbolicLink() || !stat.isFile()) throw storeError(errorCode, "Saved chat data must be a regular file.");
      [rootReal, fileReal] = await Promise.all([fs.realpath(root), fs.realpath(file)]);
    } catch (error) {
      if (error?.code === errorCode) throw error;
      if (error?.code === "ENOENT") throw storeError("CORRUPT", "Saved chat data is missing.");
      throw error;
    }
    if (!isPathInside(rootReal, fileReal)) throw storeError(errorCode, "Saved chat data crosses a symbolic-link boundary.");
    return fileReal;
  }

  async readBodyReference(chatId, ref) {
    if (!ref || !CONTENT_HASH_PATTERN.test(ref.contentHash) || ref.file !== `bodies/${ref.contentHash}.txt`
      || !Number.isSafeInteger(ref.bytes) || ref.bytes < 0) {
      throw storeError("INVALID_BODY", "Invalid saved text body.");
    }
    const file = await this.resolveStoredFile(chatId, ref.file, `bodies/${ref.contentHash}.txt`, "INVALID_BODY");
    await validateContentAddressedFile(file, ref.contentHash, ref.bytes);
    return file;
  }

  async readAttachmentReference(chatId, ref) {
    if (!ref || !CONTENT_HASH_PATTERN.test(ref.contentHash) || ref.file !== `attachments/${ref.contentHash}`
      || !Number.isSafeInteger(ref.bytes) || ref.bytes < 0 || typeof ref.mimeType !== "string"
      || !/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i.test(ref.mimeType)) {
      throw storeError("INVALID_ATTACHMENT", "Invalid saved attachment.");
    }
    const file = await this.resolveStoredFile(chatId, ref.file, `attachments/${ref.contentHash}`, "INVALID_ATTACHMENT");
    await validateContentAddressedFile(file, ref.contentHash, ref.bytes);
    return file;
  }

  enqueue(chatId, operation) {
    const key = assertChatId(chatId);
    const previous = this.queues.get(key) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(operation);
    this.queues.set(key, current);
    current.finally(() => {
      if (this.queues.get(key) === current) this.queues.delete(key);
    }).catch(() => {});
    return current;
  }

  async readManifest(chatId, options = {}) {
    const file = this.chatFile(chatId);
    let raw;
    try {
      raw = await fs.readFile(file, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") {
        if (options.allowMissing) return null;
        throw storeError("NOT_FOUND", `Chat not found: ${chatId}`);
      }
      throw error;
    }
    let chat;
    try {
      chat = JSON.parse(raw);
    } catch {
      throw storeError("CORRUPT", `Chat file is not valid JSON: ${chatId}`);
    }
    if (chat?.schemaVersion === void 0) return options.migrate === false ? chat : this.migrateV1(chatId, chat, raw);
    if (chat.schemaVersion !== CHAT_SCHEMA_VERSION) throw storeError("UNSUPPORTED_VERSION", `Unsupported chat schema version: ${chat.schemaVersion}`);
    return chat;
  }

  async commitManifest(chat, step = "manifest") {
    await atomicWrite(this.chatFile(chat.id), JSON.stringify(chat, null, 2), this.hooks, step);
    return chat;
  }

  async storeBody(chatId, text) {
    const contentHash = hash(text);
    const relative = `bodies/${contentHash}.txt`;
    await writeContentAddressed(path.join(this.chatDataDirectory(chatId), relative), text, contentHash, this.hooks, "body");
    return { file: relative, contentHash, bytes: bytes(text) };
  }

  async storeAttachment(chatId, dataUrl) {
    const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUrl);
    if (!match) return null;
    const buffer = Buffer.from(match[2], "base64");
    const contentHash = createHash("sha256").update(buffer).digest("hex");
    const relative = `attachments/${contentHash}`;
    const file = path.join(this.chatDataDirectory(chatId), relative);
    if (!(await pathExists(file))) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const temporary = `${file}.${randomUUID()}.tmp`;
      const handle = await fs.open(temporary, "wx", 0o600);
      try { await handle.writeFile(buffer); await handle.sync(); } finally { await handle.close(); }
      await this.hooks?.beforeStep?.("attachment", { file, temporary });
      await fs.rename(temporary, file);
      await syncDirectory(path.dirname(file));
    }
    return { file: relative, contentHash, mimeType: match[1], bytes: buffer.length };
  }

  async externalizeValue(chatId, value) {
    if (typeof value === "string") {
      if (value.startsWith("data:") && value.includes(";base64,")) {
        const attachmentRef = await this.storeAttachment(chatId, value);
        if (attachmentRef) return { __bingoAttachmentRef: attachmentRef };
      }
      if (bytes(value) > BODY_MAX_INLINE_BYTES) return { __bingoBodyRef: await this.storeBody(chatId, value) };
      return value;
    }
    if (Array.isArray(value)) return Promise.all(value.map(item => this.externalizeValue(chatId, item)));
    if (!value || typeof value !== "object") return value;
    const result = {};
    for (const [key, item] of Object.entries(value)) result[key] = await this.externalizeValue(chatId, item);
    return result;
  }

  async hydrateValue(chatId, value, budget) {
    if (!value || typeof value !== "object") return value;
    if (value.__bingoBodyRef?.file) {
      const ref = value.__bingoBodyRef;
      const file = await this.readBodyReference(chatId, ref);
      if (budget && Number(ref.bytes) > budget.remaining) return { bodyRef: ref };
      const text = await fs.readFile(file, "utf8");
      const size = bytes(text);
      if (budget && size > budget.remaining) return { bodyRef: ref };
      if (budget) budget.remaining -= size;
      return text;
    }
    if (value.__bingoAttachmentRef?.file) {
      const ref = value.__bingoAttachmentRef;
      const file = await this.readAttachmentReference(chatId, ref);
      const encodedSize = Buffer.byteLength(`data:${ref.mimeType};base64,`, "utf8") + Math.ceil(Number(ref.bytes || 0) / 3) * 4;
      if (budget && encodedSize > budget.remaining) return { attachmentRef: ref };
      const buffer = await fs.readFile(file);
      const dataUrl = `data:${ref.mimeType};base64,${buffer.toString("base64")}`;
      const size = bytes(dataUrl);
      if (budget && size > budget.remaining) return { attachmentRef: ref };
      if (budget) budget.remaining -= size;
      return dataUrl;
    }
    if (Array.isArray(value)) return Promise.all(value.map(item => this.hydrateValue(chatId, item, budget)));
    const result = {};
    for (const [key, item] of Object.entries(value)) result[key] = await this.hydrateValue(chatId, item, budget);
    return result;
  }

  async prepareMessage(chatId, rawMessage, seq, defaults = {}) {
    const id = typeof rawMessage?.id === "string" && rawMessage.id ? rawMessage.id : `msg-${randomUUID()}`;
    const message = await this.externalizeValue(chatId, {
      ...rawMessage,
      id,
      seq,
      role: rawMessage?.role === "assistant" ? "assistant" : "user",
      runId: rawMessage?.runId ?? defaults.runId,
      finalized: rawMessage?.finalized ?? defaults.finalized ?? true
    });
    return message;
  }

  tailNeedsSealing(tail) {
    return tail.filter(message => message.finalized !== false).length > TAIL_MAX_FINALIZED_MESSAGES || bytes(tail) > TAIL_MAX_BYTES;
  }

  sealCount(tail) {
    let sealable = 0;
    while (sealable < tail.length && tail[sealable].finalized !== false) sealable += 1;
    if (sealable === 0) return 0;
    const finalized = tail.filter(message => message.finalized !== false).length;
    let count = Math.max(0, finalized - TAIL_TARGET_FINALIZED_MESSAGES);
    if (bytes(tail) > TAIL_MAX_BYTES) {
      while (count < sealable && bytes(tail.slice(count)) > Math.floor(TAIL_MAX_BYTES * 0.75)) count += 1;
    }
    return Math.min(sealable, Math.max(1, count));
  }

  async sealTail(chat) {
    while (this.tailNeedsSealing(chat.tail)) {
      const count = this.sealCount(chat.tail);
      if (!count) break;
      const messages = chat.tail.slice(0, count);
      const serialized = JSON.stringify(messages);
      const contentHash = hash(serialized);
      const relative = `segments/${contentHash}.json`;
      await writeContentAddressed(path.join(this.chatDataDirectory(chat.id), relative), serialized, contentHash, this.hooks, "segment");
      chat.segments.push({ fromSeq: messages[0].seq, toSeq: messages[messages.length - 1].seq, file: relative, contentHash });
      chat.tail = chat.tail.slice(count);
    }
  }

  async migrateV1(chatId, legacy, raw) {
    return this.enqueue(chatId, async () => {
      const currentRaw = await fs.readFile(this.chatFile(chatId), "utf8");
      const parsed = JSON.parse(currentRaw);
      if (parsed.schemaVersion === CHAT_SCHEMA_VERSION) return parsed;
      if (parsed.schemaVersion !== void 0) throw storeError("UNSUPPORTED_VERSION", `Unsupported chat schema version: ${parsed.schemaVersion}`);
      const dataDir = this.chatDataDirectory(chatId);
      await fs.mkdir(dataDir, { recursive: true });
      const backup = path.join(dataDir, "migration-v1.json");
      if (!(await pathExists(backup))) await atomicWrite(backup, JSON.stringify({ migratedAt: new Date().toISOString(), sourceHash: hash(currentRaw), original: parsed }, null, 2), this.hooks, "migration-backup");
      const now = Date.now();
      const chat = {
        schemaVersion: CHAT_SCHEMA_VERSION,
        id: chatId,
        revision: 1,
        lifecycle: "active",
        nextSeq: 1,
        segments: [],
        tail: [],
        constraints: [],
        title: parsed.title ?? "New chat",
        archived: parsed.archived === true,
        ...(parsed.archivedAt ? { archivedAt: parsed.archivedAt } : {}),
        createdAt: parsed.createdAt ?? now,
        updatedAt: parsed.updatedAt ?? now,
        requests: [],
        mutations: []
      };
      for (const message of Array.isArray(parsed.messages) ? parsed.messages : []) {
        chat.tail.push(await this.prepareMessage(chatId, message, chat.nextSeq++));
        await this.sealTail(chat);
      }
      await this.commitManifest(chat, "migration-manifest");
      return chat;
    });
  }

  async createChat(input = {}) {
    const chatId = assertChatId(input.id || `chat-${randomUUID()}`);
    for (const message of Array.isArray(input.messages) ? input.messages : []) assertNoInternalReferences(message);
    return this.enqueue(chatId, async () => {
      if (await pathExists(this.chatFile(chatId))) throw storeError("CONFLICT", `Chat already exists: ${chatId}`);
      const now = Date.now();
      const chat = {
        schemaVersion: CHAT_SCHEMA_VERSION,
        id: chatId,
        revision: 1,
        lifecycle: "active",
        nextSeq: 1,
        segments: [],
        tail: [],
        constraints: [],
        title: input.title ?? "New chat",
        archived: false,
        createdAt: input.createdAt ?? now,
        updatedAt: now,
        requests: [],
        mutations: [],
        ...(input.chatTabId ? { chatTabId: input.chatTabId } : {})
      };
      for (const message of Array.isArray(input.messages) ? input.messages : []) {
        chat.tail.push(await this.prepareMessage(chatId, message, chat.nextSeq++));
        await this.sealTail(chat);
      }
      return this.commitManifest(chat);
    });
  }

  metadata(chat) {
    return {
      id: chat.id,
      schemaVersion: chat.schemaVersion,
      revision: chat.revision,
      lifecycle: chat.lifecycle,
      title: chat.title,
      archived: chat.archived,
      archivedAt: chat.archivedAt,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: Math.max(0, chat.nextSeq - 1 - Number(chat.deletedCount ?? 0)),
      tailCount: chat.tail.length,
      summary: chat.summary,
      constraints: chat.constraints
    };
  }

  async listChats(options = {}) {
    await fs.mkdir(this.chatsDirectory, { recursive: true });
    const files = (await fs.readdir(this.chatsDirectory)).filter(file => file.endsWith(".json"));
    const chats = [];
    for (const file of files) {
      const chatId = file.slice(0, -5);
      await this.recoverInterruptedRun(chatId);
      const chat = await this.readManifest(chatId);
      if (chat.lifecycle === "deleting") {
        await this.enqueue(chatId, async () => {
          const current = await this.readManifest(chatId, { allowMissing: true });
          if (current?.lifecycle === "deleting") await this.finishDeletion(chatId);
        });
        continue;
      }
      if (!options.includeArchived && chat.archived) continue;
      chats.push(options.legacy ? await this.readAll(chat) : this.metadata(chat));
    }
    return chats.sort((left, right) => Number(right.updatedAt ?? 0) - Number(left.updatedAt ?? 0));
  }

  async segmentMessages(chat, segment) {
    if (!segment || !CONTENT_HASH_PATTERN.test(segment.contentHash)) throw storeError("CORRUPT", "Invalid chat segment reference.");
    const file = await this.resolveStoredFile(chat.id, segment.file, `segments/${segment.contentHash}.json`, "INVALID_SEGMENT");
    const raw = await fs.readFile(file, "utf8");
    if (hash(raw) !== segment.contentHash) throw storeError("CORRUPT", `Chat segment checksum failed: ${segment.file}`);
    const messages = JSON.parse(raw);
    if (!Array.isArray(messages)) throw storeError("CORRUPT", `Chat segment is not an array: ${segment.file}`);
    return messages;
  }

  async storedMessages(chat, range = {}) {
    const messages = [];
    const fromSeq = range.fromSeq ?? 1;
    const toSeq = range.toSeq ?? Number.MAX_SAFE_INTEGER;
    for (const segment of chat.segments) {
      if (segment.toSeq < fromSeq || segment.fromSeq > toSeq) continue;
      messages.push(...(await this.segmentMessages(chat, segment)).filter(message => message.seq >= fromSeq && message.seq <= toSeq));
    }
    messages.push(...chat.tail.filter(message => message.seq >= fromSeq && message.seq <= toSeq));
    return messages.sort((left, right) => left.seq - right.seq);
  }

  async *iterateStoredMessages(chat, fromSeq = 1) {
    for (const segment of chat.segments) {
      if (segment.toSeq < fromSeq) continue;
      for (const message of await this.segmentMessages(chat, segment)) if (message.seq >= fromSeq) yield message;
    }
    for (const message of chat.tail) if (message.seq >= fromSeq) yield message;
  }

  async readAll(chatOrId) {
    const resolvedId = typeof chatOrId === "string" ? await this.resolveChatId(chatOrId) : null;
    if (typeof chatOrId === "string" && !resolvedId) throw storeError("NOT_FOUND", `Chat not found: ${chatOrId}`);
    const chat = typeof chatOrId === "string" ? await this.readManifest(resolvedId) : chatOrId;
    const stored = await this.storedMessages(chat);
    const messages = [];
    for (const message of stored) messages.push(await this.hydrateValue(chat.id, message));
    return { ...this.metadata(chat), messages };
  }

  async readChat(chatId, options = {}) {
    const resolvedId = await this.resolveChatId(chatId);
    if (!resolvedId) throw storeError("NOT_FOUND", `Chat not found: ${chatId}`);
    const chat = await this.readManifest(resolvedId);
    const limit = Math.min(200, Math.max(1, Number(options.limit) || READ_DEFAULT_LIMIT));
    const beforeSeq = options.cursor ? Number(Buffer.from(String(options.cursor), "base64url").toString("utf8")) : chat.nextSeq;
    if (!Number.isInteger(beforeSeq) || beforeSeq < 1 || beforeSeq > chat.nextSeq) throw storeError("INVALID_CURSOR", "Invalid chat history cursor.");
    const fromSeq = Math.max(1, beforeSeq - limit);
    const stored = await this.storedMessages(chat, { fromSeq, toSeq: beforeSeq - 1 });
    const budget = { remaining: Math.max(1_024, Number(options.maxBytes) || READ_MAX_BYTES) };
    const messages = [];
    for (let index = stored.length - 1; index >= 0; index -= 1) {
      const hydrated = await this.hydrateValue(chat.id, stored[index], { remaining: budget.remaining });
      if (bytes(hydrated) > budget.remaining && messages.length > 0) break;
      budget.remaining -= Math.min(budget.remaining, bytes(hydrated));
      messages.unshift(hydrated);
    }
    const oldestSeq = messages[0]?.seq ?? beforeSeq;
    return { ...this.metadata(chat), messages, nextCursor: oldestSeq > 1 ? Buffer.from(String(oldestSeq), "utf8").toString("base64url") : null };
  }

  async findStoredMessage(chat, messageId) {
    const tailMessage = chat.tail.find(message => message.id === messageId);
    if (tailMessage) return tailMessage;
    for (const segment of chat.segments) {
      const message = (await this.segmentMessages(chat, segment)).find(candidate => candidate.id === messageId);
      if (message) return message;
    }
    return null;
  }

  async readMessageBody(chatId, messageId, options = {}) {
    const resolvedId = await this.resolveChatId(chatId);
    if (!resolvedId) throw storeError("NOT_FOUND", `Chat not found: ${chatId}`);
    const chat = await this.readManifest(resolvedId);
    const message = await this.findStoredMessage(chat, messageId);
    if (!message) throw storeError("NOT_FOUND", `Message not found: ${messageId}`);
    // Resolve an opaque body ID only within this message, never a renderer path.
    const findBody = value => {
      if (!value || typeof value !== "object") return null;
      if (value.__bingoBodyRef?.contentHash === options.bodyId) return value.__bingoBodyRef;
      for (const item of Object.values(value)) {
        const found = findBody(item);
        if (found) return found;
      }
      return null;
    };
    if (options.bodyId != null && !CONTENT_HASH_PATTERN.test(options.bodyId)) throw storeError("INVALID_BODY", "Invalid text body ID.");
    const ref = options.bodyId ? findBody(message) : message.content?.__bingoBodyRef;
    if (!ref?.file) throw storeError("NOT_FOUND", "This message does not have a paged text body.");
    const savedBody = await this.readBodyReference(chat.id, ref);
    const offset = options.offset ?? 0;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > ref.bytes) throw storeError("INVALID_CURSOR", "Invalid text offset.");
    const limit = Math.min(32 * 1024, Math.max(1_024, Number(options.limit) || 8 * 1024));
    const handle = await fs.open(savedBody, "r");
    try {
      const buffer = Buffer.alloc(Math.min(limit + 4, Math.max(0, ref.bytes - offset)));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
      let consumed = Math.min(bytesRead, limit);
      let content = "";
      while (consumed > 0) {
        try {
          content = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, consumed));
          break;
        } catch {
          consumed -= 1;
        }
      }
      if (consumed === 0 && offset < ref.bytes) throw storeError("INVALID_BODY", "The saved text could not be read at this offset.");
      return {
        schemaVersion: CHAT_SCHEMA_VERSION,
        messageId,
        offset,
        content,
        nextOffset: offset + consumed < ref.bytes ? offset + consumed : null,
        totalBytes: ref.bytes
      };
    } finally {
      await handle.close();
    }
  }

  async readMessage(chatId, messageId) {
    const resolvedId = await this.resolveChatId(chatId);
    if (!resolvedId) throw storeError("NOT_FOUND", `Chat not found: ${chatId}`);
    const chat = await this.readManifest(resolvedId);
    const message = await this.findStoredMessage(chat, messageId);
    if (!message) throw storeError("NOT_FOUND", `Message not found: ${messageId}`);
    return this.hydrateValue(chat.id, message, { remaining: READ_MAX_BYTES });
  }

  async searchHistory(chatId, options = {}) {
    const resolvedId = await this.resolveChatId(chatId);
    if (!resolvedId) throw storeError("NOT_FOUND", `Chat not found: ${chatId}`);
    const chat = await this.readManifest(resolvedId);
    if (options.messageId) {
      const stored = await this.findStoredMessage(chat, String(options.messageId));
      if (!stored) return { schemaVersion: CHAT_SCHEMA_VERSION, revision: chat.revision, results: [], complete: true, nextCursor: null };
      const message = await this.hydrateValue(chat.id, stored, { remaining: READ_MAX_BYTES });
      return { schemaVersion: CHAT_SCHEMA_VERSION, revision: chat.revision, results: [{ messageId: stored.id, seq: stored.seq, role: stored.role, message }], complete: true, nextCursor: null };
    }
    if (options.bodyMessageId) return this.readMessageBody(chat.id, String(options.bodyMessageId), { offset: options.bodyOffset, limit: options.bodyLimit });
    const query = String(options.query ?? "").trim();
    if (!query) return this.readChat(chat.id, { cursor: options.cursor, limit: options.limit, maxBytes: options.maxBytes });
    const queryLower = query.toLocaleLowerCase();
    const queryHash = hash(queryLower);
    let nextSeq = 1;
    let bodyOffset = 0;
    if (options.cursor) {
      let decoded;
      try { decoded = JSON.parse(Buffer.from(String(options.cursor), "base64url").toString("utf8")); } catch {}
      if (!decoded || decoded.revision !== chat.revision || decoded.queryHash !== queryHash || !Number.isInteger(decoded.nextSeq)) throw storeError("INVALID_CURSOR", "History search cursor is stale or belongs to another query.");
      nextSeq = decoded.nextSeq;
      bodyOffset = Math.max(0, Number(decoded.bodyOffset) || 0);
    }
    const resultLimit = Math.min(50, Math.max(1, Number(options.limit) || 20));
    const scanLimit = Math.min(SEARCH_BATCH_MAX_BYTES, Math.max(16 * 1024, Number(options.scanBytes) || SEARCH_BATCH_MAX_BYTES));
    const results = [];
    let scannedBytes = 0;
    let resumeSeq = null;
    let resumeBodyOffset = 0;
    for await (const message of this.iterateStoredMessages(chat, nextSeq)) {
      const currentBodyOffset = message.seq === nextSeq ? bodyOffset : 0;
      const inline = currentBodyOffset === 0 ? JSON.stringify(message, (key, value) => key === "__bingoAttachmentRef" || key === "__bingoBodyRef" ? void 0 : value) : "";
      const messageBytes = bytes(inline);
      if (scannedBytes + messageBytes > scanLimit && scannedBytes > 0) {
        resumeSeq = message.seq;
        break;
      }
      scannedBytes += messageBytes;
      let matchedText = inline;
      const bodyRef = message.content?.__bingoBodyRef;
      if (bodyRef?.file && scannedBytes < scanLimit) {
        const savedBody = await this.readBodyReference(chat.id, bodyRef);
        const remaining = Math.min(Math.max(0, bodyRef.bytes - currentBodyOffset), scanLimit - scannedBytes);
        const handle = await fs.open(savedBody, "r");
        try {
          const buffer = Buffer.alloc(remaining);
          const { bytesRead } = await handle.read(buffer, 0, remaining, currentBodyOffset);
          matchedText += buffer.subarray(0, bytesRead).toString("utf8");
          scannedBytes += bytesRead;
        } finally { await handle.close(); }
        if (currentBodyOffset + remaining < bodyRef.bytes) {
          resumeSeq = message.seq;
          resumeBodyOffset = currentBodyOffset + remaining;
        }
      }
      const matchIndex = matchedText.toLocaleLowerCase().indexOf(queryLower);
      if (matchIndex >= 0) {
        const start = Math.max(0, matchIndex - 160);
        const excerpt = matchedText.slice(start, matchIndex + query.length + 240);
        const result = { messageId: message.id, seq: message.seq, role: message.role, excerpt, source: { kind: "message", chatId: chat.id, messageId: message.id, seq: message.seq } };
        if (bytes(results) + bytes(result) > SEARCH_OUTPUT_MAX_BYTES) {
          resumeSeq = message.seq;
          break;
        }
        results.push(result);
        if (results.length >= resultLimit) {
          if (resumeSeq === null) resumeSeq = message.seq + 1;
          break;
        }
      }
      if (resumeSeq !== null || scannedBytes >= scanLimit) {
        resumeSeq ??= message.seq + 1;
        break;
      }
    }
    const complete = resumeSeq === null || resumeSeq >= chat.nextSeq;
    const nextCursor = complete ? null : Buffer.from(JSON.stringify({ revision: chat.revision, queryHash, nextSeq: resumeSeq, bodyOffset: resumeBodyOffset }), "utf8").toString("base64url");
    return { schemaVersion: CHAT_SCHEMA_VERSION, revision: chat.revision, query, results, scannedBytes, complete, nextCursor };
  }

  async contextMessagesBeforeRun(chatId, runId, options = {}) {
    const chat = await this.readManifest(chatId);
    const runUser = chat.tail.find(message => message.runId === runId && message.role === "user");
    if (!runUser) throw storeError("NOT_FOUND", "The current run user message is missing.");
    const maxBytes = Math.min(64 * 1024, Math.max(1_024, Number(options.maxBytes) || HISTORY_CONTEXT_MAX_BYTES));
    const selected = [];
    let remaining = maxBytes;
    let omitted = 0;
    const consider = async storedMessage => {
      if (storedMessage.finalized === false) return;
      const hydrated = await this.hydrateValue(chat.id, storedMessage, { remaining });
      const message = { id: hydrated.id, seq: hydrated.seq, role: hydrated.role, content: typeof hydrated.content === "string" ? hydrated.content : "[Large message body omitted; use chat_history_read with this message id.]" };
      const size = bytes(message);
      if (size > remaining) {
        omitted += 1;
        return;
      }
      remaining -= size;
      selected.unshift(message);
    };
    for (let index = chat.tail.length - 1; index >= 0; index -= 1) {
      const message = chat.tail[index];
      if (message.seq >= runUser.seq) continue;
      await consider(message);
      if (remaining <= 0) break;
    }
    if (remaining > 0) {
      for (let segmentIndex = chat.segments.length - 1; segmentIndex >= 0; segmentIndex -= 1) {
        const segment = chat.segments[segmentIndex];
        if (segment.fromSeq >= runUser.seq) continue;
        const segmentMessages = await this.segmentMessages(chat, segment);
        for (let messageIndex = segmentMessages.length - 1; messageIndex >= 0; messageIndex -= 1) {
          const message = segmentMessages[messageIndex];
          if (message.seq >= runUser.seq) continue;
          await consider(message);
          if (remaining <= 0) break;
        }
        if (remaining <= 0) break;
      }
    }
    const activeConstraints = (chat.constraints ?? []).filter(constraint => constraint.status === "active");
    const constraintText = activeConstraints.map(constraint => `- ${constraint.quote} (source message ${constraint.source.messageId}, seq ${constraint.source.seq})`).join("\n");
    if (bytes(constraintText) > (Number(options.constraintMaxBytes) || CONSTRAINT_CONTEXT_MAX_BYTES)) throw storeError("CONTEXT_CAPACITY", "Active chat constraints exceed the context budget. Resolve or shorten a constraint before continuing.");
    // Seq numbers let us report older omitted context without opening sealed
    // segments merely to count them. deletedCount can only reduce that total.
    const priorMessageUpperBound = Math.max(0, runUser.seq - 1 - Number(chat.deletedCount ?? 0));
    omitted = Math.max(omitted, priorMessageUpperBound - selected.length);
    return { messages: selected, activeConstraints, constraintText, summary: chat.summary?.valid === false ? null : chat.summary ?? null, omittedMessages: omitted, includedBytes: maxBytes - remaining, beforeSeq: runUser.seq };
  }

  async prepareSummaryInput(chatId, options = {}) {
    const chat = await this.readManifest(chatId);
    const allStored = await this.storedMessages(chat);
    const allMessages = [];
    for (const message of allStored) allMessages.push(await this.hydrateValue(chat.id, message, { remaining: 64 * 1024 }));
    const previousThrough = chat.summary?.valid === false ? 0 : Number(chat.summary?.coveredThroughSeq ?? 0);
    const finalized = allMessages.filter(message => message.finalized !== false);
    const keepRecent = Math.max(20, Number(options.keepRecent) || 20);
    const candidates = finalized.filter(message => message.seq > previousThrough).slice(0, Math.max(0, finalized.filter(message => message.seq > previousThrough).length - keepRecent));
    const batch = [];
    let used = 0;
    const maxBytes = Math.min(64 * 1024, Math.max(8 * 1024, Number(options.maxBytes) || 48 * 1024));
    for (const message of candidates) {
      const clean = { id: message.id, seq: message.seq, role: message.role, content: typeof message.content === "string" ? message.content : "[large body omitted]", operationFacts: message.operationFacts ?? [] };
      if (used + bytes(clean) > maxBytes) break;
      batch.push(clean);
      used += bytes(clean);
    }
    if (!batch.length) return null;
    const coveredThroughSeq = batch[batch.length - 1].seq;
    const expectedPrefixHash = coveredPrefixHash(allMessages, coveredThroughSeq);
    return {
      schemaVersion: CHAT_SCHEMA_VERSION,
      chatId: chat.id,
      expectedGeneration: Number(chat.summary?.generation ?? 0) + 1,
      coveredThroughSeq,
      expectedPrefixHash,
      previousSummary: chat.summary?.valid === false ? null : chat.summary ?? null,
      constraints: (chat.constraints ?? []).filter(constraint => constraint.status === "active"),
      messages: batch,
      validationMessages: allMessages,
      inputBytes: used
    };
  }

  async commitSummary(chatId, candidate, expectation) {
    return this.enqueue(chatId, async () => {
      const chat = await this.readManifest(chatId);
      if (chat.lifecycle !== "active" || chat.archived === true) throw storeError("CHAT_UNAVAILABLE", "This chat is archived or being deleted.");
      const allStored = await this.storedMessages(chat);
      const messages = [];
      for (const message of allStored) messages.push(await this.hydrateValue(chat.id, message, { remaining: 64 * 1024 }));
      const normalized = validateSummaryCandidate(candidate, {
        chatId: chat.id,
        messages,
        expectedGeneration: expectation.expectedGeneration,
        expectedPrefixHash: expectation.expectedPrefixHash
      });
      if (Number(chat.summary?.generation ?? 0) + 1 !== expectation.expectedGeneration) throw storeError("STALE_GENERATION", "A newer summary was committed first.");
      chat.summary = { ...normalized, valid: true };
      await this.commitManifest(chat, "summary-manifest");
      return this.metadata(chat);
    });
  }

  async pinConstraint(chatIdOrTabId, input) {
    const chatId = await this.resolveChatId(chatIdOrTabId);
    if (!chatId) throw storeError("NOT_FOUND", `Chat not found: ${chatIdOrTabId}`);
    if (!Number.isInteger(input?.expectedRevision) || !input?.mutationId || !input?.messageId || typeof input?.quote !== "string") throw storeError("INVALID_MUTATION", "messageId, quote, mutationId, and expectedRevision are required.");
    const quote = input.quote.trim();
    if (!quote || quote.length > 2_000) throw storeError("INVALID_CONSTRAINT", "Constraint quotes must contain 1-2000 characters.");
    const mutationHash = hash({ type: "pin-constraint", messageId: input.messageId, quote });
    return this.enqueue(chatId, async () => {
      const chat = await this.readManifest(chatId);
      chat.mutations ??= [];
      const prior = chat.mutations.find(entry => entry.mutationId === input.mutationId);
      if (prior) {
        if (prior.mutationHash !== mutationHash) throw storeError("IDEMPOTENCY_CONFLICT", "This mutation id was already used for a different change.");
        return { ...this.metadata(chat), replay: true };
      }
      if (chat.revision !== input.expectedRevision) throw storeError("CONFLICT", `Expected revision ${input.expectedRevision}, found ${chat.revision}.`);
      const source = await this.findStoredMessage(chat, input.messageId);
      if (!source || source.role !== "user") throw storeError("INVALID_SOURCE", "A chat constraint must quote an existing user message.");
      const hydrated = await this.hydrateValue(chat.id, source);
      if (typeof hydrated.content !== "string" || !hydrated.content.includes(quote)) throw storeError("INVALID_SOURCE", "The constraint quote is not present in the source user message.");
      if (!(chat.constraints ?? []).some(constraint => constraint.status === "active" && constraint.source.messageId === source.id && constraint.quote === quote)) {
        chat.constraints ??= [];
        chat.constraints.push({ id: input.constraintId || `constraint-${randomUUID()}`, quote, source: { kind: "message", chatId: chat.id, messageId: source.id, seq: source.seq }, status: "active", createdAt: Date.now() });
      }
      chat.revision += 1;
      chat.updatedAt = Date.now();
      chat.mutations.push({ mutationId: input.mutationId, mutationHash, revision: chat.revision, appliedAt: chat.updatedAt });
      await this.commitManifest(chat, "constraint-manifest");
      return { ...this.metadata(chat), replay: false };
    });
  }

  async resolveConstraint(chatIdOrTabId, input) {
    const chatId = await this.resolveChatId(chatIdOrTabId);
    if (!chatId) throw storeError("NOT_FOUND", `Chat not found: ${chatIdOrTabId}`);
    if (!Number.isInteger(input?.expectedRevision) || !input?.mutationId || !input?.constraintId) throw storeError("INVALID_MUTATION", "constraintId, mutationId, and expectedRevision are required.");
    const mutationHash = hash({ type: "resolve-constraint", constraintId: input.constraintId });
    return this.enqueue(chatId, async () => {
      const chat = await this.readManifest(chatId);
      chat.mutations ??= [];
      const prior = chat.mutations.find(entry => entry.mutationId === input.mutationId);
      if (prior) {
        if (prior.mutationHash !== mutationHash) throw storeError("IDEMPOTENCY_CONFLICT", "This mutation id was already used for a different change.");
        return { ...this.metadata(chat), replay: true };
      }
      if (chat.revision !== input.expectedRevision) throw storeError("CONFLICT", `Expected revision ${input.expectedRevision}, found ${chat.revision}.`);
      const constraint = (chat.constraints ?? []).find(candidate => candidate.id === input.constraintId);
      if (!constraint) throw storeError("NOT_FOUND", `Constraint not found: ${input.constraintId}`);
      constraint.status = "resolved";
      constraint.resolvedAt = Date.now();
      constraint.resolvedReason = "user-resolved";
      chat.revision += 1;
      chat.updatedAt = Date.now();
      chat.mutations.push({ mutationId: input.mutationId, mutationHash, revision: chat.revision, appliedAt: chat.updatedAt });
      await this.commitManifest(chat, "constraint-manifest");
      return { ...this.metadata(chat), replay: false };
    });
  }

  async resolveChatId(chatIdOrTabId) {
    if (await pathExists(this.chatFile(chatIdOrTabId))) {
      const chat = await this.readManifest(chatIdOrTabId);
      return chat.lifecycle === "deleting" ? null : chatIdOrTabId;
    }
    await fs.mkdir(this.chatsDirectory, { recursive: true });
    for (const file of (await fs.readdir(this.chatsDirectory)).filter(file => file.endsWith(".json"))) {
      const chat = await this.readManifest(file.slice(0, -5));
      if (chat.lifecycle !== "deleting" && chat.chatTabId === chatIdOrTabId) return chat.id;
    }
    return null;
  }

  async writeRunRecord(chatId, requestId, record) {
    const relative = `runs/${hash(requestId)}.json`;
    await atomicWrite(path.join(this.chatDataDirectory(chatId), relative), JSON.stringify(record, null, 2), this.hooks, "run-record");
    return relative;
  }

  async readRunRecord(chatId, requestId) {
    const file = path.join(this.chatDataDirectory(chatId), `runs/${hash(requestId)}.json`);
    if (!(await pathExists(file))) return null;
    return JSON.parse(await fs.readFile(file, "utf8"));
  }

  async startRun(input) {
    assertNoInternalReferences(input?.userMessage);
    const requestedChatExists = !!input.chatId && await pathExists(this.chatFile(input.chatId));
    let chatId = input.chatId ? await this.resolveChatId(input.chatId) : null;
    if (requestedChatExists && !chatId) throw storeError("CHAT_UNAVAILABLE", "This chat is being deleted.");
    if (!chatId && input.chatTabId) chatId = await this.resolveChatId(input.chatTabId);
    if (!chatId) {
      const created = await this.createChat({ title: input.title, chatTabId: input.chatTabId });
      chatId = created.id;
    }
    await this.recoverInterruptedRun(chatId);
    return this.enqueue(chatId, async () => {
      const chat = await this.readManifest(chatId);
      if (chat.lifecycle !== "active" || chat.archived === true) throw storeError("CHAT_UNAVAILABLE", "This chat is archived or being deleted.");
      const payloadHash = input.payloadHash || hash(input.userMessage);
      const requestEntry = chat.requests.find(entry => entry.requestId === input.requestId);
      const prior = requestEntry ? await this.readRunRecord(chatId, input.requestId) : null;
      if (prior) {
        if (prior.payloadHash !== payloadHash) throw storeError("IDEMPOTENCY_CONFLICT", "This request id was already used for different content.");
        return { chatId, runId: prior.runId, assistantMessageId: prior.assistantMessageId, replay: true, status: prior.status };
      }
      if (chat.activeRun) throw storeError("CHAT_BUSY", "This chat already has a running task.");
      const runId = input.runId || randomUUID();
      const user = await this.prepareMessage(chatId, { ...input.userMessage, requestId: input.requestId, requestPayloadHash: payloadHash }, chat.nextSeq++, { runId, finalized: true });
      const assistant = await this.prepareMessage(chatId, { id: `msg-${randomUUID()}`, role: "assistant", content: "", requestId: input.requestId, requestPayloadHash: payloadHash }, chat.nextSeq++, { runId, finalized: false });
      chat.tail.push(user, assistant);
      chat.activeRun = { runId, requestId: input.requestId, assistantMessageId: assistant.id, startedAt: Date.now(), processId: process.pid };
      chat.revision += 1;
      chat.updatedAt = Date.now();
      const runFile = await this.writeRunRecord(chatId, input.requestId, { requestId: input.requestId, payloadHash, runId, status: "running", assistantMessageId: assistant.id, startedAt: chat.activeRun.startedAt });
      chat.requests.push({ requestId: input.requestId, runFile });
      await this.sealTail(chat);
      await this.commitManifest(chat, "run-start-manifest");
      return { chatId, runId, assistantMessageId: assistant.id, replay: false, status: "running", revision: chat.revision };
    });
  }

  async recoverInterruptedRun(chatId) {
    const existing = await this.readManifest(chatId);
    if (!existing.activeRun || existing.activeRun.processId === process.pid) return false;
    return this.enqueue(chatId, async () => {
      const chat = await this.readManifest(chatId);
      const activeRun = chat.activeRun;
      if (!activeRun || activeRun.processId === process.pid) return false;
      const index = chat.tail.findIndex(message => message.id === activeRun.assistantMessageId);
      if (index < 0) throw storeError("CORRUPT", "Interrupted assistant placeholder is missing from the tail.");
      const current = chat.tail[index];
      chat.tail[index] = await this.prepareMessage(chatId, {
        ...current,
        content: current.content ?? "",
        outcome: "interrupted",
        finalized: true
      }, current.seq, { runId: activeRun.runId, finalized: true });
      delete chat.activeRun;
      chat.revision += 1;
      chat.updatedAt = Date.now();
      const previous = await this.readRunRecord(chatId, activeRun.requestId);
      await this.writeRunRecord(chatId, activeRun.requestId, { ...previous, status: "interrupted", finishedAt: Date.now() });
      await this.sealTail(chat);
      await this.commitManifest(chat, "run-recovery-manifest");
      return true;
    });
  }

  async checkpointRun(chatId, runId, patch) {
    return this.enqueue(chatId, async () => {
      const chat = await this.readManifest(chatId);
      if (chat.activeRun?.runId !== runId) throw storeError("NOT_FOUND", "Active run not found.");
      const index = chat.tail.findIndex(message => message.id === chat.activeRun.assistantMessageId);
      if (index < 0) throw storeError("CORRUPT", "Assistant placeholder is missing from the tail.");
      const current = chat.tail[index];
      chat.tail[index] = await this.prepareMessage(chatId, { ...current, ...patch, id: current.id, seq: current.seq, role: "assistant", finalized: false }, current.seq, { runId, finalized: false });
      await this.commitManifest(chat, "run-checkpoint-manifest");
      return this.metadata(chat);
    });
  }

  async finalizeRun(chatId, runId, result = {}) {
    return this.enqueue(chatId, async () => {
      const chat = await this.readManifest(chatId);
      if (chat.activeRun?.runId !== runId) throw storeError("NOT_FOUND", "Active run not found.");
      const activeRun = chat.activeRun;
      const index = chat.tail.findIndex(message => message.id === activeRun.assistantMessageId);
      if (index < 0) throw storeError("CORRUPT", "Assistant placeholder is missing from the tail.");
      const current = chat.tail[index];
      chat.tail[index] = await this.prepareMessage(chatId, {
        ...current,
        content: result.content ?? current.content ?? "",
        ...(result.activity ? { activity: result.activity } : {}),
        ...(result.operationFacts ? { operationFacts: result.operationFacts } : {}),
        ...(result.toolResults ? { toolResults: result.toolResults } : {}),
        ...(result.workTargets ? { workTargets: result.workTargets } : {}),
        ...(Number.isFinite(result.workDurationMs) ? { workDurationMs: result.workDurationMs } : {}),
        outcome: result.outcome ?? "completed",
        finalized: true
      }, current.seq, { runId, finalized: true });
      delete chat.activeRun;
      chat.revision += 1;
      chat.updatedAt = Date.now();
      const previous = await this.readRunRecord(chatId, activeRun.requestId);
      await this.writeRunRecord(chatId, activeRun.requestId, { ...previous, status: result.outcome ?? "completed", finishedAt: Date.now() });
      await this.sealTail(chat);
      await this.commitManifest(chat, "run-finalize-manifest");
      return this.metadata(chat);
    });
  }

  async correctOperationFact(chatIdOrTabId, fact) {
    const chatId = await this.resolveChatId(chatIdOrTabId);
    if (!chatId || !fact?.operationId) return false;
    return this.enqueue(chatId, async () => {
      const chat = await this.readManifest(chatId);
      let messageIndex = -1;
      let factIndex = -1;
      for (let index = chat.tail.length - 1; index >= 0; index -= 1) {
        const candidateFacts = chat.tail[index]?.operationFacts;
        if (!Array.isArray(candidateFacts)) continue;
        const candidateIndex = candidateFacts.findIndex(candidate => candidate?.operationId === fact.operationId);
        if (candidateIndex < 0) continue;
        messageIndex = index;
        factIndex = candidateIndex;
        break;
      }
      if (messageIndex < 0) return false;
      const current = chat.tail[messageIndex];
      const operationFacts = [...current.operationFacts];
      const toolResults = Array.isArray(current.toolResults) ? [...current.toolResults] : [];
      const toolResultIndex = toolResults.findIndex(result => operationIdFromToolResult(result) === fact.operationId);
      const correctedResult = toolResultIndex >= 0 ? correctToolResult(toolResults[toolResultIndex], fact) : null;
      if (JSON.stringify(operationFacts[factIndex]) === JSON.stringify(fact)
        && (toolResultIndex < 0 || JSON.stringify(toolResults[toolResultIndex]) === JSON.stringify(correctedResult))) return true;
      operationFacts[factIndex] = fact;
      if (toolResultIndex >= 0) toolResults[toolResultIndex] = correctedResult;
      chat.tail[messageIndex] = await this.prepareMessage(chatId, {
        ...current,
        operationFacts,
        ...(toolResultIndex >= 0 ? { toolResults } : {})
      }, current.seq, {
        runId: current.runId,
        finalized: current.finalized !== false
      });
      chat.revision += 1;
      chat.updatedAt = Date.now();
      await this.commitManifest(chat, "late-operation-fact-manifest");
      return true;
    });
  }

  async cancelActiveRun(chatIdOrTabId) {
    const chatId = await this.resolveChatId(chatIdOrTabId);
    if (!chatId) return false;
    return this.enqueue(chatId, async () => {
      const chat = await this.readManifest(chatId);
      const activeRun = chat.activeRun;
      if (!activeRun) return false;
      const index = chat.tail.findIndex(message => message.id === activeRun.assistantMessageId);
      if (index < 0) throw storeError("CORRUPT", "Assistant placeholder is missing from the tail.");
      const current = chat.tail[index];
      chat.tail[index] = await this.prepareMessage(chatId, {
        ...current,
        content: current.content ?? "",
        outcome: "cancelled",
        finalized: true
      }, current.seq, { runId: activeRun.runId, finalized: true });
      delete chat.activeRun;
      chat.revision += 1;
      chat.updatedAt = Date.now();
      const previous = await this.readRunRecord(chatId, activeRun.requestId);
      await this.writeRunRecord(chatId, activeRun.requestId, { ...previous, status: "cancelled", finishedAt: Date.now() });
      await this.sealTail(chat);
      await this.commitManifest(chat, "run-cancel-manifest");
      return this.metadata(chat);
    });
  }

  async mutateMessage(chatIdOrTabId, input) {
    assertNoInternalReferences(input?.patch);
    const chatId = await this.resolveChatId(chatIdOrTabId);
    if (!chatId) throw storeError("NOT_FOUND", `Chat not found: ${chatIdOrTabId}`);
    if (!input || !["edit", "delete"].includes(input.type)) throw storeError("INVALID_MUTATION", "Message mutation must be edit or delete.");
    if (typeof input.messageId !== "string" || !input.messageId) throw storeError("INVALID_MUTATION", "Message id is required.");
    if (typeof input.mutationId !== "string" || !input.mutationId) throw storeError("INVALID_MUTATION", "Mutation id is required.");
    if (!Number.isInteger(input.expectedRevision)) throw storeError("INVALID_MUTATION", "Expected revision is required.");
    const mutationHash = hash({ type: input.type, messageId: input.messageId, patch: input.patch ?? null });
    return this.enqueue(chatId, async () => {
      const chat = await this.readManifest(chatId);
      chat.mutations ??= [];
      const prior = chat.mutations.find(entry => entry.mutationId === input.mutationId);
      if (prior) {
        if (prior.mutationHash !== mutationHash) throw storeError("IDEMPOTENCY_CONFLICT", "This mutation id was already used for a different change.");
        return { ...this.metadata(chat), replay: true };
      }
      if (chat.revision !== input.expectedRevision) throw storeError("CONFLICT", `Expected revision ${input.expectedRevision}, found ${chat.revision}.`);

      let messages = chat.tail;
      let messageIndex = messages.findIndex(message => message.id === input.messageId);
      let segmentIndex = -1;
      let oldSegmentFile = null;
      if (messageIndex < 0) {
        for (let index = 0; index < chat.segments.length; index += 1) {
          const candidate = await this.segmentMessages(chat, chat.segments[index]);
          const candidateIndex = candidate.findIndex(message => message.id === input.messageId);
          if (candidateIndex < 0) continue;
          messages = candidate;
          messageIndex = candidateIndex;
          segmentIndex = index;
          oldSegmentFile = chat.segments[index].file;
          break;
        }
      }
      if (messageIndex < 0) throw storeError("NOT_FOUND", `Message not found: ${input.messageId}`);
      const current = messages[messageIndex];
      if (current.finalized === false || chat.activeRun?.assistantMessageId === current.id) throw storeError("CHAT_BUSY", "A running assistant message cannot be changed.");
      if (input.type === "delete") {
        messages.splice(messageIndex, 1);
        chat.deletedCount = Number(chat.deletedCount ?? 0) + 1;
      } else {
        const patch = input.patch && typeof input.patch === "object" ? input.patch : {};
        const { id: _id, seq: _seq, role: _role, runId: _runId, finalized: _finalized, ...safePatch } = patch;
        messages[messageIndex] = await this.prepareMessage(chatId, {
          ...current,
          ...safePatch,
          id: current.id,
          seq: current.seq,
          role: current.role,
          runId: current.runId,
          finalized: true,
          editedAt: Date.now()
        }, current.seq, { runId: current.runId, finalized: true });
      }
      for (const constraint of chat.constraints ?? []) {
        if (constraint.status !== "active" || constraint.source?.messageId !== current.id) continue;
        constraint.status = "resolved";
        constraint.resolvedAt = Date.now();
        constraint.resolvedReason = input.type === "delete" ? "source-deleted" : "source-edited";
      }
      if (chat.summary?.valid !== false && current.seq <= Number(chat.summary?.coveredThroughSeq ?? 0)) {
        chat.summary.valid = false;
        chat.summary.invalidatedAt = new Date().toISOString();
        chat.summary.invalidatedReason = input.type === "delete" ? "source-deleted" : "source-edited";
      }

      if (segmentIndex >= 0) {
        if (messages.length === 0) {
          chat.segments.splice(segmentIndex, 1);
        } else {
          const serialized = JSON.stringify(messages);
          const contentHash = hash(serialized);
          const relative = `segments/${contentHash}.json`;
          await writeContentAddressed(path.join(this.chatDataDirectory(chat.id), relative), serialized, contentHash, this.hooks, "segment-rewrite");
          chat.segments[segmentIndex] = { fromSeq: messages[0].seq, toSeq: messages[messages.length - 1].seq, file: relative, contentHash };
        }
      }
      chat.revision += 1;
      chat.updatedAt = Date.now();
      chat.mutations.push({ mutationId: input.mutationId, mutationHash, revision: chat.revision, appliedAt: chat.updatedAt });
      await this.commitManifest(chat, "message-mutation-manifest");
      if (oldSegmentFile && !chat.segments.some(segment => segment.file === oldSegmentFile)) {
        await fs.rm(path.join(this.chatDataDirectory(chat.id), oldSegmentFile), { force: true }).catch(() => {});
      }
      return { ...this.metadata(chat), replay: false };
    });
  }

  async patchMetadata(chatIdOrTabId, patch, expectedRevision) {
    const chatId = await this.resolveChatId(chatIdOrTabId);
    if (!chatId) throw storeError("NOT_FOUND", `Chat not found: ${chatIdOrTabId}`);
    return this.enqueue(chatId, async () => {
      const chat = await this.readManifest(chatId);
      if (expectedRevision !== void 0 && chat.revision !== expectedRevision) throw storeError("CONFLICT", `Expected revision ${expectedRevision}, found ${chat.revision}.`);
      if (typeof patch.title === "string") chat.title = patch.title.slice(0, 500);
      if (typeof patch.archived === "boolean") {
        chat.archived = patch.archived;
        if (patch.archived) chat.archivedAt = Date.now(); else delete chat.archivedAt;
      }
      chat.revision += 1;
      chat.updatedAt = Date.now();
      await this.commitManifest(chat, "metadata-manifest");
      return this.metadata(chat);
    });
  }

  async replaceMessagesLegacy(chatId, messages) {
    const chat = await this.readManifest(chatId, { migrate: false });
    if (chat?.schemaVersion === CHAT_SCHEMA_VERSION) throw storeError("V2_FULL_REPLACE_REJECTED", "Full message replacement is not allowed for v2 chats. Use run/message operations.");
    const next = { ...chat, messages, updatedAt: Date.now() };
    await atomicWrite(this.chatFile(chatId), JSON.stringify(next, null, 2), this.hooks, "legacy-manifest");
    return next;
  }

  async finishDeletion(chatId) {
    const target = this.chatDataDirectory(chatId);
    const root = path.resolve(this.dataDirectory);
    if (path.dirname(target) !== root || !isPathInside(root, target)) throw storeError("INVALID_ID", "Refusing to delete an unsafe chat data path.");
    try {
      const stat = await fs.lstat(target);
      if (stat.isSymbolicLink()) throw storeError("UNSAFE_DELETE", "Refusing to delete a symbolic-link chat data directory.");
      const [rootReal, targetReal] = await Promise.all([fs.realpath(root), fs.realpath(target)]);
      if (!isPathInside(rootReal, targetReal)) throw storeError("UNSAFE_DELETE", "Refusing to delete chat data outside its root.");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await this.hooks?.beforeStep?.("delete-data", { chatId });
    await fs.rm(target, { recursive: true, force: true });
    await this.hooks?.beforeStep?.("delete-manifest", { chatId });
    await fs.rm(this.chatFile(chatId), { force: true });
  }

  async deleteChat(chatIdOrTabId) {
    let chatId = await this.resolveChatId(chatIdOrTabId);
    if (!chatId && await pathExists(this.chatFile(chatIdOrTabId))) chatId = assertChatId(chatIdOrTabId);
    if (!chatId) return { success: true };
    return this.enqueue(chatId, async () => {
      const chat = await this.readManifest(chatId);
      if (chat.activeRun) throw storeError("CHAT_BUSY", "A running chat cannot be deleted.");
      if (chat.lifecycle !== "deleting") {
        chat.lifecycle = "deleting";
        chat.revision += 1;
        await this.commitManifest(chat, "delete-mark-manifest");
      }
      await this.finishDeletion(chatId);
      return { success: true };
    });
  }
}

export {
  BODY_MAX_INLINE_BYTES,
  CHAT_SCHEMA_VERSION,
  ChatStore,
  READ_DEFAULT_LIMIT,
  READ_MAX_BYTES,
  SEARCH_BATCH_MAX_BYTES,
  SEARCH_OUTPUT_MAX_BYTES,
  TAIL_MAX_BYTES,
  TAIL_MAX_FINALIZED_MESSAGES,
  atomicWrite,
  bytes,
  hash,
  storeError
};
