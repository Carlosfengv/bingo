import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { normalizeUpdateSubtree } from "../../packages/compiler/src/codegen/canvasAiEdit";
import { buildSelectionRootFromParsed } from "../../packages/compiler/src/codegen/selectionEdit";
import { ensureV2 } from "../../packages/compiler/src/store/ensureV2";
import { toWire } from "../../packages/compiler/src/store/wire";
import { applyOperationsToStore, createReplaceOperation, invertOperations } from "../../packages/editor/src/shared/utils/operations";
import { prepareComponentInstanceSourceEdit } from "./componentInstanceSave";

const catalog = { Button: {path:"Button.tsx",props:{label:{type:"string"}},editing:{rootStyle:"supported",rootTag:"button"}} };
const button = (id: string, label: string, extra = {}) => ({id,type:"component",componentName:"Button",props:{label},styles:{borderRadius:"12px"},...extra});
const original = (id: string, label: string, origin: string) => button(id,label,{
  componentEditing:{schemaVersion:1,identity:{sourcePath:"Button.tsx",exportName:"Button"},sourceBinding:{schemaVersion:1,filePath:`${id}.tsx`,sourceHash:id},styleRecords:{borderRadius:{target:"root",scope:"base",origin,rootTag:"button"}}},
  sourceInfo:{fileName:`${id}.tsx`,lineNumber:10},
  theme:{version:1,localCollectionModes:{colors:id},bindings:[]},
});
const frame = children => ({id:"frame",type:"html",tag:"div",children});
const nodes = root => [root,...(root.children??[]).flatMap(nodes)];
const update = (before,next) => normalizeUpdateSubtree(before,next,new Set(nodes(before).map(n=>n.id)),new Set([...nodes(before).map(n=>n.id),"foreign"]),catalog);

test("agent reorder preserves explicit instance IDs and their own source/override metadata", () => {
  const a=original("a","A","source"),b=original("b","B","editor");
  const before=frame([a,b]);
  const result=update(before,frame([button("b","B edited"),button("a","A edited")]));
  assert.equal(result.error,undefined);
  assert.deepEqual(result.element.children.map(n=>n.id),["b","a"]);
  for(const [next,old] of [[result.element.children[0],b],[result.element.children[1],a]]) {
    assert.deepEqual(next.componentEditing,old.componentEditing);
    assert.deepEqual(next.sourceInfo,old.sourceInfo);
    assert.deepEqual(next.theme,old.theme);
  }
  const store=ensureV2([before]),op=createReplaceOperation(store,"frame",result.element);
  const applied=applyOperationsToStore(store,[op]);
  const reopened=ensureV2(JSON.parse(JSON.stringify(toWire(applied))));
  assert.deepEqual(toWire(reopened),toWire(applied));
  assert.deepEqual(toWire(applyOperationsToStore(applied,invertOperations([op]))),toWire(store));
});

test("explicit moved IDs are reserved before matching unlabelled inserted siblings", () => {
  const a=original("a","A","source"),before=frame([a]);
  const next=frame([button("invented","New"),{id:"wrapper",type:"html",tag:"section",children:[button("a","Moved")] }]);
  const result=update(before,next);
  assert.equal(result.error,undefined);
  const [inserted,wrapper]=result.element.children;
  assert.notEqual(inserted.id,"a");
  assert.equal(inserted.componentEditing.sourceBinding,undefined);
  assert.equal(inserted.theme,undefined);
  assert.equal(wrapper.children[0].id,"a");
  assert.deepEqual(wrapper.children[0].componentEditing.sourceBinding,a.componentEditing.sourceBinding);
  assert.equal(new Set(nodes(result.element).map(n=>n.id)).size,nodes(result.element).length);
});

test("JSX keys preserve metadata across reorder without trusted data-element IDs", () => {
  const a=original("a","A","source"),b=original("b","B","editor");
  a.props={...a.props,key:"a"}; b.props={...b.props,key:"b"};
  const result=update(frame([a,b]),frame([button("new-b","B edited",{props:{key:"b",label:"B edited"}}),button("new-a","A edited",{props:{key:"a",label:"A edited"}})]));
  assert.equal(result.error,undefined);
  assert.deepEqual(result.element.children.map(n=>n.id),["b","a"]);
  assert.deepEqual(result.element.children[0].sourceInfo,b.sourceInfo);
});

