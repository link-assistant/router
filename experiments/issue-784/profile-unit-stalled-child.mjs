// Observe the already-running task child; its original controller reaps it.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {setTimeout as delay} from 'node:timers/promises';
const pid=Number(process.argv[2]);assert.ok(Number.isSafeInteger(pid)&&pid>1);
const command=readFileSync('/proc/'+pid+'/cmdline','utf8');
assert.ok(command.includes('profile-unit-production-baseline-child.mjs'));
assert.ok(command.includes('--max-old-space-size=768'));
const prefix='ci-logs/issue-784-restart-2/unit-production-stalled-namespace';
const log=readFileSync('ci-logs/issue-784-restart-2/unit-production-module-window.child.log','utf8');
const url=log.match(/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/u)?.[0];assert.ok(url);
const socket=new WebSocket(url),pending=new Map();let sequence=0;
socket.addEventListener('message',event=>{const row=JSON.parse(event.data),handler=pending.get(row.id);if(handler){pending.delete(row.id);row.error?handler.reject(new Error(JSON.stringify(row.error))):handler.resolve(row.result);}});
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
try{
 await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:10000});await send('Profiler.start');
 const startedAt=new Date().toISOString();await delay(15000);const {profile}=await send('Profiler.stop');await send('Profiler.disable');
 const raw=Buffer.from(JSON.stringify({schema:'unit-stalled-namespace-window-v1',pid,command,startedAt,finishedAt:new Date().toISOString(),profile,completeControllerSource:readFileSync(new URL(import.meta.url),'utf8'),completeChildSource:readFileSync('experiments/issue-784/profile-unit-production-baseline-child.mjs','utf8'),deadlineQualified:false,productionExecutableGain:null}));
 assert.ok(raw.length<=8*1024*1024);const packed=gzipSync(raw,{mtime:0});assert.deepEqual(gunzipSync(packed),raw);writeFileSync(prefix+'.profile.json.gz',packed,{flag:'wx'});
}finally{
 socket.close();assert.equal(readFileSync('/proc/'+pid+'/cmdline','utf8'),command);process.kill(pid,'SIGTERM');
}
