import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

test("agent hook consumers share focus refreshes and discard results invalidated during a request", async () => {
  const output=await build({entryPoints:["packages/editor/src/shell/hooks/useSharedAgentQuery.ts"],bundle:true,packages:"external",platform:"node",format:"cjs",write:false});
  const module={exports:{} as any}, cleanups:Array<()=>void>=[], requests:Array<{force:boolean;resolve:(value:any)=>void}>=[];
  const focus=new Set<()=>void>();let changed:()=>void, now=0, read:()=>any;
  vm.runInNewContext(output.outputFiles[0].text,{module,exports:module.exports,console,Date:{now:()=>now},
    require:()=>({useCallback:fn=>fn,useEffect:fn=>fn(),useSyncExternalStore:(subscribe,get)=>{read=get;cleanups.push(subscribe(()=>{}));return get();}}),
    window:{addEventListener:(_event,fn)=>focus.add(fn),removeEventListener:(_event,fn)=>focus.delete(fn),api:{
      on:(_channel,fn)=>{changed=fn;return ()=>{};},
      invoke:(_channel,args)=>new Promise(resolve=>requests.push({force:args.force,resolve})),
    }},
  });
  const drain=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
  const hook=module.exports.useSharedAgentQuery;
  hook("agent:list",false);assert.equal(requests.length,0);assert.equal(focus.size,0);
  const first=hook("agent:list"),second=hook("agent:list");
  assert.equal(requests.length,1);assert.equal(focus.size,1);
  requests[0].resolve({agents:[{installed:true}],selectedAgent:"first"});await drain();
  for(const fn of focus)fn();assert.equal(requests.length,1);
  now=31_000;for(const fn of focus)fn();assert.equal(requests.length,2);
  changed!();requests[1].resolve({agents:[{installed:true}],selectedAgent:"obsolete"});await drain();
  assert.equal(read!().value.selectedAgent,"first");assert.equal(requests.length,3);assert.equal(requests[2].force,true);
  requests[2].resolve({agents:[{installed:true}],selectedAgent:"latest"});await drain();
  assert.equal(read!().value.selectedAgent,"latest");
  const a=first.refresh(),b=second.refresh();assert.equal(requests.length,4);
  requests[3].resolve({agents:[{installed:true}],selectedAgent:"latest"});await Promise.all([a,b]);
  for(const cleanup of cleanups)cleanup();assert.equal(focus.size,0);
});
