// Fixed recursive parent creation plus direct source writes. Operational veto.
import fs from 'node:fs';
import {resolve,dirname} from 'node:path';
import {types} from 'node:util';
import {captureAbsoluteNativeMutationTargets} from './protected-external-mutations-20261102-addresses.mjs';
import {DIRECT_WRITE_ALIAS_LIMITS as LIMITS} from './protected-preparer-writers-20261102-alias.mjs';
import {withProtectedNativeWriter,withProtectedNativeSourceAdmission,allowProtectedNativeAbsoluteDirectWrites,mutateProtectedNativeAbsoluteDirectWriter,mutateProtectedNativeAbsoluteEntries} from './protected-native-writers-20261102.mjs';
const fail=message=>{throw new TypeError('Protected recursive source CLI: '+message);};
function errorCode(error){if(error===null||!['object','function'].includes(typeof error)||types.isProxy(error))return undefined;const field=Object.getOwnPropertyDescriptor(error,'code');return field&&Object.hasOwn(field,'value')?field.value:undefined;}
function directoryState(path){
 let entry;try{entry=fs.lstatSync(path,{bigint:true});}catch(error){const code=errorCode(error);if(code==='ENOENT')return {kind:'missing',identity:null,entry:null,linked:false,link:null};if(code==='ENOTDIR')return {kind:'blocked',identity:null,entry:null,linked:false,link:null};throw error;}
 const linked=entry.isSymbolicLink(),stamp=row=>[row.dev,row.ino,row.mode,row.uid,row.gid].map(String).join(':'),link=linked?fs.readlinkSync(path,{encoding:'buffer'}).toString('base64'):null,entryStamp=linked?[entry.dev,entry.ino,entry.mode,entry.size,entry.mtimeNs,entry.ctimeNs].map(String).join(':'):stamp(entry);let row=entry;
 if(linked)try{row=fs.statSync(path,{bigint:true});}catch(error){if(errorCode(error)==='ENOENT')return {kind:'dangling',identity:null,entry:entryStamp,linked,link};throw error;}
 return {kind:row.isDirectory()?'directory':'other',identity:stamp(row),entry:entryStamp,linked,link};
}
function snapshotParents(root,target){
 const canonicalRoot=fs.realpathSync(resolve(root)),parent=captureAbsoluteNativeMutationTargets({requestedRoot:root,canonicalRoot,targets:[dirname(target)]})[0].canonicalTarget,paths=[];let at=parent,retained=0;
 for(;;){if(paths.length>=LIMITS.nodes)fail('complete parent observation count bound');retained+=2*Buffer.byteLength(at)+256;if(retained>LIMITS.rawBytes)fail('complete parent observation byte bound');paths.push(at);const next=dirname(at);if(next===at)break;at=next;}
 const rows=[],missing=[];for(const path of paths.reverse()){const row={path,...directoryState(path)};retained+=Buffer.byteLength(JSON.stringify(row));if(row.kind==='missing'){retained+=Buffer.byteLength(path)+32;missing.push(path);}if(retained>LIMITS.rawBytes)fail('complete parent observation byte bound');rows.push(row);}return {parent,rows,missing};
}
function verifyParents(root,snapshot,after){return withProtectedNativeSourceAdmission(root,()=>{
 let failed=false,primary;
 // Observe every captured prefix even after an earlier mismatch. Parent entry
 // clocks may change because mkdir creates children; directory identity may not.
 for(const row of snapshot.rows)try{const current=directoryState(row.path),created=after&&row.kind==='missing'&&current.kind==='directory'&&!current.linked;if(!created&&(current.kind!==row.kind||current.identity!==row.identity||current.entry!==row.entry||current.linked!==row.linked||current.link!==row.link))fail('recursive parent namespace changed: '+row.path);}catch(error){if(!failed){failed=true;primary=error;}}
 if(failed)throw primary;
});}
export function createProtectedRecursiveCliParents(root,target){
 const snapshot=withProtectedNativeSourceAdmission(root,()=>snapshotParents(root,target));
 return mutateProtectedNativeAbsoluteEntries(root,snapshot.missing,()=>{
  verifyParents(root,snapshot,false);let result,failed=false,primary;
  try{result=fs.mkdirSync(snapshot.parent,{recursive:true});}catch(error){failed=true;primary=error;}
  try{verifyParents(root,snapshot,true);}catch(error){if(!failed){failed=true;primary=error;}else try{process.stderr.write('{"schema":"protected-recursive-cli-closing-20261103","closingFailed":true}\n');}catch{}}
  if(failed)throw primary;return result;
 });
}
function preflightRows(root,rows){let batch=[],bytes=0;const flush=()=>{if(batch.length){allowProtectedNativeAbsoluteDirectWrites(root,batch);batch=[];bytes=0;}};for(const row of rows){const size=3*Buffer.byteLength(row.target)+96;if(batch.length&&(batch.length===1024||bytes+size>1048576))flush();batch.push(row.target);bytes+=size;}flush();}
export function writeProtectedRecursiveCliPlan(root,produce,stale){return withProtectedNativeWriter(root,()=>{
 const plan=withProtectedNativeSourceAdmission(root,produce);withProtectedNativeSourceAdmission(root,()=>stale(plan));
 // Actual three producers return ordinary own rows. Capture each primitive path
 // and byte payload once after the original guard, then reuse those values.
 const rows=withProtectedNativeSourceAdmission(root,()=>{const rows=[];for(const row of plan.files){const path=row.path,after=row.after;rows.push({target:resolve(root,path),after});}return rows;});preflightRows(root,rows);
 for(const row of rows){createProtectedRecursiveCliParents(root,row.target);mutateProtectedNativeAbsoluteDirectWriter(root,[row.target],captured=>fs.writeFileSync(captured[0].canonicalTarget,row.after));}
 return plan;
});}
