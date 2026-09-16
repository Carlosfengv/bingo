import { buildChatSystemPrompt, buildCLIPrompt, formatComponentSearchLine } from "@bingo/compiler";
import { createHash } from "node:crypto";

const COMPONENT_CONTEXT_BUDGET = 4_000;
const PROJECT_STATE_CONTEXT_BUDGET = 2_000;
const CHAT_MEMORY_CONTEXT_BUDGET = 2_000;
const COMPONENT_TOOL_MAX_BYTES = 16 * 1024;
const COMPONENT_TOOL_DEFAULT_LIMIT = 40;
const COMPONENT_TOOL_MAX_LIMIT = 80;
const COMPONENT_LINE_MAX_BYTES = 2_048;
const THEME_TEXT_MAX_BYTES = 8 * 1024;
const PAGE_TEXT_MAX_BYTES = 4 * 1024;

function utf8Bytes(value) {
  return Buffer.byteLength(String(value ?? ""), "utf8");
}

function truncateUtf8(value, maxBytes, suffix = "\n… [truncated]") {
  const text = String(value ?? "");
  if (utf8Bytes(text) <= maxBytes) return text;
  const suffixBytes = utf8Bytes(suffix);
  const target = Math.max(0, maxBytes - suffixBytes);
  const bytes = Buffer.from(text, "utf8");
  let end = Math.min(target, bytes.length);
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end -= 1;
  return bytes.subarray(0, end).toString("utf8") + suffix;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const key of Object.keys(value).sort()) {
    const item = value[key];
    if (item !== void 0 && typeof item !== "function") result[key] = stableValue(item);
  }
  return result;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function hashValue(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableStringify(value)).digest("hex");
}

function cleanInline(value, fallback = "unknown") {
  const text = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim() : "";
  return text || fallback;
}

function normalizeComponentIndex(index) {
  if (!index || typeof index !== "object" || Array.isArray(index)) return [];
  return Object.entries(index).map(([rawName, rawInfo]) => {
    const info = rawInfo && typeof rawInfo === "object" ? rawInfo : {};
    const props = info.props && typeof info.props === "object" && !Array.isArray(info.props) ? stableValue(info.props) : void 0;
    return {
      name: cleanInline(rawName),
      path: cleanInline(info.path),
      ...(typeof info.exportName === "string" && info.exportName.trim() ? { exportName: cleanInline(info.exportName) } : {}),
      ...(props ? { props } : {})
    };
  }).sort((left, right) => left.path.localeCompare(right.path, "en") || left.name.localeCompare(right.name, "en"));
}

function componentRevision(entries) {
  return `components-v1-${hashValue(entries)}`;
}

function textRevision(prefix, text) {
  return `${prefix}-v1-${hashValue(String(text ?? ""))}`;
}

function buildProjectContextSnapshot(input) {
  const indexAvailable = input.indexAvailable === true;
  const components = normalizeComponentIndex(indexAvailable ? input.componentIndex : {});
  const themeText = typeof input.themeText === "string" ? input.themeText.trim() : "";
  const activePageInput = input.activePage && typeof input.activePage === "object" ? input.activePage : {};
  const activePageSummary = typeof activePageInput.summary === "string" ? activePageInput.summary.trim() : "";
  return {
    projectKey: String(input.projectKey ?? ""),
    componentRevision: componentRevision(components),
    freshness: ["ready", "building", "failed", "unavailable"].includes(input.freshness) ? input.freshness : indexAvailable ? "ready" : "unavailable",
    components,
    indexAvailable,
    componentCoverage: {
      total: components.length,
      included: 0,
      complete: indexAvailable && components.length === 0
    },
    theme: {
      text: themeText,
      revision: textRevision("theme", themeText),
      available: themeText.length > 0
    },
    activePage: {
      ...(typeof activePageInput.id === "string" && activePageInput.id ? { id: activePageInput.id } : {}),
      ...(typeof activePageInput.name === "string" && activePageInput.name ? { name: activePageInput.name } : {}),
      summary: activePageSummary,
      available: activePageInput.available === true || activePageSummary.length > 0
    }
  };
}

function normalizeSearchText(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase();
}

function wordsIn(value) {
  return normalizeSearchText(value).split(/[^\p{L}\p{N}_$./-]+/u).filter(Boolean);
}

