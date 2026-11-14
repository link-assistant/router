import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{readFileSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {prepareSourceOriginConcretePhases} from '../prepare-source-origin-concrete-phases.mjs';
import {transportConcreteNamedSourcePhases as original} from '../concrete-sequential-phases.mjs';
import {transportConcreteNamedSourcePhases as sourceOrigin} from '../concrete-source-origin-phases.mjs';
import {transportConcreteSourcePhases as originalDefault} from '../concrete-sequential-equations.mjs';
import {transportConcreteSourcePhases as sourceOriginDefault} from '../concrete-source-origin-equations.mjs';
import {transportPrivateConcreteSequentialPhases as originalPrivate} from '../private-parser-sequential-phases.mjs';
import {transportPrivateConcreteSourceOriginPhases as sourceOriginPrivate} from '../private-parser-source-origin-phases.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const names=['language:original-rule','repository:original-rule','language:original-inverse','repository:original-inverse'];
const good=()=>({before:'// Ω😀\r\nfn value()->u8{1}',middle:'// Ω😀\r\nfn value()->u8{2}',after:'// Ω😀\r\nfn answer()->u8{2}',language:'Rust',rules:[...names]});

test('complete producer preserves all three original APIs and real source/CST inverses',{timeout:60000},()=>{
 const plan=prepareSourceOriginConcretePhases();
 assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.files.length,3);
 assert.equal(plan.originalPublicTransactionsUnchanged,true);assert.equal(plan.untrustedDocumentsAccepted,false);
 assert.equal(plan.freshBuildsPerSourceTransport,2);assert.equal(plan.originalSourceBudgetsUnchanged,true);assert.equal(plan.semanticAuthority,false);assert.equal(plan.runtimeParity,false);
 for(const row of plan.files){
  assert.equal(readFileSync(row.original,'utf8'),row.before);assert.equal(readFileSync(row.path,'utf8'),row.after);assert.equal(row.current,row.after);
  assert.equal(row.equation.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.equation.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.equation.afterMeta).source,row.after);
  assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.equation.stages){assert.equal(stage.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}
  assert.ok(row.after.split('\n').length<1000);
 }
});

test('whole source substitutions match complete original public and private documents counts traces and inverses',{timeout:60000},()=>{
 const input=[good(),{before:'\ufeff// Ω😀\r\nexport const x=1;',middle:'\ufeff// Ω😀\r\nexport const x=2;',after:'\ufeff// Ω😀\r\nexport const y=2;',language:'JavaScript',rules:[...names]},
  {before:'export const x:number=1;',middle:'export const x:number=2;',after:'export const y:number=2;',language:'TypeScript',rules:[...names]},
  {before:'',middle:'// identity\r\n',after:'// identity\r\n',language:'Rust',rules:[...names]},
  {before:'// \ud800\r\nconst a=/[{}]/;',middle:'// \ud800\r\nconst a=/[{}]/;',after:'// \udfff\r\nconst a=/[{}]/;',language:'JavaScript',rules:[...names]}];
 assert.deepEqual(sourceOrigin(input),original(input));
 const defaults=input.map(({before,middle,after,language})=>({before,middle,after,language}));
 assert.deepEqual(sourceOriginDefault(defaults),originalDefault(defaults));
 const rows=input.flatMap(row=>[row.before,row.middle,row.after].map(source=>({source,language:row.language}))),ids=input.map(row=>row.rules);
 assert.deepEqual(sourceOriginPrivate(rows,ids),originalPrivate(rows,ids));
 for(const equation of sourceOrigin(input))for(const stage of equation.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);const next=transportConcreteSyntaxMeta(stage.afterMeta);
  assert.equal(next.source,stage.after);assert.equal(stage.inverse,stage.before);assert.deepEqual(next.document.authority,{type:false,owner:false,executable:false});
 }
 const frozen=Object.freeze([Object.freeze({...good(),rules:Object.freeze([...names])})]);assert.deepEqual(sourceOrigin(frozen),original(frozen));
});

