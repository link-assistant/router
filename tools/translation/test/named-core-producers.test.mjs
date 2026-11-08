import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,copyFileSync,mkdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {prepareNamedCoreProducers,originalNamedCoreProducerSources} from '../prepare-named-core-producers.mjs';
import {prepareCoreUnitMatches,composeCoreUnitMatches} from '../prepare-core-unit-matches.mjs';
import {prepareCoreUnicodePredicates} from '../prepare-core-unicode-predicates.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

test('both complete producer source equations retain original native copies bindings rule names and inverses',{timeout:60000},()=>{
 const plan=prepareNamedCoreProducers();assert.equal(plan.files.length,2);assert.equal(plan.typescriptVersion,'5.9.3');
 assert.equal(plan.originalRuleNamesRetained,true);assert.equal(plan.originalNativeCopiesAndBindingsRetained,true);assert.equal(plan.newVerdictCaches,false);assert.equal(plan.semanticAuthority,false);
 for(const row of plan.files){
  assert.equal(row.current,row.after);assert.equal(row.equation.inverse,row.before);
  let replayed=row.before;
  for(const edit of [...row.nativeEdits].sort((a,b)=>b.span[0]-a.span[0])){
   assert.equal(replayed.slice(...edit.span),edit.expected);
   replayed=replayed.slice(0,edit.span[0])+edit.replacement+replayed.slice(edit.span[1]);
  }
  assert.equal(replayed,row.middle);
  assert.equal(readFileSync(new URL('../../../'+row.path,import.meta.url),'utf8'),row.after);
  for(const stage of row.equation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
  assert.deepEqual(row.historyEquations.map(equation=>equation.before),[row.namedAfter,row.sequentialAfter]);
  for(const equation of row.historyEquations){assert.equal(equation.after,row.after);assert.equal(equation.inverse,equation.before);for(const stage of equation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}}
  assert.ok(row.rules.every(name=>row.before.includes(name)&&row.after.includes(name)));
  for(const marker of ['nativeCopy(','readFileSync(resolve(root,','semanticAuthority:false'])assert.ok(row.after.includes(marker),marker);
 }
});

test('the known host history does not admit an unknown complete physical producer',{timeout:60000},()=>{
 const root=mkdtempSync(join(tmpdir(),'router-named-core-'));
 try{
  const paths=['tools/translation/source-profiles/named-core-producers/manifest.json','tools/translation/source-profiles/named-core-producers/originals.json.gz','tools/translation/prepare-core-unit-matches.mjs','tools/translation/prepare-core-unicode-predicates.mjs'];
  for(const path of paths){const target=join(root,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(new URL('../../../'+path,import.meta.url),target);}
  const path=join(root,paths[3]),source=readFileSync(path,'utf8');
  assert.ok(source.includes('propertyQualified:false'));
  writeFileSync(path,source.replace('propertyQualified:false','propertyQualified:true'));
  assert.throws(()=>prepareNamedCoreProducers({root}),/unknown complete physical source: tools\/translation\/prepare-core-unicode-predicates\.mjs/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

for(const [name,prepare,entry]of [
 ['unit',prepareCoreUnitMatches,'prepareCoreUnitMatches'],
 ['unicode',prepareCoreUnicodePredicates,'prepareCoreUnicodePredicates'],
])test('complete '+name+' producer result equals the complete retained original operation',{timeout:60000},async()=>{
 const originals=originalNamedCoreProducerSources(),row=originals.find(row=>row.path.endsWith(name==='unit'?'prepare-core-unit-matches.mjs':'prepare-core-unicode-predicates.mjs'));
 assert.ok(row);assert.equal(row.equation.inverse,row.source);
 for(const stage of row.equation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}
 const original=await import('data:text/javascript;base64,'+Buffer.from(row.after).toString('base64'));
 const before=original[entry](),after=prepare();
 // Entire records: all sources, canonical documents, traces, copied native
 // programs, lexical bindings, current physical bytes and original properties.
 assert.deepEqual(after,before);
});

test('complete valid unit composition equals the original while wrong own-data predecessors refuse',{timeout:60000},async()=>{
 const row=originalNamedCoreProducerSources().find(row=>row.path.endsWith('prepare-core-unit-matches.mjs'));
 const original=await import('data:text/javascript;base64,'+Buffer.from(row.after).toString('base64'));
 const before=original.composeCoreUnitMatches({}),after=composeCoreUnitMatches({});assert.deepEqual(after,before);
 const prior={'rust/src/translation_core.rs':{after:'forged'}};let refused;
 try{original.composeCoreUnitMatches(prior);}catch(error){refused=error;}
 assert.ok(refused instanceof TypeError);
 assert.throws(()=>composeCoreUnitMatches(prior),error=>error.constructor===refused.constructor&&error.message===refused.message);
 assert.deepEqual(prior,{'rust/src/translation_core.rs':{after:'forged'}});
});

test('unit predecessor accessors keep their original deferred single-read behavior',{timeout:60000},()=>{
 const packet=JSON.parse(gunzipSync(readFileSync(new URL('../source-profiles/core-unit-matches/originals.json.gz',import.meta.url)),{maxOutputLength:100000}).toString('utf8')),path='rust/src/translation_core.rs',source=packet.files.find(row=>row.path===path).source;
 let parentReads=0,afterReads=0;
 const prior={};Object.defineProperty(prior,path,{get(){parentReads++;return {after:source};},enumerable:true});
 const first=composeCoreUnitMatches(prior);assert.equal(parentReads,1);assert.equal(first.historicalSources,prior);assert.equal(first.sources[path].before,source);
 const value={};Object.defineProperty(value,'after',{get(){afterReads++;return source;},enumerable:true});
 const second=composeCoreUnitMatches({[path]:value});assert.equal(afterReads,1);assert.equal(second.sources[path].before,source);
});