function rankComponents(entries, currentRequest, explicitComponents = []) {
  const request = normalizeSearchText(currentRequest);
  const requestWords = new Set(wordsIn(currentRequest));
  const explicit = new Set(explicitComponents.flatMap(item => {
    if (typeof item === "string") return [normalizeSearchText(item)];
    if (!item || typeof item !== "object") return [];
    return [item.name, item.path, item.componentName].filter(Boolean).map(normalizeSearchText);
  }));
  const priority = entry => {
    const name = normalizeSearchText(entry.name);
    const path = normalizeSearchText(entry.path);
    if (explicit.has(name) || explicit.has(path)) return 0;
    if (request.includes(path) || requestWords.has(name)) return 1;
    if (request.includes(name) || wordsIn(entry.name).some(word => requestWords.has(word))) return 2;
    return 3;
  };
  return [...entries].sort((left, right) => priority(left) - priority(right) || left.path.localeCompare(right.path, "en") || left.name.localeCompare(right.name, "en"));
}

function boundedProps(props) {
  if (!props) return { props: void 0, omitted: false };
  if (utf8Bytes(stableStringify(props)) <= 1_024) return { props, omitted: false };
  return { props: void 0, omitted: true };
}

function componentLine(entry) {
  const bounded = boundedProps(entry.props);
  const exportSuffix = entry.exportName ? ` — export: ${entry.exportName}` : " — export: unknown";
  const propsSuffix = bounded.omitted ? " — props: omitted (metadata too large; read source)" : entry.props ? "" : " — props: unavailable; read source when API details are needed";
  const raw = `${formatComponentSearchLine(entry.name, entry.path, bounded.props)}${exportSuffix}${propsSuffix}`;
  return truncateUtf8(raw, COMPONENT_LINE_MAX_BYTES, "… [entry truncated; use targeted search]");
}

function componentCatalogHeader(snapshot, included, total, nextCursor) {
  const complete = snapshot.indexAvailable && included === total && !nextCursor;
  const propsKnown = snapshot.components.filter(entry => entry.props).length;
  return [
    "## Project Components",
    `Revision: ${snapshot.componentRevision}`,
    `Freshness: ${snapshot.freshness}`,
    `Coverage: ${included}/${total} indexed entries; complete: ${complete}`,
    `Props metadata: ${propsKnown}/${snapshot.components.length} indexed entries`,
    snapshot.indexAvailable ? "Use these source paths directly. Read the source when its API is needed. Search only for a missing component or when this snapshot is stale." : "Component index unavailable. Do not treat 0/0 as a confirmed empty project; use project files or a targeted component query when needed."
  ].join("\n");
}

function buildComponentCatalog(snapshot, options = {}) {
  const budget = Math.max(512, Number(options.budgetBytes) || COMPONENT_CONTEXT_BUDGET);
  const ranked = rankComponents(snapshot.components, options.currentRequest, options.explicitComponents);
  const selected = [];
  for (const entry of ranked) {
    const candidate = [...selected, componentLine(entry)];
    const text = `${componentCatalogHeader(snapshot, candidate.length, ranked.length)}\n${candidate.join("\n")}`;
    if (utf8Bytes(text) > budget) continue;
    selected.push(candidate[candidate.length - 1]);
  }
  const text = `${componentCatalogHeader(snapshot, selected.length, ranked.length)}${selected.length ? `\n${selected.join("\n")}` : ""}`;
  return {
    text: truncateUtf8(text, budget),
    included: selected.length,
    total: ranked.length,
    complete: snapshot.indexAvailable && selected.length === ranked.length,
    omitted: ranked.length - selected.length
  };
}

function buildProjectContextSection(snapshot, options = {}) {
  const componentCatalog = buildComponentCatalog(snapshot, options);
  const stateBudget = Math.max(512, Number(options.stateBudgetBytes) || PROJECT_STATE_CONTEXT_BUDGET);
  const pageText = snapshot.activePage.available ? [snapshot.activePage.name ? `Name: ${cleanInline(snapshot.activePage.name)}` : "", snapshot.activePage.id ? `ID: ${cleanInline(snapshot.activePage.id)}` : "", truncateUtf8(snapshot.activePage.summary, PAGE_TEXT_MAX_BYTES)].filter(Boolean).join("\n") : "Active page information unavailable.";
  const themeText = snapshot.theme.available ? truncateUtf8(snapshot.theme.text, THEME_TEXT_MAX_BYTES) : "Project theme unavailable.";
  const rawState = [`## Project Theme\nRevision: ${snapshot.theme.revision}\n${themeText}`, `## Active Page\n${pageText}`].join("\n\n");
  const stateText = truncateUtf8(rawState, stateBudget);
  const text = `${componentCatalog.text}\n\n${stateText}`;
  const degradationReasons = [];
  if (!snapshot.indexAvailable) degradationReasons.push("component-index-unavailable");
  if (snapshot.freshness !== "ready") degradationReasons.push(`component-index-${snapshot.freshness}`);
  if (componentCatalog.omitted > 0) degradationReasons.push("component-catalog-truncated");
  if (!snapshot.theme.available) degradationReasons.push("theme-unavailable");
  if (!snapshot.activePage.available) degradationReasons.push("active-page-unavailable");
  return {
    text,
    report: {
      componentRevision: snapshot.componentRevision,
      componentCountIncluded: componentCatalog.included,
      componentCountTotal: componentCatalog.total,
      selectedMemoryIds: [],
      textBudgetUnits: utf8Bytes(text),
      estimateMethod: "utf8-byte-proxy",
      omittedSections: componentCatalog.omitted > 0 ? ["component-catalog-tail"] : [],
      degradationReasons,
      themeRevision: snapshot.theme.revision,
      componentCatalogComplete: componentCatalog.complete
    }
  };
}

