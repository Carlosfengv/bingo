import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { extractComponentMetadata } from "./componentPropMetadata";
import { prepareComponentInstanceSourceEdit } from "./componentInstanceSave";
import { componentPropControl, componentPropMetadataError, parseComponentPropInput, updateComponentProp, validateComponentProp, type ComponentProp } from "../../packages/compiler/src/store/componentEditing";
import { buildSelectionRootFromParsed } from "../../packages/compiler/src/codegen/selectionEdit";
import { normalizeUpdateSubtree } from "../../packages/compiler/src/codegen/canvasAiEdit";

const fields = `
  /** Fill amount.
   * @editorLabel Progress
   * @editorGroup state
   * @editorOrder 10
   * @editorMin 0
   * @editorMax 1
   * @editorStep 0.1
   */
  progress?: number;
  /** Accent color.
   * @editorControl color
   * @editorGroup appearance
   */
  accent?: string | null;
  label?: string;
`;
const definition = `type Props = {${fields}}; export function Meter({progress=0,accent='var(--brand)',label='Meter'}:Props){return <div>{label}</div>}`;
const info = extractComponentMetadata(definition).Meter;
const instance = (props: Record<string, unknown>) => ({id:"meter",type:"component",componentName:"Meter",props});

test("source annotations retain real types/defaults and do not leak to following fields", () => {
  assert.deepEqual(info.props.progress, {type:"number",required:false,description:"Fill amount.",label:"Progress",group:"state",order:10,min:0,max:1,step:0.1,default:0});
  assert.equal(info.props.accent.control,"color");
  assert.equal(info.props.accent.default,"var(--brand)");
  assert.deepEqual(info.props.label,{type:"string",required:false,default:"Meter"});
  for (const source of [
    `interface Props {${fields}} export function Meter(p:Props){return <div/>}`,
    `interface Base {${fields}} interface Props extends Base {} export function Meter(p:Props){return <div/>}`,
    `export function Meter(p:{${fields}}){return <div/>}`,
  ]) {
    const props=extractComponentMetadata(source).Meter.props;
    assert.equal(props.progress.step,0.1);
    assert.equal(props.accent.control,"color");
    assert.equal(props.label.description,undefined);
    assert.equal(Object.hasOwn(props.progress,"default"),false);
  }
});

test("invalid namespaced annotations fail closed while ordinary documentation is harmless", () => {
  for (const [type,tags] of [
    ["number","@editorMin 5\n * @editorMax 1"],
    ["number","@editorStep 0"], ["number","@editorStep -1"],
    ["number","@editorMin NaN"], ["number","@editorMax Infinity"],
    ["number","@editorOrder 1e999"], ["number","@editorMin 0x10"],
    ["string","@editorStep 1"], ["number","@editorControl color"],
    ["string","@editorLabel"], ["string","@editorGroup imaginary"],
    ["string","@editorLabel First\n * @editorLabel Second"],
    ["string","@editorUnknown yes"], ["string","@editor"],
  ]) {
    const props=extractComponentMetadata(`export function Meter(p:{/** ${tags}\n */ value?:${type}; safe?:string}){return <div/>}`).Meter.props;
    assert.ok(props.value.metadataError,`${type}: ${tags}`);
    assert.equal(componentPropControl(props.value).kind,"readonly");
    assert.equal(componentPropControl(props.safe).kind,"string");
  }
  const props=extractComponentMetadata(`export function Meter(p:{/** Helpful text.\n * @deprecated Use the newer field.\n */ value?:string}){return <div/>}`).Meter.props;
  assert.equal(props.value.description,"Helpful text.");
  assert.equal(componentPropControl(props.value).kind,"string");
});

test("descriptors loaded from other entry points cannot bypass metadata validation", () => {
  const invalid: ComponentProp[] = [
    {type:"number",min:NaN}, {type:"number",max:Infinity},
    {type:"number",step:0}, {type:"number",step:-1}, {type:"number",min:2,max:1},
    {type:"string",min:0}, {type:"number",control:"color"},
    {type:"string",label:" "}, {type:"string",order:Infinity},
    {type:"string",group:"bad" as ComponentProp["group"]},
    {type:"string | null",metadataError:"conflicting annotation"},
  ];
  for (const descriptor of invalid) {
    assert.ok(componentPropMetadataError(descriptor));
    for (const value of [null,0,"",false]) assert.equal(validateComponentProp(descriptor,value),false);
    assert.throws(()=>updateComponentProp({value:1},"value",descriptor,{reset:true}),/supported parameter control/);
  }
});

