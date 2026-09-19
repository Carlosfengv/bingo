import assert from "node:assert/strict";
import test from "node:test";
import { ensureV2 } from "../store/ensureV2";
import { toWire } from "../store/wire";
import { applyOps } from "../store/apply";
import { generateJSX } from "../codegen/generateJSX";
import { parseJSX } from "../codegen/parseJSX";
import { bindElementVariable, detachElementVariable, findElementVariableBinding, prepareVariableStore, resolveCollectionModes, resolveVariableValues, setElementVariableMode, validateVariableLibrary, variableExpression } from "./variables";
import { applyOperationsToStore, createSetStylesOperation, invertOperations } from "../../../editor/src/shared/utils/operations";

export const variableFixture = {
  version: 1,
  collections: [
    { id: "colors", name: "Colors", defaultModeId: "light", modes: [{ id: "light", name: "Light" }, { id: "dark", name: "Dark" }, { id: "ocean", name: "Ocean" }] },
    { id: "density", name: "Density", defaultModeId: "comfortable", modes: [{ id: "comfortable" }, { id: "compact" }] },
  ],
  tokens: [
    { id: "bg", name: "surface/page", type: "color", cssName: "surface-page", collectionId: "colors", valuesByMode: { light: { kind: "literal", value: "#fff" }, dark: { kind: "literal", value: "#111827" }, ocean: { kind: "literal", value: "#06293b" } } },
    { id: "alias", name: "surface/card", type: "color", cssName: "surface-card", collectionId: "density", valuesByMode: { comfortable: { kind: "alias", tokenId: "bg" }, compact: { kind: "alias", tokenId: "bg" } } },
    { id: "gap", name: "space/gap", type: "number", cssName: "space-gap", collectionId: "density", valuesByMode: { comfortable: { kind: "literal", value: 16 }, compact: { kind: "literal", value: 8 } } },
  ],
};
function fixture() {
  const root = { id: "root", type: "html", tag: "div", children: [{ id: "card", type: "html", tag: "div", children: [{ id: "text", type: "html", tag: "span" }] }] };
  return ensureV2([root, { id: "second", type: "html", tag: "div" }]);
}
test("each collection inherits independently, Auto clears only the chosen override", () => {
  let store = fixture(); store.variableModes = { colors: "light", density: "compact" };
  store.byId.set("root", setElementVariableMode(store.byId.get("root"), variableFixture, "colors", "dark"));
  store.byId.set("card", setElementVariableMode(store.byId.get("card"), variableFixture, "colors", "ocean"));
  assert.deepEqual(resolveCollectionModes(store, "text", variableFixture).modes, { colors: "ocean", density: "compact" });
  assert.equal(resolveCollectionModes(store, "text", variableFixture).sources.colors, "card");
  store.byId.set("card", setElementVariableMode(store.byId.get("card"), variableFixture, "colors", null));
  assert.equal(resolveCollectionModes(store, "text", variableFixture).modes.colors, "dark");
  store = applyOps(store, [{ type: "move", id: "card", toParentId: "second", toIndex: 0 }]);
  assert.equal(resolveCollectionModes(store, "text", variableFixture).modes.colors, "light");
});
test("default changes update Auto but not explicitly selected former defaults", () => {
  const store = fixture(); const library = structuredClone(variableFixture);
  store.byId.set("second", setElementVariableMode(store.byId.get("second"), library, "colors", "light"));
  library.collections[0].defaultModeId = "ocean";
  assert.equal(resolveCollectionModes(store, "root", library).modes.colors, "ocean");
  assert.equal(resolveCollectionModes(store, "second", library).modes.colors, "light");
});
test("cross-collection aliases use the referenced collection at the consumer", () => {
  const resolved = resolveVariableValues(variableFixture, { colors: "dark", density: "compact" });
  assert.equal(resolved.values.alias, "#111827"); assert.equal(resolved.values.gap, 8); assert.deepEqual(resolved.diagnostics, []);
});
test("invalid aliases, duplicate CSS names, missing modes and cycles are diagnosed", () => {
  assert.doesNotThrow(() => validateVariableLibrary(variableFixture));
  const bad = structuredClone(variableFixture);
  bad.tokens[0].valuesByMode.light = { kind: "alias", tokenId: "alias" } as any;
  assert.throws(() => validateVariableLibrary(bad), /cycle/);
  assert.ok(resolveVariableValues(bad, { colors: "light", density: "compact" }).diagnostics.length > 0);
  const duplicate = structuredClone(variableFixture); duplicate.tokens[1].cssName = duplicate.tokens[0].cssName;
  assert.throws(() => validateVariableLibrary(duplicate), /CSS name/);
  const missing = structuredClone(variableFixture); delete missing.tokens[0].valuesByMode.dark;
  assert.throws(() => validateVariableLibrary(missing), /missing/);
});
test("number bindings preserve CSS units and color opacity keeps the variable", () => {
  assert.equal(variableExpression(variableFixture.tokens[2], "padding"), "calc(var(--space-gap) * 1px)");
  assert.equal(variableExpression(variableFixture.tokens[2], "opacity"), "var(--space-gap)");
  const bound = bindElementVariable({ styles: {} }, variableFixture, "backgroundColor", "bg", .5);
  assert.equal(bound.styles.backgroundColor, "color-mix(in srgb, var(--surface-page) 50%, transparent)");
  assert.throws(() => bindElementVariable({}, variableFixture, "padding", "bg"), /cannot/);
  assert.throws(() => bindElementVariable({}, variableFixture, "backgroundColor", "bg", 2), /Opacity/);
});
test("opposite-mode aliases are valid when no consumer can encounter a cycle", () => {
  const library = structuredClone(variableFixture);
  const bg = library.tokens.find(token => token.id === "bg")!;
  const alias = library.tokens.find(token => token.id === "alias")!;
  alias.collectionId = "colors";
  alias.valuesByMode = { light: { kind: "literal", value: "#fff" }, dark: { kind: "alias", tokenId: "bg" }, ocean: { kind: "alias", tokenId: "bg" } } as any;
  bg.valuesByMode.light = { kind: "alias", tokenId: "alias" } as any;
  assert.doesNotThrow(() => validateVariableLibrary(library));
});
test("detaching snapshots each consumer's value and keeps the definition unchanged", () => {
  const bound = bindElementVariable({ id: "card" }, variableFixture, "backgroundColor", "bg");
  const detached = detachElementVariable(bound, variableFixture, "backgroundColor", { bg: "#06293b" });
  assert.equal(detached.styles.backgroundColor, "#06293b"); assert.equal(detached.theme.bindings.length, 0);
  assert.equal(bound.theme.bindings.length, 1); assert.equal(variableFixture.tokens[0].valuesByMode.light.value, "#fff");
});
test("existing CSS variable references are recognized and can detach without binding metadata", () => {
  const element = { id: "card", styles: { backgroundColor: "var(--surface-page)" } };
  assert.deepEqual(findElementVariableBinding(element, variableFixture, "backgroundColor"), { target: "style", property: "backgroundColor", tokenId: "bg", inferred: true });
  const detached = detachElementVariable(element, variableFixture, "backgroundColor", { bg: "#111827" });
  assert.equal(detached.styles.backgroundColor, "#111827");
  assert.equal(detached.theme, undefined);
});
test("render-only values differ across roots without modifying saved variable expressions", () => {
  const store = fixture();
  for (const id of ["root", "card", "second"]) store.byId.set(id, bindElementVariable(store.byId.get(id), variableFixture, "backgroundColor", "bg"));
  store.byId.set("second", setElementVariableMode(store.byId.get("second"), variableFixture, "colors", "dark"));
  store.byId.set("card", setElementVariableMode(store.byId.get("card"), variableFixture, "colors", "ocean"));
  const prepared = prepareVariableStore(store, variableFixture);
  assert.equal(prepared.byId.get("root").styles["--surface-page"], "#fff");
  assert.equal(prepared.byId.get("second").styles["--surface-page"], "#111827");
  assert.equal(prepared.byId.get("card").styles["--surface-card"], "#06293b");
  assert.equal(store.byId.get("root").styles["--surface-page"], undefined);
});
test("page modes survive ordinary edits, save/reload, and undo/redo", () => {
  const store = fixture();
  const ops = [{ type: "set_variable_modes", oldModes: undefined, newModes: { colors: "dark" } }];
  let changed = applyOperationsToStore(store, ops);
  changed = applyOps(changed, [{ type: "set_name", id: "card", name: "Renamed" }]);
  changed = ensureV2(toWire(changed));
  assert.equal(changed.variableModes.colors, "dark");
  const undone = applyOperationsToStore(changed, invertOperations(ops));
  assert.equal(undone.variableModes, undefined);
  assert.equal(applyOperationsToStore(undone, ops).variableModes.colors, "dark");
});
test("fixed-value overrides detach stale metadata and undo restores the binding", () => {
  const store = fixture();
  store.byId.set("card", bindElementVariable(store.byId.get("card"), variableFixture, "backgroundColor", "bg"));
  const op = createSetStylesOperation(store, "card", { backgroundColor: "#ff0000" });
  const changed = applyOperationsToStore(store, [op]);
  assert.equal(changed.byId.get("card").theme.bindings.length, 0);
  const restored = applyOperationsToStore(changed, invertOperations([op]));
  assert.equal(restored.byId.get("card").theme.bindings[0].tokenId, "bg");
  assert.equal(restored.byId.get("card").styles.backgroundColor, "var(--surface-page)");
});
test("exported JSX retains live expressions, local modes and page inheritance when reopened", () => {
  const store = fixture(); store.variableModes = { colors: "dark", density: "compact" };
  store.byId.set("card", bindElementVariable(setElementVariableMode(store.byId.get("card"), variableFixture, "colors", "ocean"), variableFixture, "backgroundColor", "bg"));
  const jsx = generateJSX(store, 0, { variableLibrary: variableFixture, includeDataElementId: true });
  assert.match(jsx, /var\(--surface-page\)/);
  assert.match(jsx, /#06293b/);
  const parsed = parseJSX(`<>${jsx}</>`, {}, {});
  assert.equal(parsed.variableModes.colors, "dark");
  assert.equal(parsed.byId.get("card").theme.localCollectionModes.colors, "ocean");
  assert.equal(parsed.byId.get("card").theme.bindings[0].tokenId, "bg");
  assert.equal(parsed.byId.get("card").props["data-bingo-variables"], undefined);
});
