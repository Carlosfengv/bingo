import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import { CANVAS_OPERATION_PROTOCOL_VERSION, getById, getChildren$2, getRootIds, parseJSX } from "@bingo/compiler";
import { applyOperationsToStore } from "../../packages/editor/src/shared/utils/operations";

const requireModule = createRequire(new URL("../../packages/editor/package.json", import.meta.url));
const handlerBundle = build({
  entryPoints: [new URL("../../packages/editor/src/shell/hooks/useCanvasToolHandler.ts", import.meta.url).pathname],
  bundle: true, packages: "external", platform: "node", format: "cjs", write: false,
});

async function harness(run) {
  const initial = parseJSX('<main data-element-id="parent" />');
  const storeRef = { current: initial };
  let requestHandler;
  let cleanup;
  const responses = [];
  const history = [];
  let publications = 0;
  const module = { exports: {} };
  vm.runInNewContext((await handlerBundle).outputFiles[0].text, {
    module, exports: module.exports, console, performance, setInterval, clearInterval, structuredClone, Map, Set, URLSearchParams,
    require: name => name === "react" ? {
      useEffectEvent: callback => callback,
      useRef: current => ({ current }),
      useEffect: callback => { cleanup = callback(); },
    } : name === "react-dom" ? { flushSync: callback => callback() } : requireModule(name),
    window: { location: {search:""}, api: {
      on: (_channel, callback) => { requestHandler = callback; return () => {}; },
      send: (_channel, value) => responses.push(value.result),
    } },
  });
  const canvasId = "f464381c-4fb1-4db0-86c3-f518a9c6d4fa";
  const tabs = [{ id: "tab", canvasId, name: "Page", store: initial, loaded: true }];
  module.exports.useCanvasToolHandler({
    projectId: "project", tabs,
    activeTabIdRef: { current: "tab" }, storeRef, iconLibraries: {}, componentIndex: {},
    elementLocksRef: { current: new Map([["parent", "claim"]]) },
    claimIdToChatTabIdRef: { current: new Map() }, setElementLocksVersion: () => {},
    findElementTab: id => getById(storeRef.current, id) ? { tabId: "tab", store: storeRef.current } : null,
    setStore: store => { publications++; storeRef.current = store; tabs[0].store = store; },
    getCanvasRevision: () => publications,
    history: {
      recordOperations: (_tab, operations) => history.push(operations),
      pushOperation: (_tab, store, operation) => {
        history.push([operation]);
        return applyOperationsToStore(store, [operation]);
      },
    },
  });
  const send = async (jsx, operationId = "operation", operation = "add_to_canvas", args = {}) => {
    await requestHandler({ requestId: operationId, operationId, projectId: "project", protocolVersion: CANVAS_OPERATION_PROTOCOL_VERSION,
      operation, args: { jsx, parent_id: "parent", claim_id: "claim", ...args } });
    return responses.at(-1);
  };
  try {
    await run({ send, storeRef, initial, history, canvasId, publications: () => publications });
  } finally {
    cleanup?.();
  }
}

test("renderer canvas_add repairs line-34 adjacent roots and commits the batch only once", async () => {
  await harness(async ({ send, storeRef, history, publications }) => {
    const jsx = `<section><h2>Typography</h2>${"\n".repeat(32)}</section>\n<section><h2>Spacing</h2></section>`;
    const result = await send(jsx);
    assert.equal(result.isError, undefined, JSON.stringify(result));
    assert.equal(result.structuredContent.operation.applied, true);
    assert.equal(result.structuredContent.recovery.status, "recovered");
    assert.equal(result.structuredContent.recovery.stage, "commit");
    assert.equal(result.structuredContent.recovery.attempts.length, 1);
    const ids = getChildren$2(storeRef.current, "parent");
    // Bundled store helpers create arrays in the renderer VM's realm.
    assert.deepEqual(Array.from(ids, id => getById(storeRef.current, id)?.tag), ["section", "section"]);
    assert.deepEqual(Array.from(getRootIds(storeRef.current)), ["parent"]);
    assert.equal(history.length, 1);
    assert.equal(history[0].length, 2);
    assert.equal(publications(), 1);
    const replay = await send(jsx);
    assert.equal(replay, result);
    assert.equal(publications(), 1);
  });
});

