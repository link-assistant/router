import {captureAbsoluteNativeMutationTargets} from './protected-external-mutations-20261102-addresses.mjs';
// Invocation-local filesystem alias DATA. This issues no source/compiler token.
import fs from 'node:fs';
import {resolve,parse,join,dirname,isAbsolute} from 'node:path';
import {types} from 'node:util';
export const DIRECT_WRITE_ALIAS_LIMITS=Object.freeze({paths:4096,protectedPaths:8193,nodes:32768,
 steps:262144,rawBytes:16777216,symlinkHops:256});
const fail=message=>{throw new TypeError('Protected direct source write: '+message);};
function errorCode(error){if(error===null||!['object','function'].includes(typeof error)||types.isProxy(error))return undefined;const field=Object.getOwnPropertyDescriptor(error,'code');return field&&Object.hasOwn(field,'value')?field.value:undefined;}
const equal=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
const inode=stat=>String(stat.dev)+':'+String(stat.ino);
function stamp(stat){
 // Unrelated directory entries may change their clocks. Every selected child,
 // negative lookup and symlink is separately captured and closed below.
 return (stat.isDirectory()?[stat.dev,stat.ino,stat.mode,stat.uid,stat.gid]:
  [stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs,stat.nlink,stat.uid,stat.gid]).map(String);
}
function strings(value,limit){
 if(!Array.isArray(value)||types.isProxy(value)||value.length>limit)fail('bounded own path array required');
 const fields=Object.getOwnPropertyDescriptors(value);if(Reflect.ownKeys(fields).length!==value.length+1)fail('dense ordinary path array required');
 const copied=[];for(let at=0;at<value.length;at++){if(!fields[at]||!Object.hasOwn(fields[at],'value')||typeof fields[at].value!=='string')fail('primitive own path required');copied.push(fields[at].value);}return copied;
}
const parts=text=>process.platform==='win32'?text.split(/[\\/]/u):text.split('/');
function closingFailure(primary,error,count){
 if(primary!==null&&['object','function'].includes(typeof primary))try{Object.defineProperties(primary,{directWriteAliasClosingFailure:{value:error,enumerable:true},directWriteAliasClosingFailureCount:{value:count,enumerable:true}});return;}catch{}
 try{process.stderr.write('{"schema":"direct-write-alias-closing-20261102","closingFailed":true}\n');}catch{}
}
function descriptorNumbers(value){if(!Array.isArray(value)||types.isProxy(value)||value.length>DIRECT_WRITE_ALIAS_LIMITS.paths)fail('bounded own descriptor array required');const fields=Object.getOwnPropertyDescriptors(value);if(Reflect.ownKeys(fields).length!==value.length+1)fail('dense own descriptor array required');const result=[];for(let at=0;at<value.length;at++){const field=fields[at];if(!field||!Object.hasOwn(field,'value')||!Number.isSafeInteger(field.value)||field.value<0)fail('primitive actual file descriptor required');result.push(field.value);}return [...new Set(result)];}
export function assertProtectedDirectWriteTargets({root,protectedNames,paths}={}){return observeProtectedDirectWriteTargets({root,protectedNames,paths,descriptors:[]});}
export function assertProtectedNativeDirectWriteTargets({root,protectedNames,paths,descriptors=[]}={}){return observeProtectedDirectWriteTargets({root,protectedNames,paths,descriptors});}
export function assertProtectedNativeStreamWriteDescriptors({root,protectedNames,descriptors=[]}={}){return observeProtectedDirectWriteTargets({root,protectedNames,paths:[],descriptors,streamDescriptors:true});}
function descriptorStamp(stat,streamDescriptors){return streamDescriptors&&!stat.isFile()?[stat.dev,stat.ino,stat.mode,stat.uid,stat.gid].map(String):stamp(stat);}
function observeProtectedDirectWriteTargets({root,protectedNames,paths,descriptors,streamDescriptors=false}){
 protectedNames=strings(protectedNames,DIRECT_WRITE_ALIAS_LIMITS.protectedPaths);paths=strings(paths,DIRECT_WRITE_ALIAS_LIMITS.paths);
 const names=[...new Set(protectedNames)],destinations=[...new Set(paths)],fds=descriptorNumbers(descriptors);
 if(!destinations.length&&!fds.length)return {nodes:0,steps:0,retainedBytes:0,closingChecks:0,sourceAuthority:false,semanticAuthority:false};
 const snapshots=new Map(),descriptorSnapshots=new Map(),protectedInodes=new Map(),protectedEndpoints=new Map(),missingByParent=new Map();
 let steps=0,retained=0,primary,failed=false,answer;
 const step=()=>{if(++steps>DIRECT_WRITE_ALIAS_LIMITS.steps)fail('metadata/walk step bound exceeded');};
 function lookup(path){
  if(snapshots.has(path))return snapshots.get(path);if(snapshots.size>=DIRECT_WRITE_ALIAS_LIMITS.nodes)fail('metadata node bound exceeded');
  step();let stat,missing=null;try{stat=fs.lstatSync(path,{bigint:true});}catch(error){const code=errorCode(error);if(!['ENOENT','ENOTDIR'].includes(code))throw error;missing=code;}
  const row={path,missing,stat,signature:stat?stamp(stat):null,link:null};snapshots.set(path,row);
  retained+=Buffer.byteLength(path)+64+(row.signature?row.signature.reduce((sum,value)=>sum+Buffer.byteLength(value),0):0);
  if(stat?.isSymbolicLink()){
   step();row.link=fs.readlinkSync(path,{encoding:'buffer'});if(!Buffer.isBuffer(row.link))fail('original symlink byte target required');retained+=row.link.length;
   step();if(!equal(stamp(fs.lstatSync(path,{bigint:true})),row.signature))fail('symlink identity changed during capture');
   if(!Buffer.from(row.link.toString('utf8')).equals(row.link))fail('non-UTF8 symlink target is outside the alias profile');
  }
  if(retained>DIRECT_WRITE_ALIAS_LIMITS.rawBytes)fail('complete metadata raw-byte bound exceeded');return row;
 }
 function endpoint(full){
  full=resolve(full);let current=parse(full).root,pending=parts(full.slice(current.length)).filter(Boolean),hops=0;
  lookup(current);
  while(pending.length){step();const part=pending.shift();if(part==='.')continue;if(part==='..'){current=dirname(current);continue;}
   const parent=lookup(current),next=join(current,part),row=lookup(next);
   if(row.missing){const tail=[part,...pending].filter(value=>value!=='.');if(tail.includes('..'))fail('unresolved missing-parent dot segments are outside the alias profile');return {path:join(current,...tail),stat:null,missing:{parent:parent.stat?inode(parent.stat):current,tail}};}
   if(row.stat.isSymbolicLink()){
    if(++hops>DIRECT_WRITE_ALIAS_LIMITS.symlinkHops)fail('symlink hop/cycle bound exceeded');const target=row.link.toString('utf8');if(!target)fail('empty symlink target unsupported');
    if(isAbsolute(target)){current=parse(target).root;pending=[...parts(target.slice(current.length)).filter(Boolean),...pending];lookup(current);}else pending=[...parts(target).filter(Boolean),...pending];
   }else current=next;
  }
  const row=lookup(current);return {path:current,stat:row.stat??null,missing:row.missing?{parent:dirname(current),tail:[parse(current).base]}:null};
 }
 function missingKey(value){return value.parent+'\0'+value.tail.join('\0');}
 try{
  for(const name of names){const value=endpoint(resolve(root,name));protectedEndpoints.set(value.path,name);if(value.stat)protectedInodes.set(inode(value.stat),name);
   if(value.missing){const group=value.missing.parent+'\0'+value.missing.tail.length,list=missingByParent.get(group)??[];list.push({name,...value.missing});missingByParent.set(group,list);}
  }
  for(const fd of fds){step();const stat=fs.fstatSync(fd,{bigint:true}),signature=descriptorStamp(stat,streamDescriptors);descriptorSnapshots.set(fd,signature);if(!streamDescriptors&&!stat.isFile())fail('ordinary actual file descriptor required');retained+=96+signature.reduce((sum,value)=>sum+Buffer.byteLength(value),0);if(retained>DIRECT_WRITE_ALIAS_LIMITS.rawBytes)fail('complete FD metadata raw-byte bound exceeded');const protectedName=protectedInodes.get(inode(stat));if(protectedName!==undefined)fail('authored/unmanaged or policy actual FD alias retained: '+fd+' -> '+protectedName);}
  for(const path of destinations){const value=endpoint(resolve(root,path));let protectedName=protectedEndpoints.get(value.path)??(value.stat?protectedInodes.get(inode(value.stat)):null);
   if(value.missing){const peers=missingByParent.get(value.missing.parent+'\0'+value.missing.tail.length)??[];
    for(const peer of peers){if(missingKey(peer)===missingKey(value.missing)){protectedName=peer.name;break;}
     const a=peer.tail.join('/'),b=value.missing.tail.join('/');if(/[^\x00-\x7f]/u.test(a+b))fail('ambiguous non-ASCII missing-name equivalence is outside the alias profile');if(a.toLowerCase()===b.toLowerCase())fail('ambiguous missing-name case alias retained: '+path);
    }
   }
   if(protectedName!==null&&protectedName!==undefined)fail('authored/unmanaged or policy alias retained: '+path+' -> '+protectedName);
  }
  answer={nodes:snapshots.size,steps,retainedBytes:retained,sourceAuthority:false,semanticAuthority:false};
 }catch(error){failed=true;primary=error;}
 // Never spend the main work budget on closing: every captured metadata row is
 // attempted even after a bound, opaque failure or veto has already poisoned it.
 let firstClosing,closingCount=0,closingChecks=0;
 for(const row of snapshots.values()){
  const checks=[()=>{let now,missing=null;try{now=fs.lstatSync(row.path,{bigint:true});}catch(error){const code=errorCode(error);if(!['ENOENT','ENOTDIR'].includes(code))throw error;missing=code;}if(row.missing!==missing||now&&!equal(stamp(now),row.signature??[]))fail('captured alias metadata changed before closing');}];
  if(row.link!==null)checks.push(()=>{const link=fs.readlinkSync(row.path,{encoding:'buffer'});if(!Buffer.isBuffer(link)||!link.equals(row.link))fail('complete symlink source changed before closing');},()=>{if(!equal(stamp(fs.lstatSync(row.path,{bigint:true})),row.signature))fail('symlink epoch changed before closing');});
  for(const check of checks)try{closingChecks++;check();}catch(error){if(!closingCount)firstClosing=error;closingCount++;}
 }
 for(const [fd,signature]of descriptorSnapshots)try{closingChecks++;if(!equal(descriptorStamp(fs.fstatSync(fd,{bigint:true}),streamDescriptors),signature))fail('actual descriptor epoch changed before closing');}catch(error){if(!closingCount)firstClosing=error;closingCount++;}
 if(answer)answer.closingChecks=closingChecks;
 descriptorSnapshots.clear();snapshots.clear();protectedInodes.clear();protectedEndpoints.clear();missingByParent.clear();
 if(failed){if(closingCount)closingFailure(primary,firstClosing,closingCount);throw primary;}if(closingCount){if(closingCount===1)throw firstClosing;const error=new AggregateError([firstClosing],'Alias metadata closing failures: '+closingCount);Object.defineProperty(error,'failureCount',{value:closingCount,enumerable:true});throw error;}return answer;
}

