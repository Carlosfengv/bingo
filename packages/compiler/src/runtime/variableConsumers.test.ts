import assert from "node:assert/strict";
import test from "node:test";
import { ensureV2 } from "../store/ensureV2";
import { collectVariableConsumers, createVariableConsumerResolver } from "./variableConsumers";
import { prepareVariableStore, setElementVariableMode, variableModeChangedRootIds } from "./variables";

const library = {
  version: 1,
  collections: [{ id: "theme", defaultModeId: "light", modes: [{ id: "light" }, { id: "dark" }] }],
  tokens: ["used", "alias", "fallback", "unused"].map(cssName => ({ id: cssName, cssName, type: "color", collectionId: "theme",
    valuesByMode: { light: { kind: "literal", value: "#fff" }, dark: { kind: "literal", value: cssName === "alias" ? "var(--used)" : "#000" } } })),
};
const usage = { complete: true, declarations: [], conditions: [] };
const fixture = () => ensureV2([{ id: "root", type: "html", tag: "div", children: [
  { id: "child", type: "html", tag: "span", styles: { color: "var(--alias, var(--fallback))" } },
] }]);

test("consumer declarations include inline and stylesheet aliases/fallbacks in every mode", () => {
  const store = fixture();
  const used = collectVariableConsumers(store, library, usage)!;
  assert.deepEqual([...used].sort(), ["alias", "fallback", "used"]);
  const before = prepareVariableStore(store, library, {}, undefined, used);
  const dark = prepareVariableStore(store, library, { theme: "dark" }, undefined, used);
  assert.equal(before.byId.get("root").styles["--unused"], undefined);
  assert.equal(dark.byId.get("root").styles["--used"], "#000");
  assert.equal(before.byId.get("child"), dark.byId.get("child"));
  assert.equal(prepareVariableStore(store, library).byId.get("root").styles["--unused"], "#fff", "full preview declarations remain independent");
  const extended = collectVariableConsumers(store, library, { ...usage, declarations: [{ property: "width", value: "var(--unused)" }] })!;
  assert.equal(prepareVariableStore(store, library, {}, undefined, extended).byId.get("root").styles["--unused"], "#fff", "new CSS consumers restore a declaration");
});

test("opaque consumers and incomplete or ambiguous CSS keep every variable", () => {
  for (const element of [
    { type: "component", componentName: "Probe" }, { type: "capture" }, { type: "webview" }, { type: "icon", library: "custom", iconName: "Probe" },
    { type: "html", tag: "my-widget" }, { type: "html", tag: "script" },
    { type: "html", tag: "div", props: { dangerouslySetInnerHTML: { __html: "<i/>" } } },
    { type: "html", tag: "div", props: { onClick: "readVar()" } },
  ]) assert.equal(collectVariableConsumers(ensureV2([{ id: "opaque", ...element }]), library, usage), undefined);
  for (const value of ["var(--used) var(--中文)", "var(/* comment */ --used)", "var(--us\\65 d)"]) {
    assert.equal(collectVariableConsumers(fixture(), library, { ...usage, declarations: [{ property: "color", value }] }), undefined);
  }
  assert.equal(collectVariableConsumers(fixture(), library, { ...usage, complete: false }), undefined);
  assert.equal(collectVariableConsumers(fixture(), library, { ...usage, conditions: ["@container style(--used: red)"] }), undefined);
  assert.equal(collectVariableConsumers(fixture(), library, { ...usage, conditions: ['[style*="--used"]'] }), undefined);
  assert.equal(collectVariableConsumers(fixture(), library, { ...usage, conditions: ['[s\\74yle]'] }), undefined);
  assert.ok(collectVariableConsumers(fixture(), library, { ...usage, conditions: ["@property --tw-translate-x", ".bg-\\[var\\(--used\\)\\]"] }), "registrations and escaped utility class names are not value conditions");
});

test("explicit bindings, SVG props, prop styles and local declarations retain their tokens", () => {
  const store = ensureV2([{ id: "svg", type: "html", tag: "svg", styles: { "--unused": "red" }, props: { style: { color: "var(--used)" } }, children: [
    { id: "circle", type: "html", tag: "circle", props: { fill: "VAR(--fallback)" }, theme: { bindings: [{ target: "style", property: "stroke", tokenId: "alias" }] } },
  ] }]);
  assert.deepEqual([...collectVariableConsumers(store, library, usage)!].sort(), ["alias", "fallback", "unused", "used"]);
});

test("mode-only layout invalidation includes the whole affected root and rejects other edits", () => {
  const before = ensureV2([{ id: "a", type: "html", tag: "div", children: [{ id: "nested", type: "html", tag: "div" }] }, { id: "b", type: "html", tag: "div" }]);
  const byId = new Map(before.byId).set("nested", setElementVariableMode(before.byId.get("nested"), library, "theme", "dark"));
  const after = { ...before, byId };
  assert.deepEqual([...variableModeChangedRootIds(before, after, {}, {})!], ["a"]);
  assert.deepEqual([...variableModeChangedRootIds(before, after, {}, { theme: "dark" })!].sort(), ["a", "b"]);
  byId.set("b", { ...byId.get("b"), styles: { width: 100 } });
  assert.equal(variableModeChangedRootIds(before, after, {}, {}), undefined);
  assert.equal(variableModeChangedRootIds(before, { ...before, parentByChild: new Map(before.parentByChild) }, {}, {}), undefined);
});

test("consumer analysis is reused for mode edits and revalidated for new CSS or element consumers", () => {
  const resolve = createVariableConsumerResolver();
  const before = fixture();
  const first = resolve(before, library, usage)!;
  const after = { ...before, byId: new Map(before.byId).set("root", setElementVariableMode(before.byId.get("root"), library, "theme", "dark")) };
  assert.equal(resolve(after, library, { ...usage, declarations: [], conditions: [] }), first);
  const css = { ...usage, declarations: [{ property: "color", value: "var(--unused)" }] };
  assert.ok(resolve(after, library, css)!.has("unused"));
  assert.equal(resolve(after, library, usage)!.has("unused"), false);
  const added = { ...after, byId: new Map(after.byId).set("child", { ...after.byId.get("child"), styles: { color: "var(--unused)" } }) };
  assert.ok(resolve(added, library, usage)!.has("unused"));
  assert.equal(resolve(added, library, { ...usage, complete: false }), undefined);
});
