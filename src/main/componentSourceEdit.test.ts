import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { componentImportAtCallsite, editComponentCallsite, componentSourceChanges } from "../../packages/compiler/src/codegen/componentSourceEdit";
import { parseCompositionFile } from "../../packages/compiler/src/codegen/extractCompositionElement";
import { parseCompositionJsx } from "../../packages/compiler/src/codegen/parseComposition";
import { cloneElementWithNewIds } from "../../packages/editor/src/shared/utils/elementCloning";
import { applyComponentSourceSave } from "../../packages/editor/src/shared/utils/componentSourceSave";
import { applyOperationsToStore, createSetStylesOperation, createSetPropsOperation, invertOperations } from "../../packages/editor/src/shared/utils/operations";
import { prepareComponentInstanceSourceEdit } from "./componentInstanceSave";
import { storeFromNested } from "../../packages/compiler/src/store/ensureV2";

const locator = (source: string, index = 0) => {
  const nodes: any[] = [];
  traverse(parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] }), { JSXOpeningElement(path) { if (path.node.name.type === "JSXIdentifier" && path.node.name.name === "Button") nodes.push(path.node); } });
  const node = nodes[index];
  return { start: node.start, end: node.end, tag: "Button", openingSource: source.slice(node.start, node.end) };
};
const empty = () => ({ set: {}, remove: [] });

test("source identity follows the call's lexical binding across nested scopes", () => {
  const source = `import {Button} from '#components/Button';
    const first = <Button />;
    function Parameter(Button) { return <Button />; }
    function Destructured({Button}) { return <Button />; }
    { const Button = replacement; const local = <Button />; }
    function Unrelated() { const Button = replacement; }
    function Imported() { return <Button />; }`;
  assert.deepEqual(componentImportAtCallsite(source, locator(source, 0)), {source:'#components/Button', name:'Button'});
  for (const index of [1, 2, 3]) assert.equal(componentImportAtCallsite(source, locator(source, index)), null);
  assert.deepEqual(componentImportAtCallsite(source, locator(source, 4)), {source:'#components/Button', name:'Button'});
});

test("source identity supports renamed value imports and default imports only", () => {
  for (const [declaration, name] of [[`import {Actual as Button} from './Button'`, 'Actual'], [`import Button from './Button'`, 'default']]) {
    const source = `${declaration}; const view = <Button />;`;
    assert.deepEqual(componentImportAtCallsite(source, locator(source)), {source:'./Button', name});
  }
  for (const declaration of [`import type {Button} from './Button'`, `import {type Button} from './Button'`, `import type Button from './Button'`, `import * as Button from './Button'`, `const Button = replacement`]) {
    const source = `${declaration}; const view = <Button />;`;
    assert.equal(componentImportAtCallsite(source, locator(source)), null);
  }
});

test("source identity rejects a stale locator and reassigned imported binding", () => {
  const source = `import {Button} from './Button'; const view = <Button />;`;
  assert.equal(componentImportAtCallsite(source, {...locator(source), openingSource:'<Button disabled />'}), null);
  assert.equal(componentImportAtCallsite(source, {...locator(source), start:0}), null);
  const reassigned = source + ` Button = replacement;`;
  assert.equal(componentImportAtCallsite(reassigned, locator(reassigned)), null);
});

test("component source edits change only the selected call attributes and preserve all other code", () => {
  const source = `import { Button } from './Button';\nconst handler = () => submit();\nexport const One = <Button size="sm" disabled onClick={handler} style={{ borderRadius: 8, color: 'red' }}>Hello {name}</Button>;\nexport const Two = <Button size="sm" />; // keep\n`;
  const target = locator(source);
  const result = editComponentCallsite(source, target, { props: { set: { size: "lg", disabled: false, label: "" }, remove: [] }, styles: { set: { borderRadius: "var(--radius-lg)" }, remove: [] } });
  assert.equal(result.source.slice(0, target.start), source.slice(0, target.start));
  assert.equal(result.source.slice(result.locator.end), source.slice(target.end));
  assert.match(result.locator.openingSource, /disabled=\{false\}/);
  assert.match(result.locator.openingSource, /onClick=\{handler\}/);
  assert.match(result.locator.openingSource, /label=\{""\}/);
  assert.match(result.locator.openingSource, /var\(--radius-lg\)/);
  assert.match(result.locator.openingSource, /color: 'red'/);
});

test("reset removes only the requested fields, including the last style property", () => {
  const source = `export const One = <Button size="lg" disabled={false} style={{borderRadius: 12}} onClick={() => save()} />;`;
  const result = editComponentCallsite(source, locator(source), { props: { set: {}, remove: ["size"] }, styles: { set: {}, remove: ["borderRadius"] } });
  assert.doesNotMatch(result.source, /size=|style=/);
  assert.match(result.source, /disabled=\{false\}/);
  assert.match(result.source, /onClick=\{\(\) => save\(\)\}/);
});

