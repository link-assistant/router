// Invocation-local source-parent DATA ledger. No producer/semantic authority.
// Original private plans retain this closure; public metadata cannot advance it.
// Node path operations require the documented cooperating/exclusive writer
// boundary. This does not supply atomic conditional rename/unlink or crash
// recovery, and cannot exclude an adversary racing inside a permitted operation.
import fs from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {checkBoundedSourcePath} from './forward-output-ownership-20261101-bounded-bytes.mjs';
const need=(yes,message)=>{if(!yes)throw new TypeError('Forward original source directories: '+message);};
const same=(a,b)=>a===b||Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,index)=>same(value,b[index]));
const stamp=stat=>[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs].map(value=>value.toString());
function snapshot(file){
 const before=fs.lstatSync(file,{bigint:true});need(before.isDirectory()&&!before.isSymbolicLink(),'ordinary source ancestor required');checkBoundedSourcePath(file);
 const names=fs.readdirSync(file).sort(),after=fs.lstatSync(file,{bigint:true});
 need(same(stamp(before),stamp(after)),'source directory changed during full census');return {identity:stamp(before),names};
}
function closing(operation,checks){
 let value,primary,failed=false;const secondary=[];try{value=operation();}catch(error){failed=true;primary=error;}
 for(const check of checks)try{check();}catch(error){if(!failed){failed=true;primary=error;}else secondary.push(error);}
 if(failed){if(primary&&typeof primary==='object')try{Object.defineProperty(primary,'forwardDirectoryClosingFailures',{value:secondary,enumerable:true});}catch{}throw primary;}return value;
}
export function createForwardSourceDirectoryLedger(){
 const rows=new Map();let released=false,mutating=false;
 const observe=parents=>{
  need(!released&&!mutating,'live readonly source-parent capture required');
  for(const parent of parents){
   // Absent ancestors belong to sparse immutable source reads. Their original
   // absence is checked by the bounded reader, never enrolled as a new output.
   if(parent.identity===null)continue;
   const file=resolve(parent.path),row=rows.get(file);
   if(row){
    // The complete census is retained once per actual directory. Fresh full
    // time/identity checks guard each additional reference; verify() rereads
    // the whole census. Do not copy/read a20k-child census20k times.
    const current=fs.lstatSync(file,{bigint:true});checkBoundedSourcePath(file);
    need(same(row.identity,parent.identity)&&same(row.identity,stamp(current)),'original source-parent identity/time changed');row.references.add(parent);
   }else{
    const now=snapshot(file);need(same(now.identity,parent.identity),'original delegated source ancestor changed');rows.set(file,{...now,references:new Set([parent])});
   }
  }
 };
 const verify=()=>{need(!released&&!mutating,'live complete source-parent ledger required');for(const [file,row]of rows){const now=snapshot(file);need(same(now.identity,row.identity)&&same(now.names,row.names),'unregistered original source-parent transition: '+file);}};
 const mutate=(targets,operation)=>{
  need(!released&&!mutating&&Array.isArray(targets)&&typeof operation==='function','one synchronous exact output mutation required');
  const allowed=new Map();for(const target of targets){need(typeof target==='string'&&resolve(target)===target,'absolute actual output target required');const file=dirname(target);if(!rows.has(file))continue;let names=allowed.get(file);if(!names)allowed.set(file,names=new Set());names.add(basename(target));}
  // Only source-parent directories actually touched by this exact operation
  // may advance. Every other directory retains its original complete stamp.
  for(const [file]of allowed){const row=rows.get(file),now=snapshot(file);need(same(now.identity,row.identity)&&same(now.names,row.names),'source-parent changed before own output mutation');}
  mutating=true;return closing(operation,[...allowed].map(([file,names])=>()=>{
   const row=rows.get(file),now=snapshot(file);
   need(same(now.identity.slice(0,3),row.identity.slice(0,3)),'source-parent identity/mode replaced during own output mutation');
   need(same(row.names.filter(name=>!names.has(name)),now.names.filter(name=>!names.has(name))),'unrelated source-parent members changed during own output mutation');
   row.identity=now.identity;row.names=now.names;for(const reference of row.references)reference.identity=[...now.identity];
  }).concat(()=>{mutating=false;}));
 };
 return Object.freeze({observe,verify,mutate,release(){released=true;rows.clear();}});
}
