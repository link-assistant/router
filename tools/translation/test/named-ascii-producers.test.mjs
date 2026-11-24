import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareNamedAsciiProducers,originalNamedAsciiProducerSources} from '../prepare-named-ascii-producers.mjs';
import {prepareCoreAsciiReverseSources} from '../prepare-core-ascii-reverse-sources.mjs';
import {prepareOwnedCorePrivateAnalysisRetention} from '../prepare-owned-core-private-analysis-retention.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

test('complete named ASCII producer sources retain original native checks rules and inverses',{timeout:60000},()=>{
 const plan=prepareNamedAsciiProducers();assert.equal(plan.files.length,2);assert.equal(plan.typescriptVersion,'5.9.3');
 assert.equal(plan.originalRuleNamesRetained,true);assert.equal(plan.originalNativeCopiesAndBindingsRetained,true);assert.equal(plan.newVerdictCaches,false);assert.equal(plan.semanticAuthority,false);
 for(const row of plan.files){
  assert.equal(row.current,row.after);assert.equal(row.equation.inverse,row.before);assert.equal(readFileSync(new URL('../../../'+row.path,import.meta.url),'utf8'),row.after);
  for(const stage of row.equation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
  assert.deepEqual(row.historyEquations.map(equation=>equation.before),[row.namedAfter,row.sequentialAfter]);
  for(const equation of row.historyEquations){assert.equal(equation.after,row.after);assert.equal(equation.inverse,equation.before);for(const stage of equation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}}
  assert.ok(row.rules.every(name=>row.before.includes(name)&&row.after.includes(name)));
  for(const marker of ['nativeCopy(','readFileSync(resolve(root,','runtimeExecuted:false'])assert.ok(row.before.includes(marker)&&row.after.includes(marker),marker);
 }
});

for(const [name,prepare,entry]of [
 ['reverse',prepareCoreAsciiReverseSources,'prepareCoreAsciiReverseSources'],
 ['retention',prepareOwnedCorePrivateAnalysisRetention,'prepareOwnedCorePrivateAnalysisRetention'],
])test('complete '+name+' source producer equals its whole retained original operation',{timeout:60000},async()=>{
 const originals=originalNamedAsciiProducerSources(),row=originals.find(row=>row.path.endsWith(name==='reverse'?'prepare-core-ascii-reverse-sources.mjs':'prepare-owned-core-private-analysis-retention.mjs'));
 assert.ok(row);assert.equal(row.equation.inverse,row.source);
 for(const stage of row.equation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}
 const original=await import('data:text/javascript;base64,'+Buffer.from(row.after).toString('base64'));
 const before=original[entry](),after=prepare();
 // Compare entire original records: native programs, physical bytes, CST,
 // phase traces, inverses, source selections, all declarations and refusal flags.
 assert.deepEqual(after,before);
});
