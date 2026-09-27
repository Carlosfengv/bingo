import assert from "node:assert/strict";
import { test } from "node:test";
import { countClick, interactiveParentsForSelection, normalizeSelection, resetClickSequence, resolveDescendTarget, resolveNearestDivTarget, toggleSelection } from "../../canvas/utils/selection";

const store = {
  byId: new Map([
    ["frame", { id: "frame", type: "html", tag: "div" }],
    ["card", { id: "card", type: "html", tag: "div" }],
    ["text", { id: "text", type: "text" }],
    ["sibling", { id: "sibling", type: "html", tag: "span" }],
    ["other", { id: "other", type: "component" }],
  ]),
  parentByChild: new Map([
    ["frame", "ROOT"], ["card", "frame"], ["text", "card"],
    ["sibling", "frame"], ["other", "ROOT"],
  ]),
};

test("rapid clicks descend only while hitting the same node and modifier state", () => {
  assert.equal(countClick(10, 10, 1000, "text:false:false"), 1);
  assert.equal(countClick(12, 10, 1100, "text:false:false"), 2);
  assert.equal(countClick(12, 10, 1200, "sibling:false:false"), 1);
  assert.equal(countClick(12, 10, 1300, "sibling:true:false"), 1);
  assert.equal(countClick(12, 10, 1400, "sibling:false:false"), 1);
  resetClickSequence();
  assert.equal(countClick(12, 10, 1450, "sibling:false:false"), 1);
});

test("selection excludes descendants of selected parents and lets the last node be removed", () => {
  assert.deepEqual([...normalizeSelection(store, ["text", "frame", "other", "missing"])], ["frame", "other"]);
  assert.deepEqual([...toggleSelection(store, new Set(["frame"]), "text")], ["text"]);
  assert.deepEqual([...toggleSelection(store, new Set(["text"]), "frame")], ["frame"]);
  assert.deepEqual([...toggleSelection(store, new Set(["card"]), "card")], []);
});

test("descent follows the actual clicked path one level at a time", () => {
  assert.equal(resolveDescendTarget(store, "frame", ["text", "card", "frame"]), "card");
  assert.equal(resolveDescendTarget(store, "card", ["text", "card", "frame"]), "text");
  assert.equal(resolveDescendTarget(store, "frame", ["frame"]), null);
});

test("entered branches remain interactive for non-div fallback targets", () => {
  assert.deepEqual([...interactiveParentsForSelection(store, new Set(), null)], []);
  assert.deepEqual([...interactiveParentsForSelection(store, new Set(["frame"]), null)], []);
  assert.deepEqual([...interactiveParentsForSelection(store, new Set(["card"]), null)], ["frame"]);
  assert.deepEqual([...interactiveParentsForSelection(store, new Set(["text"]), null)], ["card", "frame"]);
  assert.deepEqual([...interactiveParentsForSelection(store, new Set(["frame"]), "frame")], ["frame"]);
});

test("pointer hit prefers the closest div layer and skips text and spans", () => {
  assert.equal(resolveNearestDivTarget(store, ["text", "card", "frame"]), "card");
  assert.equal(resolveNearestDivTarget(store, ["sibling", "frame"]), "frame");
  assert.equal(resolveNearestDivTarget(store, ["frame"]), "frame");
  assert.equal(resolveNearestDivTarget(store, ["other"]), null);
});
