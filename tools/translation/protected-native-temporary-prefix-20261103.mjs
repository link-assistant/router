// Per-policy namespace observations only. No public fresh flag or source permit.
import fs from 'node:fs';
import {resolve,parse,join,dirname,basename,isAbsolute,sep} from 'node:path';
import {types} from 'node:util';
import {retainProtectedSourceDiagnostic} from './protected-source-diagnostics-20261103.mjs';
const LIMITS=Object.freeze({paths:8193,nodes:32768,steps:262144,bytes:16777216,hops:256,addressBytes:131072});
const fail=message=>{throw TypeError('Native temporary-directory prefix: '+message);};
const equal=(a,b)=>a.length===b.length&&a.every((value,at)=>value===b[at]);
const inode=stat=>String(stat.dev)+':'+String(stat.ino);
const stamp=stat=>(stat.isDirectory()?[stat.dev,stat.ino,stat.mode,stat.uid,stat.gid]:[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs,stat.nlink,stat.uid,stat.gid]).map(String);
function code(error){if(error===null||!['object','function'].includes(typeof error)||types.isProxy(error))return undefined;const field=Object.getOwnPropertyDescriptor(error,'code');return field&&Object.hasOwn(field,'value')?field.value:undefined;}
const parts=text=>process.platform==='win32'?text.split(/[\\/]/u):text.split('/');
function paths(value){
 if(!Array.isArray(value)||types.isProxy(value)||value.length>LIMITS.paths)fail('bounded own protected names required');const fields=Object.getOwnPropertyDescriptors(value);if(Reflect.ownKeys(fields).length!==value.length+1)fail('dense own protected names required');const rows=[];
 for(let at=0;at<value.length;at++){const field=fields[at];if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='string'||!field.value||field.value.startsWith('/')||/[\x00-\x1f\x7f\\]/u.test(field.value)||field.value.split('/').some(part=>!part||part==='.'||part==='..'))fail('ordinary primitive relative protected name required');rows.push(field.value);}return [...new Set(rows)];
}
function mayGenerate(stem,name){
 // Conservative native namespace profile, never an assumption of case
 // sensitivity. Unknown Unicode/short-name/device-stream namespaces refuse.
 if(/[^\x20-\x7e]|[\\/:*?"<>|~]/u.test(stem+name))fail('ambiguous generated-name namespace requires separate native proof');
 const target=name.replace(/[. ]+$/u,'').toLowerCase(),prefix=stem.toLowerCase();if(!target)fail('ambiguous empty native name alias');return target.startsWith(prefix)&&target.length>=prefix.length+6;
}
/** Holds actual prefix-parent, symlink, negative endpoint and ancestor epochs
 * across ONE fixed native mkdtempSync call. There is no creation callback. */
export function captureProtectedNativeTemporaryPrefix({root,protectedNames,prefix,maximumRetainedBytes=LIMITS.bytes}={}){
 if(typeof root!=='string'||typeof prefix!=='string'||!isAbsolute(prefix)||resolve(prefix)!==prefix||prefix.length>LIMITS.addressBytes||Buffer.byteLength(prefix)>LIMITS.addressBytes||!Number.isSafeInteger(maximumRetainedBytes)||maximumRetainedBytes<0||maximumRetainedBytes>LIMITS.bytes)fail('bounded normalized primitive prefix and resource profile required');
 if(Buffer.from(prefix,'utf8').toString('utf8')!==prefix||prefix.includes('\0'))fail('lossless native prefix text required');root=fs.realpathSync(resolve(root));const names=paths(protectedNames),snapshots=new Map(),parentInodes=new Set();let retained=0,steps=0,live=true;
 const charge=bytes=>{if(retained+bytes>maximumRetainedBytes)fail('aggregate retained temporary-prefix metadata bound');retained+=bytes;};
 const step=()=>{if(++steps>LIMITS.steps)fail('temporary-prefix namespace work bound');};
 function lookup(path){
  if(snapshots.has(path))return snapshots.get(path);if(snapshots.size>=LIMITS.nodes)fail('temporary-prefix metadata node bound');step();let stat,missing=null;try{stat=fs.lstatSync(path,{bigint:true});}catch(error){missing=code(error);if(!['ENOENT','ENOTDIR'].includes(missing))throw error;}
  const row={path,stat,missing,signature:stat?stamp(stat):null,link:null};charge(Buffer.byteLength(path)+128+(row.signature?row.signature.reduce((sum,value)=>sum+Buffer.byteLength(value),0):0));snapshots.set(path,row);
  if(stat?.isSymbolicLink()){step();row.link=fs.readlinkSync(path,{encoding:'buffer'});if(!Buffer.isBuffer(row.link)||!Buffer.from(row.link.toString('utf8')).equals(row.link))fail('original lossless symlink bytes required');charge(row.link.length);step();if(!equal(stamp(fs.lstatSync(path,{bigint:true})),row.signature))fail('actual symlink changed during capture');}return row;
 }
 function endpoint(full,ancestors=null){
  full=resolve(full);let current=parse(full).root,pending=parts(full.slice(current.length)).filter(Boolean),hops=0;lookup(current);
  while(pending.length){step();const part=pending.shift();if(part==='.')continue;if(part==='..'){current=dirname(current);continue;}const parent=lookup(current);if(ancestors&&parent.stat?.isDirectory())ancestors.add(inode(parent.stat));const next=join(current,part),row=lookup(next);
   if(row.missing){const tail=[part,...pending].filter(value=>value!=='.');if(tail.includes('..'))fail('unknown missing-parent dot namespace');return {path:join(current,...tail),stat:null,missing:{parent:parent.stat?.isDirectory()?inode(parent.stat):null,tail}};}
   if(row.stat.isSymbolicLink()){if(++hops>LIMITS.hops)fail('temporary-prefix symlink hop/cycle bound');const target=row.link.toString('utf8');if(!target)fail('empty symlink target');if(isAbsolute(target)){current=parse(target).root;pending=[...parts(target.slice(current.length)).filter(Boolean),...pending];lookup(current);}else pending=[...parts(target).filter(Boolean),...pending];}else current=next;
  }const row=lookup(current);if(ancestors&&row.stat?.isDirectory())ancestors.add(inode(row.stat));return {path:current,stat:row.stat??null,missing:null};
 }
 const verifyRows=()=>{
  let failed=false,primary;const check=run=>{try{run();}catch(error){if(!failed){failed=true;primary=error;}else retainProtectedSourceDiagnostic('Native temporary prefix closing failure',{primary,secondary:error});}};
  for(const row of snapshots.values())check(()=>{let current,missing=null;try{current=fs.lstatSync(row.path,{bigint:true});}catch(error){missing=code(error);if(!['ENOENT','ENOTDIR'].includes(missing))throw error;}if(missing!==row.missing||current&&!equal(stamp(current),row.signature))fail('original prefix/negative endpoint/ancestor changed');if(row.link&&!fs.readlinkSync(row.path,{encoding:'buffer'}).equals(row.link))fail('original prefix symlink changed');});if(failed)throw primary;
 };
 let parent,stem,failed=false,primary;
 try{parent=endpoint(dirname(prefix),parentInodes);if(!parent.stat?.isDirectory())fail('genuine existing native prefix parent required');stem=basename(prefix).replace(/X+$/u,'');
  for(const name of names){const value=endpoint(resolve(root,name));if(value.stat?.isDirectory()&&parentInodes.has(inode(value.stat)))fail('native temporary directory would mutate a protected directory namespace');if(value.missing?.parent===inode(parent.stat)&&mayGenerate(stem,value.missing.tail[0]))fail('native generated prefix could create a protected missing endpoint or ancestor');}
  verifyRows();
 }catch(error){failed=true;primary=error;}
 if(failed){try{verifyRows();}catch(error){retainProtectedSourceDiagnostic('Native temporary prefix capture closing failure',{primary,secondary:error});}snapshots.clear();parentInodes.clear();throw primary;}
 return Object.freeze({prefix,retainedBytes:retained,sourceAuthority:false,semanticAuthority:false,
  close(created=null){
   if(!live)fail('temporary-prefix observation expired');let failed=false,primary;const check=run=>{try{run();}catch(error){if(!failed){failed=true;primary=error;}else retainProtectedSourceDiagnostic('Native temporary prefix result closing failure',{primary,secondary:error});}};
   try{check(verifyRows);if(created!==null)check(()=>{if(typeof created!=='string'||!isAbsolute(created)||resolve(created)!==created||!basename(created).startsWith(stem))fail('actual native generated directory result differs');const directory=fs.realpathSync(dirname(created)),parentNow=fs.lstatSync(directory,{bigint:true}),entry=fs.lstatSync(created,{bigint:true});if(!parentNow.isDirectory()||inode(parentNow)!==inode(parent.stat)||!entry.isDirectory()||entry.isSymbolicLink())fail('genuine native generated parent/entry identity required');});if(failed)throw primary;}
   finally{live=false;snapshots.clear();parentInodes.clear();}
  },
 });
}
