import assert from "node:assert/strict";
import test from "node:test";
import { generateJSX, generateJSXWithinBudget } from "../codegen/generateJSX";
import { generateCompleteFile } from "../codegen/generateCompleteFile";
import { parseJSX } from "../codegen/parseJSX";
import { buildSelectionRootFromParsed } from "../codegen/selectionEdit";
import { ensureV2 } from "../store/ensureV2";
import { getRootIds } from "../store/read";
import { storeSubtreeToLegacyNested } from "../store/legacy";
import { toWire } from "../store/wire";
import { prepareVariableStore, resolveCollectionModes } from "../runtime/variables";
import { applyOperationsToStore, createReplaceOperation, invertOperations } from "../../../editor/src/shared/utils/operations";

const library = {
  version: 1,
  collections: [{ id: "colors", defaultModeId: "light", modes: [{ id: "light" }, { id: "dark" }] }],
  tokens: ["foreground", "unused"].map(cssName => ({ id: cssName, cssName, type: "color", collectionId: "colors",
    sourceRef: { kind: "css" }, valuesByMode: { light: { kind: "literal", value: "#222222" }, dark: { kind: "literal", value: "#eeeeee" } } })),
};
const theme = { version: 1, localCollectionModes: { colors: "dark" }, bindings: [{ target: "style", property: "color", tokenId: "foreground" }] };
const label = (id = "label", text = "分析", extra = {}) => ({ id, type: "component", componentName: "SidebarGroupLabel", props: {},
  children: [{ id: `${id}-text`, type: "text", text }], ...extra });
const fixture = () => ensureV2([{ id: "page", type: "html", tag: "div", theme: { version: 1, localCollectionModes: { colors: "dark" } }, children: [label()] }]);
function edit(previous, jsx) {
  const parsed = parseJSX(jsx, {}, {}, undefined, { forceNewIds: true });
  return buildSelectionRootFromParsed(previous, previous.id, getRootIds(parsed).map(id => storeSubtreeToLegacyNested(parsed, id)), library);
}
function applyEdit(previous, jsx) {
  const result = edit(previous, jsx);
  assert.equal(result.error, undefined);
  return result.element;
}

test("editor JSX contains authored props only, regardless of selected root and theme", () => {
  const store = fixture();
  const before = toWire(store);
  const code = generateCompleteFile({ componentName: "NewComponent", componentIndex: {}, store, rootId: "label", purpose: "editor", variableLibrary: library });
  assert.match(code, /<SidebarGroupLabel>/);
  assert.doesNotMatch(code, /data-bingo-variables|--foreground|--unused|style=/);
  assert.equal(code, generateCompleteFile({ componentName: "NewComponent", componentIndex: {}, store, rootId: "label", purpose: "editor", variableLibrary: library, variablePageModes: { colors: "light" } }));
  assert.deepEqual(toWire(store), before);
  assert.equal(prepareVariableStore(store, library).byId.get("label").styles["--foreground"], "#eeeeee", "runtime bridge remains intact");
});

test("editor preserves explicit custom declarations, even library names and matching values", () => {
  const original = label("label", "分析", { styles: { "--foreground": "#222222", "--custom": "8px", color: "var(--foreground)" }, theme });
  const code = generateJSX(ensureV2([original]), 0, { purpose: "editor", variableLibrary: library });
  assert.match(code, /"--foreground": "#222222"/);
  assert.doesNotMatch(code, /data-bingo-variables|--unused/);
  const next = applyEdit(original, code.replace("分析", "资源"));
  assert.deepEqual(next.styles, original.styles);
  assert.deepEqual(next.theme, theme);
  assert.equal(next.children[0].text, "资源");
});

