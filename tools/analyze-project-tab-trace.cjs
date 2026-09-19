/* Summarize main/renderer long tasks from a --trace benchmark recording.
 * node tools/analyze-project-tab-trace.cjs trace.json [summary.json]
 * Durations describe recorded tasks, not actual compositor presentation time.
 */
const fs = require('node:fs');
const input = process.argv[2];
if (!input) throw Error('Provide a Chromium trace JSON file.');
const threads = new Map();
const stats = values => {
  const sorted = values.sort((a,b) => a-b);
  return { count:sorted.length, over50ms:sorted.filter(v=>v>=50).length,
    maxMs:sorted.at(-1) ?? 0, p95Ms:sorted[Math.ceil(sorted.length*.95)-1] ?? 0 };
};
async function main() {
  // Electron writes one event per line. Stream large recordings (>512 MiB)
  // instead of exceeding V8's string limit or retaining millions of events.
  const stream=fs.createReadStream(input);
  const lines=require('node:readline').createInterface({input:input.endsWith('.gz') ? stream.pipe(require('node:zlib').createGunzip()) : stream,crlfDelay:Infinity});
  const groups=Object.fromEntries(['CrBrowserMain','CrRendererMain'].map(name=>[name,{tasks:[],functions:[],longestFunctions:[]}]));
  let first=true;
  for await(const raw of lines) {
    const line=raw.trim();
    if(first){first=false;if(line!=='{"traceEvents":[')throw Error('Expected Electron contentTracing format (one event per line).');continue;}
    if(line.startsWith(']'))break;
    if(!line)continue;
    let e, finalEvent=false;
    try { e=JSON.parse(line.replace(/,$/,'')); }
    catch(error) {
      // The final event may share a line with the trace array's closing bracket.
      let depth=0, quoted=false, escaped=false, end=0;
      for(let i=0;i<line.length;i++){
        const ch=line[i];
        if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue;}
        if(ch==='"')quoted=true;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0){end=i+1;break;}
      }
      if(!end || !line.slice(end).trimStart().startsWith(']'))throw error;
      e=JSON.parse(line.slice(0,end));finalEvent=true;
    }
    if(e.name==='thread_name')threads.set(`${e.pid}:${e.tid}`,e.args.name);
    const group=groups[threads.get(`${e.pid}:${e.tid}`)];
    if(!group || e.ph!=='X' || !Number.isFinite(e.dur)){if(finalEvent)break;continue;}
    if(e.name==='ThreadControllerImpl::RunTask')group.tasks.push(e.dur/1000);
    if(e.name==='FunctionCall'){
      group.functions.push(e.dur/1000);
      group.longestFunctions.push({pid:e.pid,durationMs:e.dur/1000,...e.args?.data});
      group.longestFunctions.sort((a,b)=>b.durationMs-a.durationMs);group.longestFunctions.length=Math.min(10,group.longestFunctions.length);
    }
    if(finalEvent)break;
  }
  const report={input,note:'Nested FunctionCall and RunTask events overlap; never add their durations or counts together.',threads:{}};
  for(const [name,group] of Object.entries(groups))report.threads[name]={tasks:stats(group.tasks),functions:stats(group.functions),longestFunctions:group.longestFunctions};
  const text=JSON.stringify(report,null,2);
  if(process.argv[3])fs.writeFileSync(process.argv[3],text);
  console.log(text);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