test('malformed source retains full original diagnostics instead of acquiring grammar or executable authority',{timeout:60000},()=>{
 for(const key of ['before','middle','after']){
  const row={...good(),[key]:'fn unfinished(){"unterminated'},result=sourceOrigin([row]);assert.deepEqual(result,original([row]));
  const field=key==='before'?'beforeMeta':key==='middle'?'middleMeta':'afterMeta',received=transportConcreteSyntaxMeta(result[0][field]);
  assert.equal(received.source,row[key]);assert.ok(['opaque','error'].includes(received.document.status));assert.equal(received.document.diagnostics.length,1);assert.equal(received.document.nodes.length,2);
  assert.deepEqual(received.document.nodes[1].slice(2,4),[0,row[key].length]);assert.deepEqual(received.document.authority,{type:false,owner:false,executable:false});
 }
});

test('stored documents accessors proxies sparse data and undeclared fields cannot enter the source-origin domain',{timeout:60000},()=>{
 let calls=0;const getter=good();Object.defineProperty(getter,'before',{enumerable:true,get(){calls++;throw Error('getter');}});
 const proxy=new Proxy(good(),{get(){calls++;throw Error('proxy');},ownKeys(){calls++;throw Error('keys');}}),rules=new Proxy([...names],{get(){calls++;throw Error('rules');},ownKeys(){calls++;throw Error('rule keys');}});
 const hidden=good();Object.defineProperty(hidden,'middle',{enumerable:false});
 for(const input of [[getter],[proxy],[{...good(),rules}],new Array(1),Object.assign([good()],{extra:1}),[hidden],[{...good(),document:{authority:{executable:true}}}],[{source:'',language:'Rust',nodes:[]}],[{...good(),before:{source:'',authority:{executable:true}}}],[{...good(),rules:new Array(4)}]])assert.throws(()=>sourceOrigin(input),TypeError);
 assert.equal(calls,0);assert.deepEqual(sourceOrigin([good()]),original([good()]));
});

test('original source aggregate and row bounds and complete phase domains still refuse',{timeout:60000},()=>{
 for(const input of [[],[{...good(),before:'x'.repeat(2097153)}],[{...good(),before:'x'.repeat(750000),middle:'y'.repeat(750000),after:'z'.repeat(750000)}],Array.from({length:86},good),[{...good(),language:'Other'}],[{...good(),rules:names.slice(0,3)}]]){
  assert.throws(()=>original(input),TypeError);assert.throws(()=>sourceOrigin(input),TypeError);
 }
 const rows=[{source:'',language:'Rust'},{source:'',language:'JavaScript'},{source:'',language:'Rust'}];
 assert.throws(()=>originalPrivate(rows,[names]),/languages differ/);assert.throws(()=>sourceOriginPrivate(rows,[names]),/languages differ/);
 assert.deepEqual(sourceOrigin([good()]),original([good()]));
});

test('late native reads cannot mutate caller descriptors rules or authenticated source bytes',{timeout:60000},()=>{
 const read=Object.getOwnPropertyDescriptor(fs,'readSync');
 for(const change of ['source','rules','descriptor','array','bytes']){
  const row=good(),input=[row];let reads=0;
  try{
   Object.defineProperty(fs,'readSync',{...read,value:function(...args){const count=Reflect.apply(read.value,this,args);if(count>0&&reads++===0){
    if(change==='source')row.before+='// late mutation';else if(change==='rules')row.rules[0]='forged:late-rule';else if(change==='descriptor')Object.defineProperty(row,'middle',{writable:false});else if(change==='array')input[0]=good();else args[1][args[2]]^=1;
   }return count;}});syncBuiltinESMExports();
   assert.throws(()=>sourceOrigin(input),change==='bytes'?TypeError:/input changed/);assert.ok(reads>0);
  }finally{Object.defineProperty(fs,'readSync',read);syncBuiltinESMExports();}
  assert.deepEqual(sourceOrigin([good()]),original([good()]));
 }
});

test('changed live JSON and traversal intrinsics refuse before invoking replacements',{timeout:60000},()=>{
 let calls=0;
 for(const [owner,key]of [[JSON,'parse'],[JSON,'stringify'],[Array.prototype,'entries']]){
  const field=Object.getOwnPropertyDescriptor(owner,key);
  try{Object.defineProperty(owner,key,{...field,value:function(){calls++;throw Error('replacement invoked');}});assert.throws(()=>sourceOrigin([good()]),TypeError);}
  finally{Object.defineProperty(owner,key,field);}
 }
 assert.equal(calls,0);assert.deepEqual(sourceOrigin([good()]),original([good()]));
});