test("selection edits retain inherited page context through history and save/reopen", () => {
  const store = fixture(); store.variableModes = { colors: "light" };
  const previous = storeSubtreeToLegacyNested(store, "label");
  const code = generateJSX(store, 0, { rootId: "label", purpose: "editor", variableLibrary: library });
  const next = applyEdit(previous, code.replace("分析", "资源"));
  const op = createReplaceOperation(store, "label", next);
  const changed = applyOperationsToStore(store, [op]);
  const reopened = ensureV2(toWire(changed));
  assert.equal(reopened.byId.get("label").theme, undefined);
  assert.equal(reopened.byId.get("label").styles, undefined);
  assert.deepEqual(reopened.variableModes, { colors: "light" });
  assert.equal(resolveCollectionModes(reopened, "label", library).modes.colors, "dark");
  const undone = applyOperationsToStore(changed, invertOperations([op]));
  assert.deepEqual(toWire(undone), toWire(store));
  assert.deepEqual(toWire(applyOperationsToStore(undone, [op])), toWire(changed));
});

test("fixed, removed, different-variable and unknown expressions reconcile bindings", () => {
  const original = label("label", "分析", { theme, styles: { color: "var(--foreground)" } });
  for (const expression of ['"red"', '"var(--unknown)"', '"calc(var(--foreground) * 2)"']) {
    const next = applyEdit(original, `<SidebarGroupLabel style={{color:${expression}}}>分析</SidebarGroupLabel>`);
    assert.deepEqual(next.theme.bindings, []);
    assert.deepEqual(next.theme.localCollectionModes, { colors: "dark" });
    const rendered = prepareVariableStore(ensureV2([next]), library).byId.get("label");
    assert.equal(rendered.styles.color, JSON.parse(expression));
  }
  assert.deepEqual(applyEdit(original, '<SidebarGroupLabel>分析</SidebarGroupLabel>').theme.bindings, []);
  const rebound = applyEdit(original, '<SidebarGroupLabel style={{color:"var(--unused)"}}>分析</SidebarGroupLabel>');
  assert.deepEqual(rebound.theme.bindings, [{ target: "style", property: "color", tokenId: "unused" }]);
});

test("reorders and inserted same-kind siblings follow exact contents, not positions", () => {
  const first = label("first", "A", { theme });
  const second = label("second", "B", { theme: { version: 1, localCollectionModes: { colors: "light" } } });
  const previous = { id: "root", type: "html", tag: "div", children: [first, second] };
  const next = applyEdit(previous, '<div><SidebarGroupLabel>B</SidebarGroupLabel><SidebarGroupLabel>New</SidebarGroupLabel><SidebarGroupLabel>A</SidebarGroupLabel></div>');
  assert.equal(next.children[0].id, "second");
  assert.equal(next.children[0].theme.localCollectionModes.colors, "light");
  assert.equal(next.children[1].theme, undefined);
  assert.equal(next.children[2].id, "first");
  assert.equal(next.children[2].theme.localCollectionModes.colors, "dark");
});

test("ambiguous hidden metadata is rejected; explicit keys permit reordering and editing", () => {
  const previous = { id: "root", type: "html", tag: "div", children: [label("a", "A", { theme }), label("b", "B", { theme })] };
  assert.match(edit(previous, '<div><SidebarGroupLabel>C</SidebarGroupLabel><SidebarGroupLabel>D</SidebarGroupLabel></div>').error, /Cannot safely match/);
  const keyed = applyEdit(previous, '<div><SidebarGroupLabel key="a">A</SidebarGroupLabel><SidebarGroupLabel key="b">B</SidebarGroupLabel></div>');
  assert.deepEqual(keyed.children.map(child => child.theme.localCollectionModes), [{ colors: "dark" }, { colors: "dark" }]);
  previous.children.forEach(child => child.props.key = child.id);
  const next = applyEdit(previous, '<div><SidebarGroupLabel key="b">D</SidebarGroupLabel><SidebarGroupLabel key="a">C</SidebarGroupLabel></div>');
  assert.deepEqual(next.children.map(child => child.id), ["b", "a"]);
});

test("styled text spans retain local modes and only unchanged property bindings", () => {
  const previous = { id: "text", type: "text", text: "Before", styles: { color: "var(--foreground)" }, theme };
  const code = generateJSX(ensureV2([previous]), 0, { purpose: "editor", variableLibrary: library });
  const next = applyEdit(previous, code.replace("Before", "After"));
  assert.deepEqual(next.theme, theme);
  assert.equal(next.styles.color, "var(--foreground)");
  const fixed = applyEdit(previous, code.replace("var(--foreground)", "red"));
  assert.deepEqual(fixed.theme.bindings, []);
});

