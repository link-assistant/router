// Finite low-rate CPU observation of this task's already-running canonical check.
// The controller's Node version does not replace the compiler's Node 20 runtime.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import net from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';

const [pidText,gateText,prefix,...rest]=process.argv.slice(2),pid=Number(pidText),gate=Number(gateText);
if(rest.length||!Number.isInteger(pid)||pid<2||!Number.isInteger(gate)||gate<2||!prefix?.startsWith('ci-logs/issue-784-restart-2/'))
 throw new Error('Exact owned PID and task evidence prefix required');
const command=()=>readFileSync(`/proc/${pid}/cmdline`,'utf8').split('\0').filter(Boolean);
const expected=[process.cwd()+'/experiments/issue-784/toolchain/node20/bin/node','scripts/translate-router.mjs','--check'];
function assertGateOwner(){
 const selected=readFileSync(`/proc/${gate}/cmdline`,'utf8').split('\0').filter(Boolean);
 if(JSON.stringify(selected)!==JSON.stringify(['node','--max-old-space-size=128','scripts/check-js-first-local.mjs']))throw new Error('Owned complete gate command differs');
 let parent=pid;
 for(let at=0;at<16;at++){if(parent===gate)return;parent=Number(readFileSync(`/proc/${parent}/stat`,'utf8').replace(/^.*\) /u,'').split(' ')[1]);}
 throw new Error('Canonical child is outside the selected complete gate');
}
assertGateOwner();
const identity=()=>readFileSync(`/proc/${pid}/stat`,'utf8').replace(/^.*\) /u,'').split(' ')[19];
if(JSON.stringify(command())!==JSON.stringify(expected))throw new Error('Owned canonical command differs');
const start=identity(),outputs=[prefix+'.cpuprofile.json.gz',prefix+'.receipt.json'];
if(outputs.some(existsSync))throw new Error('Fresh output paths required');
const listening=await new Promise(resolve=>{
 const socket=net.createConnection({host:'127.0.0.1',port:9229});
 socket.once('connect',()=>{socket.destroy();resolve(true);});
 socket.once('error',error=>{if(error.code==='ECONNREFUSED')resolve(false);else throw error;});
});
if(listening)throw new Error('Existing inspector left untouched');
process.kill(pid,'SIGUSR1');
let targets;
for(let attempt=0;attempt<20;attempt++){
 try{const response=await fetch('http://127.0.0.1:9229/json/list');targets=await response.json();break;}
 catch{await delay(100);}
}
if(!targets||targets.length!==1||targets[0].type!=='node'
 ||!targets[0].webSocketDebuggerUrl.startsWith('ws://127.0.0.1:9229/'))
 throw new Error('One local owned inspector required');
if(identity()!==start||JSON.stringify(command())!==JSON.stringify(expected))
 throw new Error('Owned process identity changed');
const socket=new WebSocket(targets[0].webSocketDebuggerUrl),pending=new Map();let sequence=0;
socket.addEventListener('message',event=>{
 const row=JSON.parse(event.data),handler=pending.get(row.id);
 if(handler){pending.delete(row.id);clearTimeout(handler.timer);if(row.error)handler.reject(new Error(JSON.stringify(row.error)));else handler.resolve(row.result);}
});
socket.addEventListener('close',()=>{for(const handler of pending.values()){clearTimeout(handler.timer);handler.reject(new Error('Owned inspector closed'));}pending.clear();});
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
const send=(method,params={})=>new Promise((resolve,reject)=>{
 const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('Finite diagnostic inspector response bound: '+method));socket.close();},5000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
});
assertGateOwner();
const startedAt=new Date().toISOString(),controller=process.version;
await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:10000});
await send('Profiler.start');await delay(15000);
const {profile}=await send('Profiler.stop');await send('Profiler.disable');socket.close();
if(identity()!==start)throw new Error('Owned process identity changed during observation');
const raw=Buffer.from(JSON.stringify(profile));
if(raw.length>8388608)throw new Error('Finite profile output exceeded its bound');
const packed=gzipSync(raw,{level:9});writeFileSync(outputs[0],packed,{flag:'wx'});
const receipt={schema:'owned-gate-canonical-cpu-observation-v1',pid,gate,start,command:expected,
 startedAt,finishedAt:new Date().toISOString(),controllerNode:controller,
 compilerNode:'20.20.2',sampleIntervalMicroseconds:10000,requestedMilliseconds:15000,
 samples:profile.samples?.length??0,rawBytes:raw.length,packedBytes:packed.length,
 compilerInputsChanged:false,compilerHeapMiB:512,includesProfilerOverhead:true,performanceQualification:false};
writeFileSync(outputs[1],JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt));
