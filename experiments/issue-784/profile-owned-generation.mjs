// Sampling allocations is a separate diagnostic, never a receiving check.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {join,resolve} from 'node:path';
const choices=new Map([
 ['owned',['owned-allocation-samples','profile-owned-generation-child.mjs']],
 ['ordinary-current',['ordinary-current-allocation-samples','profile-ordinary-generation-child.mjs']],
]);
const choice=process.argv[2]??'owned';
if(!choices.has(choice)||process.argv.length>3)throw new TypeError('Select owned or ordinary-current');
const [folder,script]=choices.get(choice);
const directory=resolve('ci-logs/issue-784-restart-2/'+folder);
mkdirSync(directory);
const executable=resolve('experiments/issue-784/toolchain/node20/bin/node');
const command=[executable,'--max-old-space-size=768','--inspect=127.0.0.1:0','experiments/issue-784/'+script];
const child=spawn(command[0],command.slice(1),{stdio:['ignore','inherit','pipe']});
const started=performance.now(),pending=new Map(),samples=[];
let socket=null,identifier=0,interval=null,collecting=false,prefix='',sampling=false,storedBytes=0;
function request(method,params={}){
 return new Promise((resolve,reject)=>{
  const id=++identifier;pending.set(id,{resolve,reject});
  try{socket.send(JSON.stringify({id,method,params}));}catch(error){pending.delete(id);reject(error);}
 });
}
function report(error){process.stderr.write('Allocation diagnostic: '+error.message+'\n');}
async function collect(){
 if(collecting||!sampling)return;collecting=true;
 try{
  const {profile}=await request('HeapProfiler.getSamplingProfile');
  const bytes=Buffer.from(JSON.stringify(profile)+'\n');
  if(bytes.length>32*1024*1024)throw Error('Sampling profile exceeds diagnostic storage bound');
  const name=String(samples.length).padStart(4,'0')+'.json.gz';
  const packed=gzipSync(bytes,{level:1});
  if(storedBytes+packed.length>32*1024*1024){sampling=false;clearInterval(interval);await request('HeapProfiler.stopSampling');socket.close();return;}
  writeFileSync(join(directory,name),packed,{flag:'wx'});storedBytes+=packed.length;
  const rows=[],stack=[profile.head];
  while(stack.length){const row=stack.pop();rows.push({functionName:row.callFrame.functionName,url:row.callFrame.url,lineNumber:row.callFrame.lineNumber,selfSize:row.selfSize});for(const item of row.children)stack.push(item);}
  rows.sort((a,b)=>b.selfSize-a.selfSize);
  const record={name,elapsedMilliseconds:Math.floor(performance.now()-started),bytes:bytes.length,sampledLiveBytes:rows.reduce((sum,row)=>sum+row.selfSize,0),largest:rows.slice(0,12)};
  samples.push(record);process.stderr.write(JSON.stringify({allocationSample:record})+'\n');
 }catch(error){report(error);}finally{collecting=false;}
}
child.stderr.on('data',bytes=>{
 process.stderr.write(bytes);
 if(socket){if(bytes.toString().includes('Waiting for the debugger to disconnect'))socket.close();return;}
 prefix=(prefix+bytes.toString()).slice(-8192);
 const match=/Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[a-f0-9-]+)/u.exec(prefix);
 if(!match)return;
 socket=new WebSocket(match[1]);
 socket.addEventListener('message',event=>{
  const response=JSON.parse(event.data);const call=pending.get(response.id);if(!call)return;
  pending.delete(response.id);if(response.error)call.reject(Error(JSON.stringify(response.error)));else call.resolve(response.result);
 });
 socket.addEventListener('open',async()=>{
  try{await request('HeapProfiler.startSampling',{samplingInterval:65536});sampling=true;interval=setInterval(collect,5000);}catch(error){report(error);socket.close();}
 });
 socket.addEventListener('error',()=>report(Error('Inspector connection failed')));
 socket.addEventListener('close',()=>{clearInterval(interval);for(const call of pending.values())call.reject(Error('Inspector closed'));pending.clear();});
});
child.on('error',report);
child.on('exit',(code,signal)=>{
 clearInterval(interval);sampling=false;socket?.close();
 const result={command,exitCode:code,signal,elapsedMilliseconds:Math.floor(performance.now()-started),samplingInterval:65536,samples,scope:'Sampled live allocation stacks, not RSS or exact retained object sizes; separate 768 MiB diagnostic heap; no output applied or gate qualification.'};
 writeFileSync(join(directory,'result.json'),JSON.stringify(result)+'\n',{flag:'wx'});
 process.exitCode=code??(signal?1:0);
});
