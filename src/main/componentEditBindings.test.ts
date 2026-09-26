import assert from "node:assert/strict";
import test from "node:test";
import { validateComponentBindingChanges } from "../../packages/compiler/src/codegen/componentEditBindings";
import { buildSelectionRootFromParsed } from "../../packages/compiler/src/codegen/selectionEdit";
import { normalizeUpdateSubtree } from "../../packages/compiler/src/codegen/canvasAiEdit";
import { parseJSX } from "../../packages/compiler/src/codegen/parseJSX";
import { getRootIds } from "../../packages/compiler/src/store/read";
import { storeSubtreeToLegacyNested } from "../../packages/compiler/src/store/legacy";

const catalog={Button:{props:{count:{type:"number"},label:{type:"string"}}}};
const parsed = jsx => { const store=parseJSX(jsx,{},{Button:{}},undefined,{forceNewIds:true}); return storeSubtreeToLegacyNested(store,getRootIds(store)[0]); };
const expectRejected = (beforeJsx: string, afterJsx: string) => {
  const before=parsed(beforeJsx), after=parsed(afterJsx);
  assert.throws(()=>validateComponentBindingChanges(before,after),/source binding/);
  assert.match(buildSelectionRootFromParsed(before,before.id,[after],undefined,catalog).error,/source binding/);
  assert.match(normalizeUpdateSubtree(before,after,new Set([before.id]),new Set([before.id]),catalog).error,/source binding/);
};

test("code and agent edits reject new, replaced and removed dynamic parameter bindings", () => {
  expectRejected('<Button count={0} />','<Button count={runtimeCount} />');
  expectRejected('<Button count={runtimeCount} />','<Button count={0} />');
  expectRejected('<Button count={runtimeCount} />','<Button count={otherCount} />');
  expectRejected('<Button count={runtimeCount} />','<Button />');
});

test("unchanged bindings survive ordinary edits and harmless expression formatting", () => {
  const before=parsed('<Button count={state.count} label="Before" onClick={() => save()} />');
  const after=parsed('<Button count={state . count} label="After" onClick={ () => save( ) } />');
  assert.doesNotThrow(()=>validateComponentBindingChanges(before,after));
  const result=buildSelectionRootFromParsed(before,before.id,[after],undefined,catalog);
  assert.equal(result.error,undefined);
  assert.equal(result.element.props.label,'After');
  assert.match(result.element.sourceExpressions.props.count,/state/);
});

test("spread bindings preserve their ordering and disable ambiguous parameter edits", () => {
  expectRejected('<Button {...options} count={0} />','<Button count={0} {...options} />');
  expectRejected('<Button {...options} count={0} />','<Button {...options} count={1} />');
  expectRejected('<Button {...options} />','<Button {...other} />');
  expectRejected('<Button {...options} />','<Button />');
  expectRejected('<Button />','<Button {...options} />');
  assert.doesNotThrow(()=>validateComponentBindingChanges(parsed('<Button {...options} count={0} />'),parsed('<Button data-element-id="instance" {...options} count={0} />')));
});

test("new components cannot introduce unevaluated callbacks or dynamic children", () => {
  for(const jsx of ['<Button onClick={() => save()} />','<Button>{items.map(item => <span>{item}</span>)}</Button>']) {
    assert.throws(()=>validateComponentBindingChanges(undefined,parsed(jsx)),/source binding/);
  }
  expectRejected('<Button>{items}</Button>','<Button>Static</Button>');
});

test("static component values and ordinary HTML are unaffected by the binding guard", () => {
  assert.doesNotThrow(()=>validateComponentBindingChanges(undefined,parsed('<Button count={0} label="" />')));
  assert.doesNotThrow(()=>validateComponentBindingChanges(undefined,{type:'html',sourceExpressions:{props:{title:'title={text}'}}}));
});
