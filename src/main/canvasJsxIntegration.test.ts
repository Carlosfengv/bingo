import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import { CANVAS_OPERATION_PROTOCOL_VERSION, getById, getChildren$2, getRootIds, parseJSX } from "@bingo/compiler";

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
    module, exports: module.exports, console, performance, setInterval, clearInterval, structuredClone, Map, Set,
    require: name => name === "react" ? {
      useEffectEvent: callback => callback,
      useRef: current => ({ current }),
      useEffect: callback => { cleanup = callback(); },
    } : name === "react-dom" ? { flushSync: callback => callback() } : requireModule(name),
    window: { api: {
      on: (_channel, callback) => { requestHandler = callback; return () => {}; },
      send: (_channel, value) => responses.push(value.result),
    } },
  });
  const canvasId = "f464381c-4fb1-4db0-86c3-f518a9c6d4fa";
  module.exports.useCanvasToolHandler({
    projectId: "project", tabs: [{ id: "tab", canvasId, name: "Page", store: initial }],
    activeTabIdRef: { current: "tab" }, storeRef, iconLibraries: {}, componentIndex: {},
    elementLocksRef: { current: new Map([["parent", "claim"]]) },
    claimIdToChatTabIdRef: { current: new Map() }, setElementLocksVersion: () => {},
    findElementTab: id => getById(storeRef.current, id) ? { tabId: "tab", store: storeRef.current } : null,
    setStore: store => { publications++; storeRef.current = store; },
    getCanvasRevision: () => publications,
    history: { recordOperations: (_tab, operations) => history.push(operations) },
  });
  const send = async (jsx, operationId = "operation", operation = "add_to_canvas") => {
    await requestHandler({ requestId: operationId, operationId, projectId: "project", protocolVersion: CANVAS_OPERATION_PROTOCOL_VERSION,
      operation, args: { jsx, parent_id: "parent", claim_id: "claim" } });
    return responses.at(-1);
  };
  try {
    await run({ send, storeRef, initial, history, publications: () => publications });
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
