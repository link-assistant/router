// Observed resource names/bytes only; no source/type/ownership authority. UNRUN.
import {createHash} from 'node:crypto';
import {withSelectedTrackedSourceOperation} from './selected-source-reader-20261101.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw TypeError('Receiving resource census: '+message);};
const prefix='tools/translation/source-profiles/';
function path(value){if(typeof value!=='string'||!value||value.length>4096||value.startsWith('/')||/[\\:\0\r\n]/u.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('ordinary repository-relative resource path required');return value;}
export function withOpaqueReceivingResourceCensus(root,run){
 requireSynchronousSourceCallback(run);const rows=new Map();let bytes=0,reads=0,active=true,failed=false,primary;
 function add(row,observed){
  if(!active)fail('resource census expired');path(row.path);if(!row.path.startsWith(prefix))return;
  if(Object.keys(row).sort().join(',')!=='bytes,path,semanticAuthority,sha256,sourceAuthority'||!Number.isSafeInteger(row.bytes)||row.bytes<0||row.bytes>33554432||typeof row.sha256!=='string'||!/^[a-f0-9]{64}$/u.test(row.sha256)||row.sourceAuthority!==false||row.semanticAuthority!==false)fail('complete bounded ordinary resource DATA required');
  const before=rows.get(row.path);if(before&&(before.bytes!==row.bytes||before.sha256!==row.sha256))fail('conflicting complete resource observations');
  if(!before){if(rows.size>=8192||bytes+row.bytes>67108864)fail('original resource count/byte bucket exceeded');rows.set(row.path,{...row,observedReads:0,declaredByPreflight:false});bytes+=row.bytes;}
  const current=rows.get(row.path);if(observed){current.observedReads++;reads++;}else current.declaredByPreflight=true;
 }
 const register=inputs=>{try{return withSourceInputValidation(()=>{if(!active)fail('resource census expired');account(inputs);if(!Array.isArray(inputs)||inputs.length>8192)fail('bounded complete preflight input list required');for(const row of inputs)add(row,false);return null;});}catch(error){if(!failed){failed=true;primary=error;}throw error;}};
 try{let value;withSelectedTrackedSourceOperation(root,()=>{
  value=withCompleteSourceClosingFence(()=>run(register),[]);if(failed)throw primary;return null;
 },{observe:event=>{if(event.missing||!event.path.startsWith(prefix))return;add({path:event.path,bytes:event.bytes.length,sha256:createHash('sha256').update(event.bytes).digest('hex'),sourceAuthority:false,semanticAuthority:false},true);},limits:{paths:8192,bytes:67108864}});
  const resources=[...rows.values()].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);account(resources);
  return {value,resources,resourceBytes:bytes,observedReads:reads,scope:'observed selected-reader inputs plus explicit actual profile-preflight inputs; not whole compiler runtime closure',sourceAuthority:false,semanticAuthority:false,censusGrantsCompilerAuthority:false,callerExecutionQualified:false};
 }finally{active=false;rows.clear();}
}
