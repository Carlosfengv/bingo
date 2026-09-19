import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = build({ entryPoints: ["packages/editor/src/shared/lib/projectActivity.ts"], bundle: true, packages: "external", platform: "node", format: "cjs", write: false });
async function fixture() {
  const canvas = { ready: false };
  let event: (state: any) => void, finish: (state: any) => void, cleanup: () => void;
  const module = { exports: {} as any };
  vm.runInNewContext((await bundle).outputFiles[0].text, {
    module, exports: module.exports, console, setTimeout,
    document: {querySelector:()=>({getAttribute:()=>String(canvas.ready)})},
    require: () => ({useEffect: fn => { cleanup = fn(); }, useSyncExternalStore: (_subscribe, read) => read()}),
    window: { location: { search: "?projectTab=project" }, api: {
      on: (_channel, fn) => { event = fn; return () => {}; },
      invoke: () => new Promise(resolve => { finish = resolve; }),
    } },
  });
  return { api: module.exports, canvas, event: state => event(state), finish: state => finish(state), cleanup: () => cleanup() };
}
test("project activity starts inactive and rejects a late initial snapshot", async () => {
  const f = await fixture();
  assert.equal(f.api.isProjectVisualActive(),false);
  f.api.ProjectActivityProvider({ children:null });
  f.event({active:true,windowVisible:true,revision:3});
  f.finish({active:false,windowVisible:true,revision:1});await Promise.resolve();
  assert.equal(f.api.isProjectVisualActive(),true);
  f.event({active:true,windowVisible:false,revision:4});assert.equal(f.api.isProjectVisualActive(),false);
  f.cleanup();f.event({active:true,windowVisible:true,revision:5});assert.equal(f.api.isProjectVisualActive(),false);
});
test("capture waits for the committed canvas and rejects a canvas that never becomes ready", async()=>{
  const {api,canvas}=await fixture();let completed=false;
  const pending=api.waitForProjectRenderReady().then(()=>{completed=true;});
  await new Promise(resolve=>setTimeout(resolve,25));assert.equal(completed,false);
  canvas.ready=true;await pending;assert.equal(completed,true);
  canvas.ready=false;await assert.rejects(api.waitForProjectRenderReady(1),/not ready/);
});
test("overlapping background render requests release independently and idempotently", async()=>{
  const {api}=await fixture();let changes=0;
  const off=api.subscribeProjectActivity(()=>changes++);
  const a=api.acquireProjectRender(),b=api.acquireProjectRender();
  assert.equal(api.isProjectVisualActive(),true);
  assert.equal(api.isProjectForegroundActive(),false,"render leases must not resume UI polling or AI camera following");
  a();a();assert.equal(api.isProjectVisualActive(),true);
  b();assert.equal(api.isProjectVisualActive(),false);assert.equal(changes,4);off();
});
