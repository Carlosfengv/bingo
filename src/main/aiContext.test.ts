import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPONENT_TOOL_MAX_BYTES,
  CHAT_MEMORY_CONTEXT_BUDGET,
  buildAiChatContext,
  buildChatMemorySection,
  buildComponentCatalog,
  buildProjectContextSnapshot,
  paginateComponentCatalog,
  utf8Bytes
} from "./aiContext";

function componentIndex(count, options = {}) {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => {
    const number = String(index).padStart(3, "0");
    const name = options.names?.[index] ?? `Component${number}`;
    return [name, {
      path: options.paths?.[index] ?? `src/components/${number}/${name}.tsx`,
      exportName: index === 0 && options.defaultFirst ? "default" : name,
      ...(options.props?.[index] ? { props: options.props[index] } : {})
    }];
  }));
}

test("distinguishes an unavailable index from a confirmed empty index", () => {
  const unavailable = buildProjectContextSnapshot({ projectKey: "p", indexAvailable: false });
  const empty = buildProjectContextSnapshot({ projectKey: "p", indexAvailable: true, componentIndex: {}, freshness: "ready" });
  assert.deepEqual(unavailable.componentCoverage, { total: 0, included: 0, complete: false });
  assert.deepEqual(empty.componentCoverage, { total: 0, included: 0, complete: true });
  assert.match(buildComponentCatalog(unavailable).text, /Do not treat 0\/0 as a confirmed empty project/);
  assert.doesNotMatch(buildComponentCatalog(empty).text, /Button, Card, Input, Badge/);
});

test("component revision is stable for equivalent ordering and changes with catalog data", () => {
  const first = buildProjectContextSnapshot({
    projectKey: "p",
    indexAvailable: true,
    componentIndex: {
      Button: { path: "components/Button.tsx", exportName: "default" },
      卡片: { path: "组件/卡片.tsx", exportName: "卡片" }
    }
  });
  const reordered = buildProjectContextSnapshot({
    projectKey: "p",
    indexAvailable: true,
    componentIndex: {
      卡片: { exportName: "卡片", path: "组件/卡片.tsx" },
      Button: { exportName: "default", path: "components/Button.tsx" }
    }
  });
  const changed = buildProjectContextSnapshot({
    projectKey: "p",
    indexAvailable: true,
    componentIndex: {
      卡片: { exportName: "卡片", path: "组件/新卡片.tsx" },
      Button: { exportName: "default", path: "components/Button.tsx" }
    }
  });
  assert.equal(first.componentRevision, reordered.componentRevision);
  assert.notEqual(first.componentRevision, changed.componentRevision);
});

for (const count of [0, 1, 30, 80, 500]) {
  test(`builds a bounded catalog for ${count} component entries`, () => {
    const snapshot = buildProjectContextSnapshot({ projectKey: "p", indexAvailable: true, freshness: "ready", componentIndex: componentIndex(count) });
    const result = buildComponentCatalog(snapshot);
    assert.ok(utf8Bytes(result.text) <= 4_000);
    assert.equal(result.total, count);
    assert.equal(result.included + result.omitted, count);
    assert.match(result.text, new RegExp(`Coverage: ${result.included}/${count} indexed entries; complete: ${result.complete}`));
  });
}

test("prioritizes explicitly referenced and request-matched components in a large catalog", () => {
  const index = componentIndex(500);
  index.ZebraCard = { path: "src/very/deep/ZebraCard.tsx", exportName: "default" };
  const snapshot = buildProjectContextSnapshot({ projectKey: "p", indexAvailable: true, freshness: "ready", componentIndex: index });
  const result = buildComponentCatalog(snapshot, { currentRequest: "Please update ZebraCard", explicitComponents: ["ZebraCard"], budgetBytes: 1_200 });
  assert.match(result.text, /ZebraCard/);
  assert.match(result.text, /export: default/);
  assert.equal(result.complete, false);
});

test("bounds Chinese paths and oversized props without splitting invalid UTF-8", () => {
  const veryLongPath = `组件/${"很长的目录/".repeat(600)}按钮.tsx`;
  const snapshot = buildProjectContextSnapshot({
    projectKey: "中文项目",
    indexAvailable: true,
    componentIndex: {
      中文按钮: {
        path: veryLongPath,
        exportName: "default",
        props: { description: { type: "string", example: "例".repeat(4_000) } }
      }
    }
  });
  const page = paginateComponentCatalog(snapshot, { limit: 80 });
  assert.ok(utf8Bytes(page.text) <= COMPONENT_TOOL_MAX_BYTES);
  assert.doesNotMatch(page.text, /�/);
  assert.match(page.text, /metadata too large|entry truncated/);
});

