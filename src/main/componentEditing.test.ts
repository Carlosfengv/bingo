import assert from "node:assert/strict";
import test from "node:test";
import { canResetComponentProp, componentEditableElement, componentLegacyStyleState, componentPropControl, componentPropState, componentRenderStyles, componentStyleArgument, componentStyleOverrides, componentStyleSupport, parseComponentPropInput, updateComponentProp } from "../../packages/compiler/src/store/componentEditing";
import { storeFromNested, ensureV2 } from "../../packages/compiler/src/store/ensureV2";
import { toWire } from "../../packages/compiler/src/store/wire";
import { generateJSX } from "../../packages/compiler/src/codegen/generateJSX";
import { generateCompleteFile } from "../../packages/compiler/src/codegen/generateCompleteFile";
import { applyOperationsToStore, createSetStylesOperation, createSetPropsOperation, invertOperations, mergeStyleOperations } from "../../packages/editor/src/shared/utils/operations";
import { createI18n } from "../../packages/i18n/src/index";
import { parseJSX } from "../../packages/compiler/src/codegen/parseJSX";
import { lintCanvasDesign } from "../../packages/compiler/src/codegen/canvasDesignLint";
import { buildSelectionRootFromParsed } from "../../packages/compiler/src/codegen/selectionEdit";
import { storeSubtreeToLegacyNested } from "../../packages/compiler/src/store/legacy";
import { preserveMatchingSubtreeIds } from "../../packages/compiler/src/codegen/canvasAiEdit";
import { normalizeFlexShrinkOps } from "../../packages/editor/src/shared/utils/flexShrink";
import { expandComponentStyle, updateComponentStyleProperties } from "../../packages/compiler/src/store/componentStyleProperties";
import { commitInspectorUnitValue, getInspectorUnitInputValue } from "../../packages/editor/src/shell/utils/unitValue";
import { describeOperation, squashOperations } from "../../packages/editor/src/shared/utils/captureStore";
import { createVariableElementOperations } from "../../packages/editor/src/shared/utils/variableEditing";
import { bindElementVariable, detachElementVariable, setElementVariableMode, prepareVariableStore, variableStyleProjection } from "../../packages/compiler/src/runtime/variables";

const componentVariableLibrary: any = { version: 1, collections: [{ id: 'colors', defaultModeId: 'light', modes: [{ id: 'light' }, { id: 'dark' }] }], tokens: [{ id: 'fill', type: 'color', cssName: 'component-fill', collectionId: 'colors', valuesByMode: { light: { kind: 'literal', value: '#ffffff' }, dark: { kind: 'literal', value: '#111111' } } }] };

test("runtime variables preserve absent, empty, null and authored component style arguments across modes", () => {
  const variants = [{ props: {} }, { props: { style: {} } }, { props: { style: null } }, { props: {}, styles: { color: 'var(--component-fill)' } }];
  const store = storeFromNested(variants.map((value, i) => ({ id: `case-${i}`, type: 'component', componentName: 'DefaultStyle', ...value })));
  const before = toWire(store);
  for (const mode of ['light', 'dark']) {
    const prepared = prepareVariableStore(store, componentVariableLibrary, { colors: mode });
    const args = variants.map((_, i) => {
      const element = prepared.byId.get(`case-${i}`);
      const projection = variableStyleProjection(element)!;
      assert.equal(projection.declarations['--component-fill'], mode === 'dark' ? '#111111' : '#ffffff');
      const styles = { ...projection.styles, ...element.props?.style };
      return componentStyleArgument(element, styles, projection.declarations);
    });
    assert.equal(args[0], undefined);
    assert.deepEqual(args[1], {});
    assert.equal(args[2], null);
    assert.equal(args[3]?.color, 'var(--component-fill)');
    assert.equal(args[3]?.['--component-fill'], mode === 'dark' ? '#111111' : '#ffffff');
    const defaultStyle = { borderRadius: 23, padding: 9 };
    const receiveStyle = ({ style = defaultStyle }) => style;
    assert.equal(receiveStyle({ style: args[0] }), defaultStyle);
    assert.deepEqual(receiveStyle({ style: args[1] }), {});
    assert.equal(receiveStyle({ style: args[2] }), null);
    const cached = prepareVariableStore(store, componentVariableLibrary, { colors: mode });
    assert.equal(variableStyleProjection(cached.byId.get('case-0')), variableStyleProjection(prepared.byId.get('case-0')));
  }
  assert.deepEqual(toWire(store), before);
});