test("explicit empty and null styles survive unrelated source edits and accept an intentional override", () => {
  for (const style of ['{}', 'null']) {
    const source = `export const One = <Button label="Keep" style={${style}} />;`;
    const unrelated = editComponentCallsite(source, locator(source), { props: { set: { disabled: false }, remove: [] }, styles: empty() });
    assert.ok(unrelated.source.includes(`style={${style}}`));
    const changed = editComponentCallsite(source, locator(source), { props: empty(), styles: { set: { borderRadius: 12 }, remove: [] } });
    assert.match(changed.source, /"borderRadius": 12/);
    assert.match(changed.source, /label="Keep"/);
    const reset = editComponentCallsite(changed.source, changed.locator, { props: empty(), styles: { set: {}, remove: ['borderRadius'] } });
    assert.doesNotMatch(reset.source, /style=/);
  }
});

test("empty style reset and its undo can both be saved without losing argument presence", () => {
  for (const value of [{}, null]) {
    const source = `export const One = <Button disabled={false} style={${JSON.stringify(value)}} />;`;
    const binding = { schemaVersion: 1, ...locator(source), filePath: 'example.tsx', sourceHash: crypto.createHash('sha256').update(source).digest('hex'), baseProps: { disabled: false, style: value }, baseStyles: {} };
    const element = { id: 'empty-style', type: 'component', componentName: 'Button', props: { ...binding.baseProps }, styles: {}, componentEditing: { schemaVersion: 1, sourceBinding: binding } };
    const info = { props: { disabled: { type: 'boolean' } }, editing: { rootStyle: 'supported', rootTag: 'button' } };
    const store = storeFromNested([element]);
    const reset = createSetStylesOperation(store, element.id, {}, undefined, undefined, info, true);
    const changed = applyOperationsToStore(store, [reset]);
    const prepared = prepareComponentInstanceSourceEdit(source, changed.byId.get(element.id), info);
    assert.doesNotMatch(prepared.code, /style=/);
    assert.match(prepared.code, /disabled=\{false\}/);
    const saved = applyComponentSourceSave(changed, prepared);
    const undone = applyOperationsToStore(saved, invertOperations([reset]));
    const restored = prepareComponentInstanceSourceEdit(prepared.code, undone.byId.get(element.id), info);
    assert.ok(restored.code.includes(`style={${JSON.stringify(value)}}`));
    assert.equal(componentSourceChanges(binding, element).styleArgument, undefined);
  }
});

test("empty style argument edits reject dynamic sources and cannot erase unrelated declarations", () => {
  for (const style of ['styles', '{...styles}', '{color: "red"}']) {
    const source = `export const One = <Button style={${style}} />;`;
    assert.throws(() => editComponentCallsite(source, locator(source), { props: empty(), styles: empty(), styleArgument: 'omit' }));
  }
});

test("dynamic fields, spreads, duplicate attributes and stale locations never get guessed", () => {
  for (const attrs of [`size={current}`, `{...props} size="sm"`, `size="sm" size="lg"`]) {
    const source = `export const One = <Button ${attrs} />;`;
    assert.throws(() => editComponentCallsite(source, locator(source), { props: { set: { size: "lg" }, remove: [] }, styles: empty() }));
  }
  for (const style of [`style={styles}`, `style={{...styles}}`, `style={{borderRadius: radius}}`]) {
    const source = `export const One = <Button ${style} />;`;
    assert.throws(() => editComponentCallsite(source, locator(source), { props: empty(), styles: { set: { borderRadius: 12 }, remove: [] } }));
  }
  const source = `export const One = <Button size="sm" />;`;
  assert.throws(() => editComponentCallsite("// shifted\n" + source, locator(source), { props: { set: { size: "lg" }, remove: [] }, styles: empty() }), /could not be located/);
});

test("composition import preserves exact callsite identity while keeping constant bindings locked", () => {
  const source = `import { Button } from './Button';\nconst size = 'sm';\nexport const Example = <div><Button size={size} label="Save" onClick={() => save()} style={{borderRadius: 8}} /></div>;`;
  const sourceHash = crypto.createHash("sha256").update(source).digest("hex");
  const parsed = parseCompositionFile(source, { filePath: "src/Button.compositions.tsx", sourceHash });
  const jsx = parsed.editableJsxByExport.get("Example");
  assert.ok(jsx?.includes("data-bingo-callsite"));
  const store = parseCompositionJsx(jsx, {}, { Button: { path: "src/Button.tsx" } });
  const element: any = [...store.byId.values()].find((item: any) => item.type === "component");
  assert.equal(element.props.size, "sm");
  assert.equal(element.props["data-bingo-callsite"], undefined);
  assert.equal(element.sourceExpressions.props.size, "size={size}");
  const binding = element.componentEditing.sourceBinding;
  assert.equal(binding.sourceHash, sourceHash);
  assert.equal(source.slice(binding.start, binding.end), binding.openingSource);
  assert.equal(binding.baseProps.label, "Save");
  const changes = componentSourceChanges(binding, { ...element, props: { ...element.props, label: "Changed" }, styles: {} });
  assert.deepEqual(changes, { props: { set: { label: "Changed" }, remove: [] }, styles: { set: {}, remove: ["borderRadius"] } });
  const result = editComponentCallsite(source, binding, changes);
  assert.match(result.source, /size=\{size\}/);
  assert.match(result.source, /label=\{"Changed"\}/);
  assert.doesNotMatch(result.source, /style=|data-bingo-callsite/);
  const imported = cloneElementWithNewIds(element);
  assert.ok(imported.componentEditing.sourceBinding);
  assert.equal(imported.componentEditing.sourceBinding.template, undefined);
  assert.equal(cloneElementWithNewIds(imported).componentEditing.sourceBinding, undefined, "a copied instance must not overwrite the original call");
});

