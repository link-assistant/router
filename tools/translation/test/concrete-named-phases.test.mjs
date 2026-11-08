import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{readFileSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {createHash} from 'node:crypto';
import {prepareConcreteNamedPhases} from '../prepare-concrete-named-phases.mjs';
import {transportConcreteNamedSourcePhases} from '../concrete-named-phases.mjs';
import {transportPrivateConcreteNamedPhases} from '../private-parser-named-phases.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';

const names=['language:original-rule','repository:original-rule','language:original-inverse','repository:original-inverse'];
const good=()=>({before:'// Ω😀\r\nfn value()->u8{1}',middle:'// Ω😀\r\nfn value()->u8{2}',after:'// Ω😀\r\nfn answer()->u8{2}',language:'Rust',rules:[...names]});

test('named transaction derives the entire original native kernel with complete CST inverses',{timeout:60000},()=>{
 const plan=prepareConcreteNamedPhases(),row=plan.file;
 assert.equal(plan.originalPrivateTransactionUnchanged,true);assert.equal(plan.semanticAuthority,false);
 assert.equal(readFileSync(new URL('../private-parser-phased-equations.mjs',import.meta.url),'utf8'),row.before);
 assert.equal(createHash('sha256').update(row.before).digest('hex'),'2f511be5ffc068049366ea34ec7482a9d653f1f90cfbc39e11a738a5785a0e20');
 assert.equal(readFileSync(new URL('../private-parser-named-phases.mjs',import.meta.url),'utf8'),row.after);
 let current=row.before;for(const edit of [...row.nativeEdits].sort((a,b)=>b.span[0]-a.span[0])){
  assert.equal(current.slice(...edit.span),edit.expected);current=current.slice(0,edit.span[0])+edit.replacement+current.slice(edit.span[1]);
 }
 assert.equal(current,row.middle);assert.equal(row.equation.inverse,row.before);
 for(const stage of row.equation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
 assert.ok(row.after.split('\n').length<1000);
});

test('named language/repository rules retain actual original traces and every canonical stage',{timeout:60000},()=>{
 const rows=[good(),{before:'export const x=1;',middle:'export const x=2;',after:'export const y=2;',language:'JavaScript',rules:[...names]},
  {before:'export const x:number=1;',middle:'export const x:number=2;',after:'export const y:number=2;',language:'TypeScript',rules:[...names]},
  {before:'fn x(){}',middle:'fn x(){}',after:'fn x(){}',language:'Rust',rules:[...names]}];
 const plans=transportConcreteNamedSourcePhases(rows);assert.equal(plans.length,rows.length);
 for(const [at,input]of rows.entries()){
  const plan=plans[at];let original=transportConcreteSyntaxSource(input.before,{language:input.language});
  assert.equal(plan.beforeMeta,serializeConcreteSyntaxMeta(original.document));assert.equal(plan.inverse,input.before);
  for(const [index,phase]of ['language','repository'].entries()){
   const after=index===0?input.middle:input.after,source=original.source;
   const rule={id:input.rules[index],edits:[{span:[0,source.length],expected:source,replacement:after}]};
   const result=applyConcreteSyntaxSubstitutions(original.document,{languageRules:index===0?[rule]:[],repositoryRules:index===1?[rule]:[]});
   const wire=serializeConcreteSyntaxMeta(result.value),received=transportConcreteSyntaxMeta(wire),stage=plan.stages[index];
   assert.equal(stage.phase,phase);assert.equal(stage.afterMeta,wire);assert.deepEqual(stage.trace,result.trace);assert.equal(received.source,after);
   assert.equal(stage.inverse,source);assert.deepEqual(received.document.authority,{type:false,owner:false,executable:false});original=received;
  }
  assert.equal(plan.afterMeta,serializeConcreteSyntaxMeta(original.document));
 }
});

test('named rules reject getter proxy sparse extra-field and malformed private inputs without callbacks',{timeout:60000},()=>{
 let calls=0;const getter=[...names];Object.defineProperty(getter,'0',{enumerable:true,get(){calls++;throw Error('getter');}});
 const proxy=new Proxy([...names],{get(){calls++;throw Error('proxy');},ownKeys(){calls++;throw Error('keys');}});
 for(const rules of [getter,proxy,new Array(4),Object.assign([...names],{extra:1}),names.slice(0,3),[...names.slice(0,3),null],['x'.repeat(161),...names.slice(1)]])assert.throws(()=>transportConcreteNamedSourcePhases([{...good(),rules}]),TypeError);
 assert.equal(calls,0);
 const source=[{source:'fn x(){}',language:'Rust'},{source:'fn x(){}',language:'Rust'},{source:'fn x(){}',language:'Rust'}];
 for(const identifiers of [[],[getter],[proxy],[names.slice(0,3)],new Array(1)])assert.throws(()=>transportPrivateConcreteNamedPhases(source,identifiers),TypeError);
 assert.equal(calls,0);assert.equal(transportConcreteNamedSourcePhases([good()])[0].after,good().after);
});

test('fresh source reads and original caller rule descriptors are rejoined after native callbacks',{timeout:60000},()=>{
 const input=good(),original=Object.getOwnPropertyDescriptor(fs,'readSync');
 assert.equal(transportConcreteNamedSourcePhases([input])[0].after,input.after);
 let reads=0;
 try{
  Object.defineProperty(fs,'readSync',{...original,value:function(...args){const count=Reflect.apply(original.value,this,args);if(count>0&&reads++===0)input.rules[0]='forged:late-rule';return count;}});syncBuiltinESMExports();
  assert.throws(()=>transportConcreteNamedSourcePhases([input]),/input changed/);assert.ok(reads>0);
 }finally{Object.defineProperty(fs,'readSync',original);syncBuiltinESMExports();input.rules[0]=names[0];}
 assert.equal(transportConcreteNamedSourcePhases([input])[0].after,input.after);reads=0;
 try{
  Object.defineProperty(fs,'readSync',{...original,value:function(...args){const count=Reflect.apply(original.value,this,args);if(count>0&&reads++===0)args[1][args[2]]^=1;return count;}});syncBuiltinESMExports();
  assert.throws(()=>transportConcreteNamedSourcePhases([input]),TypeError);assert.ok(reads>0);
 }finally{Object.defineProperty(fs,'readSync',original);syncBuiltinESMExports();}
 assert.equal(transportConcreteNamedSourcePhases([input])[0].after,input.after);
});
