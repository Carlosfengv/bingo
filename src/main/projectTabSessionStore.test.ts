import assert from "node:assert/strict";
import test from "node:test";
import { ProjectTabSessionStore } from "./projectTabSessionStore";

test("session writes coalesce and changes during a write are serialized", async () => {
  const writes: string[]=[];let finish: ()=>void;
  const store=new ProjectTabSessionStore(()=>"session.json",async(_file,text)=>{
    writes.push(text);if(writes.length===1)await new Promise<void>(r=>{finish=r;});
  });
  store.set({active:"a"});store.set({active:"b"});
  const flushing=store.flush();store.set({active:"c"});store.set({active:"d"});
  finish!();await flushing;await store.flush();
  assert.deepEqual(writes,[JSON.stringify({active:"b"}),JSON.stringify({active:"d"})]);
  store.set({active:"d"});await store.flush();assert.equal(writes.length,2);
});
test("failed flush preserves dirty state and can be retried", async()=>{
  let fail=true;const writes: string[]=[];
  const store=new ProjectTabSessionStore(()=>"session.json",async(_file,text)=>{if(fail)throw Error("disk full");writes.push(text);});
  store.set(["a"]);await assert.rejects(store.flush(),/disk full/);
  fail=false;await store.flush();assert.deepEqual(writes,['["a"]']);
});