function ordinary(name){if(typeof name!=='string'||!name||name.length>4096||name.startsWith('/')||name.includes('\\')||/[\0\r\n:]/u.test(name)||name.split('/').some(part=>!part||part==='.'||part==='..'))fail('ordinary repository-relative mutation path required');return name;}
export function directMutationOutputPaths(outputs){
 if(!Array.isArray(outputs)||types.isProxy(outputs)||outputs.length>DIRECT_WRITE_ALIAS_LIMITS.paths)fail('bounded direct mutation output array required');
 const fields=Object.getOwnPropertyDescriptors(outputs);if(Reflect.ownKeys(fields).length!==outputs.length+1)fail('dense direct mutation outputs required');const paths=[];
 for(let at=0;at<outputs.length;at++){const item=fields[at];if(!item||!Object.hasOwn(item,'value')||!item.value||typeof item.value!=='object'||types.isProxy(item.value))fail('own direct mutation row required');const field=Object.getOwnPropertyDescriptor(item.value,'path');if(!field||!Object.hasOwn(field,'value'))fail('own direct mutation path required');paths.push(ordinary(field.value));}return paths;
}
export function assertProtectedMutationPaths({protectedNames,paths}={}){
 protectedNames=strings(protectedNames,DIRECT_WRITE_ALIAS_LIMITS.protectedPaths);paths=strings(paths,DIRECT_WRITE_ALIAS_LIMITS.paths);const names=new Set(protectedNames);
 for(const path of paths){ordinary(path);if(names.has(path))fail('authored/unmanaged or policy mutation path retained: '+path);}
}

