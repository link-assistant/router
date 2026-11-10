// One bounded 15 s observation of the actual complete baseline's first stages.
// The complete input is unchanged. Termination is diagnostic, never a test pass.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,openSync,writeSync,closeSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {setTimeout as delay} from 'node:timers/promises';
const stage=process.argv[2]??'project-graph';
assert.ok(['project-graph','namespace','module-parse'].includes(stage));
const prefix=process.argv[3];
assert.match(prefix??'',/^ci-logs\/issue-784-restart-2\/[a-z0-9-]+$/u);
assert.equal(process.execArgv.includes('--experimental-websocket'),true);
const childSource='experiments/issue-784/profile-unit-production-baseline-child.mjs';
const fd=openSync(prefix+'.child.log','wx');
const child=spawn('experiments/issue-784/toolchain/node20/bin/node',['--max-old-space-size=768','--inspect=127.0.0.1:0',childSource],{stdio:['ignore','pipe','pipe']});
const completion=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));
let url,resolveStarted,rejectStarted,ended=false,buffer='';
const started=new Promise((resolve,reject)=>{resolveStarted=resolve;rejectStarted=reject;});
child.once('error',rejectStarted);child.once('close',()=>{ended=true;rejectStarted(new Error('Diagnostic child ended before project progress'));});
child.stderr.on('data',data=>{writeSync(fd,data);url??=data.toString().match(/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/u)?.[0];});
child.stdout.on('data',data=>{writeSync(fd,data);buffer+=data;let at;while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at);buffer=buffer.slice(at+1);const row=JSON.parse(line);if(row.event?.stage===stage&&row.event.state==='start')resolveStarted();}});
let socket;
try{
 await started;assert.ok(url);socket=new WebSocket(url);const pending=new Map();let sequence=0;
 socket.addEventListener('message',event=>{const row=JSON.parse(event.data),handler=pending.get(row.id);if(handler){pending.delete(row.id);row.error?handler.reject(new Error(JSON.stringify(row.error))):handler.resolve(row.result);}});
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:10000});await send('Profiler.start');
 const at=new Date().toISOString();await delay(15000);const {profile}=await send('Profiler.stop');await send('Profiler.disable');
 const record={schema:'unit-production-first-window-v1',stage,startedAt:at,finishedAt:new Date().toISOString(),requestedMilliseconds:15000,samplingMicroseconds:10000,completeChildSource:readFileSync(childSource,'utf8'),completeControllerSource:readFileSync(new URL(import.meta.url),'utf8'),profile,deadlineQualified:false,productionExecutableGain:null};
 const raw=Buffer.from(JSON.stringify(record));assert.ok(raw.length<=8*1024*1024);const packed=gzipSync(raw,{mtime:0});assert.deepEqual(gunzipSync(packed),raw);writeFileSync(prefix+'.profile.json.gz',packed,{flag:'wx'});
}finally{
 socket?.close();if(!ended)child.kill('SIGTERM');const terminal=await completion;closeSync(fd);writeFileSync(prefix+'.terminal.json',JSON.stringify({...terminal,diagnosticOnly:true,originalWholeTestQualified:false})+'\n',{flag:'wx'});
}
