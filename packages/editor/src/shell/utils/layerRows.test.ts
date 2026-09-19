import assert from "node:assert/strict";
import { test } from "node:test";
import { createLayerRowsIndex, isInsideLayerSelection, searchLayerRows, selectedLayerRanges } from "./layerRows";

function fixture() {
  return {
    byId: new Map(["a", "card", "text", "sibling", "b"].map(id => [id, { id, type: id === "text" ? "text" : "html", tag: "div" }])),
    childrenByParent: new Map([["ROOT", ["a", "b"]], ["a", ["card", "sibling"]], ["card", ["text"]]]),
  };
}

test("visible rows preserve subtree drop ranges and rebuild when a branch collapses", () => {
  const index = createLayerRowsIndex(), store = fixture(), expanded = new Set<string>();
  const before = index.get(store, expanded);
  assert.deepEqual(before.rows, [
    { id: "a", depth: 0, subtreeEnd: 4 }, { id: "card", depth: 1, subtreeEnd: 3 },
    { id: "text", depth: 2, subtreeEnd: 3 }, { id: "sibling", depth: 1, subtreeEnd: 4 },
    { id: "b", depth: 0, subtreeEnd: 5 },
  ]);
  assert.equal(index.get(store, expanded), before);
  const collapsed = index.get(store, new Set(["card"]));
  assert.deepEqual(collapsed.rows.map(row => row.id), ["a", "card", "sibling", "b"]);
  assert.equal(collapsed.rows[0].subtreeEnd, 3);
  assert.equal(collapsed.indexById.get("b"), 3);
});

test("mode/style/name changes reuse row and lookup identities; structural changes invalidate them", () => {
  const index = createLayerRowsIndex(), store = fixture(), collapsed = new Set<string>();
  const before = index.get(store, collapsed);
  const byId = new Map(store.byId);
  byId.set("a", { ...byId.get("a")!, name: "Renamed", styles: { color: "red" }, theme: { localCollectionModes: { colors: "dark" } } } as any);
  assert.equal(index.get({ ...store, byId }, collapsed), before);
  const moved = { byId, childrenByParent: new Map(store.childrenByParent).set("a", ["card"]).set("b", ["sibling"]) };
  const after = index.get(moved, collapsed);
  assert.notEqual(after, before);
  assert.deepEqual(after.rows.map(row => [row.id, row.depth]), [["a", 0], ["card", 1], ["text", 2], ["b", 0], ["sibling", 1]]);
  byId.set("a", { ...byId.get("a")!, tag: "img" });
  // Replacement may change child capability while retaining adjacency maps.
  const replaced = index.get({ ...moved, byId: new Map(byId) }, collapsed);
  assert.deepEqual(replaced.rows.map(row => row.id), ["a", "b", "sibling"]);
});

test("nested multi-selection produces outer shells, sticky parents and correct visible-row highlights", () => {
  const model = createLayerRowsIndex().get(fixture(), new Set());
  const { shells, stickyParents } = selectedLayerRanges(model, new Set(["b", "card", "a", "missing"]));
  assert.deepEqual(shells, [{ start: 0, end: 4 }, { start: 4, end: 5 }]);
  assert.deepEqual([...stickyParents], [[0, 4], [1, 3]]);
  assert.deepEqual(model.rows.map((_, index) => isInsideLayerSelection(index, shells)), [false, true, true, true, false]);
  assert.deepEqual(selectedLayerRanges(model, new Set()).shells, []);
  assert.equal(isInsideLayerSelection(1, []), false);
  assert.equal(model.indexById.get("text"), 2);
});

test("search hits remain separate shells, including a text match with its contextual parent", () => {
  const model = searchLayerRows([{ id: "card", depth: 0 }, { id: "text", depth: 1 }, { id: "b", depth: 0 }]);
  const { shells, stickyParents } = selectedLayerRanges(model, new Set(["card", "b"]));
  assert.deepEqual(shells, [{ start: 0, end: 1 }, { start: 2, end: 3 }]);
  assert.equal(stickyParents.size, 0);
  assert.equal(isInsideLayerSelection(1, shells), false);
});
