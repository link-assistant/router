// Explicit protected-source ownership policy for fixed writers and runners.
// Split from unit-runtime-materialization.mjs so evidence runners can capture
// the policy without loading the complete translator graph. No cache is kept:
// every capture re-reads translation/source-ownership.json and its ancestors.
import {emitProtectedSourceDiagnostic,retainProtectedSourceDiagnostic} from './protected-source-diagnostics-20261103.mjs';
import {captureProtectedNativeTemporaryPrefix} from './protected-native-temporary-prefix-20261103.mjs';
import {captureAbsoluteNativeMutationTargets} from './protected-external-mutations-20261102-addresses.mjs';
import {captureContainedNativeDirectTargets} from './protected-contained-direct-20261102-paths.mjs';
import * as fs from 'node:fs';
import {assertProtectedMutationPaths,directMutationOutputPaths,assertProtectedDirectWriteTargets,assertProtectedStagedMutationTargets,assertProtectedNativeStagedMutationTargets,assertProtectedNativeDirectWriteTargets,assertProtectedNativeStreamWriteDescriptors} from './protected-preparer-writers-20261102-alias.mjs';
import {ownSourceFailureField} from './source-error-fields-20261102.mjs';import {captureReadonlySourceProfile} from './ordered-text-map-callers-20261102-source-storage.mjs';
import {resolve} from 'node:path';
import {Buffer} from 'node:buffer';
const FILE_LIMIT=8*1024*1024;
const fail=message=>{throw new TypeError('Source unit synchronization: '+message);};
function relative(value){if(typeof value!=='string'||!value||value.length>4096||value.startsWith('/')||value.includes('\\')||/[\0\r\n:]/u.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('ordinary repository-relative path required');return value;}
function physical(root,name){relative(name);let parent=root;const parts=name.split('/');for(const part of parts.slice(0,-1)){parent=resolve(parent,part);try{const row=fs.lstatSync(parent);if(!row.isDirectory()||row.isSymbolicLink())fail('linked or non-directory source parent');}catch(error){if(ownSourceFailureField(error,'code')!=='ENOENT')throw error;}}return resolve(root,name);}
function source(root,name){
 relative(name);const stored=captureReadonlySourceProfile(resolve(root,name),{maximum:FILE_LIMIT,retainBytes:false});if(stored){const raw=stored.read(),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('source must retain exact UTF8 bytes');stored.requireCurrent();return text;}const full=physical(root,name);let row;try{row=fs.lstatSync(full);}catch(error){if(ownSourceFailureField(error,'code')==='ENOENT')return null;throw error;}
 if(!row.isFile()||row.isSymbolicLink()||row.size>FILE_LIMIT)fail('bounded ordinary source file required');const fd=fs.openSync(full,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);let readFailed=false;
 try{const before=fs.fstatSync(fd),chunks=[];let total=0;for(;;){const bytes=Buffer.alloc(Math.min(65536,FILE_LIMIT-total+1)),count=fs.readSync(fd,bytes,0,bytes.length,null);if(!count)break;total+=count;if(total>FILE_LIMIT)fail('source grew beyond its byte bound');chunks.push(bytes.subarray(0,count));}const raw=Buffer.concat(chunks,total),after=fs.fstatSync(fd),named=fs.lstatSync(full);if(!before.isFile()||row.dev!==before.dev||row.ino!==before.ino||before.dev!==after.dev||before.ino!==after.ino||before.size!==raw.length||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||before.dev!==named.dev||before.ino!==named.ino||before.mode!==named.mode||after.size!==named.size||after.mtimeMs!==named.mtimeMs||after.ctimeMs!==named.ctimeMs)fail('complete source changed during capture');const text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('source must retain exact UTF8 bytes');return text;}catch(error){readFailed=true;throw error;}finally{try{fs.closeSync(fd);}catch(error){if(!readFailed)throw error;}}
}
// Private operational ownership snapshot. It grants no compiler permission.
// Capture precedes fresh production so a producer cannot remove the policy
// before installation. A restored present file retains changed ctimeNs.
function captureProtectedSourcePolicy(requestedRoot){
 if(typeof requestedRoot!=='string')fail('explicit source installation root required');
 const root=fs.realpathSync(resolve(requestedRoot)),policyPath='translation/source-ownership.json',schema='router-explicit-source-ownership-v1';
 const rootStamp=()=>{const stat=fs.lstatSync(root,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink())fail('ordinary protected-policy root required');return [stat.dev,stat.ino,stat.mode].map(String);};
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),rootIdentity=rootStamp();let revoked=false,closed=false;
 const parentStamp=()=>{let stat;try{stat=fs.lstatSync(resolve(root,'translation'),{bigint:true});}catch(error){if(ownSourceFailureField(error,'code')==='ENOENT')return null;throw error;}if(!stat.isDirectory()||stat.isSymbolicLink())fail('ordinary protected-policy parent required');return [stat.dev,stat.ino,stat.mode].map(String);},parentIdentity=parentStamp();
 const fileStamp=()=>{let stat;try{stat=fs.lstatSync(physical(root,policyPath),{bigint:true});}catch(error){if(ownSourceFailureField(error,'code')==='ENOENT')return null;throw error;}if(!stat.isFile()||stat.isSymbolicLink()||stat.size>BigInt(FILE_LIMIT))fail('bounded ordinary protected-source policy required');return [stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs].map(String);};
 const read=()=>{const before=fileStamp(),body=source(root,policyPath),after=fileStamp();if(!same(before,after)||(body===null)!==(after===null))fail('protected-source policy changed during capture');return {body,identity:after};};
 const initial=read(),protectedPaths=new Set();if(!same(rootStamp(),rootIdentity)||!same(parentStamp(),parentIdentity))fail('protected-source policy ancestors changed during capture');
 if(initial.body!==null){const value=JSON.parse(initial.body);if(!value||Array.isArray(value)||Object.keys(value).sort().join(',')!=='authored,schema,unmanaged'||value.schema!==schema)fail('closed explicit source ownership policy required');
  for(const names of [value.authored,value.unmanaged]){if(!Array.isArray(names)||names.length>4096)fail('bounded explicit protected-source list required');for(const name of names){relative(name);if(protectedPaths.has(name))fail('duplicate explicit protected-source path');protectedPaths.add(name);}}
 }
 const verify=()=>{try{if(closed||revoked)fail('protected-source policy scope expired or revoked');if(!same(rootStamp(),rootIdentity)||parentIdentity!==null&&!same(parentStamp(),parentIdentity))fail('protected-source root or parent changed');const next=read();if(next.body!==initial.body||!same(next.identity,initial.identity))fail('protected-source policy changed or was restored');}catch(error){revoked=true;throw error;}};
 const veto=operation=>{let value,failed=false,primary;try{verify();value=operation();}catch(error){failed=true;primary=error;}try{verify();}catch(error){if(!failed){failed=true;primary=error;}else recordProtectedPolicyClosingFailure(primary,error,diagnosticVeto);}if(failed){revoked=true;throw primary;}return value;};
 const diagnosticVeto=()=>veto(()=>assertProtectedNativeStreamWriteDescriptors({root,protectedNames:[policyPath,...protectedPaths],descriptors:[2]}));
 return Object.freeze({retainedBytes:initial.body===null?0:4*Buffer.byteLength(initial.body)+256,verify,
  allow(fresh){return veto(()=>{if(fs.realpathSync(resolve(fresh.root))!==root)fail('fresh producer root differs from protected-source policy');const protectedNames=[policyPath,...protectedPaths];let names=[];for(const row of fresh.outputs){relative(row.path);if(row.path===policyPath||protectedPaths.has(row.path)){if(row.before!==row.after)fail('explicit authored/unmanaged source or policy retained: '+row.path);if(row.before!==null){const stat=fs.lstatSync(physical(root,row.path));if((stat.mode&0o777)!==row.mode)fail('explicit protected-source mode retained: '+row.path);}}if(row.before!==row.after){names.push(row.path);if(names.length===256){assertProtectedStagedMutationTargets({root,protectedNames,paths:names});names=[];}}}if(names.length)assertProtectedStagedMutationTargets({root,protectedNames,paths:names});});},
  allowMutationPaths(paths){return veto(()=>{const protectedNames=[policyPath,...protectedPaths];assertProtectedMutationPaths({protectedNames,paths});assertProtectedStagedMutationTargets({root,protectedNames,paths});});},
  allowDirectWrites(fresh){return veto(()=>{if(fs.realpathSync(resolve(fresh.root))!==root)fail('fresh direct-writer root differs from protected-source policy');const paths=directMutationOutputPaths(fresh.outputs),protectedNames=[policyPath,...protectedPaths];assertProtectedMutationPaths({protectedNames,paths});assertProtectedDirectWriteTargets({root,protectedNames,paths});});},
  allowContainedDirectWrites(fresh){return veto(()=>{const captured=captureContainedNativeDirectTargets({requestedRoot:fresh.root,canonicalRoot:root,targets:fresh.targets});assertProtectedDirectWriteTargets({root,protectedNames:[policyPath,...protectedPaths],paths:captured.map(row=>row.canonicalTarget)});return captured;});},
  allowNativeDirectWrites(fresh){return veto(()=>{const captured=captureAbsoluteNativeMutationTargets({requestedRoot:fresh.root,canonicalRoot:root,targets:fresh.targets});assertProtectedNativeDirectWriteTargets({root,protectedNames:[policyPath,...protectedPaths],paths:captured.map(row=>row.canonicalTarget),descriptors:fresh.descriptors??[]});return captured;});},
  allowNativeStreamWrites(fresh){return veto(()=>{captureAbsoluteNativeMutationTargets({requestedRoot:fresh.root,canonicalRoot:root,targets:[]});return assertProtectedNativeStreamWriteDescriptors({root,protectedNames:[policyPath,...protectedPaths],descriptors:fresh.descriptors??[]});});},
  allowNativeTemporaryPrefix(fresh){return veto(()=>{const captured=captureAbsoluteNativeMutationTargets({requestedRoot:fresh.root,canonicalRoot:root,targets:[fresh.prefix]});return captureProtectedNativeTemporaryPrefix({root,protectedNames:[policyPath,...protectedPaths],prefix:captured[0].canonicalTarget,maximumRetainedBytes:fresh.maximumRetainedBytes});});},
  allowNativeMutationPaths(fresh){return veto(()=>{const captured=captureAbsoluteNativeMutationTargets({requestedRoot:fresh.root,canonicalRoot:root,targets:fresh.targets});assertProtectedNativeStagedMutationTargets({root,protectedNames:[policyPath,...protectedPaths],paths:captured.map(row=>row.canonicalTarget)});return captured;});},
  close(){if(closed)fail('protected-source policy already closed');try{verify();}finally{closed=true;protectedPaths.clear();}},
 });
}
function recordProtectedPolicyClosingFailure(primary,error,additionalVeto){
 retainProtectedSourceDiagnostic('Protected source policy closing failure',{primary,secondary:error});
 if(primary!==null&&(typeof primary==='object'||typeof primary==='function'))try{Object.defineProperty(primary,'protectedSourcePolicyClosingFailure',{value:error,enumerable:true});return;}catch{}
 try{emitProtectedSourceDiagnostic(JSON.stringify({schema:'router-protected-source-policy-closing-v1',policy:'translation/source-ownership.json',closingFailed:true})+'\n',{primary,secondary:error,additionalVeto});}catch{}
}
// Shared operational veto/closing scope for fixed specialized writers. Its
// methods can restrict source mutations; they issue no compiler permission.
export {captureProtectedSourcePolicy,captureProtectedSourcePolicy as captureExplicitSourceMutationPolicy,recordProtectedPolicyClosingFailure,fail as failSourceUnitSynchronization,relative as sourceUnitRelativePath,physical as sourceUnitPhysicalPath,source as readSourceUnitText};