function summaryEvidenceLabel(evidence) {
  if (evidence?.kind === "message") return `message:${cleanInline(evidence.messageId, "unknown")}@${Number(evidence.seq) || "?"}`;
  if (evidence?.kind === "operation") return `operation:${cleanInline(evidence.operationId, "unknown")}`;
  return null;
}

function buildChatMemorySection(chatContext = {}, options = {}) {
  const budget = Math.max(512, Number(options.budgetBytes) || CHAT_MEMORY_CONTEXT_BUDGET);
  const sections = [];
  const constraintText = typeof chatContext.constraintText === "string" ? chatContext.constraintText.trim() : "";
  if (constraintText) {
    const section = `## Active Chat Constraints (verbatim)\n${constraintText}`;
    if (utf8Bytes(section) > budget) throw Object.assign(new Error("Active chat constraints exceed the serialized context budget."), { code: "CONTEXT_CAPACITY" });
    sections.push(section);
  }
  const summary = chatContext.summary;
  let omittedSummaryItems = 0;
  if (summary && typeof summary === "object") {
    const header = `## Earlier Chat Summary\nGeneration: ${Number(summary.generation) || 0}; covered through seq ${Number(summary.coveredThroughSeq) || 0}`;
    const lines = [];
    for (const group of ["goal", "decisions", "completed", "pending", "openQuestions"]) {
      for (const item of Array.isArray(summary[group]) ? summary[group] : []) {
        const sources = (Array.isArray(item?.evidence) ? item.evidence : []).map(summaryEvidenceLabel).filter(Boolean).slice(0, 3);
        const line = `- ${group}: ${cleanInline(item?.text, "(empty)")} [${cleanInline(item?.verification, "inferred")}${sources.length ? `; sources: ${sources.join(", ")}` : ""}]`;
        const candidateSummary = `${header}${lines.length ? `\n${[...lines, line].join("\n")}` : `\n${line}`}`;
        const candidate = [...sections, candidateSummary].join("\n\n");
        if (utf8Bytes(candidate) <= budget) lines.push(line); else omittedSummaryItems += 1;
      }
    }
    if (lines.length > 0 && utf8Bytes([...sections, `${header}\n${lines.join("\n")}`].join("\n\n")) <= budget) sections.push(`${header}\n${lines.join("\n")}`);
    else omittedSummaryItems += ["goal", "decisions", "completed", "pending", "openQuestions"].reduce((count, group) => count + (Array.isArray(summary[group]) ? summary[group].length : 0), 0) - omittedSummaryItems;
  }
  const text = sections.join("\n\n");
  return { text, bytes: utf8Bytes(text), omittedSummaryItems };
}

function buildAiChatContext(input) {
  const projectContext = input.projectContext ?? buildProjectContextSection(input.snapshot, {
    currentRequest: input.messages?.[input.messages.length - 1]?.content,
    explicitComponents: input.explicitComponents,
    budgetBytes: input.componentBudgetBytes,
    stateBudgetBytes: input.stateBudgetBytes
  });
  const currentMessage = input.messages?.[input.messages.length - 1];
  const sourceLabel = currentMessage?.id
    ? `\n\nCurrent user message source: ${cleanInline(currentMessage.id)}, seq ${Number(currentMessage.seq) || "?"}`
    : "";
  const systemPrompt = buildChatSystemPrompt({
    ...input.promptContext,
    projectContextText: projectContext.text
  }) + sourceLabel;
  return {
    prompt: buildCLIPrompt(`${systemPrompt}${input.supplementalInstructions ?? ""}`, input.messages ?? []),
    report: projectContext.report
  };
}