test("project theme boundaries cannot silently suppress component style defaults or replace explicit empty arguments", () => {
  const library = { ...componentVariableLibrary, tokens: componentVariableLibrary.tokens.map(token => ({ ...token, sourceRef: { kind: 'css' } })) };
  for (const props of [{}, { style: {} }, { style: null }]) {
    const store = storeFromNested([{ id: 'frame', type: 'html', tag: 'section', theme: { version: 1, localCollectionModes: { colors: 'dark' } }, children: [{ id: 'button', type: 'component', componentName: 'DefaultStyle', props, styles: {} }] }]);
    const before = toWire(store);
    assert.throws(() => generateJSX(store, 0, { purpose: 'project', rootId: 'button', variableLibrary: library }), /without changing its style argument/);
    const frame = generateJSX(store, 0, { purpose: 'project', rootId: 'frame', variableLibrary: library });
    assert.match(frame, /"--component-fill":\s*"#111111"/);
    const expected = !Object.hasOwn(props, 'style') ? '<DefaultStyle />' : props.style === null ? '<DefaultStyle style={null} />' : '<DefaultStyle style={{}} />';
    assert.ok(frame.includes(expected), frame);
    assert.deepEqual(toWire(store), before);
    // A CSS-backed default mode requires no extra component argument.
    store.byId.set('frame', { ...store.byId.get('frame'), theme: undefined });
    assert.ok(generateJSX(store, 0, { purpose: 'project', rootId: 'button', variableLibrary: library }).includes(expected));
  }
});

test("component variable bindings consolidate legacy styles and undo their contract metadata atomically", () => {
  const store = storeFromNested([{ id: 'legacy', type: 'component', componentName: 'Button', props: { style: { backgroundColor: 'red', color: 'yellow' } }, styles: { backgroundColor: 'blue', fontSize: '15px' } }]);
  const before = JSON.stringify(toWire(store));
  const index = { Button: { editing: { rootStyle: 'supported', rootTag: 'button' } } };
  const bind = createVariableElementOperations(store, ['legacy'], element => bindElementVariable(element, componentVariableLibrary, 'backgroundColor', 'fill'), index, true);
  const bound = applyOperationsToStore(store, bind);
  const element = bound.byId.get('legacy');
  assert.deepEqual(element.props, {});
  assert.deepEqual(element.styles, { backgroundColor: 'var(--component-fill)', color: 'yellow', fontSize: '15px' });
  assert.equal(element.componentEditing.styleRecords.backgroundColor.rootTag, 'button');
  assert.equal(element.componentEditing.styleRecords.backgroundColor.origin, 'editor');
  assert.equal(element.componentEditing.styleRecords.color.origin, 'legacy');
  assert.equal(element.theme.bindings[0].tokenId, 'fill');
  const detach = createVariableElementOperations(bound, ['legacy'], element => detachElementVariable(element, componentVariableLibrary, 'backgroundColor', { fill: '#111111' }), index, true);
  const detached = applyOperationsToStore(bound, detach);
  assert.equal(detached.byId.get('legacy').styles.backgroundColor, '#111111');
  assert.equal(detached.byId.get('legacy').theme.bindings.length, 0);
  assert.equal(JSON.stringify(toWire(applyOperationsToStore(detached, invertOperations(detach)))), JSON.stringify(toWire(bound)));
  assert.equal(JSON.stringify(toWire(applyOperationsToStore(bound, invertOperations(bind)))), before);
});

test("theme mode changes and no-op detach never migrate an untouched legacy component", () => {
  const store = storeFromNested([{ id: 'legacy', type: 'component', componentName: 'Button', props: { style: { color: 'red' } }, styles: { color: 'blue' } }]);
  const mode = createVariableElementOperations(store, ['legacy'], element => setElementVariableMode(element, componentVariableLibrary, 'colors', 'dark'));
  assert.deepEqual(mode.map(operation => operation.type), ['set_theme']);
  const changed = applyOperationsToStore(store, mode).byId.get('legacy');
  assert.deepEqual(changed.props, store.byId.get('legacy').props);
  assert.deepEqual(changed.styles, store.byId.get('legacy').styles);
  assert.equal(changed.componentEditing, undefined);
  assert.deepEqual(createVariableElementOperations(store, ['legacy'], element => detachElementVariable(element, componentVariableLibrary, 'color', {}), {}, true), []);
});

