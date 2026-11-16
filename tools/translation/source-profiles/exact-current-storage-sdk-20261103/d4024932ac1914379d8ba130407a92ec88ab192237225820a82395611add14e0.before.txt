// Physical source custody only. No compiler, type, owner or body verdict cache.
import {lstatSync,realpathSync} from 'node:fs';import {captureReadonlySourceProfile} from './ordered-text-map-callers-20261102-source-storage.mjs';
import {resolve,dirname,sep} from 'node:path';
import {readCompactSparsePhysicalFile,sameCompactPhysicalSourceStamp} from './compact-sparse-git-io-20261102.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=()=>{throw TypeError('Canonical map corpus original physical source changed');};
const stable=(a,b)=>['dev','ino','mode','uid','gid'].every(key=>a[key]===b[key]);
export function createOrderedMapCanonicalSourceCustody(root){
 const requested=resolve(root);root=realpathSync(requested);const files=new Map(),directories=new Map(),stored=new Map();let poisoned=false,primary,total=0;
 const actual=path=>{path=resolve(path);if(path!==requested&&!path.startsWith(requested+sep))fail();return resolve(root,path===requested?'':path.slice(requested.length+1));};
 const sameDirectory=(path,a,b)=>path===root||path.startsWith(root+sep)?sameCompactPhysicalSourceStamp(a,b):stable(a,b);
 const fileClose=row=>{const stat=lstatSync(row.path,{bigint:true});if(!stat.isFile()||stat.isSymbolicLink()||!sameCompactPhysicalSourceStamp(row.stat,stat))fail();};
 const directoryClose=row=>{const stat=lstatSync(row.path,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink()||!sameDirectory(row.path,row.stat,stat))fail();};
 const closeSelected=(selectedFiles,selectedDirectories)=>withCompleteSourceClosingFence(()=>null,[...selectedFiles.map(row=>()=>fileClose(row)),...selectedDirectories.map(row=>()=>directoryClose(row))]);
 const close=()=>{let failed=false,error;try{withCompleteSourceClosingFence(()=>closeSelected([...files.values()],[...directories.values()]),[...stored.values()].map(row=>row.requireCurrent));}catch(value){failed=true;error=value;}if(failed&&!poisoned){poisoned=true;primary=error;}if(poisoned)throw primary;};
 const protect=run=>{if(poisoned)throw primary;try{return run();}catch(error){if(!poisoned){poisoned=true;primary=error;}return withCompleteSourceClosingFence(()=>{throw primary;},[close]);}};
 const ancestors=(path,selected)=>{let parent=path,depth=0;for(;;){if(++depth>128)fail();const stat=lstatSync(parent,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink())fail();let row=directories.get(parent);if(row){if(!sameDirectory(parent,row.stat,stat))fail();}else{row={path:parent,stat};directories.set(parent,row);}selected.push(row);const next=dirname(parent);if(next===parent)break;parent=next;}};
 const directory=path=>protect(()=>{const selected=[];return withCompleteSourceClosingFence(()=>ancestors(actual(path),selected),[()=>closeSelected([],selected)]);});
 const readBytes=(path,maximum=33554432)=>protect(()=>{
  const selected=[];let row;return withCompleteSourceClosingFence(()=>{
   if(!Number.isSafeInteger(maximum)||maximum<0||maximum>33554432)fail();path=actual(path);if(!path.startsWith(root+sep))fail();const logical=captureReadonlySourceProfile(path,{maximum,retainBytes:false});if(logical){const old=stored.get(path);if(old){old.requireCurrent();if(old.sha256!==logical.sha256||old.byteLength!==logical.byteLength)fail();}else{if(files.size+stored.size>=32768||total+logical.byteLength>268435456)fail();total+=logical.byteLength;stored.set(path,logical);}return logical.read();}ancestors(dirname(path),selected);
   const stat=lstatSync(path,{bigint:true});if(!stat.isFile()||stat.isSymbolicLink()||stat.size>BigInt(maximum))fail();const old=files.get(path);if(old&&!sameCompactPhysicalSourceStamp(old.stat,stat))fail();
   if(!old&&(files.size+stored.size>=32768||total+Number(stat.size)>268435456))fail();row=old??{path,stat};const raw=readCompactSparsePhysicalFile(row);if(!old){total+=raw.length;files.set(path,row);}return raw;
  },[()=>closeSelected(row?[row]:[],selected)]);
 });
 const read=path=>protect(()=>{const raw=readBytes(path),source=raw.toString('utf8');if(!Buffer.from(source).equals(raw))fail();return source;});
 return Object.freeze({read,readBytes,directory,close});
}
