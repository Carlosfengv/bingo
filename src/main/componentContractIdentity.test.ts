import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { componentClassSupport, componentIdentityMatches, componentRenderStyles, componentStyleOverrides, nextComponentStyleRecords } from "../../packages/compiler/src/store/componentEditing";
import { validateComponentParameterChanges } from "../../packages/compiler/src/codegen/componentEditParameters";
import { buildSelectionRootFromParsed } from "../../packages/compiler/src/codegen/selectionEdit";
import { normalizeUpdateSubtree } from "../../packages/compiler/src/codegen/canvasAiEdit";
import { extractComponentMetadata } from "./componentPropMetadata";
import { prepareComponentInstanceSourceEdit } from "./componentInstanceSave";

const info = {path:"src/Button.tsx",exportName:"Button",props:{label:{type:"string"}},editing:{rootStyle:"supported",rootTag:"button"}};
const old = {id:"button",type:"component",componentName:"Button",props:{label:"Keep"},styles:{color:"red"},componentEditing:{schemaVersion:1,identity:{sourcePath:"src/Old.tsx",exportName:"Button"},styleRecords:{color:{target:"root",scope:"base",origin:"editor",rootTag:"button"}}}};

test("a same-name component cannot reuse another path or export's recorded contract", () => {
  assert.equal(componentIdentityMatches(old,info),false);
  assert.equal(componentIdentityMatches(old,{...info,path:"src/Old.tsx"}),true);
  assert.equal(componentIdentityMatches(old,{...info,path:"src/Old.tsx",exportName:"default"}),false);
  assert.equal(componentIdentityMatches(old,undefined),false);
  assert.equal(componentIdentityMatches({...old,componentEditing:undefined},info),true);
  assert.deepEqual(componentRenderStyles(old,info),{});
  assert.equal(componentStyleOverrides(old,info)[0].active,false);
  assert.equal(old.styles.color,"red");
});

test("parameter, selection-code and agent entries reject a mismatched component identity", () => {
  const next={...old,props:{label:"Changed"}};
  assert.throws(()=>validateComponentParameterChanges(old,next,info),/identity changed/);
  assert.match(buildSelectionRootFromParsed(old,old.id,[next],undefined,{Button:info}).error,/identity changed/);
  assert.match(normalizeUpdateSubtree(old,next,new Set([old.id]),new Set([old.id]),{Button:info}).error,/identity changed/);
  assert.doesNotThrow(()=>validateComponentParameterChanges(old,old,info));
});

test("style edits cannot silently rebind identity, but removing incompatible records is allowed", () => {
  assert.throws(()=>nextComponentStyleRecords(old,{color:"blue"},info),/identity changed/);
  for(const styles of [{color:"red"},{}]) assert.deepEqual(nextComponentStyleRecords(old,styles,info).identity,old.componentEditing.identity);
  const legacy={...old,componentEditing:undefined};
  assert.deepEqual(nextComponentStyleRecords(legacy,{color:"blue"},info).identity,{sourcePath:info.path,exportName:info.exportName});
});

test("root class contract accepts direct forwarding and rejects replaced, transformed and unstable targets", () => {
  for(const declaration of [
    `({className}:{className?:string}) => <button className={className}/>`,
    `(p:{className?:string}) => <button className={p.className}/>`,
    `({label,...rest}:{label?:string;className?:string}) => <button {...rest}/>`,
  ]) assert.equal(extractComponentMetadata(`export const Button=${declaration}`).Button.editing.rootClassName,"supported");
  for(const declaration of [
    `({className}:{className?:string}) => <button className="fixed"/>`,
    `({className}:{className?:string}) => <button className={merge(className)}/>`,
    `(p:{className?:string}) => <button {...p} className="fixed"/>`,
    `(p:{className?:string}) => <button className={p.className} {...unknown}/>`,
    `(p:{className?:string}) => <Wrapper className={p.className}/>`,
    `(p:{className?:string}) => p.className ? <button {...p}/> : <div {...p}/>`,
  ]) assert.equal(extractComponentMetadata(`export const Button=${declaration}`).Button.editing.rootClassName,undefined);
});

test("class-only editing respects identity, asChild and source bindings independently of style support", () => {
  const contract={...info,editing:{rootStyle:"unknown",rootClassName:"supported"}};
  const instance={...old,componentEditing:undefined};
  assert.equal(componentClassSupport(instance,contract),true);
  for(const instance of [old,{...old,componentEditing:undefined,props:{asChild:true}},{...old,componentEditing:undefined,sourceExpressions:{props:{className:"dynamic"}}},{...old,componentEditing:undefined,sourceExpressions:{spread:["props"]}}]) assert.equal(componentClassSupport(instance,contract),false);
});

test("source save rejects identity collisions and preserves static class-only edits", () => {
  const source='<Button label="Keep" className="old" />';
  const sourceBinding={schemaVersion:1,filePath:"Page.tsx",tag:"Button",start:0,end:source.length,openingSource:source,sourceHash:crypto.createHash("sha256").update(source).digest("hex"),baseProps:{label:"Keep",className:"old"},baseStyles:{}};
  const instance={...old,styles:{},props:{label:"Changed",className:"new"},componentEditing:{...old.componentEditing,styleRecords:{},sourceBinding}};
  assert.throws(()=>prepareComponentInstanceSourceEdit(source,instance,info),/identity changed/);
  const matching={...instance,componentEditing:{...instance.componentEditing,identity:{sourcePath:info.path,exportName:"Button"}}};
  assert.throws(()=>prepareComponentInstanceSourceEdit(source,matching,info),/does not describe className/);
  const result=prepareComponentInstanceSourceEdit(source,matching,{...info,editing:{rootClassName:"supported",rootStyle:"unknown"}});
  assert.match(result.code,/className=\{"new"\}/);
  assert.match(result.code,/label=\{"Changed"\}/);
  assert.doesNotMatch(result.code,/style=/);
});
