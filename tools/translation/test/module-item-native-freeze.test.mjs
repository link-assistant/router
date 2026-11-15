import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as current from '../source-module-views.mjs';
const fixture=new URL('../source-profiles/module-token-layout/original-source.mjs.txt',import.meta.url);
let source=readFileSync(fixture,'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'),'7102dd98986e9ad3965ebfc51ab339079f50da2df6ce35fdb3548859b653ae3e');
for(const name of ['rust-structure.mjs','cfg-profile.mjs'])source=source.replace("'./"+name+"'",JSON.stringify(new URL('../'+name,import.meta.url).href));
const original=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function observed(api,kind){
 const input='mod child {pub const VALUE:u8=7;}',events=[];
 const prototype=Object.getPrototypeOf(createHash('sha256'));
 const update=Object.getOwnPropertyDescriptor(prototype,'update'),freeze=Object.freeze,values=Object.values;
 const token=value=>value&&typeof value==='object'&&Object.hasOwn(value,'type')&&Object.hasOwn(value,'text')&&Object.hasOwn(value,'start')&&Object.hasOwn(value,'end');
 let installed=false;
 try{
  Object.defineProperty(prototype,'update',{...update,value:function(value,...rest){
   if(!installed&&typeof value==='string'&&value.includes('"schema":"original-source-module-view-v1"')){
    installed=true;events.push('late-'+kind);
    if(kind==='values')Object.values=function(value){if(token(value))events.push('values:'+value.text);return values(value);};
    else Object.freeze=function(value){
     if(token(value)){events.push('freeze:'+value.text);if(kind==='restored-freeze')Object.freeze=freeze;}
     return freeze(value);
    };
   }
   return Reflect.apply(update.value,this,[value,...rest]);
  }});
  const result=api.captureSourceModuleViews({source:input,sourcePath:'src/lib.rs'});
  return {result,items:result.views.map(view=>api.originalModuleViewItems(view,input)),events};
 }finally{Object.defineProperty(prototype,'update',update);Object.freeze=freeze;Object.values=values;}
}
test('late hash observers retain original token freezing and values observations',()=>{
 for(const kind of ['freeze','values','restored-freeze']){
  const before=observed(original,kind),after=observed(current,kind);
  assert.ok(before.events.some(value=>value.startsWith(kind==='values'?'values:':'freeze:')),kind+' actually observed original tokens');
  assert.deepEqual(after,before,kind+' complete original values, private items and observation order');
 }
});
