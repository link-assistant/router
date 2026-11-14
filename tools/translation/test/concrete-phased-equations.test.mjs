import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{readFileSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {transportConcreteSourcePhases} from '../concrete-phased-equations.mjs';
import {transportPrivateConcretePhases} from '../private-parser-phased-equations.mjs';
import {prepareConcretePhasedEquations} from '../prepare-concrete-phased-equations.mjs';
import {transportConcreteSyntaxSources,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

test('separate phase transaction preserves the complete original native kernel and both CST inverses',{timeout:60000},()=>{
 const plan=prepareConcretePhasedEquations(),row=plan.file;
 assert.equal(plan.existingExecutorUnchanged,true);assert.equal(plan.newResultCaches,false);
 assert.equal(plan.semanticAuthority,false);assert.equal(plan.performanceQualified,false);
 assert.equal(readFileSync(new URL('../private-parser-execution.mjs',import.meta.url),'utf8'),row.before);
 assert.equal(readFileSync(new URL('../private-parser-phased-equations.mjs',import.meta.url),'utf8'),row.after);
 assert.ok(row.after.startsWith(row.before));assert.equal(row.inverse,row.before);
 assert.equal(row.nativeKernel.source,row.before.slice(...row.nativeKernel.span));
 let copied=row.nativeKernel.source;
 for(const edit of [...row.nativeKernel.edits].sort((a,b)=>b.span[0]-a.span[0])){
  assert.equal(copied.slice(...edit.span),edit.expected);
  copied=copied.slice(0,edit.span[0])+edit.replacement+copied.slice(edit.span[1]);
 }
 assert.equal(copied,row.nativeKernel.copied);assert.ok(row.after.includes(copied));
 for(const expected of ['batchSnapshot(input,current)','authenticate()','transport(row.source,row.language,false)',
  'nodes>BATCH_NODES||canonicalUnits>BATCH_SERIAL','finalIdentities(before.records,before.ancestors)',
  'batchInputCurrent(request.snapshots)','modules.concrete.originalIdentityTransport!==transport'])assert.ok(copied.includes(expected),expected);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
  assert.equal(stage.inverse,stage.before);
 }
});

test('actual language and repository edits reparse every canonical stage and complete inverse',{timeout:60000},()=>{
 const input=[
  {before:'// Ω😀\r\npub fn value()->u8{1}\n',middle:'// Ω😀\r\npub fn value()->u8{2}\n',after:'// Ω😀\r\npub fn answer()->u8{2}\n',language:'Rust'},
  {before:'// trivia\nexport const value="a";\n',middle:'// trivia\nexport const value="b";\n',after:'// trivia\nexport const answer="b";\n',language:'JavaScript'},
  {before:'export const value: number=1;\n',middle:'export const value: number=2;\n',after:'export const answer: number=2;\n',language:'TypeScript'},
  {before:'fn incomplete(',middle:'fn incomplete( ',after:'// retained\nfn incomplete( ',language:'Rust'},
  {before:'const value="\uD800";',middle:'const value="\uD800x";',after:'const answer="\uD800x";',language:'JavaScript'},
 ];
 const snapshot=structuredClone(input),actual=transportConcreteSourcePhases(input);
 const original=transportConcreteSyntaxSources(input.flatMap(({before,middle,after,language})=>[
  {source:before,language},{source:middle,language},{source:after,language},
 ]));
 assert.deepEqual(input,snapshot);assert.equal(actual.length,input.length);
 for(let at=0;at<actual.length;at++){
  const row=actual[at],wanted=input[at];
  assert.equal(row.before,wanted.before);assert.equal(row.middle,wanted.middle);assert.equal(row.after,wanted.after);
  assert.equal(row.beforeMeta,original.rows[at*3].meta);assert.equal(row.middleMeta,original.rows[at*3+1].meta);assert.equal(row.afterMeta,original.rows[at*3+2].meta);
  assert.equal(row.inverse,wanted.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.stages){
   assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
   const received=transportConcreteSyntaxMeta(stage.afterMeta);
   assert.equal(received.source,stage.after);assert.deepEqual(received.document.authority,{type:false,owner:false,executable:false});
   assert.equal(stage.inverse,stage.before);
   const active=stage.trace.find(trace=>trace.phase===stage.phase),empty=stage.trace.find(trace=>trace.phase!==stage.phase);
   assert.deepEqual(active.rules.map(rule=>rule.id),['source-phases:complete-'+stage.phase+'-edit']);
   assert.equal(empty.rules.length,0);assert.notEqual(stage.before,stage.after);
  }
 }
 const unchanged={before:'fn same(){}',middle:'fn same(){}',after:'fn same(){}',language:'Rust'};
 assert.equal(transportConcreteSourcePhases([unchanged])[0].beforeMeta,transportConcreteSourcePhases([unchanged])[0].afterMeta);
});

test('phased input rejects getters proxies sparse arrays extra fields and original aggregate overflow',{timeout:60000},()=>{
 let calls=0;const good={before:'fn x(){}',middle:'fn x(){ }',after:'fn y(){ }',language:'Rust'};
 const accessor={...good};Object.defineProperty(accessor,'middle',{enumerable:true,get(){calls++;throw Error('unexpected getter');}});
 const proxy=new Proxy(good,{get(){calls++;throw Error('unexpected proxy');},ownKeys(){calls++;throw Error('unexpected keys');}});
 const outerProxy=new Proxy([good],{get(){calls++;throw Error('unexpected array read');}});
 const outerAccessor=[good];Object.defineProperty(outerAccessor,'0',{enumerable:true,get(){calls++;throw Error('unexpected array getter');}});
 const huge=' '.repeat(700000);
 for(const input of [[],new Array(1),outerAccessor,outerProxy,[accessor],[proxy],[{...good,extra:1}],
  [{...good,language:'foreign'}],[{...good,middle:null}],[Object.assign(Object.create(null),good)],
  new Array(86).fill(good),[{before:huge,middle:huge,after:huge,language:'Rust'}]])assert.throws(()=>transportConcreteSourcePhases(input),TypeError);
 assert.equal(calls,0);
 assert.throws(()=>transportPrivateConcretePhases([{source:good.before,language:'Rust'}]),/triples/);
 assert.throws(()=>transportPrivateConcretePhases([{source:good.before,language:'Rust'},{source:good.middle,language:'JavaScript'},{source:good.after,language:'Rust'}]),/languages/);
 assert.equal(transportConcreteSourcePhases([good])[0].after,good.after);
});

test('each phase call freshly authenticates complete source and rejoins original caller descriptors',{timeout:60000},()=>{
 const original=Object.getOwnPropertyDescriptor(fs,'readSync');
 const good={before:'fn x(){}',middle:'fn x(){ }',after:'fn y(){ }',language:'Rust'};
 let reads=0;
 try{
  Object.defineProperty(fs,'readSync',{...original,value:function(...args){
   const count=Reflect.apply(original.value,this,args);if(count>0&&reads++===0)args[1][args[2]]^=1;return count;
  }});syncBuiltinESMExports();
  assert.throws(()=>transportConcreteSourcePhases([good]),TypeError);assert.ok(reads>0);
 }finally{Object.defineProperty(fs,'readSync',original);syncBuiltinESMExports();}
 assert.equal(transportConcreteSourcePhases([good])[0].after,good.after);
 reads=0;
 try{
  Object.defineProperty(fs,'readSync',{...original,value:function(...args){
   const count=Reflect.apply(original.value,this,args);if(count>0&&reads++===0)good.after='fn changed(){}';return count;
  }});syncBuiltinESMExports();
  assert.throws(()=>transportConcreteSourcePhases([good]),/input changed/);assert.ok(reads>0);
 }finally{Object.defineProperty(fs,'readSync',original);syncBuiltinESMExports();good.after='fn y(){ }';}
 assert.equal(transportConcreteSourcePhases([good])[0].after,good.after);
});
