import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{readFileSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {prepareSequentialConcretePhases} from '../prepare-sequential-concrete-phases.mjs';
import {transportConcreteNamedSourcePhases as original} from '../concrete-named-phases.mjs';
import {transportConcreteNamedSourcePhases as sequential} from '../concrete-sequential-phases.mjs';
import {transportPrivateConcreteNamedPhases as originalPrivate} from '../private-parser-named-phases.mjs';
import {transportPrivateConcreteSequentialPhases as sequentialPrivate} from '../private-parser-sequential-phases.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const names=['language:original-rule','repository:original-rule','language:original-inverse','repository:original-inverse'];
const good=()=>({before:'// Ω😀\r\nfn value()->u8{1}',middle:'// Ω😀\r\nfn value()->u8{2}',after:'// Ω😀\r\nfn answer()->u8{2}',language:'Rust',rules:[...names]});

test('complete native producer retains the original transaction and both whole-source inverses',{timeout:60000},()=>{
 const plan=prepareSequentialConcretePhases();
 assert.equal(plan.originalNamedTransactionUnchanged,true);assert.equal(plan.originalBudgetsUnchanged,true);
 assert.equal(plan.newVerdictCache,false);assert.equal(plan.semanticAuthority,false);
 for(const row of plan.files){
  assert.equal(readFileSync(row.original,'utf8'),row.before);
  assert.equal(readFileSync(row.path,'utf8'),row.after);
  assert.equal(row.current,row.after);assert.equal(row.equation.inverse,row.before);
  assert.equal(transportConcreteSyntaxMeta(row.equation.beforeMeta).source,row.before);
  assert.equal(transportConcreteSyntaxMeta(row.equation.afterMeta).source,row.after);
  assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.equation.stages){assert.equal(stage.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}
  assert.ok(row.after.split('\n').length<1000);
 }
});

test('complete private and public results equal original canonical bytes documents counts traces and inverses',{timeout:60000},()=>{
 const input=[good(),{before:'\ufeff// Ω😀\r\nexport const x=1;',middle:'\ufeff// Ω😀\r\nexport const x=2;',after:'\ufeff// Ω😀\r\nexport const y=2;',language:'JavaScript',rules:[...names]},
  {before:'export const x:number=1;',middle:'export const x:number=2;',after:'export const y:number=2;',language:'TypeScript',rules:[...names]},
  {before:'',middle:'// identity\r\n',after:'// identity\r\n',language:'Rust',rules:[...names]}];
 assert.deepEqual(sequential(input),original(input));
 const rows=input.flatMap(row=>[row.before,row.middle,row.after].map(source=>({source,language:row.language}))),identifiers=input.map(row=>row.rules);
 const before=originalPrivate(rows,identifiers),after=sequentialPrivate(rows,identifiers);
 assert.deepEqual(after,before);
 for(const equation of after.equations)for(const stage of equation.stages){
  const received=transportConcreteSyntaxMeta(stage.afterMeta);
  assert.equal(received.source,stage.after);assert.equal(stage.inverse,stage.before);
  assert.deepEqual(received.document.authority,{type:false,owner:false,executable:false});
 }
});

test('malformed targets retain original opaque diagnostics and original row and byte budgets remain mandatory',{timeout:60000},()=>{
 for(const key of ['before','middle','after']){
  const input={...good(),[key]:'fn unfinished(){"unterminated'};
  const expected=original([input]),actual=sequential([input]);assert.deepEqual(actual,expected);
  const field=key==='before'?'beforeMeta':key==='middle'?'middleMeta':'afterMeta';
  const received=transportConcreteSyntaxMeta(actual[0][field]);
  assert.equal(received.source,input[key]);assert.ok(['opaque','error'].includes(received.document.status));
  assert.equal(received.document.diagnostics.length,1);assert.equal(received.document.nodes.length,2);
  assert.deepEqual(received.document.nodes[1].slice(2,4),[0,input[key].length]);
  assert.deepEqual(received.document.authority,{type:false,owner:false,executable:false});
 }
 const oversized={...good(),before:'x'.repeat(2097153)};
 for(const input of [[oversized],Array.from({length:86},good)]){
  let expected;try{original(input);}catch(error){expected=error;}assert.ok(expected instanceof TypeError);
  assert.throws(()=>sequential(input),error=>error instanceof TypeError&&error.message===expected.message);
 }
 assert.equal(sequential([good()])[0].after,good().after);
});

test('getter proxy sparse forged rule and live native method changes refuse without invocation',{timeout:60000},()=>{
 let calls=0;const getter=[...names];Object.defineProperty(getter,'0',{enumerable:true,get(){calls++;throw Error('getter');}});
 const proxy=new Proxy([...names],{get(){calls++;throw Error('proxy');},ownKeys(){calls++;throw Error('keys');}});
 for(const rules of [getter,proxy,new Array(4),Object.assign([...names],{extra:1}),names.slice(0,3)])assert.throws(()=>sequential([{...good(),rules}]),TypeError);
 assert.equal(calls,0);
 const method=Object.getOwnPropertyDescriptor(Array.prototype,'entries');
 try{Object.defineProperty(Array.prototype,'entries',{...method,value:function(){calls++;throw Error('changed entries');}});assert.throws(()=>sequential([good()]),TypeError);}finally{Object.defineProperty(Array.prototype,'entries',method);}
 assert.equal(calls,0);assert.equal(sequential([good()])[0].after,good().after);
});

test('native source callbacks cannot change caller rules or source bytes across the complete fresh join',{timeout:60000},()=>{
 const input=good(),read=Object.getOwnPropertyDescriptor(fs,'readSync');let reads=0;
 try{
  Object.defineProperty(fs,'readSync',{...read,value:function(...args){const count=Reflect.apply(read.value,this,args);if(count>0&&reads++===0)input.rules[0]='forged:late-rule';return count;}});syncBuiltinESMExports();
  assert.throws(()=>sequential([input]),/input changed/);assert.ok(reads>0);
 }finally{Object.defineProperty(fs,'readSync',read);syncBuiltinESMExports();input.rules[0]=names[0];}
 assert.equal(sequential([input])[0].after,input.after);reads=0;
 try{
  Object.defineProperty(fs,'readSync',{...read,value:function(...args){const count=Reflect.apply(read.value,this,args);if(count>0&&reads++===0)args[1][args[2]]^=1;return count;}});syncBuiltinESMExports();
  assert.throws(()=>sequential([input]),TypeError);assert.ok(reads>0);
 }finally{Object.defineProperty(fs,'readSync',read);syncBuiltinESMExports();}
 assert.equal(sequential([input])[0].after,input.after);
});