test("capture summaries preserve parameter resets and the visible legacy style changes", () => {
  const store = storeFromNested([{ id: 'legacy', type: 'component', componentName: 'Button', props: { disabled: false, style: { borderRadius: '20px', color: 'red' } }, styles: { borderRadius: '8px' } }]);
  const first = createSetStylesOperation(store, 'legacy', { borderRadius: '27px', color: 'red' }, undefined, undefined, undefined, true);
  const changed = applyOperationsToStore(store, [first]);
  const second = createSetStylesOperation(changed, 'legacy', { borderRadius: '30px', color: 'red' }, undefined, undefined, undefined, true);
  const final = applyOperationsToStore(changed, [second]);
  const [combined] = squashOperations([first, second], final);
  const summary = describeOperation(combined, final).summary;
  assert.match(summary, /borderRadius: "20px" → "30px"/);
  assert.doesNotMatch(summary, /8px|27px|color/);
  assert.equal(JSON.stringify(toWire(applyOperationsToStore(final, invertOperations([combined])))), JSON.stringify(toWire(store)));
  const reset = createSetStylesOperation(store, 'legacy', { color: 'red' }, undefined, undefined, undefined, true);
  assert.match(describeOperation(reset, store).summary, /remove borderRadius/);
  const props = createSetPropsOperation(store, 'legacy', { style: store.byId.get('legacy').props.style });
  assert.match(describeOperation(props, store).summary, /remove disabled/);
});

test("absent style arguments follow component defaults while explicit legacy empty arguments remain explicit", () => {
  const element = { id: 'default', type: 'component', componentName: 'DefaultStyle', props: {}, styles: {} };
  assert.equal(componentStyleArgument(element, {}), undefined);
  assert.deepEqual(componentStyleArgument(element, { color: 'red' }), { color: 'red' });
  const explicit = { ...element, props: { style: {} } };
  assert.deepEqual(componentStyleArgument(explicit, {}), {});
  assert.doesNotMatch(generateJSX(storeFromNested([element])), /style=/);
  assert.match(generateJSX(storeFromNested([explicit])), /style=\{\{\}\}/);
  const roundTrip = [...parseJSX(generateJSX(storeFromNested([explicit])), {}, {}).byId.values()][0];
  assert.deepEqual(roundTrip.props.style, {});
  assert.deepEqual(componentStyleArgument(roundTrip, {}), {});
  const explicitNull = { ...element, props: { style: null } };
  assert.equal(componentStyleArgument(explicitNull, {}), null);
  const nullCode = generateJSX(storeFromNested([explicitNull]));
  assert.match(nullCode, /style=\{null\}/);
  assert.equal([...parseJSX(nullCode, {}, {}).byId.values()][0].props.style, null);
});

test("legacy root styles display and export with their original precedence without mutating stored data", () => {
  const original = { id: 'legacy', type: 'component', componentName: 'Button', props: { disabled: false, style: { borderRadius: '20px', color: 'red' } }, styles: { borderRadius: '8px', fontSize: '15px' } };
  const store = storeFromNested([original]);
  const before = JSON.stringify(toWire(store));
  const view = componentEditableElement(store.byId.get('legacy'));
  assert.deepEqual(view.styles, { borderRadius: '20px', fontSize: '15px', color: 'red' });
  assert.equal(view.props.style, undefined);
  assert.equal(componentStyleOverrides(original, {}).find(entry => entry.property === 'borderRadius')?.value, '20px');
  const code = generateJSX(store, 0, { purpose: 'project' });
  assert.match(code, /20px/);
  assert.doesNotMatch(code, /8px/);
  const parsed = [...parseJSX(code, {}, {}).byId.values()][0];
  assert.deepEqual(parsed.styles, view.styles);
  assert.equal(JSON.stringify(toWire(store)), before);
});

