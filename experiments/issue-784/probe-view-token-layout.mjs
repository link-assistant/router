// Finite allocation hypothesis probe, not compiler or observer qualification.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const hash=value=>createHash('sha256').update(value).digest('hex');
const variant=process.argv[2];
assert.ok(['original','literal','guarded'].includes(variant));
assert.equal(typeof globalThis.gc,'function','run with --expose-gc');
const root=resolve('.'),modulePath=join(root,'tools/translation/source-module-views.mjs');
const original=readFileSync(join(root,'tools/translation/source-profiles/module-token-layout/original-source.mjs.txt'),'utf8');
assert.equal(hash(original),'7102dd98986e9ad3965ebfc51ab339079f50da2df6ce35fdb3548859b653ae3e');
const before='({...token,start:token.start+span.start,end:token.end+span.start})';
const after='({type:token.type,text:token.text,start:token.start+span.start,end:token.end+span.start})';
assert.equal(original.split(before).length,2,'exactly one experimental source span');
let experimental=variant==='literal'?original.replace(before,after):original;
for(const name of ['rust-structure.mjs','cfg-profile.mjs']){
 const literal="'./"+name+"'";
 assert.equal(experimental.split(literal).length,2);
 experimental=experimental.replace(literal,JSON.stringify(pathToFileURL(join(root,'tools/translation',name)).href));
}
const api=await import(variant==='guarded'?pathToFileURL(modulePath).href:
 'data:text/javascript;base64,'+Buffer.from(experimental).toString('base64'));
function files(directory){
 return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const path=join(directory,entry.name);
  return entry.isDirectory()?files(path):entry.isFile()&&path.endsWith('.rs')?[path]:[];
 });
}
const selected=files('rust/src').map(path=>({path,bytes:statSync(path).size}))
 .sort((a,b)=>b.bytes-a.bytes||a.path.localeCompare(b.path)).slice(0,8);
assert.equal(selected.length,8);
assert.ok(selected.reduce((sum,row)=>sum+row.bytes,0)<=1_000_000);
globalThis.gc();globalThis.gc();
const initial=process.memoryUsage(),started=performance.now(),retained=[],rows=[];
let tokens=0;
for(const input of selected){
 const source=readFileSync(input.path,'utf8');
 const captured=api.captureSourceModuleViews({source,sourcePath:input.path});
 const evidence=captured.views.map(view=>{
  const items=api.originalModuleViewItems(view,source);
  for(const item of items)for(const token of item.tokens){
   tokens++;
   assert.equal(Object.getPrototypeOf(token),Object.prototype);
   assert.deepEqual(Reflect.ownKeys(token),['type','text','start','end']);
   assert.ok(Object.isFrozen(token));
   for(const key of Reflect.ownKeys(token)){
    const field=Object.getOwnPropertyDescriptor(token,key);
    assert.ok(Object.hasOwn(field,'value')&&field.enumerable&&!field.configurable&&!field.writable);
   }
  }
  return {view,items};
 });
 assert.ok(tokens<=500_000,'finite diagnostic token bound');
 rows.push({...input,sourceSha256:hash(source),views:captured.views.length,
  resultSha256:hash(JSON.stringify({captured,evidence}))});
 retained.push(captured);
}
globalThis.gc();globalThis.gc();
const final=process.memoryUsage();
process.stdout.write(JSON.stringify({variant,node:process.version,moduleSha256:hash(original),
 currentModuleSha256:hash(readFileSync(modulePath)),
 experimentalSha256:hash(experimental),files:rows,tokens,retainedGraphs:retained.length,
 elapsedMilliseconds:performance.now()-started,initial,final,
 retainedHeapDelta:final.heapUsed-initial.heapUsed,
 scope:'Eight largest current rust/src files, native ordinary intrinsics, separate process and 256 MiB diagnostic heap. Heap delta after explicit GC is not a retained-root proof, observer equivalence, full corpus generation or gate qualification.'})+'\n');
