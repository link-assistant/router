import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveCompilerAliasScopeReader} from '../compiler-alias-receiving-reader.mjs';
const consumer=readFileSync(new URL('./private-native-proof-cost-scope.test.mjs',import.meta.url),'utf8');
const wrapper=readFileSync(new URL('./current-proof-cost-source-history.mjs',import.meta.url),'utf8');
const imported="import {readProofCostScopeHistory as readFileSync} from './current-proof-cost-source-history.mjs';";
const delegate='export function readProofCostScopeHistory(...args){return historicalRead(readCompilerAliasHistory,args);}';
test('actual receiving wrapper retains the original alias reader and both complete source inverses',{timeout:60000},()=>{
 const plan=deriveCompilerAliasScopeReader(consumer,wrapper);
 assert.equal(plan.consumer,consumer);assert.equal(plan.wrapper,wrapper);
 assert.equal(plan.selections.consumer,imported);assert.equal(plan.selections.entry,delegate);
 assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeAuthority,false);
 for(const row of plan.equations){assert.equal(row.before,row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
 assert.notEqual(deriveCompilerAliasScopeReader(consumer,wrapper),plan);
});
test('changed duplicate and foreign receiving reader imports refuse complete consumer source',{timeout:60000},()=>{
 for(const changed of [consumer.replace(imported,imported+'\n'+imported),consumer.replace(imported,''),consumer.replace(imported,imported.replace('readProofCostScopeHistory as','readProofRetainedCostHistory as')),consumer.replace(imported,imported.replace('./current-proof-cost-source-history.mjs','./foreign.mjs'))]){
  assert.notEqual(changed,consumer);assert.throws(()=>deriveCompilerAliasScopeReader(changed,wrapper),/consumer.*import/);
 }
});
test('changed prior imports delegation and native-first reads refuse complete wrapper source',{timeout:60000},()=>{
 for(const changed of [wrapper.replace("import {readCompilerAliasHistory}","import {readFileSync as readCompilerAliasHistory}"),wrapper.replace(delegate,delegate+'\n'+delegate),wrapper.replace(delegate,delegate.replace('historicalRead(readCompilerAliasHistory,args)','historicalRead(readFileSync,args)')),wrapper.replace('const source=read(...args);','const source="forged";'),wrapper+'\nexport const broken = ;']){
  assert.notEqual(changed,wrapper);assert.throws(()=>deriveCompilerAliasScopeReader(consumer,changed),/alias import|declaration|delegation|native-first|grammar/);
 }
});