test("number constraints preserve zero, decimal steps and a declared step origin", () => {
  const progress=info.props.progress;
  for (const value of [0,0.1,0.1+0.2,0.7,1]) assert.equal(validateComponentProp(progress,value),true,String(value));
  for (const value of [-0.1,0.15,1.1,NaN,Infinity,"0",null]) assert.equal(validateComponentProp(progress,value),false,String(value));
  assert.equal(parseComponentPropInput(progress,"0"),0);
  for (const value of ["","-","0.15","2"]) assert.throws(()=>parseComponentPropInput(progress,value));
  for (const value of [1,3,5]) assert.equal(validateComponentProp({type:"number",min:1,max:5,step:2},value),true);
  assert.equal(validateComponentProp({type:"number",min:1,max:5,step:2},2),false);
  assert.equal(validateComponentProp({type:"number",step:2},-2),true);
  assert.equal(validateComponentProp({type:"number"},-0.123),true);
});

test("a color control preserves string, variable and nullable API semantics", () => {
  const accent=info.props.accent;
  assert.equal(componentPropControl(accent).kind,"color");
  for (const value of ["#abc","var(--brand)","currentColor","",null,"component-specific-color"]) {
    assert.equal(validateComponentProp(accent,value),true);
    assert.deepEqual(updateComponentProp({},"accent",accent,{value}),{accent:value});
  }
  assert.equal(componentPropControl({type:"string"}).kind,"string");
  assert.equal(validateComponentProp(accent,123),false);
  assert.deepEqual(updateComponentProp({accent:"#abc"},"accent",accent,{reset:true}),{});
});

test("code and agent updates use number constraints without rewriting unchanged legacy values", () => {
  const before=instance({progress:0.5,label:"Before"});
  const index={Meter:info};
  for (const value of [-0.1,0.15,1.1,"0.5"]) {
    const next=instance({...before.props,progress:value});
    assert.ok(buildSelectionRootFromParsed(before,before.id,[next],undefined,index).error);
    assert.ok(normalizeUpdateSubtree(before,next,new Set([before.id]),new Set([before.id]),index).error);
  }
  const old=instance({progress:2,label:"Before"});
  const next=instance({progress:2,label:"After"});
  assert.equal(buildSelectionRootFromParsed(old,old.id,[next],undefined,index).error,undefined);
  assert.equal(normalizeUpdateSubtree(old,next,new Set([old.id]),new Set([old.id]),index).error,undefined);
  const broken={Meter:{...info,props:{...info.props,progress:{type:"number",step:-1}}}};
  assert.ok(buildSelectionRootFromParsed(before,before.id,[instance({label:"Before"})],undefined,broken).error);
  assert.ok(normalizeUpdateSubtree(before,instance({label:"Before"}),new Set([before.id]),new Set([before.id]),broken).error);
});

test("source saving enforces constraints and readonly resets, while preserving untouched source", () => {
  const call='<Meter progress={0.5} accent="var(--brand)" onClick={handler} />';
  const source=`import {Meter} from './Meter'; export const view=${call};`;
  const base={progress:0.5,accent:"var(--brand)"};
  const binding={schemaVersion:1,filePath:"page.tsx",sourceHash:crypto.createHash("sha256").update(source).digest("hex"),start:source.indexOf(call),end:source.indexOf(call)+call.length,tag:"Meter",openingSource:call,baseProps:base,baseStyles:{}};
  const element=(props:Record<string,unknown>)=>({...instance(props),styles:{},componentEditing:{sourceBinding:binding}});
  for (const value of [0.15,2]) assert.throws(()=>prepareComponentInstanceSourceEdit(source,element({...base,progress:value}),info),{code:"INVALID_PARAMETER"});
  const saved=prepareComponentInstanceSourceEdit(source,element({...base,progress:0.7}),info);
  assert.equal(saved.code,source.replace('progress={0.5}','progress={0.7}'));
  const broken={...info,props:{...info.props,progress:{type:"number",metadataError:"bad annotation"}}};
  assert.throws(()=>prepareComponentInstanceSourceEdit(source,element({accent:base.accent}),broken),{code:"INVALID_PARAMETER"});
  assert.equal(prepareComponentInstanceSourceEdit(source,element(base),broken).code,source);
});