test("paginates empty queries at 40 by default and 80 at maximum", () => {
  const snapshot = buildProjectContextSnapshot({ projectKey: "p", indexAvailable: true, componentIndex: componentIndex(120) });
  const first = paginateComponentCatalog(snapshot, {});
  assert.equal(first.report.included, 40);
  assert.equal(first.report.total, 120);
  assert.ok(first.report.nextCursor);
  const second = paginateComponentCatalog(snapshot, { cursor: first.report.nextCursor, limit: 999 });
  assert.equal(second.report.offset, 40);
  assert.equal(second.report.included, 80);
  assert.equal(second.report.nextCursor, null);
  assert.ok(utf8Bytes(first.text) <= COMPONENT_TOOL_MAX_BYTES);
  assert.ok(utf8Bytes(second.text) <= COMPONENT_TOOL_MAX_BYTES);
});

test("binds component cursors to project, query, and revision", () => {
  const firstSnapshot = buildProjectContextSnapshot({ projectKey: "p", indexAvailable: true, componentIndex: componentIndex(90) });
  const first = paginateComponentCatalog(firstSnapshot, { query: "component" });
  assert.ok(first.report.nextCursor);
  const wrongQuery = paginateComponentCatalog(firstSnapshot, { query: "other", cursor: first.report.nextCursor });
  assert.equal(wrongQuery.error.code, "INVALID_CURSOR");
  const changedSnapshot = buildProjectContextSnapshot({ projectKey: "p", indexAvailable: true, componentIndex: componentIndex(91) });
  const stale = paginateComponentCatalog(changedSnapshot, { query: "component", cursor: first.report.nextCursor });
  assert.equal(stale.error.code, "STALE_CURSOR");
  const otherProject = buildProjectContextSnapshot({ projectKey: "other", indexAvailable: true, componentIndex: componentIndex(90) });
  assert.equal(paginateComponentCatalog(otherProject, { query: "component", cursor: first.report.nextCursor }).error.code, "INVALID_CURSOR");
});

test("builds the CLI prompt from real project context and preserves Bingo slash expansion", () => {
  const snapshot = buildProjectContextSnapshot({
    projectKey: "p",
    indexAvailable: true,
    freshness: "ready",
    componentIndex: { RealButton: { path: "components/RealButton.tsx", exportName: "default" } },
    themeText: "--color-primary: blue",
    activePage: { id: "page-1", name: "Home", summary: "One card", available: true }
  });
  const built = buildAiChatContext({
    snapshot,
    promptContext: { canvasElements: [], attachedElements: [] },
    messages: [{ role: "user", content: "/import-design-system /tmp/source" }]
  });
  assert.match(built.prompt, /RealButton/);
  assert.match(built.prompt, /components\/RealButton\.tsx/);
  assert.doesNotMatch(built.prompt, /Button, Card, Input, Badge/);
  assert.match(built.prompt, /Call read_skill with name "bingo-import-from-project"/);
  assert.equal(built.report.estimateMethod, "utf8-byte-proxy");
  assert.equal(built.report.componentCountTotal, 1);
});

test("labels the current user message so explicit project-memory authorization is traceable", () => {
  const snapshot = buildProjectContextSnapshot({ projectKey: "p", indexAvailable: true, componentIndex: {} });
  const built = buildAiChatContext({
    snapshot,
    promptContext: { canvasElements: [], attachedElements: [] },
    messages: [{ id: "message-current", seq: 17, role: "user", content: "Remember that buttons use cobalt." }]
  });
  assert.match(built.prompt, /Current user message source: message-current, seq 17/);
});

test("bounds serialized chat summary and keeps exact source labels", () => {
  const section = buildChatMemorySection({
    constraintText: "- Keep the existing public API.",
    summary: {
      generation: 3,
      coveredThroughSeq: 42,
      goal: Array.from({ length: 50 }, (_, index) => ({
        text: `Goal ${index} ${"很长".repeat(80)}`,
        verification: "user-stated",
        evidence: [{ kind: "message", messageId: `m-${index}`, seq: index + 1 }]
      })),
      decisions: [], completed: [], pending: [], openQuestions: []
    }
  });
  assert.ok(utf8Bytes(section.text) <= CHAT_MEMORY_CONTEXT_BUDGET);
  assert.match(section.text, /Active Chat Constraints \(verbatim\)/);
  assert.match(section.text, /sources: message:m-0@1/);
  assert.ok(section.omittedSummaryItems > 0);
});
