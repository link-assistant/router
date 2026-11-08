import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareNamedCoreProducers,originalNamedCoreProducerSources} from '../prepare-named-core-producers.mjs';
import {prepareCoreUnitMatches} from '../prepare-core-unit-matches.mjs';
import {prepareCoreUnicodePredicates} from '../prepare-core-unicode-predicates.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

test('both complete producer source equations retain original native copies bindings rule names and inverses',{timeout:60000},()=>{
 const plan=prepareNamedCoreProducers();assert.equal(plan.files.length,2);assert.equal(plan.typescriptVersion,'5.9.3');
 assert.equal(plan.originalRuleNamesRetained,true);assert.equal(plan.originalNativeCopiesAndBindingsRetained,true);assert.equal(plan.newVerdictCaches,false);assert.equal(plan.semanticAuthority,false);
 for(const row of plan.files){
  assert.equal(row.current,row.after);assert.equal(row.equation.inverse,row.before);
  assert.equal(readFileSync(new URL('../../../'+row.path,import.meta.url),'utf8'),row.after);
  for(const stage of row.equation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
  assert.ok(row.rules.every(name=>row.before.includes(name)&&row.after.includes(name)));
  for(const marker of ['nativeCopy(','readFileSync(resolve(root,','semanticAuthority:false'])assert.ok(row.after.includes(marker),marker);
 }
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
