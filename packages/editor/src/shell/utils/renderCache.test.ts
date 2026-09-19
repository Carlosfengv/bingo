import assert from "node:assert/strict";
import { test } from "node:test";
import { createCanvasRenderCache } from "../../canvas/utils/renderCache";

function fixture() {
  return {
    byId: new Map(["a", "card", "text", "sibling", "b"].map(id => [id, { id, type: "html", tag: "div", styles: {} }])),
    childrenByParent: new Map([["ROOT", ["a", "b"]], ["a", ["card", "sibling"]], ["card", ["text"]]]),
    parentByChild: new Map([["a", "ROOT"], ["b", "ROOT"], ["card", "a"], ["text", "card"], ["sibling", "a"]]),
  };
}
function renderer() {
  const cache = createCanvasRenderCache();
  const built: string[] = [];
  const render = (store: ReturnType<typeof fixture>, options: any) => {
    cache.prepare(store, options);
    const node = (id: string, parent: string | null): any => cache.render(id, { ...options, _currentParentId: parent }, () => {
      built.push(id);
      return { element: store.byId.get(id), children: (store.childrenByParent.get(id) ?? []).map(child => node(child, id)) };
    });
    return [node("a", null), node("b", null)];
  };
  return { cache, built, render };
}
test("local edits preserve siblings and other roots; edits to a scope don't rebuild its contents", () => {
  const r = renderer(), before = fixture(), options = {};
  const original = r.render(before, options); r.built.length = 0;
  const byId = new Map(before.byId).set("text", { ...before.byId.get("text")!, styles: { color: "red" } });
  const next = r.render({ ...before, byId }, options);
  assert.deepEqual(r.built, ["a", "card", "text"]);
  assert.equal(next[1], original[1]);
  assert.equal(next[0].children[1], original[0].children[1]);
  r.built.length = 0;
  const scoped = r.render({ ...before, byId: new Map(byId).set("a", { ...byId.get("a")!, styles: { "--color": "blue" } }) }, options);
  assert.deepEqual(r.built, ["a"]);
  assert.equal(scoped[0].children[0], next[0].children[0]);
});
test("live event state does not invalidate visuals; drag capability changes only the affected branch", () => {
  const r = renderer(), store = fixture(), live = { current: null as string | null };
  const options = { drilledParentIdRef: live, interactiveParentIds: new Set(["a", "b"]) };
  const before = r.render(store, options); r.built.length = 0; live.current = "a";
  assert.deepEqual(r.render(store, options), before);
  assert.deepEqual(r.built, []);
  const next = r.render(store, { ...options, interactiveParentIds: new Set(["a", "b", "card"]) });
  assert.deepEqual(r.built, ["a", "card", "text"]);
  assert.equal(next[1], before[1]);
  assert.equal(next[0].children[1], before[0].children[1]);
});
test("moves invalidate old and new parents; deletion cannot resurrect a cached child", () => {
  const r = renderer(), store = fixture(); r.render(store, {}); r.built.length = 0;
  const moved = { ...store, childrenByParent: new Map(store.childrenByParent).set("a", ["sibling"]).set("b", ["card"]),
    parentByChild: new Map(store.parentByChild).set("card", "b") };
  const next = r.render(moved, {});
  assert.deepEqual(next[0].children.map((n: any) => n.element.id), ["sibling"]);
  assert.equal(next[1].children[0].element.id, "card");
  const byId = new Map(moved.byId); byId.delete("text");
  const deleted = r.render({ ...moved, byId, childrenByParent: new Map(moved.childrenByParent).set("card", []) }, {});
  assert.equal(deleted[1].children[0].children.length, 0);
});
test("SVG, asChild and introspected children retain separate contexts; render behavior invalidates all", () => {
  const r = renderer(), store = fixture(), options = { componentsRevision: 1 };
  r.render(store, options);
  const svg = r.cache.render("text", { isSVGContext: true }, () => ({ tag: "svg child" }));
  const slot = r.cache.render("text", { isAsChildSlotTarget: true }, () => ({ tag: "actual child" }));
  assert.notEqual(svg, slot);
  assert.equal(r.cache.render("text", { isAsChildSlotTarget: true }, () => null), slot);
  r.built.length = 0; r.render(store, { ...options, inert: true });
  assert.equal(r.built.length, store.byId.size);
});
test("resource updates invalidate only consumers and keep unrelated HTML roots cached", () => {
  const r = renderer(), store = fixture();
  store.byId.set("card", { ...store.byId.get("card")!, type: "component", componentName: "Card" } as any);
  const before = r.render(store, { componentsRevision: 1, components: { Card: () => 1 } }); r.built.length = 0;
  const implementation = () => 2;
  const next = r.render(store, { componentsRevision: 2, components: { Card: implementation } });
  assert.deepEqual(r.built, ["a", "card"]);
  assert.equal(before[1], next[1]);
  assert.equal(before[0].children[1], next[0].children[1]);
  const version = r.cache.componentRevision("Card"); r.built.length = 0;
  r.render(store, { componentsRevision: 3, components: { Card: implementation, Unused: () => 3 } });
  assert.deepEqual(r.built, []);
  assert.equal(r.cache.componentRevision("Card"), version);
});
