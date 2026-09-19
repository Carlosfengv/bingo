import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

test("background visual commits keep the latest snapshot, resume immediately and cancel on unmount", async () => {
  const result = await build({ stdin: { contents: 'export * from "./packages/editor/src/shell/hooks/useBackgroundVisualCommit"; export * from "./packages/editor/src/shared/lib/projectActivity";', resolveDir: process.cwd() }, bundle:true, packages:"external", platform:"node", format:"cjs", write:false });
  const cleanups: Array<() => void> = [], timers = new Map<number, () => void>();
  let nextTimer = 0, activity: (value: any) => void;
  const module = { exports: {} as any };
  vm.runInNewContext(result.outputFiles[0].text, { module, exports:module.exports, console,
    setTimeout: fn => { timers.set(++nextTimer,fn);return nextTimer; }, clearTimeout: id => timers.delete(id),
    require: () => ({ useRef: value => ({current:value}), useCallback: fn => fn,
      useEffect: fn => { const cleanup=fn();if(cleanup)cleanups.push(cleanup); }, useSyncExternalStore: (_subscribe,read)=>read() }),
    window: { location:{search:"?projectTab=fixture"}, api:{ on:(_channel,fn)=>{activity=fn;return ()=>{};}, invoke:()=>new Promise(()=>{}) } },
  });
  const api=module.exports, committed:number[]=[];
  api.ProjectActivityProvider({children:null});
  const enqueue=api.useBackgroundVisualCommit(value=>committed.push(value));
  enqueue(1);enqueue(2);enqueue(3);
  assert.deepEqual(committed,[]);assert.equal(timers.size,1);
  [...timers.values()][0]();assert.deepEqual(committed,[3]);
  enqueue(4);activity!({active:true,windowVisible:true,revision:1});
  assert.deepEqual(committed,[3,4]);assert.equal(timers.size,0);
  enqueue(5);assert.deepEqual(committed,[3,4,5]);
  activity!({active:false,windowVisible:true,revision:2});enqueue(6);enqueue(0,true);
  assert.deepEqual(committed,[3,4,5,0]);assert.equal(timers.size,0);
  enqueue(7);for(const cleanup of cleanups)cleanup();assert.equal(timers.size,0);
  assert.deepEqual(committed,[3,4,5,0]);
});