function cursorProjectKey(projectKey) {
  return hashValue(String(projectKey)).slice(0, 16);
}

function encodeComponentCursor(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeComponentCursor(cursor) {
  try {
    const value = JSON.parse(Buffer.from(String(cursor), "base64url").toString("utf8"));
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function componentPageError(code, message) {
  return { error: { code, message }, text: `${code}: ${message}` };
}

function paginateComponentCatalog(snapshot, args = {}, options = {}) {
  if (!snapshot.indexAvailable) return {
    text: `${componentCatalogHeader(snapshot, 0, 0)}\nNo component index is currently available.`,
    report: { total: 0, included: 0, nextCursor: null, revision: snapshot.componentRevision }
  };
  const query = normalizeSearchText(args.query).trim();
  const limit = Math.min(COMPONENT_TOOL_MAX_LIMIT, Math.max(1, Number.isFinite(Number(args.limit)) ? Math.floor(Number(args.limit)) : COMPONENT_TOOL_DEFAULT_LIMIT));
  let offset = 0;
  if (args.cursor) {
    const cursor = decodeComponentCursor(args.cursor);
    if (!cursor || cursor.v !== 1 || cursor.p !== cursorProjectKey(snapshot.projectKey) || cursor.q !== query || !Number.isInteger(cursor.o) || cursor.o < 0) return componentPageError("INVALID_CURSOR", "The component cursor does not match this project or query. Start the search again without a cursor.");
    if (cursor.r !== snapshot.componentRevision) return componentPageError("STALE_CURSOR", `The component index changed from ${cursor.r} to ${snapshot.componentRevision}. Start the search again without a cursor.`);
    offset = cursor.o;
  }
  const matched = snapshot.components.filter(entry => !query || normalizeSearchText(entry.name).includes(query) || normalizeSearchText(entry.path).includes(query)).sort((left, right) => left.path.localeCompare(right.path, "en") || left.name.localeCompare(right.name, "en"));
  if (offset > matched.length) return componentPageError("INVALID_CURSOR", "The component cursor points past the end of this result set.");
  const maxBytes = Math.max(1_024, Number(options.maxBytes) || COMPONENT_TOOL_MAX_BYTES);
  const selected = [];
  for (const entry of matched.slice(offset, offset + limit)) {
    const line = componentLine(entry);
    const provisionalNext = offset + selected.length + 1 < matched.length ? encodeComponentCursor({ v: 1, p: cursorProjectKey(snapshot.projectKey), q: query, r: snapshot.componentRevision, o: offset + selected.length + 1 }) : null;
    const header = componentCatalogHeader(snapshot, selected.length + 1, matched.length, provisionalNext);
    const candidate = `${header}\nQuery: ${query || "(all)"}\n${[...selected, line].join("\n")}${provisionalNext ? `\nNext cursor: ${provisionalNext}` : ""}`;
    if (utf8Bytes(candidate) > maxBytes) break;
    selected.push(line);
  }
  const nextOffset = offset + selected.length;
  const nextCursor = nextOffset < matched.length ? encodeComponentCursor({ v: 1, p: cursorProjectKey(snapshot.projectKey), q: query, r: snapshot.componentRevision, o: nextOffset }) : null;
  const header = componentCatalogHeader(snapshot, selected.length, matched.length, nextCursor);
  const body = selected.length ? selected.join("\n") : query ? `No components matching "${cleanInline(args.query, "")}".` : "The current index is confirmed empty.";
  const text = `${header}\nQuery: ${query || "(all)"}\n${body}${nextCursor ? `\nNext cursor: ${nextCursor}` : ""}`;
  return {
    text: truncateUtf8(text, maxBytes),
    report: { total: matched.length, included: selected.length, nextCursor, revision: snapshot.componentRevision, offset }
  };
}

export {
  CHAT_MEMORY_CONTEXT_BUDGET,
  COMPONENT_CONTEXT_BUDGET,
  COMPONENT_TOOL_DEFAULT_LIMIT,
  COMPONENT_TOOL_MAX_BYTES,
  COMPONENT_TOOL_MAX_LIMIT,
  PAGE_TEXT_MAX_BYTES,
  PROJECT_STATE_CONTEXT_BUDGET,
  THEME_TEXT_MAX_BYTES,
  buildAiChatContext,
  buildChatMemorySection,
  buildComponentCatalog,
  buildProjectContextSection,
  buildProjectContextSnapshot,
  componentRevision,
  normalizeComponentIndex,
  paginateComponentCatalog,
  rankComponents,
  stableStringify,
  truncateUtf8,
  utf8Bytes
};
