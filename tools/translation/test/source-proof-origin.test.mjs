import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSourceProofPreservation,prepareSourceOriginProofPreservation,
 composeSourceProofPreservation} from '../prepare-source-proof-preservation.mjs';
import {receiveCompleteSourceMetadata} from './complete-source-metadata-receiving.mjs';

test('the separate source-origin proof preparer preserves every complete original plan field',{timeout:60000},()=>{
 const original=prepareSourceProofPreservation(),current=prepareSourceOriginProofPreservation();
 assert.deepEqual(current,original);
 assert.equal(current.files.length,3);
 assert.equal(current.newAcrossInvocationCache,false);
 assert.equal(current.semanticAuthority,false);
 const receiving=receiveCompleteSourceMetadata(current.files);
 for(const row of current.files){
  assert.equal(row.inverse,row.before);
  assert.equal(row.completeNativeAstCopy,true);
  assert.equal(row.nativeCopies.length,2);
  assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));
  assert.equal(receiving.next(row.beforeMeta).source,row.before);
  assert.equal(receiving.next(row.afterMeta).source,row.after);
  assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.stages){
   assert.equal(stage.completeInverse,true);
   assert.equal(receiving.next(stage.beforeMeta).source,stage.before);
   assert.equal(receiving.next(stage.afterMeta).source,stage.after);
   assert.equal(stage.trace.find(item=>item.phase===stage.phase).rules.length,1);
   assert.equal(stage.trace.find(item=>item.phase!==stage.phase).rules.length,0);
  }
 }
 receiving.finish();
});

test('the selected proof composer freshly rejoins complete parents and refuses a replaced predecessor',{timeout:60000},()=>{
 const plan=prepareSourceOriginProofPreservation();
 const prior=Object.fromEntries(plan.files.map(row=>[row.path,{after:row.before}]));
 const composed=composeSourceProofPreservation(prior);
 assert.equal(composed.historicalSources,prior);
 assert.deepEqual(composed.layers,[plan]);
 for(const row of plan.files){
  assert.deepEqual(composed.sources[row.path],row);
  assert.equal(prior[row.path].after,row.before);
 }
 const selected=plan.files[0];
 assert.throws(()=>composeSourceProofPreservation({...prior,
  [selected.path]:{after:selected.before+' '}}),/preceding complete source equation differs/);
 assert.deepEqual(prepareSourceOriginProofPreservation(),plan);
});
