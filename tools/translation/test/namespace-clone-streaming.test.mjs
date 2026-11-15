import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {sourceItems} from '../rust-structure.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';

const directory=mkdtempSync(join(tmpdir(),'router-namespace-streaming-test-'));
after(()=>rmSync(directory,{recursive:true,force:true}));
const origin=new URL('../source-scopes.mjs',import.meta.url);
const fixture=new URL('./fixtures/namespace-clone-streaming/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8'));
const row=manifest.sources.find(row=>row.path==='tools/translation/source-scopes.mjs');
assert.ok(row);const stored=readFileSync(new URL(row.storedPath,fixture));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(stored.length,row.storedBytes);assert.equal(hash(stored),row.storedSha256);
const bytes=gunzipSync(stored);assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);
assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),row.gitBlobSha1);
const original=bytes.toString('utf8'),current=readFileSync(origin,'utf8');
let next=0;
async function load(source){
 const edits=[];
 const relocated=source.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/gu,(whole,quote,path)=>{
  const replacement='from '+quote+new URL(path,origin).href+quote;
  edits.push({before:whole,after:replacement});return replacement;
 });
 let inverse=relocated;
 for(const edit of [...edits].reverse()){
  assert.equal(inverse.split(edit.after).length,2);inverse=inverse.replace(edit.after,()=>edit.before);
 }
 assert.equal(inverse,source);
 const path=join(directory,'complete-'+next+++'.mjs');writeFileSync(path,relocated,{flag:'wx'});
 return import(pathToFileURL(path));
}
const modules=[{file:'src/lib.rs',path:[],source:'mod a;mod b;pub struct Root;'},
 {file:'src/a.rs',path:['a'],source:'pub struct Shared;struct Private;pub fn value()->u8{1}'},
 {file:'src/b.rs',path:['b'],source:'use crate::a::Shared as Alias;pub struct Local;'}]
 .map(row=>({...row,items:sourceItems(row.source)}));
const inspect=value=>typeof value==='function'?{function:Function.prototype.toString.call(value)}:
 value instanceof Map?{map:[...value].map(([name,item])=>[name,inspect(item)])}:
 value instanceof Set?{set:[...value]}:Array.isArray(value)?value.map(inspect):
 value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([name,item])=>[name,inspect(item)])):value;
const configure=(api,scopes,index)=>api.configureParserSourceScope(api.requestImmutableNamespaceTargets?.({})??{},
 scopes[index],scopes,scopes[index].path);

test('streamed immutable cloning retains every scope and independent native map for every consumer',{timeout:30000},async()=>{
 const old=await load(original),actual=await load(current),scopes=resolveModuleBindings({modules}).scopes;
 for(let index=0;index<scopes.length;index++){
  const expected=configure(old,scopes,index),first=configure(actual,scopes,index),second=configure(actual,scopes,index);
  assert.deepEqual(inspect(first),inspect(expected));
  for(const namespace of ['type','value','macro']){
   const maps=first.sourceNamespaceAliases[namespace],other=second.sourceNamespaceAliases[namespace];
   assert.equal(maps.size,scopes.length);assert.notEqual(maps,other);
   for(const [path,map]of maps){
    assert.notEqual(map,other.get(path));
    for(const [name,target]of map){assert.equal(Object.isFrozen(target),true);assert.strictEqual(target,other.get(path).get(name));}
    map.set('forged',['crate','forged']);assert.equal(other.get(path).has('forged'),false);
   }
  }
 }
});

test('observable collection construction keeps the full original callback tape after warm immutable setup',{timeout:30000},async()=>{
 const scopes=resolveModuleBindings({modules}).scopes,apply=Reflect.apply,define=Object.defineProperty;
 for(const [owner,name]of [[Map.prototype,'set'],[Array.prototype,'map'],[Object,'fromEntries']]){
  const old=await load(original),actual=await load(current),field=Object.getOwnPropertyDescriptor(owner,name),observations=[];
  for(const api of [old,actual]){
   configure(api,scopes,0);const tape=[];let result;
   define(owner,name,{...field,value:function(...args){
    tape[tape.length]={receiver:this,args};return apply(field.value,this,args);
   }});
   try{result=configure(api,scopes,2);}finally{define(owner,name,field);}
   observations.push({result:inspect(result),tape:inspect(tape)});
  }
  assert.deepEqual(observations[1],observations[0],name);
 }
});
