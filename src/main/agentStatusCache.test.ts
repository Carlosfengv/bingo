import assert from "node:assert/strict";
import test from "node:test";
import { AgentStatusCache } from "./agentStatusCache";

test("status queries share actual probes, respect TTL and coalesce forced checks", async () => {
  let reads = 0, now = 0;
  const cache = new AgentStatusCache(async () => { reads++; return { installed:true }; }, value=>value.installed, ()=>now);
  await Promise.all(Array.from({length:20},()=>cache.get()));assert.equal(reads,1);
  now=29999;await cache.get();assert.equal(reads,1);
  await Promise.all([cache.get(true),cache.get(true)]);assert.equal(reads,2);
  now=60000;await cache.get();assert.equal(reads,3);
});
test("invalidating an in-flight probe retries without publishing stale configuration", async () => {
  let finish: (value:number)=>void, calls=0;
  const cache=new AgentStatusCache(async()=>++calls===1 ? new Promise<number>(r=>{finish=r;}) : 2,()=>true);
  const result=cache.get();cache.invalidate();finish!(1);
  assert.equal(await result,2);assert.equal(await cache.get(),2);assert.equal(calls,2);
});
test("failed probes have a short TTL and explicit retry recovers", async () => {
  let calls=0;
  const cache=new AgentStatusCache(async()=>{if(++calls===1)throw Error("offline");return true;},v=>v);
  await assert.rejects(cache.get(),/offline/);await assert.rejects(cache.get(),/offline/);assert.equal(calls,1);
  assert.equal(await cache.get(true),true);assert.equal(calls,2);
});