test("renderer copy edits preserve text leaves, literal characters, styles and identity", async () => {
  await harness(async ({ send, storeRef, history, publications }) => {
    await send('<section><span>合同草案.pdf</span><span>Unchanged</span></section>');
    const section = getChildren$2(storeRef.current, "parent")[0];
    const span = getChildren$2(storeRef.current, section)[0];
    const leaf = getChildren$2(storeRef.current, span)[0];
    getById(storeRef.current, leaf).styles = { color: "var(--foreground)" };
    const snapshot = store => JSON.parse(JSON.stringify(store, (_key, value) => value instanceof Map ? Object.fromEntries(value) : value));
    const before = snapshot(storeRef.current);
    const replacement = '合同定稿.pdf $& <Button> & {value}\n第二行';
    const result = await send(undefined, "copy", "edit_element", { element_id: leaf, old_string: "合同草案.pdf", new_string: replacement });
    assert.equal(result.isError, undefined, JSON.stringify(result));
    before.byId[leaf].text = replacement;
    assert.deepEqual(snapshot(storeRef.current), before);
    assert.equal(history.at(-1)[0].type, "set_text");
    assert.equal(publications(), 2);
    const removed = await send(undefined, "empty", "edit_element", { element_id: leaf, old_string: replacement, new_string: "" });
    assert.equal(removed.isError, undefined, JSON.stringify(removed));
    assert.equal(getById(storeRef.current, leaf).text, "");
    assert.equal(getById(storeRef.current, leaf).type, "text");
  });
});

test("renderer text edits reject missing matches, ambiguous matches and missing claims without mutation", async () => {
  await harness(async ({ send, storeRef, publications }) => {
    await send('<span>copy copy</span>');
    const span = getChildren$2(storeRef.current, "parent")[0];
    const leaf = getChildren$2(storeRef.current, span)[0];
    const before = storeRef.current;
    for (const [id, args] of [
      ["missing", { old_string: "absent" }],
      ["ambiguous", { old_string: "copy" }],
      ["claim", { old_string: "copy copy", claim_id: "wrong" }],
    ]) {
      const result = await send(undefined, id, "edit_element", { element_id: leaf, new_string: "changed", ...args });
      assert.equal(result.isError, true, JSON.stringify(result));
      assert.equal(storeRef.current, before);
    }
    assert.equal(publications(), 1);
    const result = await send(undefined, "all", "edit_element", { element_id: leaf, old_string: "copy", new_string: "changed", replace_all: true });
    assert.equal(result.isError, undefined, JSON.stringify(result));
    assert.equal(getById(storeRef.current, leaf).text, "changed changed");
  });
});

test("structured canvas reads retain JSX and large-page summaries for MCP clients", async () => {
  await harness(async ({ send, storeRef, canvasId }) => {
    await send('<span>Contract</span>');
    const span = getChildren$2(storeRef.current, "parent")[0];
    const leaf = getChildren$2(storeRef.current, span)[0];
    for (const element_id of [leaf, "parent", undefined]) {
      const result = await send(undefined, `read-${element_id}`, "read_canvas", { canvas_id: canvasId, element_id });
      assert.equal(result.isError, undefined, JSON.stringify(result));
      assert.equal(result.structuredContent.jsx, result.content[0].text);
      assert.match(result.structuredContent.jsx, /Contract/);
    }
    await send(`<span>${"long text ".repeat(1000)}</span>`, "long");
    const summary = await send(undefined, "summary", "read_canvas", { canvas_id: canvasId });
    assert.equal(summary.structuredContent.summary, summary.content[0].text);
    assert.match(summary.structuredContent.summary, /parent/);
  });
});

test("renderer canvas_insert uses the same recovery path", async () => {
  await harness(async ({ send, storeRef, publications }) => {
    const result = await send("<section />\n<section />", "insert", "insert_element");
    assert.equal(result.isError, undefined, JSON.stringify(result));
    assert.equal(result.structuredContent.recovery.status, "recovered");
    assert.equal(getChildren$2(storeRef.current, "parent").length, 2);
    assert.equal(publications(), 1);
  });
});

test("renderer rejects malformed recovery candidates without publishing a partial canvas", async () => {
  await harness(async ({ send, storeRef, initial, history, publications }) => {
    const result = await send("<section />\n<section>");
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent.operation.applied, false);
    assert.equal(result.structuredContent.recovery.status, "failed");
    assert.equal(storeRef.current, initial);
    assert.equal(history.length, 0);
    assert.equal(publications(), 0);
  });
});
