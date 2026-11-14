// Diagnostic-only retained allocation samples, with a finite early stop.
import {Session} from 'node:inspector';
import {writeFileSync,readFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const mode=process.env.ROUTER_784_ALLOCATION_MODE??'retained';
const variant=process.env.ROUTER_784_ALLOCATION_VARIANT??'original';
if(!['original','shared-project'].includes(variant))throw Error('Explicit diagnostic source variant required');
if(!['retained','proof-interval','resolver-interval'].includes(mode))throw Error('Explicit finite diagnostic mode required');
const session=new Session(),heapThresholdBytes=(mode==='retained'?400:650)*1024*1024,maximumCheckpoints=65536;
let active=false,checkpoints=0,started=0,cpuStarted=0,resolverCheckpoint=0;
export class AllocationSampleStop extends Error{}
function post(method,params={}){
 let result,error,complete=false;
 session.post(method,params,(failure,value)=>{error=failure;result=value;complete=true;});
 if(!complete||error)throw error??Error('Synchronous diagnostic inspector callback required');
 return result;
}
export function startAllocationSample(){
 if(active)throw Error('One finite diagnostic sampling session required');
 session.connect();post('HeapProfiler.startSampling',{samplingInterval:262144});
 if(mode==='proof-interval'){
  post('Profiler.enable');post('Profiler.setSamplingInterval',{interval:10000});post('Profiler.start');cpuStarted=performance.now();
 }
 active=true;started=performance.now();
}
export function allocationCheckpoint(stage,source=null,name=null){
 if(!active)return;
 checkpoints++;
 const memory=process.memoryUsage();
 if(mode==='resolver-interval'&&stage==='resolver-bang-start'&&!cpuStarted){
  post('Profiler.enable');post('Profiler.setSamplingInterval',{interval:10000});post('Profiler.start');
  cpuStarted=performance.now();resolverCheckpoint=checkpoints;
 }
 const beforeFinalResolver=mode==='proof-interval'&&stage==='resolver-bang-start';
 const finalResolverSampled=mode==='resolver-interval'&&cpuStarted&&
  (checkpoints-resolverCheckpoint>=2048||performance.now()-cpuStarted>=60000);
 if(memory.heapUsed<heapThresholdBytes&&checkpoints<maximumCheckpoints&&!beforeFinalResolver&&!finalResolverSampled)return;
 const {profile}=post('HeapProfiler.stopSampling');
 const cpuProfile=cpuStarted?post('Profiler.stop').profile:null;
 if(cpuProfile)post('Profiler.disable');
 active=false;session.disconnect();
 const record={schema:'bounded-ordinary-retained-allocation-sample-v1',mode,variant,stage,source,name,
  checkpoints,maximumCheckpoints,heapThresholdBytes,memory,elapsedMilliseconds:performance.now()-started,
  cpuElapsedMilliseconds:cpuStarted?performance.now()-cpuStarted:null,resolverCheckpoint,
  samplingIntervalBytes:262144,profile,cpuProfile,diagnosticOnly:true,ordinaryPlannerCompleted:false,
  productionExecutableGain:0,semanticAuthority:false,runtimeParity:false};
 const raw=Buffer.from(JSON.stringify(record));
 if(raw.length>8*1024*1024)throw Error('Finite complete sampling profile evidence bound');
 const prefix=mode==='retained'?'retained-allocation':mode;
 const output='ci-logs/issue-784-restart-2/ordinary-'+(variant==='original'?'':'shared-project-')+prefix+'-profile.json.gz';
 writeFileSync(output,gzipSync(raw),{flag:'wx'});
 if(!gunzipSync(readFileSync(output),{maxOutputLength:8*1024*1024}).equals(raw))throw Error('Complete sampling readback differs');
 console.log(JSON.stringify({output,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),
  stage,source,name,checkpoints,memory,diagnosticOnly:true,ordinaryPlannerCompleted:false}));
 throw new AllocationSampleStop('Intentional finite retained-allocation stop before the diagnostic heap limit');
}
