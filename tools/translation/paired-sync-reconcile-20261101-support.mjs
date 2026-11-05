// Bounded invocation-local source DATA helpers. No compiler proof is issued.
import * as fs from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {types} from 'node:util';
import {readCurrentSourceProposalFile} from './unit-runtime-materialization.mjs';import {captureReadonlySourceProfile} from './ordered-text-map-callers-20261102-source-storage.mjs';
export const RECONCILE_LIMITS=Object.freeze({file:8*1024*1024,raw:64*1024*1024,wire:192*1024*1024,count:4096});
const L=RECONCILE_LIMITS;
export const requireReconcile=(condition,message)=>{if(!condition)throw new TypeError('Paired source reconciliation: '+message);};
const need=requireReconcile;
export const ordinal=(a,b)=>a<b?-1:a>b?1:0;
export function relativeReconcilePath(name){need(typeof name==='string'&&name.length>0&&name.length<=4096&&!name.startsWith('/')&&!/[\\:\0\r\n]/u.test(name)&&name.split('/').every(part=>part&&part!=='.'&&part!=='..'),'canonical relative path required');return name;}
export function reconcileHead(root){
 const empty=process.platform==='win32'?'NUL':'/dev/null',env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:empty,GIT_CONFIG_SYSTEM:empty,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 const head=execFileSync(process.platform==='win32'?'git':'/usr/bin/git',['-C',root,'rev-parse','HEAD'],{env,encoding:'utf8',timeout:30000,maxBuffer:4096}).trim();need(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(head),'full current Git commit required');return head;
}
const stamp=row=>[row.dev,row.ino,row.mode,row.size,row.mtimeMs,row.ctimeMs];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function createReconcileSourceCapture(requested){
 const initial=fs.lstatSync(resolve(requested));need(initial.isDirectory()&&!initial.isSymbolicLink(),'ordinary project root required');
 const root=fs.realpathSync(resolve(requested)),files=new Map(),directories=new Map(),storedFiles=new Map();let retained=0,failed=false;
 const charged=text=>{need(typeof text==='string'&&Buffer.byteLength(text)<=L.file,'bounded complete source required');retained+=Buffer.byteLength(text);need(retained<=L.raw,'whole retained raw source bound');return text;};
 const directory=name=>{
  let full=root;const pieces=name?relativeReconcilePath(name).split('/'):[];
  for(let at=0;at<=pieces.length;at++){
   if(at)full=resolve(full,pieces[at-1]);const row=fs.lstatSync(full);need(row.isDirectory()&&!row.isSymbolicLink(),'linked or non-directory source ancestor refused');
   const key=pieces.slice(0,at).join('/'),identity=stamp(row);if(directories.has(key))need(same(directories.get(key),identity),'source directory identity changed');else{need(directories.size<L.count,'directory identity count bound');directories.set(key,identity);}
  }
 };
 const fileStamp=name=>{
  relativeReconcilePath(name);const pieces=name.split('/').slice(0,-1);let missing=false;
  for(let at=0;at<=pieces.length;at++){try{directory(pieces.slice(0,at).join('/'));}catch(error){if(error.code==='ENOENT'){missing=true;break;}throw error;}}
  if(missing)return null;let row;try{row=fs.lstatSync(resolve(root,name));}catch(error){if(error.code==='ENOENT')return null;throw error;}
  need(row.isFile()&&!row.isSymbolicLink()&&row.size<=L.file,'ordinary bounded source file required');need([0o644,0o755].includes(row.mode&0o777),'ordinary source mode required');return stamp(row);
 };
 const storedText=stored=>{const raw=stored.read(),source=raw.toString('utf8');need(Buffer.from(source).equals(raw)&&raw.length<=L.file,'complete bounded lossless UTF8 stored source required');return source;};
 const capture=name=>{
  try{
   relativeReconcilePath(name);if(files.has(name))return files.get(name);
   need(files.size<L.count,'whole captured file count bound');const stored=captureReadonlySourceProfile(resolve(root,name),{maximum:L.file,retainBytes:false});if(stored){need(['100644','100755'].includes(stored.mode),'actual original logical Git source mode required');const source=charged(storedText(stored)),row={path:name,source,mode:stored.mode==='100755'?0o755:0o644};stored.requireCurrent();storedFiles.set(name,stored);files.set(name,row);return row;}const before=fileStamp(name),source=readCurrentSourceProposalFile(root,name),after=fileStamp(name);need(same(before,after),'source identity changed during capture');
   if(source!==null)charged(source);const row={path:name,source,mode:after===null?null:after[2]&0o777,identity:after};files.set(name,row);return row;
  }catch(error){failed=true;throw error;}
 };
 const census=prefix=>{
  const names=[],listing=[];let count=0;
  const visit=name=>{
   directory(name);const handle=fs.opendirSync(resolve(root,name)),entries=[];
   try{for(;;){const entry=handle.readSync();if(entry===null)break;need(++count<=L.count,'whole source census count bound');entries.push(entry);}}finally{handle.closeSync();}
   entries.sort((a,b)=>ordinal(a.name,b.name));listing.push({path:name,names:entries.map(row=>row.name)});
   for(const entry of entries){need(!entry.isSymbolicLink(),'linked source tree entry refused');const child=relativeReconcilePath(name+'/'+entry.name);if(entry.isDirectory())visit(child);else{need(entry.isFile(),'special source tree entry refused');if(child.endsWith('.rs')){capture(child);names.push(child);}}}
  };
  try{visit(relativeReconcilePath(prefix));return {names:names.sort(ordinal),listing};}catch(error){failed=true;throw error;}
 };
 directory('');
 return {root,capture,census,charge:charged,get retained(){return retained;},
  inputs(){return [...files.values()].map(({path,source})=>({path,source})).sort((a,b)=>ordinal(a.path,b.path));},
  close(tree){
   const errors=[];
   for(const [name,row]of files)try{const stored=storedFiles.get(name);if(stored){need(storedText(stored)===row.source&&(stored.mode==='100755'?0o755:0o644)===row.mode,'complete retained logical source changed during closing: '+name);stored.requireCurrent();}else need(readCurrentSourceProposalFile(root,name)===row.source&&same(fileStamp(name),row.identity),'complete source changed during closing: '+name);}catch(error){errors.push(error);}
   // Evaluate every directory identity independently, preserving failures even
   // when a preceding parent or source cannot be read.
   for(const [name,identity]of directories)try{const stat=fs.lstatSync(name?resolve(root,name):root);need(stat.isDirectory()&&!stat.isSymbolicLink()&&same(stamp(stat),identity),'directory identity changed during closing: '+name);}catch(error){errors.push(error);}
   if(tree)for(const row of tree.listing)try{
    directory(row.path);const handle=fs.opendirSync(resolve(root,row.path)),names=[];
    try{for(;;){const entry=handle.readSync();if(entry===null)break;need(names.length<L.count,'closing source census count bound');names.push(entry.name);}}finally{handle.closeSync();}
    need(same(names.sort(ordinal),row.names),'complete source directory census changed');
   }catch(error){errors.push(error);}
   if(failed)errors.push(new TypeError('Paired source reconciliation: a source capture failure invalidated this operation'));
   if(errors.length)throw new AggregateError(errors,'Paired source reconciliation closing failures');
  },
 };
}