test("ordered source attributes retain explicit empty style arguments through complete-file export", () => {
  for (const value of ['{}', 'null']) {
    const source = `<DefaultStyle label="Keep" style={${value}} onClick={handle} />`;
    const store = parseJSX(source, {}, {});
    const element = [...store.byId.values()][0];
    const before = JSON.stringify(toWire(store));
    const code = generateCompleteFile({ componentName: 'Exported', store, rootId: element.id, componentIndex: { DefaultStyle: { path: 'src/DefaultStyle.tsx', exportName: 'DefaultStyle' } }, targetFilePath: 'src/Exported.tsx' });
    assert.ok(code.includes(`style={${value}}`));
    assert.equal((code.match(/style=/g) ?? []).length, 1);
    assert.ok(code.indexOf('label="Keep"') < code.indexOf('style='));
    assert.ok(code.indexOf('style=') < code.indexOf('onClick={handle}'));
    const regenerated = generateJSX(parseJSX(generateJSX(store), {}, {}));
    assert.ok(regenerated.includes(`style={${value}}`), 'subsequent parse/generate cycles preserve presence');
    assert.equal(JSON.stringify(toWire(store)), before);
    delete element.props.style;
    assert.doesNotMatch(generateJSX(store), /style=/, 'a stale attribute-order entry does not resurrect an intentionally removed argument');
  }
});

test("first legacy style edit and continuous edits undo and redo both style sources atomically", () => {
  const info = { editing: { rootStyle: 'supported', rootTag: 'button' } };
  const store = storeFromNested([{ id: 'legacy', type: 'component', componentName: 'Button', props: { label: 'Keep', disabled: false, style: { borderRadius: '20px', color: 'red' } }, styles: { borderRadius: '8px', fontSize: '15px' } }]);
  const original = JSON.stringify(toWire(store));
  const view = componentEditableElement(store.byId.get('legacy'));
  const nextStyles = { ...view.styles }; delete nextStyles.borderRadius;
  const first = createSetStylesOperation(store, 'legacy', nextStyles, undefined, undefined, info, true);
  const changed = applyOperationsToStore(store, [first]);
  assert.deepEqual(changed.byId.get('legacy').props, { label: 'Keep', disabled: false });
  assert.deepEqual(changed.byId.get('legacy').styles, { fontSize: '15px', color: 'red' });
  assert.equal(changed.byId.get('legacy').componentEditing.styleRecords.color.origin, 'legacy');
  const second = createSetStylesOperation(changed, 'legacy', { ...changed.byId.get('legacy').styles, borderRadius: '30px' }, undefined, undefined, info, true);
  const combined = mergeStyleOperations(first, second);
  const final = applyOperationsToStore(store, [combined]);
  assert.equal(final.byId.get('legacy').componentEditing.styleRecords.borderRadius.origin, 'editor');
  assert.equal(JSON.stringify(toWire(applyOperationsToStore(final, invertOperations([combined])))), original);
  assert.deepEqual(applyOperationsToStore(store, [combined]).byId.get('legacy'), final.byId.get('legacy'));
  assert.equal(ensureV2(JSON.parse(JSON.stringify(toWire(final)))).byId.get('legacy').props.style, undefined);
});

test("ambiguous legacy root and outer styles remain intact and do not silently lose data on export", () => {
  const info = { editing: { rootStyle: 'supported', rootTag: 'button' } };
  const element = { id: 'legacy', type: 'component', componentName: 'Button', props: { style: { width: '80px', borderRadius: '20px' } }, styles: { position: 'absolute', width: '200px', top: '12px' } };
  assert.equal(componentLegacyStyleState(element), 'separate');
  assert.equal(componentEditableElement(element), element);
  assert.equal(componentStyleSupport(element, info), false);
  const store = storeFromNested([element]);
  assert.throws(() => generateJSX(store, 0, { purpose: 'project', componentIndex: { Button: info } }), /legacy root styles need source review/);
  const layout = createSetStylesOperation(store, element.id, { ...element.styles, width: '240px' }, undefined, undefined, info, true);
  assert.deepEqual(applyOperationsToStore(store, [layout]).byId.get(element.id).props, element.props);
  assert.deepEqual(store.byId.get(element.id), element);
});

test("length fields accept a CSS variable reference without coercing it to a number", () => {
  assert.deepEqual(commitInspectorUnitValue("var(--radius-lg)"), { valid: true, cssValue: "var(--radius-lg)", inputValue: "var(--radius-lg)", unit: null });
  assert.equal(getInspectorUnitInputValue("var(--radius-lg)"), "var(--radius-lg)");
  assert.equal(commitInspectorUnitValue("var(radius)").valid, false);
  assert.equal(commitInspectorUnitValue("var(--radius); color:red").valid, false);
  assert.equal(commitInspectorUnitValue("{execute()}").valid, false);
});

