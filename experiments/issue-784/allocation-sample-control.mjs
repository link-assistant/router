// Diagnostic-only retained allocation samples, with a finite early stop.
import {Session} from 'node:inspector';
import {writeFileSync,readFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const session=new Session(),heapThresholdBytes=400*1024*1024,maximumCheckpoints=65536;
let active=false,checkpoints=0,started=0;
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
 active=true;started=performance.now();
}
export function allocationCheckpoint(stage,source=null,name=null){
 if(!active)return;
 checkpoints++;
 const memory=process.memoryUsage();
 if(memory.heapUsed<heapThresholdBytes&&checkpoints<maximumCheckpoints)return;
 const {profile}=post('HeapProfiler.stopSampling');active=false;session.disconnect();
 const record={schema:'bounded-ordinary-retained-allocation-sample-v1',stage,source,name,
  checkpoints,maximumCheckpoints,heapThresholdBytes,memory,elapsedMilliseconds:performance.now()-started,
  samplingIntervalBytes:262144,profile,diagnosticOnly:true,ordinaryPlannerCompleted:false,
  productionExecutableGain:0,semanticAuthority:false,runtimeParity:false};
 const raw=Buffer.from(JSON.stringify(record));
 if(raw.length>8*1024*1024)throw Error('Finite complete sampling profile evidence bound');
 const output='ci-logs/issue-784-restart-2/ordinary-retained-allocation-profile.json.gz';
 writeFileSync(output,gzipSync(raw),{flag:'wx'});
 if(!gunzipSync(readFileSync(output),{maxOutputLength:8*1024*1024}).equals(raw))throw Error('Complete sampling readback differs');
 console.log(JSON.stringify({output,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),
  stage,source,name,checkpoints,memory,diagnosticOnly:true,ordinaryPlannerCompleted:false}));
 throw new AllocationSampleStop('Intentional finite retained-allocation stop before the diagnostic heap limit');
}
