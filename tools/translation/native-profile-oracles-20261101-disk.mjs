// Sampled operational disk DATA. No ownership, cleanup or Rust authority.
import {lstatSync,opendirSync,statfsSync,realpathSync,readlinkSync} from 'node:fs';
import {join,relative,isAbsolute,resolve,dirname,sep} from 'node:path';
import {types} from 'node:util';
import {performance} from 'node:perf_hooks';
import {inspectNativeOracleResourceObservation} from './native-profile-oracles-20261101-metrics.mjs';
import {NATIVE_PROFILE_ORACLE_LIMITS as LIMIT} from './native-profile-oracles-20261101-control.mjs';
const fail=message=>{throw new TypeError('Native evidence disk: '+message);};
const identity=info=>[info.dev,info.ino,info.mode,info.uid,info.gid].map(String).join(':');
function inside(parent,path){const child=relative(parent,path);return child!==''&&!isAbsolute(child)&&child!=='..'&&!child.startsWith('..'+sep);}
export function createNativeOracleDiskMonitor(root,startedAt,options=undefined){
 if(typeof root!=='string'||Buffer.byteLength(root)>LIMIT.pathBytes||typeof startedAt!=='number'||!Number.isFinite(startedAt)||startedAt<0)fail('primitive bounded root and original clock required');
 const initial=lstatSync(root,{bigint:true});if(!initial.isDirectory()||initial.isSymbolicLink()||realpathSync(root)!==root)fail('ordinary canonical evidence root required');
 const runtimeRoots=new Map();let next=0,last=null;
 function rootIdentity(path){const info=lstatSync(path,{bigint:true});if(!info.isDirectory()||info.isSymbolicLink()||realpathSync(path)!==path)fail('ordinary canonical retained runtime root required');return identity(info);}
 function registerRuntimeRoot(path){
  if(typeof path!=='string'||Buffer.byteLength(path)>LIMIT.pathBytes||resolve(path)!==path||!/^native-runtime-[a-f0-9-]{36}$/u.test(relative(root,path)))fail('exact private runtime root path required');
  const current=rootIdentity(path),prior=runtimeRoots.get(path);if(prior!==undefined&&prior!==current)fail('registered runtime root replaced');if(prior===undefined){if(runtimeRoots.size>=16)fail('closed runtime root census bound');runtimeRoots.set(path,current);}
  return Object.freeze({path,identity:current,semanticAuthority:false,cleanupAllowed:false});
 }
 if(options!==undefined){
  if(!options||types.isProxy(options)||Object.getPrototypeOf(options)!==Object.prototype||Reflect.ownKeys(options).length!==1)fail('exact ordinary runtime options required');
  const field=Object.getOwnPropertyDescriptor(options,'runtimeRoots');if(!field||!field.enumerable||!Object.hasOwn(field,'value')||types.isProxy(field.value)||!Array.isArray(field.value)||field.value.length>16||Reflect.ownKeys(field.value).length!==field.value.length+1)fail('dense own runtime root DATA required');
  for(let at=0;at<field.value.length;at++){const entry=Object.getOwnPropertyDescriptor(field.value,String(at));if(!entry||!entry.enumerable||!Object.hasOwn(entry,'value'))fail('own runtime roots without accessors required');registerRuntimeRoot(entry.value);}
 }
 function rootsUnchanged(){if(identity(lstatSync(root,{bigint:true}))!==identity(initial))fail('evidence root replaced');for(const [path,prior]of runtimeRoots)if(rootIdentity(path)!==prior)fail('registered runtime root replaced');}
 function runtimeOwner(path){return [...runtimeRoots.keys()].find(parent=>inside(parent,path));}
 function tick(force=false){
  const now=performance.now();if(now-startedAt>LIMIT.deadlineMs)fail('whole native deadline exceeded');if(!force&&now<next)return undefined;rootsUnchanged();
  const free=statfsSync(root,{bigint:true}),observation=inspectNativeOracleResourceObservation({elapsedMs:now-startedAt,freeBytes:free.bavail*free.bsize,evidenceBytes:0,rawBytes:0,sampledRssBytes:null});if(!observation.withinLimits)fail(observation.reasons.join('; '));
  let files=0,directories=0,queued=1,logical=0n,allocated=0n,sampledRuntimeChanged=false;
  function vanished(path,error){if(error?.code!=='ENOENT'||!runtimeOwner(path))return false;rootsUnchanged();sampledRuntimeChanged=true;return true;}
  function current(path){try{return lstatSync(path,{bigint:true});}catch(error){if(vanished(path,error))return null;throw error;}}
  function bound(){if(files>LIMIT.sourcePaths+512||logical>BigInt(LIMIT.evidenceBytes)||allocated>BigInt(LIMIT.evidenceBytes))fail('complete observed evidence bound exceeded');}
  const stack=[{path:root,depth:0}];
  while(stack.length){
   const row=stack.pop();if(row.depth>128||++directories>LIMIT.sourcePaths+512)fail('complete evidence directory bound');if(performance.now()-startedAt>LIMIT.deadlineMs)fail('evidence census deadline exceeded');
   const before=current(row.path);if(before===null)continue;if(!before.isDirectory()||before.isSymbolicLink())fail('aliased evidence directory');if(typeof before.blocks==='bigint')allocated+=before.blocks*512n;bound();
   let directory;try{directory=opendirSync(row.path);}catch(error){if(vanished(row.path,error))continue;throw error;}
   let failed=false;try{
    for(let entry;(entry=directory.readSync())!==null;){
     const path=join(row.path,entry.name);if(Buffer.byteLength(path)>LIMIT.pathBytes)fail('evidence path bound');const info=current(path);if(info===null)continue;
     if(info.isSymbolicLink()){
      const runtime=runtimeOwner(path);if(!runtime)fail('unknown source/evidence symlink retained');files++;allocated+=typeof info.blocks==='bigint'?info.blocks*512n:info.size;bound();let link;
      try{link=readlinkSync(path);}catch(error){if(vanished(path,error))continue;throw error;}
      if(Buffer.byteLength(link)>LIMIT.pathBytes)fail('retained link text bound');logical+=BigInt(Buffer.byteLength(link));bound();
      // Never resolve/traverse an evidence link. Runtime link bytes are retained
      // as observations; they do not become source, ownership or cleanup proof.
      if(!inside(runtime,resolve(dirname(path),link)))fail('runtime link text escaped its registered root');continue;
     }
     if(info.isDirectory()){if(++queued>LIMIT.sourcePaths+512)fail('queued evidence directory bound');stack.push({path,depth:row.depth+1});}
     else if(info.isFile()){files++;logical+=info.size;allocated+=typeof info.blocks==='bigint'?info.blocks*512n:info.size;bound();}
     else fail('unknown special evidence entry retained');
    }
    const after=current(row.path);if(after!==null&&identity(after)!==identity(before))fail('evidence directory replaced during sample');
   }catch(error){if(!vanished(row.path,error)){failed=true;throw error;}}
   finally{try{directory.closeSync();}catch(error){if(!failed)throw error;}}
  }
  rootsUnchanged();next=performance.now()+LIMIT.sampleMs;
  last=Object.freeze({files,directories,logicalBytes:String(logical),allocatedBytes:String(allocated),freeBytes:String(free.bavail*free.bsize),sampled:true,sampledRuntimeChanged,peakDiskProof:false,semanticAuthority:false});return undefined;
 }
 return Object.freeze({tick,inspect:()=>last,registerRuntimeRoot});
}