test("ambiguous siblings cannot exchange override or source metadata through code or agent edits", () => {
  for(const metadata of [{componentEditing:original("a","A","source").componentEditing},{sourceInfo:{fileName:"a.tsx",lineNumber:10}}]) {
    const before=frame([button("a","A",metadata),button("b","B")]);
    const next=frame([button("x","C"),button("y","D")]);
    assert.match(update(before,next).error,/Cannot safely match/);
    assert.match(buildSelectionRootFromParsed(before,"frame",[next],undefined,catalog).error,/Cannot safely match/);
  }
});

test("new copies and incompatible replacements cannot inherit hidden instance provenance", () => {
  const a=original("a","A","source");
  const copy={...a,id:"copy"};
  const result=update(frame([a]),frame([button("a","A"),copy]));
  assert.equal(result.error,undefined);
  const copied=result.element.children[1];
  assert.equal(copied.componentEditing.sourceBinding,undefined);
  assert.equal(copied.sourceInfo,undefined);
  assert.equal(copied.theme,undefined);
  assert.equal(copied.componentEditing.styleRecords.borderRadius.origin,"editor");
  const replaced=update(frame([a]),frame([{...a,type:"html",tag:"span",componentName:undefined}]));
  assert.equal(replaced.error,undefined);
  assert.equal(replaced.element.children[0].id,"a");
  assert.equal(replaced.element.children[0].componentEditing,undefined);
  assert.equal(replaced.element.children[0].theme,undefined);
  assert.equal(replaced.element.children[0].sourceInfo,undefined);
});

test("normalization rejects duplicate/foreign IDs and attempts to reuse the selection root below itself", () => {
  const before=frame([button("a","A")]);
  assert.match(update(before,frame([button("a","A"),button("a","Again")])).error,/Duplicate/);
  assert.match(update(before,frame([button("foreign","A")])).error,/outside/);
  assert.match(update(before,{id:"new-root",type:"html",tag:"div",children:[button("frame","A")]}).error,/root/i);
  assert.match(update(before,{id:"a",type:"html",tag:"div",children:[]}).error,/root/i);
});

test("capture updates reconcile one tree without nesting a second capture wrapper", () => {
  const a=original("a","A","source");
  const before={id:"capture",type:"capture",original:{componentName:"Page"},children:[a]};
  const result=update(before,{...before,children:[button("a","Edited")]});
  assert.equal(result.error,undefined);
  assert.equal(result.element.children[0].id,"a");
  assert.deepEqual(result.element.children[0].componentEditing.sourceBinding,a.componentEditing.sourceBinding);
});

test("saving a reordered instance patches its original source call and leaves its sibling untouched", () => {
  const calls=['<Button label="A" style={{borderRadius:"12px"}} />','<Button label="B" style={{borderRadius:"12px"}} />'];
  const source=`import {Button} from './Button'; export const view=<div>${calls.join('')}</div>;`;
  const children=['a','b'].map((id,index)=>{
    const node=original(id,index===0?'A':'B','source');
    node.componentEditing.sourceBinding={schemaVersion:1,filePath:'page.tsx',sourceHash:crypto.createHash('sha256').update(source).digest('hex'),
      start:source.indexOf(calls[index]),end:source.indexOf(calls[index])+calls[index].length,tag:'Button',openingSource:calls[index],baseProps:{...node.props},baseStyles:{...node.styles}};
    return node;
  });
  const result=update(frame(children),frame([button('b','B edited'),button('a','A')]));
  assert.equal(result.error,undefined);
  const saved=prepareComponentInstanceSourceEdit(source,result.element.children[0],{...catalog.Button,props:{label:{type:'string'}}});
  assert.equal(saved.filePath,'page.tsx');
  assert.equal(saved.code,source.replace('label="B"','label={"B edited"}'));
  assert.ok(saved.code.includes(calls[0]));
});
