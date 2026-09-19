import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const bundle=build({entryPoints:["src/main/terminal.ts"],bundle:true,platform:"node",format:"cjs",write:false,external:["electron","node-pty","./mcpServer","./windowManager"]});
async function fixture() {
  const handles=new Map<string,Function>(), processes:any[]=[];
  const module={exports:{} as any};
  vm.runInNewContext((await bundle).outputFiles[0].text,{module,exports:module.exports,console,process,setTimeout,clearTimeout,setImmediate,
    require: name => {
      if(name==='electron')return{ipcMain:{handle:(name,fn)=>handles.set(name,fn),on:()=>{}}};
      if(name==='./mcpServer')return{getProjectAllowedPaths:()=>[]};
      if(name==='./windowManager')return{projectForWebContents:()=>null,windowForWebContents:()=>({id:1})};
      if(name==='node-pty')return{spawn:()=>{const p={signals:[],onData:()=>{},onExit:fn=>{p.exit=fn;},kill:signal=>p.signals.push(signal),write:()=>{}};processes.push(p);return p;}};
      if(name==='os')return{homedir:()=>'/tmp'};
      return {};
    },
  });
  module.exports.registerTerminalIPC();
  const sender={id:1,isDestroyed:()=>false,mainFrame:{},send:()=>{}};
  return {api:module.exports,processes,create:()=>handles.get('terminal:create')!({sender},{})};
}
test("quit waits for native PTY exits even after a renderer disposed its terminals",async()=>{
  const f=await fixture();f.create();f.api.disposeTerminalsForRenderer(1);
  let drained=false;const done=f.api.drainTerminalsForQuit(1000).then(()=>{drained=true;});
  await Promise.resolve();assert.equal(drained,false);assert.equal(f.create().ok,false);
  assert.equal(f.processes[0].signals.length,1);
  f.processes[0].exit({exitCode:0});await done;assert.equal(drained,true);
});
test("a stuck terminal escalates then blocks quit, and retry can recover",async()=>{
  const f=await fixture();f.create();
  await assert.rejects(f.api.drainTerminalsForQuit(30),/not finished closing/);
  assert.equal(f.processes[0].signals[1],'SIGKILL');
  f.processes[0].exit({exitCode:0});assert.equal(f.create().ok,true);
  const next=f.api.drainTerminalsForQuit(1000);f.processes[1].exit({exitCode:0});await next;
});