// Count every JSON occurrence, including repeated DAG nodes and full CST/meta,
// without allocating a complete proposal string. This is a wire bound, not a
// semantic validator. Original compiler checks remain mandatory.
export function boundedReconcileWireBytes(value){
 let bytes=0;const active=new Set(),add=count=>{bytes+=count;need(bytes<=L.wire,'complete serialized proposal bound');};
 const quote=text=>{add(2);for(let at=0;at<text.length;at++){const code=text.charCodeAt(at);if(code===34||code===92)add(2);else if(code<32)add([8,9,10,12,13].includes(code)?2:6);else if(code>=0xd800&&code<=0xdbff){const next=text.charCodeAt(at+1);if(next>=0xdc00&&next<=0xdfff){add(4);at++;}else add(6);}else if(code>=0xdc00&&code<=0xdfff)add(6);else add(code<128?1:code<2048?2:3);}};
 const visit=item=>{
  if(item===null){add(4);return;}if(typeof item==='string'){quote(item);return;}if(typeof item==='boolean'){add(item?4:5);return;}if(typeof item==='number'){need(Number.isFinite(item),'finite proposal number required');add(String(item).length);return;}
  need(item!==null&&typeof item==='object'&&!types.isProxy(item)&&!active.has(item),'acyclic ordinary proposal DATA required');need(Array.isArray(item)||[null,Object.prototype].includes(Object.getPrototypeOf(item)),'ordinary proposal object required');active.add(item);
  if(Array.isArray(item)){add(2);for(let at=0;at<item.length;at++){if(at)add(1);const field=Object.getOwnPropertyDescriptor(item,String(at));need(field&&Object.hasOwn(field,'value'),'dense own proposal array required');visit(field.value===undefined?null:field.value);}}
  else{add(2);let count=0;for(const key of Object.keys(item)){const field=Object.getOwnPropertyDescriptor(item,key);need(field&&Object.hasOwn(field,'value'),'own proposal DATA required');if(field.value===undefined)continue;if(count++)add(1);quote(key);add(1);visit(field.value);}}
  active.delete(item);
 };
 visit(value);return bytes;
}