test("directional resets split known shorthands without changing other sides or provenance", () => {
  const info = { editing: { rootStyle: "supported", rootTag: "button" } };
  const store = parseJSX('<Button style={{ padding: "8px 12px 16px 20px", paddingLeft: "24px", margin: "2px 4px", borderRadius: "10px 20px / 30px 40px" }} />', {}, {});
  const element = [...store.byId.values()][0];
  const next = updateComponentStyleProperties(element.styles, { paddingLeft: undefined, marginTop: "6px", borderTopLeftRadius: undefined });
  assert.deepEqual(next, { paddingTop: "8px", paddingRight: "12px", paddingBottom: "16px", marginRight: "4px", marginBottom: "2px", marginLeft: "4px", marginTop: "6px", borderTopRightRadius: "20px 40px", borderBottomRightRadius: "10px 30px", borderBottomLeftRadius: "20px 40px" });
  const op = createSetStylesOperation(store, element.id, next, undefined, undefined, info);
  const changed = applyOperationsToStore(store, [op]);
  assert.equal(changed.byId.get(element.id).componentEditing.styleRecords.paddingRight.origin, "source");
  assert.equal(changed.byId.get(element.id).componentEditing.styleRecords.marginTop.origin, "editor");
  assert.deepEqual(applyOperationsToStore(changed, invertOperations([op])).byId.get(element.id), element);
  const restored = ensureV2(JSON.parse(JSON.stringify(toWire(changed))));
  assert.deepEqual(restored.byId.get(element.id).styles, next);
  assert.doesNotMatch(generateJSX(restored), /paddingLeft|borderTopLeftRadius/);
});

test("shorthand normalization respects declaration order and keeps opaque variable references", () => {
  assert.deepEqual(updateComponentStyleProperties({ paddingLeft: "99px", padding: "2px 4px" }, { paddingTop: "6px" }), { paddingRight: "4px", paddingBottom: "2px", paddingLeft: "4px", paddingTop: "6px" });
  assert.equal(expandComponentStyle("padding", "var(--space)"), null);
  assert.equal(expandComponentStyle("padding", "var(--space, 1px 2px)"), null);
  assert.deepEqual(expandComponentStyle("padding", "calc(2px + 3px) 10%"), { paddingTop: "calc(2px + 3px)", paddingRight: "10%", paddingBottom: "calc(2px + 3px)", paddingLeft: "10%" });
  const token = { padding: "var(--space, 1px 2px)", paddingLeft: "8px", borderRadius: "var(--radius-lg)" };
  const changed = updateComponentStyleProperties(token, { paddingRight: "12px" });
  assert.equal(changed.padding, token.padding);
  assert.deepEqual(updateComponentStyleProperties(changed, { padding: undefined }), { paddingLeft: "8px", borderRadius: "var(--radius-lg)", paddingRight: "12px" });
  const store = storeFromNested([{ id: "token", type: "component", componentName: "Button", props: {}, styles: changed }]);
  const reopened = ensureV2(JSON.parse(JSON.stringify(toWire(store))));
  assert.equal(reopened.byId.get("token").styles.padding, token.padding);
  assert.match(generateJSX(reopened), /var\(--space, 1px 2px\)/);
});

test("component instance controls have translations without replacing existing component editing labels", async () => {
  for (const locale of ["zh-CN", "en"] as const) {
    const i18n = await createI18n(locale);
    assert.notEqual(i18n.t("componentInstance.parameters", { ns: "editor" }), "componentInstance.parameters");
    assert.notEqual(i18n.t("componentEditing.save", { ns: "editor" }), "componentEditing.save");
  }
});

test("layout normalization never invents or removes component instance overrides", () => {
  const store = storeFromNested([{ id: "frame", type: "html", tag: "div", styles: { display: "flex" }, children: [
    { id: "button", type: "component", componentName: "Button", props: {}, styles: {} },
    { id: "fixed", type: "component", componentName: "Button", props: {}, styles: { flexShrink: 0 } },
    { id: "box", type: "html", tag: "div", styles: {} },
  ] }]);
  assert.deepEqual(normalizeFlexShrinkOps(store, [{ type: "insert", element: { id: "button" } }]), []);
  assert.deepEqual(normalizeFlexShrinkOps(store, [{ type: "set_styles", elementId: "frame", oldStyles: { display: "flex" }, newStyles: { display: "block" } }]), []);
  assert.equal(normalizeFlexShrinkOps(store, [{ type: "insert", element: { id: "box" } }])[0].newStyles.flexShrink, 0, "native canvas element behavior remains intact");
});

