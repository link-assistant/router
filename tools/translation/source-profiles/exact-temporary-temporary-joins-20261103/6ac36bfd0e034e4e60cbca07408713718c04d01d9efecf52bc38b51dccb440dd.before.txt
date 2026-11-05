// Full actual source equations and lifecycle case SOURCE only; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {readSourceProfileFileSync} from '../ordered-text-map-callers-20261102-source-storage.mjs';
import {knownExactSourceSuccessor,withExactSourceHistoryDataOperation,withExactSourceHistoryDataReservation} from '../exact-source-successors-20261103.mjs';
import {knownExactSourceCompilerEngineEpoch,matchesExactSourceEpoch} from '../exact-source-compiler-epochs-20261103.mjs';
import {orderedTextMapCallerParentSourceData} from '../ordered-text-map-callers-20261102-profile.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const base='tools/translation/source-profiles/exact-source-compiler-epochs-20261103/';
test('complete reviewed index retains its original127 and excludes engine self-reference',()=>{
 const old=JSON.parse(readSourceProfileFileSync(join(root,base+'index127.before.json'),'utf8'));
 const current=JSON.parse(readSourceProfileFileSync(join(root,'tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json'),'utf8'));
 assert.equal(old.rows.length,127);assert.equal(current.rows.length,282);assert.deepEqual(current.rows.slice(0,127),old.rows);
 assert.equal(current.rows.some(row=>row.path==='tools/translation/exact-source-successors-20261103.mjs'),false);
 assert.equal(new Set(current.rows.map(row=>row.id)).size,current.rows.length);
});
test('actual complete Host/compiler source continuation retains old equations and full CST inverse',{timeout:60000},()=>{
 for(const path of ['tools/translation/extensions/host-contracts.mjs','tools/translation/namespace-standard.mjs']){
  const row=orderedTextMapCallerParentSourceData().find(row=>row.path===path),current=readFileSync(join(root,path),'utf8');assert.ok(row);
  assert.equal(matchesExactSourceEpoch(row,row.after,{root}),true);
  assert.equal(matchesExactSourceEpoch(row,current,{root,retainedBytes:Buffer.byteLength(current)}),true);
  const later=knownExactSourceSuccessor({path,before:row.after},{root});assert.ok(later);assert.equal(later.after,current);assert.equal(later.inverse,row.after);
  assert.ok(later.stages.length>0);for(const stage of later.stages)assert.equal(stage.history.inverse,stage.before);
  assert.equal(later.nativeBindingQualified,false);assert.equal(later.semanticAuthority,false);
 }
});
test('separate whole engine ancestry selects physical and compressed predecessors, never a copied flag',{timeout:60000},()=>{
 const path='tools/translation/exact-source-successors-20261103.mjs',current=readFileSync(join(root,path),'utf8');
 for(const name of ['engine.physical127.txt','engine.before.txt','engine.after.txt']){
  const before=readSourceProfileFileSync(join(root,base+name),'utf8'),result=knownExactSourceCompilerEngineEpoch({root,before,current});
  assert.ok(result);assert.equal(result.before,before);assert.equal(result.after,current);assert.equal(result.inverse,before);assert.equal(result.nativeBindingQualified,false);
 }
 assert.equal(knownExactSourceCompilerEngineEpoch({root,before:'unknown',current}),null);
 assert.equal(knownExactSourceCompilerEngineEpoch({root,before:current,current:current+'\n'}),null);
 assert.throws(()=>knownExactSourceCompilerEngineEpoch({root,before:current,current,retainedBytes:-1}));
});
test('history reservations share the original complete cap and preserve every callback primary',{timeout:60000},()=>{
 assert.throws(()=>withExactSourceHistoryDataReservation(0,()=>null));
 assert.throws(()=>withExactSourceHistoryDataOperation(root,()=>withExactSourceHistoryDataReservation(16777217,()=>null)));
 for(const primary of [false,0,'',null,undefined,Object.freeze({ordinary:true})]){
  let caught=false;try{withExactSourceHistoryDataOperation(root,()=>withExactSourceHistoryDataReservation(16,()=>{throw primary;}));}catch(error){caught=true;assert.strictEqual(error,primary);}assert.equal(caught,true);
 }
 assert.throws(()=>withExactSourceHistoryDataOperation(root,()=>withExactSourceHistoryDataReservation(0,()=>Promise.resolve())));
});
