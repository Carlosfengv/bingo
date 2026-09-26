import assert from "node:assert/strict";
import test from "node:test";
import { validateComponentParameterChanges } from "../../packages/compiler/src/codegen/componentEditParameters";
import { buildSelectionRootFromParsed } from "../../packages/compiler/src/codegen/selectionEdit";
import { normalizeUpdateSubtree } from "../../packages/compiler/src/codegen/canvasAiEdit";
import { updateComponentProp } from "../../packages/compiler/src/store/componentEditing";

const info={props:{label:{type:"string"},options:{type:"{ size: number }"},items:{type:"string[]"},unknown:{type:"unknown"},mixed:{type:"string | number"},count:{type:"number",required:true}}};
const element=(props:any,id="instance")=>({id,type:"component",componentName:"Widget",props});
const rejectEveryEntry=(before:any,next:any)=>{
  assert.throws(()=>validateComponentParameterChanges(before,next,info),/supported parameter control|component API/);
  assert.match(buildSelectionRootFromParsed(before,before.id,[next],undefined,{Widget:info}).error,/supported parameter control|component API/);
  assert.match(normalizeUpdateSubtree(before,next,new Set([before.id]),new Set([before.id]),{Widget:info}).error,/supported parameter control|component API/);
};

test("complex and unknown fields cannot be changed, removed or added through code or agent edits",()=>{
  for(const [name,oldValue,newValue] of [['options',{size:1},{size:2}],['items',['one'],['two']],['unknown','one','two'],['mixed','one',2],['undeclared','one','two']]) {
    rejectEveryEntry(element({[name]:oldValue}),element({[name]:newValue}));
    rejectEveryEntry(element({[name]:oldValue}),element({}));
    rejectEveryEntry(element({}),element({[name]:newValue}));
    assert.throws(()=>validateComponentParameterChanges(undefined,element({[name]:newValue}),info),/supported parameter control/);
  }
});

test("unchanged legacy fields round-trip while a supported field is edited",()=>{
  const before=element({label:'Before',options:{size:1,mode:'a'},items:['one'],unknown:{flag:true},undeclared:'keep'});
  const next=element({...before.props,label:'After',options:{mode:'a',size:1}});
  assert.doesNotThrow(()=>validateComponentParameterChanges(before,next,info));
  assert.equal(buildSelectionRootFromParsed(before,before.id,[next],undefined,{Widget:info}).error,undefined);
  assert.equal(normalizeUpdateSubtree(before,next,new Set([before.id]),new Set([before.id]),{Widget:info}).error,undefined);
  assert.deepEqual(before.props.options,{size:1,mode:'a'});
});

test("matched instance validation enforces primitive types, required fields and reset semantics",()=>{
  rejectEveryEntry(element({count:1}),element({count:'1'}));
  rejectEveryEntry(element({count:1}),element({}));
  assert.doesNotThrow(()=>validateComponentParameterChanges(element({label:'Before'}),element({}),info));
  assert.doesNotThrow(()=>validateComponentParameterChanges(element({count:1}),element({}),{props:{count:{type:'number',required:true,default:0}}}));
  for(const [name,descriptor,value] of [['label',info.props.label,''],['count',info.props.count,0]]) {
    const props=updateComponentProp({},name,descriptor,{value});
    assert.doesNotThrow(()=>validateComponentParameterChanges(element({}),element(props),info));
  }
});

test("missing metadata cannot authorize a changed parameter, while dedicated fields remain separate",()=>{
  assert.throws(()=>validateComponentParameterChanges(element({label:'Before'}),element({label:'After'}),undefined),/supported parameter control/);
  assert.doesNotThrow(()=>validateComponentParameterChanges(element({label:'Before'}),element({label:'Before'}),undefined));
  assert.doesNotThrow(()=>validateComponentParameterChanges(undefined,element({key:'one',className:'custom',style:{},children:'Text'}),undefined));
  assert.doesNotThrow(()=>validateComponentParameterChanges(undefined,{type:'html',props:{title:'Text'}},undefined));
});

test("an unchanged pre-existing invalid primitive is retained until the user explicitly changes it",()=>{
  assert.doesNotThrow(()=>validateComponentParameterChanges(element({count:'legacy',label:'Before'}),element({count:'legacy',label:'After'}),info));
  rejectEveryEntry(element({count:'legacy'}),element({count:'another invalid value'}));
});

test("new instances cannot reuse an unrelated instance's legacy diagnostic exemption",()=>{
  const before={id:'frame',type:'html',tag:'div',children:[element({count:'legacy'},'old-invalid')]};
  const replacement={...before,children:[element({count:1},'old-invalid'),element({},'new-missing')]};
  const ids=new Set(['frame','old-invalid']);
  assert.match(normalizeUpdateSubtree(before,replacement,ids,ids,{Widget:info}).error,/requires Widget.count/);
  replacement.children[1]=element({count:'legacy'},'new-invalid');
  assert.match(normalizeUpdateSubtree(before,replacement,ids,ids,{Widget:info}).error,/component API/);
});