// Native directory ENTRY observation for staged unlink/link/rename/create.
// Distinct exact hard-link entries remain distinct even when file inodes match.
export const STAGED_ENTRY_ALIAS_LIMITS=Object.freeze({paths:4096,protectedPaths:8193,
 nodes:32768,steps:262144,rawBytes:16777216,directoryEntries:262144,
 symlinkHops:256,symlinkBytes:65536,pendingParts:65536,entryBytes:65536,
 negativeBytes:65536,comparisonBytes:16777216,closingBytes:16777216});
const stagedFailure=message=>{throw new TypeError('Protected staged source mutation: '+message);};
const stagedStamp=stat=>[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs,stat.nlink,stat.uid,stat.gid].map(String);
function stagedSecondary(primary,error,count){
 if(primary!==null&&['object','function'].includes(typeof primary)&&!types.isProxy(primary))try{Object.defineProperties(primary,{stagedEntryClosingFailure:{value:error,enumerable:true},stagedEntryClosingFailureCount:{value:count,enumerable:true}});return;}catch{}
 try{process.stderr.write(JSON.stringify({schema:'staged-entry-alias-closing-20261102',closingFailed:true})+String.fromCharCode(10));}catch{}
}
export function assertProtectedStagedMutationTargets({root,protectedNames,paths}={}){
 protectedNames=strings(protectedNames,STAGED_ENTRY_ALIAS_LIMITS.protectedPaths);paths=strings(paths,STAGED_ENTRY_ALIAS_LIMITS.paths);
 for(const name of [...protectedNames,...paths])ordinary(name);
 return observeProtectedStagedMutationTargets({root,protectedNames,paths,native:false});
}
export function assertProtectedNativeStagedMutationTargets({root,protectedNames,paths}={}){
 protectedNames=strings(protectedNames,STAGED_ENTRY_ALIAS_LIMITS.protectedPaths);for(const name of protectedNames)ordinary(name);const captured=captureAbsoluteNativeMutationTargets({requestedRoot:root,canonicalRoot:fs.realpathSync(resolve(root)),targets:paths});
 return observeProtectedStagedMutationTargets({root,protectedNames,paths:captured.map(row=>row.canonicalTarget),native:true});
}
function observeProtectedStagedMutationTargets({root,protectedNames,paths,native}){
 const names=[...new Set(protectedNames)],destinations=[...new Set(paths)];
 if(!destinations.length)return {nodes:0,steps:0,retainedBytes:0,directoryEntries:0,closingChecks:0,sourceAuthority:false,semanticAuthority:false};
 const snapshots=new Map(),directories=new Map(),protectedEntries=new Set(),protectedDirectories=new Set(),negativeGroups=new Map();
 const separator=String.fromCharCode(0);let steps=0,retained=0,entries=0,comparisonBytes=0,captureClosingChecks=0,boundary,boundaryPrefix,primary,failed=false,answer;
 const step=()=>{if(++steps>STAGED_ENTRY_ALIAS_LIMITS.steps)stagedFailure('metadata/entry work bound exceeded');};
 const charge=bytes=>{retained+=bytes;if(retained>STAGED_ENTRY_ALIAS_LIMITS.rawBytes)stagedFailure('retained native entry metadata byte bound exceeded');};
 const utf8=text=>{const raw=Buffer.from(text);if(raw.toString('utf8')!==text)stagedFailure('non-roundtrip UTF8 path component is outside the entry profile');return raw;};
 function lookup(path){
  if(snapshots.has(path))return snapshots.get(path);if(snapshots.size>=STAGED_ENTRY_ALIAS_LIMITS.nodes)stagedFailure('metadata node bound exceeded');
  step();let stat,missing=null;try{stat=fs.lstatSync(path,{bigint:true});}catch(error){const code=errorCode(error);if(!['ENOENT','ENOTDIR'].includes(code))throw error;missing=code;}
  const namespaceDirectory=Boolean(native&&stat?.isDirectory()),row={path,stat,missing,namespaceDirectory,signature:stat?(namespaceDirectory?stamp(stat):stagedStamp(stat)):null,link:null};snapshots.set(path,row);charge(Buffer.byteLength(path)+96+(row.signature?row.signature.reduce((sum,value)=>sum+Buffer.byteLength(value),0):0));
  return row;
 }
 function followedLink(row){
  if(row.link!==null)return row.link;step();const link=fs.readlinkSync(row.path,{encoding:'buffer'});if(!Buffer.isBuffer(link)||link.length>STAGED_ENTRY_ALIAS_LIMITS.symlinkBytes)stagedFailure('bounded original symlink byte target required');row.link=link;charge(link.length);
  step();if(!equal(stagedStamp(fs.lstatSync(row.path,{bigint:true})),row.signature))stagedFailure('symlink identity changed during entry capture');if(!Buffer.from(link.toString('utf8')).equals(link))stagedFailure('non-UTF8 symlink target is outside the entry profile');return link;
 }
 function entryBytes(entry){
  if(!entry||typeof entry!=='object'||types.isProxy(entry))stagedFailure('actual native directory entry required');const field=Object.getOwnPropertyDescriptor(entry,'name');
  if(!field||!Object.hasOwn(field,'value')||!Buffer.isBuffer(field.value)||!field.value.length||field.value.length>STAGED_ENTRY_ALIAS_LIMITS.entryBytes)stagedFailure('bounded native Buffer directory spelling required');return field.value;
 }
 function nativeEntries(path,parent){
  if(directories.has(path))return directories.get(path);
  if(!parent.stat?.isDirectory()||parent.stat.isSymbolicLink())stagedFailure('actual ordinary entry parent required');
  const row={path,signature:native?stagedStamp(parent.stat):parent.signature,names:new Map(),complete:false};directories.set(path,row);
  step();if(!equal(stagedStamp(fs.lstatSync(path,{bigint:true})),row.signature))stagedFailure('entry parent changed before native enumeration');
  step();const handle=fs.opendirSync(path,{encoding:'buffer',bufferSize:1});let broken=false,problem;
  try{for(;;){step();const value=handle.readSync();if(value===null){row.complete=true;break;}if(++entries>STAGED_ENTRY_ALIAS_LIMITS.directoryEntries)stagedFailure('complete native directory entry bound exceeded');const raw=entryBytes(value),hex=raw.toString('hex');charge(2*raw.length+64);if(row.names.has(hex))stagedFailure('native directory enumeration repeated an entry');row.names.set(hex,row.names.size);}}
  catch(error){broken=true;problem=error;}
  // Always attempt handle close and the independent post-census path epoch.
  for(const close of [()=>{captureClosingChecks++;handle.closeSync();},()=>{captureClosingChecks++;if(!equal(stagedStamp(fs.lstatSync(path,{bigint:true})),row.signature))stagedFailure('entry parent changed during native enumeration');}])try{close();}catch(error){if(broken)stagedSecondary(problem,error,1);else{broken=true;problem=error;}}
  if(broken)throw problem;return row;
 }
 function inspect(full,followFinal,protect){
  full=resolve(full);const inside=full===boundary||full.startsWith(boundaryPrefix);let current=inside?boundary:parse(full).root,pending=parts(full.slice(current.length)).filter(Boolean),hops=0;const lineage=[];lookup(current);
  while(pending.length){step();const part=pending.shift(),parent=lookup(current);if(!parent.stat?.isDirectory()||parent.stat.isSymbolicLink())stagedFailure('uninspectable non-directory endpoint parent');
   if(part==='.')continue;if(part==='..'){current=dirname(current);continue;}
   if(native&&protect)protectedDirectories.add(inode(parent.stat));
   const raw=utf8(part),hex=raw.toString('hex'),next=join(current,part),row=lookup(next);if(native&&row.stat?.isDirectory()){if(protect)protectedDirectories.add(inode(row.stat));else if(!pending.length&&protectedDirectories.has(inode(row.stat)))stagedFailure('protected source directory ancestry retained: '+full);}
   // Only final native entry parents require full exact spelling enumeration.
   const listing=!native||!pending.length||row.missing?nativeEntries(current,parent):null,exact=listing?listing.names.has(hex):true;
   if(row.missing){if(exact)stagedFailure('native listed entry is missing from its captured path');const tail=[part,...pending].filter(value=>value!=='.');if(tail.includes('..'))stagedFailure('missing-parent dot segments are outside the entry profile');let bytes=0;for(const piece of tail){step();bytes+=utf8(piece).length+1;if(bytes>STAGED_ENTRY_ALIAS_LIMITS.negativeBytes)stagedFailure('missing endpoint byte bound exceeded');}charge(bytes+64);return {entry:null,stat:null,lineage,negative:{parent:inode(parent.stat),tail,spelling:tail.join('/'),bytes}};}
   if(!exact)stagedFailure('existing component lacks exact native entry spelling; case/Unicode alias is unproved');
   const key=inode(parent.stat)+separator+hex;lineage.push(key);charge(Buffer.byteLength(key)+8);
   if(row.stat.isSymbolicLink()&&(followFinal||pending.length)){
    if(protect)for(const ancestor of lineage){step();protectedEntries.add(ancestor);}
    if(++hops>STAGED_ENTRY_ALIAS_LIMITS.symlinkHops)stagedFailure('symlink hop/cycle bound exceeded');const target=followedLink(row).toString('utf8');if(!target)stagedFailure('empty symlink target unsupported');
    const absolute=isAbsolute(target),internal=absolute&&(target===boundary||target.startsWith(boundaryPrefix)),anchor=absolute?(internal?boundary:parse(target).root):null,added=parts(absolute?target.slice(anchor.length):target).filter(Boolean);
    if(added.length+pending.length>STAGED_ENTRY_ALIAS_LIMITS.pendingParts)stagedFailure('pending native path component bound exceeded');pending=[...added,...pending];if(absolute){current=anchor;lookup(current);}
   }else{current=next;if(!pending.length)return {entry:key,stat:row.stat,lineage,negative:null};}
  }return {entry:null,stat:lookup(current).stat,lineage,negative:null};
 }
 const group=value=>value.parent+separator+value.tail.length;
 const nonAscii=text=>{for(let at=0;at<text.length;at++)if(text.charCodeAt(at)>127)return true;return false;};
 try{
  step();const canonicalBoundary=fs.realpathSync(resolve(root));boundary=native?parse(canonicalBoundary).root:canonicalBoundary;const nativeSeparator=String.fromCharCode(process.platform==='win32'?92:47);boundaryPrefix=boundary.endsWith(nativeSeparator)?boundary:boundary+nativeSeparator;
  if(native){for(let at=canonicalBoundary;;at=dirname(at)){const row=lookup(at);if(!row.stat?.isDirectory()||row.stat.isSymbolicLink())stagedFailure('ordinary captured policy root ancestry required');protectedDirectories.add(inode(row.stat));if(dirname(at)===at)break;}}
  for(const name of names){const value=inspect(resolve(root,name),true,true);if(value.stat)for(const ancestor of value.lineage){step();protectedEntries.add(ancestor);}if(value.negative){const key=group(value.negative),peers=negativeGroups.get(key)??[];peers.push({name,...value.negative});negativeGroups.set(key,peers);}}
  for(const path of destinations){const value=inspect(resolve(root,path),false,false);if(value.entry&&protectedEntries.has(value.entry))stagedFailure('authored/unmanaged or policy physical entry retained: '+path);
   if(value.negative)for(const peer of negativeGroups.get(group(value.negative))??[]){step();comparisonBytes+=peer.bytes+value.negative.bytes;if(comparisonBytes>STAGED_ENTRY_ALIAS_LIMITS.comparisonBytes)stagedFailure('missing endpoint comparison byte bound exceeded');const a=peer.spelling,b=value.negative.spelling;if(a===b)stagedFailure('authored/unmanaged or policy missing entry retained: '+path);if(nonAscii(a)||nonAscii(b))stagedFailure('ambiguous non-ASCII missing entry equivalence is outside the profile');if(a.toLowerCase()===b.toLowerCase())stagedFailure('ambiguous missing entry case alias retained: '+path);}
  }
  answer={nodes:snapshots.size,steps,retainedBytes:retained,directoryEntries:entries,comparisonBytes,captureClosingChecks,sourceAuthority:false,semanticAuthority:false};
 }catch(error){failed=true;primary=error;}
 // Independent closing work never consumes an exhausted admission budget.
 // Each metadata row is attempted; each directory scans at most its captured
 // entry count plus one, rejecting an unknown name immediately. Every opened
 // native directory handle receives a close attempt even after opaque failure.
 let firstClosing,closingCount=0,closingChecks=0,closingBytes=0;
 const closeCheck=run=>{try{run();}catch(error){if(!closingCount)firstClosing=error;closingCount++;}};
 for(const row of snapshots.values()){
  closeCheck(()=>{closingChecks++;let now,missing=null;try{now=fs.lstatSync(row.path,{bigint:true});}catch(error){const code=errorCode(error);if(!['ENOENT','ENOTDIR'].includes(code))throw error;missing=code;}if(row.missing!==missing||now&&!equal(row.namespaceDirectory?stamp(now):stagedStamp(now),row.signature??[]))stagedFailure('captured endpoint metadata changed before closing');});
  if(row.link!==null){closeCheck(()=>{closingChecks++;const link=fs.readlinkSync(row.path,{encoding:'buffer'});if(!Buffer.isBuffer(link)||link.length>STAGED_ENTRY_ALIAS_LIMITS.symlinkBytes||!link.equals(row.link))stagedFailure('complete symlink target changed before entry closing');});closeCheck(()=>{closingChecks++;if(!equal(stagedStamp(fs.lstatSync(row.path,{bigint:true})),row.signature))stagedFailure('symlink epoch changed before entry closing');});}
 }
 for(const row of directories.values())closeCheck(()=>{
  closingChecks++;if(!equal(stagedStamp(fs.lstatSync(row.path,{bigint:true})),row.signature))stagedFailure('native entry parent changed before closing census');
  closingChecks++;const handle=fs.opendirSync(row.path,{encoding:'buffer',bufferSize:1}),seen=new Set();let broken=false,problem;
  try{for(let count=0;;count++){if(closingBytes>STAGED_ENTRY_ALIAS_LIMITS.closingBytes)stagedFailure('independent closing byte bound exceeded');closingChecks++;const value=handle.readSync();if(value===null)break;if(count>=row.names.size)stagedFailure('native closing directory census grew or was incomplete');const raw=entryBytes(value);closingBytes+=raw.length;if(closingBytes>STAGED_ENTRY_ALIAS_LIMITS.closingBytes)stagedFailure('independent closing byte bound exceeded');const index=row.names.get(raw.toString('hex'));if(index===undefined||seen.has(index))stagedFailure('native closing entry census differs');seen.add(index);}if(!row.complete||seen.size!==row.names.size)stagedFailure('native closing directory census lost an entry');}catch(error){broken=true;problem=error;}
  for(const close of [()=>{closingChecks++;handle.closeSync();},()=>{closingChecks++;if(!equal(stagedStamp(fs.lstatSync(row.path,{bigint:true})),row.signature))stagedFailure('native entry parent changed around closing census');}])try{close();}catch(error){if(broken)stagedSecondary(problem,error,1);else{broken=true;problem=error;}}
  if(broken)throw problem;
 });
 if(answer){answer.closingChecks=closingChecks;answer.closingBytes=closingBytes;}snapshots.clear();directories.clear();protectedEntries.clear();protectedDirectories.clear();negativeGroups.clear();
 if(failed){if(closingCount)stagedSecondary(primary,firstClosing,closingCount);throw primary;}
 if(closingCount){if(closingCount===1)throw firstClosing;const error=new AggregateError([firstClosing],'Staged entry closing failures: '+closingCount);Object.defineProperty(error,'failureCount',{value:closingCount,enumerable:true});throw error;}return answer;
}

// Additive inert numeric snapshot; no descriptor ownership or mutation authority.
export {descriptorNumbers as captureProtectedNativeDescriptorNumbers};
