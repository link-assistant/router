import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {deriveModuleTokenReceivingEvolution} from '../module-token-receiving-evolution.mjs';
import {deriveStructOrderingSourceHistory} from '../struct-ordering-source-history.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {orderingEffectsComparisonHistory,readOrderingEffectsComparisonSource} from './fixtures/ordering-effects-comparison-history.mjs';

const path='tools/translation/test/derive-output-effects.test.mjs';
const url=new URL('./derive-output-effects.test.mjs',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const archive=JSON.parse(gunzipSync(readFileSync(new URL('../source-profiles/facade-ast-receiving-history/complete-inputs.json.gz',import.meta.url)),{maxOutputLength:1048576}));
const original=archive.templates.find(row=>row.path===path).source.replace(
 "'./fixtures/native-proof-json-format.mjs'","'./fixtures/facade-ast-receiving-history.mjs'");

test('complete ordering receiving source composes the genuine earlier history and both serialized CST phases',{timeout:60000},()=>{
 const compared=orderingEffectsComparisonHistory();
 assert.equal(hash(compared.historical),'df0283cad6addd47652cda93b782e008da7589f16a589bf80baa18176454fce4');
 assert.equal(hash(compared.current),'dc9f1570e136715b3213f8d08d010166462375e76c44c5bc34f5bbd483b06c50');
 assert.equal(compared.history.inverse,compared.historical);
 const old=deriveModuleTokenReceivingEvolution(original,compared.historical);
 const current=deriveModuleTokenReceivingEvolution(original,compared.current);
 assert.equal(old.after,compared.historical);assert.equal(old.orderingHistory,null);
 assert.equal(current.after,readFileSync(url,'utf8'));assert.equal(current.inverse,original);
 assert.equal(current.orderingHistory.before,old.after);
 assert.equal(current.orderingHistory.after,current.after);
 assert.equal(current.orderingHistory.inverse,old.after);
 assert.deepEqual(current.laterSourceEvolution,old.laterSourceEvolution);
 assert.deepEqual(current.nativeSelections,old.nativeSelections);
 for(const equation of [compared.equation,current]){
  assert.deepEqual(equation.stages.map(row=>row.phase),['language','repository']);
  for(const stage of equation.stages){
   assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
   assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
   assert.equal(stage.inverse,stage.before);
  }
 }
 assert.equal(current.sourceAuthority,false);assert.equal(current.runtimeAuthority,false);
 assert.equal(compared.productionExecutableGain,0);
 assert.equal(readOrderingEffectsComparisonSource(url,'utf8'),old.after);
 assert.equal(readOrderingEffectsComparisonSource(fileURLToPath(url),'utf8'),old.after);
 assert.deepEqual(readOrderingEffectsComparisonSource(url),readFileSync(url));
});

test('foreign complete successors altered private assertions and unrelated reads keep their original refusals',{timeout:60000},()=>{
 const current=readFileSync(url,'utf8');
 for(const changed of [current+'\n',current.replace('timeout:60_000','timeout:120_000'),
  current.replace("'the current private struct Ord output discharges only its enclosing boundary'","'unproved'"),
  current.replace('assert.equal(oldOrderingToken,null);','')]){
  assert.notEqual(changed,current);
  assert.throws(()=>deriveModuleTokenReceivingEvolution(original,changed),/unregistered complete receiving successor/);
  assert.throws(()=>deriveStructOrderingSourceHistory(ownershipCompiler(),{path,source:changed}),/unregistered complete source/);
 }
 const unrelated=new URL('./fixtures/ordering-effects-comparison-history.mjs',import.meta.url);
 assert.equal(readOrderingEffectsComparisonSource(unrelated,'utf8'),readFileSync(unrelated,'utf8'));
 assert.throws(()=>readOrderingEffectsComparisonSource(new URL('./absent-ordering-history.mjs',import.meta.url),'utf8'),{code:'ENOENT'});
 assert.throws(()=>deriveModuleTokenReceivingEvolution(original+' ',current),/complete original\/current source/);
});
