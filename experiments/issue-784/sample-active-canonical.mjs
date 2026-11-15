// Finite diagnostic of this task's already-running canonical CLI only.
// A sampled stack is neither a performance comparison nor compiler authority.
import {readFileSync,readlinkSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const pid=Number(process.argv[2]),expectedParent=Number(process.argv[3]);
if(!Number.isSafeInteger(pid)||!Number.isSafeInteger(expectedParent)||pid<2||expectedParent<2)
 throw new TypeError('Explicit owned CLI and launcher PIDs required');
const stem=resolve('ci-logs/issue-784-restart-2/path-canonical-active-sample');
if(existsSync(stem+'.cpuprofile.gz')||existsSync(stem+'.json'))
 throw new Error('Diagnostic output already exists');
const proc='/proc/'+pid;
const command=readFileSync(proc+'/cmdline'),argv=command.toString().split('\0').filter(Boolean);
if(argv.length!==4||!argv[0].endsWith('node')||argv[1]!=='--max-old-space-size=768'
 ||argv[2]!=='scripts/translate-router.mjs'||argv[3]!=='--progress'
 ||readlinkSync(proc+'/cwd')!==process.cwd()
 ||Number(readFileSync(proc+'/status','utf8').match(/^PPid:\s+(\d+)$/mu)?.[1])!==expectedParent)
 throw new Error('Actual owned canonical process identity differs');
const memory=()=>Number(readFileSync('/sys/fs/cgroup/memory.current','utf8'));
if(memory()>2_866_933_760-64*1024*1024)throw new Error('Insufficient diagnostic headroom');
let existing=false;
try{const response=await fetch('http://127.0.0.1:9229/json/version',
 {signal:AbortSignal.timeout(1000)});existing=response.ok;}catch{}
if(existing)throw new Error('An existing inspector must not be reused');
process.kill(pid,'SIGUSR1');
let target=null;
for(let attempt=0;attempt<20&&!target;attempt++){
 try{
  const response=await fetch('http://127.0.0.1:9229/json/list',
   {signal:AbortSignal.timeout(1000)}),rows=await response.json();
  if(rows.length!==1||!rows[0].url.endsWith('/scripts/translate-router.mjs'))
   throw new Error('Inspector target differs');
  target=rows[0];
 }catch(error){if(error.message==='Inspector target differs')throw error;}
 if(!target)await new Promise(done=>setTimeout(done,100));
}
if(!target||!target.webSocketDebuggerUrl.startsWith('ws://127.0.0.1:9229/'))
 throw new Error('Actual bounded inspector endpoint unavailable');
const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let sequence=0;
const ready=new Promise((done,fail)=>{
 const timer=setTimeout(()=>fail(new Error('Diagnostic connection deadline')),5000);
 socket.addEventListener('open',()=>{clearTimeout(timer);done();},{once:true});
 socket.addEventListener('error',()=>{clearTimeout(timer);fail(new Error('Diagnostic connection failed'));},{once:true});
});
socket.addEventListener('message',event=>{
 if(typeof event.data!=='string'||Buffer.byteLength(event.data)>8*1024*1024)
  throw new Error('Finite diagnostic reply byte bound');
 const row=JSON.parse(event.data),request=pending.get(row.id);if(!request)return;
 pending.delete(row.id);clearTimeout(request.timer);
 if(row.error)request.fail(new Error('Diagnostic protocol error'));else request.done(row.result);
});
const send=method=>new Promise((done,fail)=>{
 const id=++sequence,timer=setTimeout(()=>{pending.delete(id);fail(new Error('Diagnostic request deadline'));},5000);
 pending.set(id,{done,fail,timer});socket.send(JSON.stringify({id,method}));
});
await ready;const initialMemory=memory(),started=Date.now();let profile;
try{
 await send('Profiler.enable');await send('Profiler.start');
 await new Promise(done=>setTimeout(done,2500));
 ({profile}=await send('Profiler.stop'));await send('Profiler.disable');
}finally{socket.close();}
const raw=Buffer.from(JSON.stringify(profile));
if(raw.length>8*1024*1024)throw new Error('Finite complete profile byte bound');
const packed=gzipSync(raw,{mtime:0});writeFileSync(stem+'.cpuprofile.gz',packed,{flag:'wx'});
if(!gunzipSync(readFileSync(stem+'.cpuprofile.gz')).equals(raw))throw new Error('Complete readback differs');
const receipt={schema:'finite-active-owned-canonical-sample-v1',pid,parentPid:expectedParent,
 commandSha256:createHash('sha256').update(command).digest('hex'),sampleMilliseconds:2500,
 elapsedMilliseconds:Date.now()-started,initialCgroupBytes:initialMemory,finalCgroupBytes:memory(),
 originalBytes:raw.length,packedBytes:packed.length,sha256:createHash('sha256').update(raw).digest('hex'),
 inspectorDiagnosticAttached:true,performanceQualification:false,runtimeParity:false,
 productionExecutableGain:0};
writeFileSync(stem+'.json',JSON.stringify(receipt)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt));