test("typed parameter edits distinguish absence, empty text, false and numeric-looking strings", () => {
  for (const text of ["", "12", "false", "null", "{doNotExecute()}"]) assert.equal(parseComponentPropInput({ type: "string" }, text), text);
  assert.equal(parseComponentPropInput({ type: "number" }, "0"), 0);
  assert.equal(parseComponentPropInput({ type: "boolean" }, "false"), false);
  for (const value of ["", " ", "NaN", "Infinity", "12px"]) assert.throws(() => parseComponentPropInput({ type: "number" }, value));
  assert.equal(componentPropControl({ type: "() => void" }).kind, "readonly");
  assert.equal(componentPropControl({ type: "Record<string, number>" }).kind, "readonly");
  assert.deepEqual(componentPropControl({ type: `'a|b' | '' | 12 | false | null | undefined` }).options, ["a|b", "", 12, false, null]);
  const descriptor = { type: "boolean", default: false };
  const explicit = updateComponentProp({}, "enabled", descriptor, { value: false });
  assert.equal(Object.hasOwn(explicit, "enabled"), true);
  assert.equal(componentPropState([{ props: {} }, { props: explicit }], "enabled", descriptor).mixed, true);
  assert.deepEqual(updateComponentProp(explicit, "enabled", descriptor, { reset: true }), {});
  assert.equal(canResetComponentProp({ type: "string", required: true }), false);
  assert.equal(canResetComponentProp({ type: "string", required: true, default: "" }), true);
});

test("parameter edits preserve unrelated values and undo field presence", () => {
  const store = storeFromNested([{ id: "b", type: "component", componentName: "Button", props: { label: "Save", enabled: false }, styles: { borderRadius: "12px" } }]);
  const op = createSetPropsOperation(store, "b", { label: "", enabled: false });
  const changed = applyOperationsToStore(store, [op]);
  assert.deepEqual(changed.byId.get("b").styles, { borderRadius: "12px" });
  assert.deepEqual(applyOperationsToStore(changed, invertOperations([op])).byId.get("b").props, store.byId.get("b").props);
  const jsx = generateJSX(changed);
  assert.match(jsx, /enabled=\{false\}/);
  assert.match(jsx, /label=""/);
});

test("overrides survive parameter changes, persistence and undo; reset removes declaration", () => {
  const info = { path: "Button.tsx", exportName: "Button", editing: { rootStyle: "supported", rootTag: "button" } };
  const store = storeFromNested([{ id: "b", type: "component", componentName: "Button", props: {}, styles: {} }]);
  const style = createSetStylesOperation(store, "b", { borderRadius: "var(--radius-lg)" }, undefined, undefined, info);
  const changed = applyOperationsToStore(store, [style]);
  const resized = applyOperationsToStore(changed, [createSetPropsOperation(changed, "b", { size: "lg" })]);
  const restored = ensureV2(JSON.parse(JSON.stringify(toWire(resized))));
  assert.equal(restored.byId.get("b").componentEditing.styleRecords.borderRadius.origin, "editor");
  assert.equal(restored.byId.get("b").styles.borderRadius, "var(--radius-lg)");
  const reset = createSetStylesOperation(restored, "b", {}, undefined, undefined, info);
  const cleared = applyOperationsToStore(restored, [reset]);
  assert.deepEqual(componentStyleOverrides(cleared.byId.get("b"), info), []);
  assert.deepEqual(cleared.byId.get("b").props, { size: "lg" });
  assert.doesNotMatch(generateJSX(cleared), /style=/);
  const undone = applyOperationsToStore(cleared, invertOperations([reset]));
  assert.deepEqual(undone.byId.get("b").componentEditing, restored.byId.get("b").componentEditing);
  assert.deepEqual(componentRenderStyles(undone.byId.get("b"), info), { borderRadius: "var(--radius-lg)" });
  assert.deepEqual(componentRenderStyles(undone.byId.get("b"), { editing: { rootStyle: "unknown" } }), {});
  assert.equal(undone.byId.get("b").styles.borderRadius, "var(--radius-lg)");
});

test("outer box layout is not included in root override reset scope", () => {
  const element = { type: "component", props: {}, styles: { position: "absolute", width: 100, top: 20, borderRadius: 8 } };
  assert.deepEqual(componentStyleOverrides(element, {}).map(entry => entry.property), ["borderRadius"]);
});

