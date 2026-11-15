import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {transportConcreteSourcePhases as original} from '../concrete-phased-equations.mjs';
import {transportConcreteSourcePhases as sequential} from '../concrete-sequential-equations.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const good=()=>({before:'// Ω😀\r\nfn value()->u8{1}',middle:'// Ω😀\r\nfn value()->u8{2}',after:'// Ω😀\r\nfn answer()->u8{2}',language:'Rust'});

test('default-rule equations retain complete original documents inverses traces and authority boundaries',{timeout:60000},()=>{
 const input=[good(),{before:'\ufeffexport const x=1;',middle:'\ufeffexport const x=2;',after:'\ufeffexport const y=2;',language:'JavaScript'},
  {before:'export const x:number=1;',middle:'export const x:number=2;',after:'export const y:number=2;',language:'TypeScript'},
  {before:'',middle:'// empty input\r\n',after:'// empty input\r\n',language:'Rust'}];
 const expected=original(input),actual=sequential(input);assert.deepEqual(actual,expected);
 for(const equation of actual){
  assert.equal(equation.inverse,equation.before);
  for(const stage of equation.stages){
   assert.equal(stage.inverse,stage.before);
   const received=transportConcreteSyntaxMeta(stage.afterMeta);
   assert.equal(received.source,stage.after);
   assert.deepEqual(received.document.authority,{type:false,owner:false,executable:false});
  }
 }
 const frozen=Object.freeze([Object.freeze(good())]);assert.deepEqual(sequential(frozen),original(frozen));
});

test('malformed complete sources and unchanged source and row bounds retain original refusals',{timeout:60000},()=>{
 for(const field of ['before','middle','after']){
  const input=[{...good(),[field]:'fn unfinished(){"unterminated'}];
  const result=sequential(input);assert.deepEqual(result,original(input));
  const received=transportConcreteSyntaxMeta(result[0][field==='before'?'beforeMeta':field==='middle'?'middleMeta':'afterMeta']);
  assert.equal(received.source,input[0][field]);assert.ok(['opaque','error'].includes(received.document.status));
  assert.equal(received.document.diagnostics.length,1);
  assert.deepEqual(received.document.authority,{type:false,owner:false,executable:false});
 }
 for(const input of [[{...good(),before:'x'.repeat(2097153)}],Array.from({length:86},good),[]]){
  assert.throws(()=>original(input),TypeError);assert.throws(()=>sequential(input),TypeError);
 }
 assert.deepEqual(sequential([good()]),original([good()]));
});

test('caller accessors proxies sparse arrays and incomplete or extra fields refuse without invocation',{timeout:60000},()=>{
 let calls=0;
 const getter=good();Object.defineProperty(getter,'before',{enumerable:true,get(){calls++;throw Error('getter');}});
 const proxy=new Proxy(good(),{get(){calls++;throw Error('proxy');},ownKeys(){calls++;throw Error('keys');}});
 const arrayProxy=new Proxy([good()],{get(){calls++;throw Error('array proxy');},ownKeys(){calls++;throw Error('array keys');}});
 const hidden=good();Object.defineProperty(hidden,'before',{enumerable:false});
 for(const input of [[getter],[proxy],arrayProxy,new Array(1),[hidden],[{...good(),rules:[]}],[{middle:'',after:'',language:'Rust'}],Object.assign([good()],{extra:1})]){
  assert.throws(()=>sequential(input),TypeError);
 }
 assert.equal(calls,0);
});

test('original caller descriptors remain fresh through native reads and source corruption refuses',{timeout:60000},()=>{
 const read=Object.getOwnPropertyDescriptor(fs,'readSync');
 for(const change of ['source','descriptor','array','bytes']){
  const row=good(),input=[row];let reads=0;
  try{
   Object.defineProperty(fs,'readSync',{...read,value:function(...args){
    const count=Reflect.apply(read.value,this,args);
    if(count>0&&reads++===0){
     if(change==='source')row.before+='// late mutation';
     else if(change==='descriptor')Object.defineProperty(row,'middle',{writable:false});
     else if(change==='array')input[0]=good();
     else args[1][args[2]]^=1;
    }
    return count;
   }});syncBuiltinESMExports();
   assert.throws(()=>sequential(input),change==='bytes'?TypeError:/input changed/);assert.ok(reads>0);
  }finally{Object.defineProperty(fs,'readSync',read);syncBuiltinESMExports();}
  assert.deepEqual(sequential([good()]),original([good()]));
 }
});
