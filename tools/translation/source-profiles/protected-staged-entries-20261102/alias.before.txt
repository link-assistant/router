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
export function assertProtectedDirectWriteTargets({root,protectedNames,paths}={}){
 protectedNames=strings(protectedNames,DIRECT_WRITE_ALIAS_LIMITS.protectedPaths);paths=strings(paths,DIRECT_WRITE_ALIAS_LIMITS.paths);
 const names=[...new Set(protectedNames)],destinations=[...new Set(paths)];
 if(!destinations.length)return {nodes:0,steps:0,retainedBytes:0,closingChecks:0,sourceAuthority:false,semanticAuthority:false};
 const snapshots=new Map(),protectedInodes=new Map(),protectedEndpoints=new Map(),missingByParent=new Map();
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
 if(answer)answer.closingChecks=closingChecks;
 snapshots.clear();protectedInodes.clear();protectedEndpoints.clear();missingByParent.clear();
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