test("changing a static parameter preserves dynamic attributes, spread order and children", () => {
  const store = parseJSX(`<Button before="A" {...options} size="sm" onClick={() => save(record)} style={{...theme, color: accent}}>{items.map(item => <Row key={item.id} item={item} />)}</Button>`, {}, {});
  const element = [...store.byId.values()][0];
  assert.equal(element.sourceExpressions.spread, true);
  assert.match(element.sourceExpressions.props.onClick, /save\(record\)/);
  assert.equal(element.styles, undefined, "dynamic style is not converted to a partial snapshot");
  const op = createSetPropsOperation(store, element.id, { ...element.props, size: "lg" });
  const output = generateJSX(applyOperationsToStore(store, [op]));
  assert.match(output, /before="A" \{\.\.\.options\} size="lg" onClick=\{\(\) => save\(record\)\}/);
  assert.match(output, /style=\{\{\.\.\.theme, color: accent\}\}/);
  assert.match(output, /\{items\.map\(item => <Row key=\{item\.id\} item=\{item\} \/>\)\}/);
  assert.equal(generateJSX(ensureV2(JSON.parse(JSON.stringify(toWire(applyOperationsToStore(store, [op])))))), output);
});

test("agent parameter validation uses the same typed contract as the inspector", () => {
  const catalog = { Button: { props: { count: { type: "number" }, active: { type: "boolean" }, label: { type: "string" } } } };
  assert.deepEqual(lintCanvasDesign('<Button count={0} active={false} label="" />', catalog), []);
  assert.deepEqual(lintCanvasDesign('<Button active count={runtimeCount} label="false" />', catalog), []);
  assert.equal(lintCanvasDesign('<Button count="12" active="false" label={1} />', catalog).filter(item => item.code === 'INVALID_COMPONENT_PROP').length, 3);
});

test("style capabilities account for default and bound asChild values in every entry", () => {
  const info = { props: { asChild: { type: "boolean", default: true } }, editing: { rootStyle: "supported" } };
  const element = { type: "component", props: {}, styles: {} };
  assert.equal(componentStyleSupport(element, info), false);
  assert.equal(componentStyleSupport({ ...element, props: { asChild: false } }, info), true);
  assert.equal(componentStyleSupport({ ...element, props: { asChild: false }, sourceExpressions: { props: { asChild: "runtimeFlag" } } }, info), false);
});

test("code edits retain override provenance and invalidated overrides cannot be saved", () => {
  const info = { path: "Button.tsx", exportName: "Button", editing: { rootStyle: "supported", rootTag: "button" } };
  const initial = storeFromNested([{ id: "b", type: "component", componentName: "Button", props: {}, styles: {} }]);
  const edited = applyOperationsToStore(initial, [createSetStylesOperation(initial, "b", { borderRadius: "12px" }, undefined, undefined, info)]);
  const parsed = parseJSX('<Button size="lg" style={{ borderRadius: "12px" }} />', {}, {});
  const next = buildSelectionRootFromParsed(storeSubtreeToLegacyNested(edited, "b"), "b", [...parsed.byId.keys()].map(id => storeSubtreeToLegacyNested(parsed, id)));
  assert.equal(next.element.componentEditing.styleRecords.borderRadius.origin, 'editor');
  assert.equal(next.element.componentEditing.styleRecords.borderRadius.rootTag, 'button');
  const agentEdit = preserveMatchingSubtreeIds(storeSubtreeToLegacyNested(edited, "b"), { ...next.element, props: { size: "sm" } });
  assert.equal(agentEdit.componentEditing.styleRecords.borderRadius.origin, 'editor');
  assert.equal(agentEdit.componentEditing.styleRecords.borderRadius.rootTag, 'button');
  assert.match(generateJSX(edited, 0, { purpose: "project", componentIndex: { Button: info } }), /borderRadius/);
  assert.throws(() => generateJSX(edited, 0, { purpose: "project", componentIndex: { Button: { editing: { rootStyle: "unknown" } } } }), /target for borderRadius/);
});

test("future component metadata versions are rejected without rewriting the document", () => {
  const element = { id: "b", type: "component", componentName: "Button", componentEditing: { schemaVersion: 99 }, styles: { borderRadius: "12px" } };
  assert.throws(() => ensureV2([element]), /Unsupported component editing/);
  assert.equal(element.componentEditing.schemaVersion, 99);
  assert.equal(element.styles.borderRadius, "12px");
});