test("moving a themed node into a new wrapper preserves its identity and local mode", () => {
  const previous = { id: "root", type: "html", tag: "div", children: [label("a", "A", { theme })] };
  const next = applyEdit(previous, '<div><section><SidebarGroupLabel>A</SidebarGroupLabel></section></div>');
  assert.equal(next.children[0].children[0].id, "a");
  assert.deepEqual(next.children[0].children[0].theme.localCollectionModes, { colors: "dark" });
  const copied = applyEdit(previous, '<div><SidebarGroupLabel>A</SidebarGroupLabel><section><SidebarGroupLabel>A</SidebarGroupLabel></section></div>');
  assert.equal(copied.children[0].id, "a");
  assert.notEqual(copied.children[1].children[0].id, "a");
  assert.equal(copied.children[1].children[0].theme, undefined);
});

test("capture fragments preserve metadata on their children and host", () => {
  const previous = { id: "capture", type: "capture", original: { componentName: "Page" }, theme, children: [label("a", "A", { theme })] };
  const next = applyEdit(previous, '<><SidebarGroupLabel>B</SidebarGroupLabel><span>New</span></>');
  assert.equal(next.type, "capture"); assert.equal(next.id, "capture");
  assert.deepEqual(next.theme.localCollectionModes, { colors: "dark" });
  assert.equal(next.children[0].id, "a");
  assert.deepEqual(next.children[0].theme.localCollectionModes, { colors: "dark" });
});

test("exchange keeps metadata without materializing values; project omits editor metadata", () => {
  const store = fixture();
  const exchanged = generateJSX(store, 0, { purpose: "exchange", rootId: "label", includeDataElementId: true, variableLibrary: library });
  assert.match(exchanged, /data-bingo-variables/); assert.doesNotMatch(exchanged, /--foreground|--unused/);
  assert.deepEqual(parseJSX(exchanged, {}, {}).variableModes, { colors: "dark" });
  const limited = generateJSXWithinBudget(store, { purpose: "editor", rootId: "label", variableLibrary: library }, 1000);
  assert.doesNotMatch(limited.jsx, /data-bingo-variables|--foreground/);
  const project = generateJSX(ensureV2([label()]), 0, { purpose: "project", variableLibrary: library });
  assert.doesNotMatch(project, /data-bingo-variables|--foreground|--unused/);
});

test("project theme declarations live at boundaries, preserve overrides and never repeat per component", () => {
  const store = fixture();
  const output = generateJSX(store, 0, { purpose: "project", variableLibrary: library });
  assert.equal(output.match(/"--foreground"/g)?.length, 1);
  assert.match(output, /<SidebarGroupLabel>/);
  assert.doesNotMatch(output, /data-bingo-variables/);
  const managed = structuredClone(library); managed.tokens.forEach(token => delete token.sourceRef);
  const original = label("label", "A", { styles: { "--foreground": "purple" } });
  const code = generateJSX(ensureV2([original]), 0, { purpose: "project", variableLibrary: managed });
  assert.match(code, /"--foreground": "purple"/);
  assert.match(code, /"--unused": "#222222"/);
  assert.deepEqual(original.styles, { "--foreground": "purple" });
});

test("project export materializes nested capture scopes and explicit resets below custom properties", () => {
  const original = { id: "root", type: "html", tag: "div", styles: { "--foreground": "purple" }, children: [
    { id: "capture", type: "capture", original: { componentName: "Page" }, theme: { version: 1, localCollectionModes: { colors: "dark" } }, children: [label()] },
    label("reset", "Reset", { theme: { version: 1, localCollectionModes: { colors: "light" } } }),
  ] };
  const code = generateJSX(ensureV2([original]), 0, { purpose: "project", variableLibrary: library, includeDataElementId: true });
  const parsed = parseJSX(code, {}, {});
  assert.equal(parsed.byId.get("label").styles["--foreground"], "#eeeeee");
  assert.equal(parsed.byId.get("reset").styles["--foreground"], "#222222");
  assert.equal(parsed.byId.get("root").styles["--foreground"], "purple");
});
