// Complete production owner DATA, not a declaration/external-namespace permit.
import {constants,lstatSync,openSync,fstatSync,readSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {rustPackageSourcePath} from './repository-layout.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PROFILE='tools/translation/source-profiles/cross-module-owned-projection-20261101/';
const hash=source=>createHash('sha256').update(source).digest('hex');
function identity(stat){return Object.fromEntries(['dev','ino','mode','nlink','uid','gid','size','mtimeNs','ctimeNs'].map(key=>{if(typeof stat[key]!=='bigint')throw new TypeError('Exact physical production source identity required');return [key,String(stat[key])];}));}
function sameIdentity(a,b){return Object.keys(a).every(key=>a[key]===b[key]);}
function boundedRead(path,limit,retain=()=>{}){
 const before=lstatSync(path,{bigint:true});if(before.isSymbolicLink()||!before.isFile())throw new TypeError('Ordinary physical production source required');if(before.size<0n||before.size>BigInt(limit))throw new RangeError('Production source byte bound');
 const record={path,limit,identity:identity(before),source:null};retain(record);
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0)|(constants.O_NONBLOCK??0));let primaryReadFailed=false;
 try{
  const opened=fstatSync(fd,{bigint:true});if(!opened.isFile()||opened.size<0n||opened.size>BigInt(limit)||!sameIdentity(record.identity,identity(opened)))throw new TypeError('Physical production source changed before bounded read');
  const size=Number(opened.size),buffer=Buffer.alloc(size+1);let count=0;
  while(count<buffer.length){const length=readSync(fd,buffer,count,Math.min(65536,buffer.length-count),null);if(length===0)break;count+=length;}
  if(count!==size)throw new TypeError('Physical production source grew or reached early EOF');
  const after=fstatSync(fd,{bigint:true}),current=lstatSync(path,{bigint:true});if(!after.isFile()||!current.isFile()||current.isSymbolicLink()||!sameIdentity(record.identity,identity(after))||!sameIdentity(record.identity,identity(current)))throw new TypeError('Physical production source identity changed during bounded read');
  const bytes=buffer.subarray(0,count),source=bytes.toString('utf8');if(!Buffer.from(source,'utf8').equals(bytes))throw new TypeError('Production source must be exact UTF8');record.source=source;return record;
 }catch(error){primaryReadFailed=true;throw error;}finally{try{closeSync(fd);}catch(error){if(!primaryReadFailed)throw error;}}
}

export function captureCrossModuleOwnedProjectionProductionOwners({root=ROOT}={}){return withSourceFailureOperation(()=>withSourceInputValidation(()=>{
 const retained=[];const read=(path,limit=2097152)=>boundedRead(path,limit,record=>retained.push(record)).source;
 return withCompleteSourceClosingFence(()=>{
 const raw=read(join(root,PROFILE+'complete-original-owner-inputs.json'),65536);if(raw.length>65536||hash(raw)!=='fd91aa8f6b626fcbc12c3825dd6815fdb2909fda6ca0165aa85ae8ad99bdbf31')throw new TypeError('Complete pinned production owner manifest required');const manifest=JSON.parse(raw);
 if(manifest.schema!=='cross-module-owned-projection-original-owner-inputs-v1'||manifest.files.length!==3)throw new TypeError('Complete original production owner manifest required');
 const rows=manifest.files.map(row=>{
  const before=read(join(root,row.originalPath)),physical=rustPackageSourcePath(root,row.logicalPath),after=read(join(root,physical));
  if(physical!==row.repositoryPath||before!==after||hash(before)!==row.sha256||Buffer.byteLength(before)!==row.bytes)throw new TypeError('Complete original production owner bytes/path changed: '+row.logicalPath);
  return {...row,before,after};
 });
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'language:transport-complete-original-production-owner-CST-and-whole-source-inverses',apply:()=>transportConcreteSourceEquations(rows.map(row=>({before:row.before,after:row.after,language:'Rust'})))}]},
  {phase:'repository',rules:[{id:'repository:retain-actual-crate-self-alias-and-auth-owner-boundaries',apply:equations=>({
   schema:'cross-module-owned-projection-production-owners-v1',rows,equations,
   entry:'src/lib.rs',helper:{source:'src/auth_remote.rs',name:'remote_import_refusal'},caller:{source:'src/auth_import.rs',name:'refuse_a_remote_import'},
   sourceAuthority:false,namespaceAuthority:false,semanticAuthority:false,productionPairAdmitted:false,receivingExecuted:false,
  })}]},
 ]).run(null);
 accountData(run);return run;
 },[()=>withSourceInputValidation(()=>{let failed=false,error;for(const row of retained)try{const current=boundedRead(row.path,row.limit);if(!sameIdentity(current.identity,row.identity)||row.source!==null&&current.source!==row.source)throw new TypeError('Complete original production input identity/bytes changed during source operation');}catch(thrown){if(!failed){failed=true;error=thrown;}}if(failed)throw error;})]);
}));}
