// Explicit NEW full compiler/profile transfer profile. Legacy64MiB raw
// materialization/export APIs remain unchanged. This transfers DATA only.
import {mkdirSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,dirname,basename,join} from 'node:path';
import {inspectCompactSourceVault,withCompactSourceVault} from './compact-source-vault-20261102.mjs';
import {compactSparsePhysicalCensus,readCompactSparsePhysicalFile,writeCompactSparseHotPhysicalFile,sameCompactPhysicalSourceStamp} from './compact-sparse-git-io-20261102.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
export const ORDERED_MAP_FULL_SOURCE_TRANSFER_LIMITS=Object.freeze({files:16384,domainFiles:8192,fileBytes:4194304,logicalBytes:268435456,encodedBytes:67108864,decodedLeaseBytes:67108864,aggregateBytes:402653184});
const L=ORDERED_MAP_FULL_SOURCE_TRANSFER_LIMITS,fail=message=>{throw TypeError('Full ordered-map compiler source DATA transfer: '+message);};
function groups(rows){const result=[];let group=[],bytes=0;for(const row of rows){if(bytes+row.bytes>L.decodedLeaseBytes){result.push(group);group=[];bytes=0;}group.push(row);bytes+=row.bytes;}if(group.length)result.push(group);return result;}
/** All logical vault files materialize; a tiny selected fixture cannot replace
 * the original compiler/history closure. Every decode lease retains64MiB.
 * No parser, source frame, native checker or semantic proof is created here.
 */
export function materializeOrderedTextMapFullCompilerSources({model,output}={}){
 return withSourceInputValidation(()=>{
  if(typeof output!=='string'||!output)fail('explicit fresh output required');
  const inspected=inspectCompactSourceVault(model),rows=inspected.metadata.files.slice().sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  if(!rows.length||rows.length>L.files||rows.reduce((sum,row)=>sum+row.bytes,0)>L.logicalBytes||rows.some(row=>row.bytes>L.fileBytes||row.path.split('/').includes('.git')))fail('complete compiler/profile source capacity exceeded');
  const requested=resolve(output),root=join(realpathSync(dirname(requested)),basename(requested));try{lstatSync(root);fail('fresh full source output already exists');}catch(error){if(error.code!=='ENOENT')throw error;}
  const batches=groups(rows),written=new Map();let census=null;
  const close=()=>{
   let failed=false,primary;const check=run=>{try{run();}catch(error){if(!failed){failed=true;primary=error;}}};
   // All groups run even after a prior closing error, including falsy errors.
   for(const batch of batches)check(()=>withCompactSourceVault(model,reader=>{let failed=false,primary;for(const row of batch)try{const retained=written.get(row.path);if(!retained)fail('complete written source row absent');const raw=reader.read(row.path),actual=readCompactSparsePhysicalFile(retained);if(!actual.equals(raw))fail('complete original/materialized bytes differ');}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;return null;}));
   if(census)check(()=>{const current=compactSparsePhysicalCensus(root,{maximum:L.logicalBytes});if(JSON.stringify(current.files.map(row=>row.name))!==JSON.stringify(census.files.map(row=>row.name))||JSON.stringify(current.directories.map(row=>row.name))!==JSON.stringify(census.directories.map(row=>row.name)))fail('complete source namespace changed');for(let at=0;at<census.files.length;at++)if(!sameCompactPhysicalSourceStamp(census.files[at].stat,current.files[at].stat))fail('complete physical source identity changed');for(let at=0;at<census.directories.length;at++)if(!sameCompactPhysicalSourceStamp(census.directories[at].stat,current.directories[at].stat))fail('complete source directory identity changed');});
   if(failed)throw primary;
  };
  try{return withCompleteSourceClosingFence(()=>{
   mkdirSync(root,{mode:0o700});
   for(const batch of batches)withCompactSourceVault(model,reader=>{for(const row of batch){const raw=reader.read(row.path);writeCompactSparseHotPhysicalFile(root,row.path,raw,row.mode);const path=join(root,row.path);written.set(row.path,{path,stat:lstatSync(path,{bigint:true})});}return null;});
   census=compactSparsePhysicalCensus(root,{maximum:L.logicalBytes});if(census.files.length!==rows.length||census.total!==rows.reduce((sum,row)=>sum+row.bytes,0)||JSON.stringify(census.files.map(row=>row.name))!==JSON.stringify(rows.map(row=>row.path)))fail('complete actual raw source census differs');
   close();return {root,files:rows.length,rawBytes:census.total,currentClosure:rows.map(row=>({path:row.path,mode:row.mode,gitBlob:row.gitBlob,bytes:row.bytes,sha256:inspected.metadata.objects[row.object].sha256})),profile:'full-compiler-profile-transfer-256MiB-v1',legacyRawLimitUnchanged:true,decodedLeaseLimitUnchanged:true,sourceAuthority:false,semanticAuthority:false,compilerQualified:false,receivingQualified:false};
  },[close]);}finally{written.clear();batches.length=0;rows.length=0;}
 });
}