test("source-save bookkeeping preserves concurrent canvas edits and survives style undo", () => {
  const source = `export const Example = <div><Button style={{borderRadius: 8}}/><Button size="sm"/></div>`;
  const sourceHash = crypto.createHash("sha256").update(source).digest("hex");
  const jsx = parseCompositionFile(source, { filePath: "example.tsx", sourceHash }).editableJsxByExport.get("Example");
  const store = parseCompositionJsx(jsx, {}, { Button: {} });
  const buttons: any[] = [...store.byId.values()].filter((element: any) => element.type === "component");
  const first = buttons[0], second = buttons[1];
  const edit = createSetStylesOperation(store, first.id, { borderRadius: 12 });
  const edited = applyOperationsToStore(store, [edit]);
  const binding = first.componentEditing.sourceBinding;
  const result = editComponentCallsite(source, binding, componentSourceChanges(binding, edited.byId.get(first.id)));
  const savedBinding = { ...binding, ...result.locator, sourceHash: crypto.createHash("sha256").update(result.source).digest("hex"), baseProps: {}, baseStyles: { borderRadius: 12 } };
  const concurrent = applyOperationsToStore(edited, [createSetPropsOperation(edited, first.id, { label: "Edited while saving" })]);
  const saved = applyComponentSourceSave(concurrent, { filePath: "example.tsx", previousHash: sourceHash, sourceBinding: savedBinding, oldEnd: binding.end, delta: result.source.length - source.length, code: result.source });
  assert.equal(saved.byId.get(first.id).props.label, "Edited while saving");
  assert.deepEqual(componentSourceChanges(savedBinding, saved.byId.get(first.id)).props, { set: { label: "Edited while saving" }, remove: [] });
  const nextSecond = saved.byId.get(second.id).componentEditing.sourceBinding;
  assert.equal(nextSecond.openingSource, second.componentEditing.sourceBinding.openingSource);
  assert.equal(result.source.slice(nextSecond.start, nextSecond.end), nextSecond.openingSource);
  const undone = applyOperationsToStore(saved, invertOperations([edit]));
  assert.equal(undone.byId.get(first.id).componentEditing.sourceBinding.sourceHash, savedBinding.sourceHash);
  assert.deepEqual(componentSourceChanges(savedBinding, undone.byId.get(first.id)).styles, { set: { borderRadius: 8 }, remove: [] });
});

test("saving validates the source version, current API and root style contract", () => {
  const source = `export const Example = <Button size="sm" />`;
  const binding = { schemaVersion: 1, ...locator(source), filePath: "example.tsx", sourceHash: crypto.createHash("sha256").update(source).digest("hex"), baseProps: { size: "sm" }, baseStyles: {} };
  const element = { id: "button", type: "component", componentName: "Button", props: { size: "lg" }, styles: {}, componentEditing: { schemaVersion: 1, sourceBinding: binding } };
  const info = { props: { size: { type: "'sm' | 'lg'" } }, editing: { rootStyle: "supported", rootTag: "button" } };
  assert.match(prepareComponentInstanceSourceEdit(source, element, info).code, /size=\{"lg"\}/);
  assert.throws(() => prepareComponentInstanceSourceEdit(source + " // external", element, info), { code: "SOURCE_CONFLICT" });
  assert.throws(() => prepareComponentInstanceSourceEdit(source, element, { ...info, props: { size: { type: "'sm'" } } }), { code: "INVALID_PARAMETER" });
  assert.throws(() => prepareComponentInstanceSourceEdit(source, { ...element, styles: { borderRadius: 12 } }, { ...info, editing: { rootStyle: "unknown" } }), { code: "UNSUPPORTED_STYLE" });
  assert.throws(() => prepareComponentInstanceSourceEdit(source, { ...element, styles: { position: "absolute", width: 120 } }, info), { code: "UNSUPPORTED_LAYOUT" });
});
