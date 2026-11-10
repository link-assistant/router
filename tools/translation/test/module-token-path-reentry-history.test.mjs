import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deriveModuleTokenReceivingEvolution} from '../module-token-receiving-evolution.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const path='tools/translation/test/derive-output-effects.test.mjs';
const archive=JSON.parse(gunzipSync(readFileSync(new URL('../source-profiles/facade-ast-receiving-history/complete-inputs.json.gz',import.meta.url)),{maxOutputLength:1048576}));
const original=archive.templates.find(row=>row.path===path).source.replace("'./fixtures/native-proof-json-format.mjs'","'./fixtures/facade-ast-receiving-history.mjs'");
const current=readFileSync(new URL('./derive-output-effects.test.mjs',import.meta.url),'utf8');
test('the genuine complete path-index receiving update joins the original module-token source equation',{timeout:60000},()=>{
 const row=deriveModuleTokenReceivingEvolution(original,current),later=row.laterSourceEvolution;
 assert.equal(later.files.length,1);assert.equal(later.files[0].path,path);
 assert.equal(later.files[0].before,row.historicalModuleToken.after);
 assert.equal(later.files[0].after,current);assert.equal(later.inverse,later.files[0].before);
 assert.equal(hash(later.files[0].before),'88343ee52b8b01e2f0b9f4a9db27455d513e2d71154428eea5723d689d7e91ae');
 assert.equal(hash(later.files[0].after),'df0283cad6addd47652cda93b782e008da7589f16a589bf80baa18176454fce4');
 assert.equal(later.originalPinsChanged,false);assert.equal(later.originalDeadlinesChanged,false);
 assert.equal(later.initialNativeBehavioralActionsUnchanged,true);
 assert.equal(later.files[0].after.slice(...later.selectedBlock.span),later.selectedBlock.source);
 assert.equal(later.files[0].after.slice(...later.selectedImport.span),later.selectedImport.source);
 assert.ok(later.selectedBlock.source.includes('assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true)'));
 assert.ok(later.selectedImport.source.includes('prepareDerivePathIndexReentry'));
 assert.equal(row.composedNativeSelections.length,3);assert.equal(row.nativeSelections.length,2);
 assert.equal(row.stages[0].before,original);assert.equal(row.stages[0].after,row.stages[1].before);
 assert.equal(row.stages[1].after,current);assert.equal(row.inverse,original);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 assert.equal(row.sourceAuthority,false);assert.equal(row.runtimeAuthority,false);
});
test('foreign path-index imports and weakened new native/CST checks remain unregistered successors',{timeout:60000},()=>{
 for(const changed of [
  current.replace("'../prepare-derive-path-index-reentry.mjs'","'../foreign-path-index.mjs'"),
  current.replace('assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);',''),
  current.replace('assert.equal(row.equation.inverse,row.before);',''),
  current.replace("['language','repository']","['language','other']")
 ]){
  assert.notEqual(changed,current);
  assert.throws(()=>deriveModuleTokenReceivingEvolution(original,changed),/unregistered complete receiving successor/);
 }
});
