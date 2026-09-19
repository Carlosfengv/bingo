import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { ensureV2 } from "../packages/compiler/src/store/ensureV2";
import { prepareVariableStore, setElementVariableMode, type VariableLibrary } from "../packages/compiler/src/runtime/variables";

const tokenCount = 206;
const library: VariableLibrary = {
  version: 1,
  collections: [{ id: "colors", name: "Colors", defaultModeId: "light", modes: [{ id: "light" }, { id: "dark" }] }],
  tokens: Array.from({ length: tokenCount }, (_, index) => ({
    id: `token-${index}`,
    name: `color/${index}`,
    collectionId: "colors",
    type: "color",
    cssName: `color-${index}`,
    valuesByMode: {
      light: { kind: "literal", value: `rgb(${index % 255} 0 0)` },
      dark: { kind: "literal", value: `rgb(0 ${index % 255} 0)` },
    },
  })),
};

function makeStore(count: number) {
  const wire: any = { schemaVersion: 2, byId: {}, childrenByParent: { ROOT: ["node-0"] } };
  for (let index = 0; index < count; index++) {
    const id = `node-${index}`;
    wire.byId[id] = { id, type: "html", tag: "div", props: {}, styles: { color: "var(--color-0)", backgroundColor: "var(--color-1)" } };
    if (index > 0) (wire.childrenByParent[`node-${Math.floor((index - 1) / 8)}`] ??= []).push(id);
  }
  return ensureV2(wire);
}

function percentile(values: number[], ratio: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * ratio) - 1];
}

function benchmark(nodes: number) {
  const original = makeStore(nodes);
  const rootId = "node-0";
  const samples: number[] = [];
  let prepared: any;
  for (let iteration = 0; iteration < 110; iteration++) {
    const byId = new Map(original.byId);
    byId.set(rootId, setElementVariableMode(byId.get(rootId), library, "colors", iteration % 2 ? "light" : "dark"));
    const input = { ...original, byId };
    const startedAt = performance.now();
    prepared = prepareVariableStore(input, library);
    if (iteration >= 10) samples.push(performance.now() - startedAt);
  }
  const declarations = [...prepared.byId.values()].reduce((count, element: any) => count + Object.keys(element.styles || {}).filter(property => property.startsWith("--")).length, 0);
  const replaced = [...prepared.byId].filter(([id, element]) => element !== original.byId.get(id)).length;
  assert.equal(declarations, tokenCount, "Only the root scope should carry declarations in the plain HTML fixture");
  assert.equal(replaced, 1, "Unchanged descendants should retain object identity");
  return {
    nodes,
    tokens: tokenCount,
    samples: samples.length,
    medianMs: Number(percentile(samples, .5).toFixed(3)),
    p95Ms: Number(percentile(samples, .95).toFixed(3)),
    declarations,
    replacedElementObjects: replaced,
  };
}

console.log(JSON.stringify({ measuredAt: new Date().toISOString(), cases: [benchmark(1_000), benchmark(5_000)] }, null, 2));
