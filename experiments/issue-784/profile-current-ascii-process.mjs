// A finite diagnostic on this already-failed whole-file attempt, never a pass.
import {readFileSync,writeFileSync} from 'node:fs';
const pid=740069, base='ci-logs/issue-784-restart-2/current-shared-source-ascii-profile';
const command=readFileSync(`/proc/${pid}/cmdline`,'utf8');
if(!command.includes('/tools/translation/js-to-rust/test/owned-core-ascii.test.mjs'))throw Error('Exact owned test process required');
const identity=readFileSync(`/proc/${pid}/stat`,'utf8').split(') ')[1].split(' ')[19];
const startedAt=new Date().toISOString();
process.kill(pid,'SIGUSR1');
let targets;
for(let attempt=0;attempt<20;attempt++){
 try{targets=await (await fetch('http://127.0.0.1:9229/json/list')).json();break;}
 catch{await new Promise(resolve=>setTimeout(resolve,100));}
}
if(targets?.length!==1||!targets[0].webSocketDebuggerUrl)throw Error('One local inspector required');
if(readFileSync(`/proc/${pid}/stat`,'utf8').split(') ')[1].split(' ')[19]!==identity)throw Error('Process identity changed');
const socket=new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
let sequence=0;const pending=new Map();
socket.addEventListener('message',event=>{const row=JSON.parse(event.data),request=pending.get(row.id);if(request){pending.delete(row.id);row.error?request.reject(Error(JSON.stringify(row.error))):request.resolve(row.result);}});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
await send('Profiler.enable');
await send('Profiler.setSamplingInterval',{interval:10000});
await send('Profiler.start');
await new Promise(resolve=>setTimeout(resolve,10000));
const {profile}=await send('Profiler.stop');
await send('Profiler.disable');socket.close();
writeFileSync(base+'.cpuprofile',JSON.stringify(profile),{flag:'wx'});
writeFileSync(base+'.json',JSON.stringify({pid,identity,command,startedAt,finishedAt:new Date().toISOString(),samplingIntervalMicroseconds:10000,requestedSampleMilliseconds:10000,activeTestClocksPaused:false,diagnosticChangesExecutionCost:true,originalDeadlineQualification:false,sourceContentsChanged:false})+'\n',{flag:'wx'});
