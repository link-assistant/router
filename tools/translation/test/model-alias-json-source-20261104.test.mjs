// Complete source/copy/caller/CST case source. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeModelAliasJsonCoreSources20261104} from '../model-alias-json-core-20261104-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('paired model policy operation retains the actual native body, shared bindings and uninstalled production caller source',{timeout:900000},()=>{
 const proposal=proposeModelAliasJsonCoreSources20261104();assert.equal(proposal.files.length,5);assert.equal(proposal.oracleFiles.length,1);assert.equal(proposal.callers.length,1);assert.equal(proposal.newFiles.length,3);assert.equal(proposal.guards.length,4);assert.equal(proposal.librarySourceInstalled,true);assert.equal(proposal.callerSourceInstalled,false);assert.equal(proposal.nativeBindingQualified,false);for(const row of [...proposal.files,...proposal.oracleFiles,...proposal.callers]){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
 assert.equal(proposal.callers[0].wholeFunctionAdmitted,false);assert.ok(proposal.callers[0].unresolved.length);assert.equal(proposal.nativeBodyCopy.history.inverse,proposal.nativeBodyCopy.before);for(const row of proposal.newFiles)assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);
});

test('actual nonstream adoption composes complete original oracle and uninstalled mutable-wrapper histories',{timeout:900000},()=>{
 const proposal=proposeModelAliasJsonCoreSources20261104();
 assert.equal(proposal.responseAdoptions.length,1);
 const response=proposal.responseAdoptions[0],oracle=proposal.oracleFiles[0],caller=proposal.callers[0];
 assert.equal(oracle.after,response.before);
 assert.equal(caller.before,response.before);
 assert.equal(oracle.currentAfter,response.after);
 assert.equal(caller.current,response.after);
 assert.deepEqual(oracle.laterHistories,[response]);
 assert.deepEqual(caller.laterHistories,[response]);
 assert.equal(caller.currentProjection.before,response.after);
 assert.equal(caller.currentProjection.after,caller.currentAfter);
 assert.equal(caller.currentProjection.inverse,response.after);
 assert.notEqual(caller.currentAfter,caller.after);
 for(const row of [response,caller.currentProjection]){
  assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  let source=row.before;
  for(const stage of row.stages){
   assert.equal(stage.before,source);
   assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,source);
   assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);
   assert.equal(stage.history.inverse,source);source=stage.after;
  }
  assert.equal(source,row.after);
 }
 const ownedCall='value = crate::translation_state_core::json_rewrite_model_alias(value, upstream, visible);';
 assert.ok(response.after.includes(ownedCall));
 assert.ok(caller.currentAfter.includes(ownedCall));
 assert.ok(response.after.includes('    rewrite_value(&mut value, upstream, visible);'));
 assert.ok(caller.currentAfter.includes('std::mem::take(value)'));
 for(const name of ['nonstream_response_rewrites_model_fields_and_retires_stale_entity_headers','unsuccessful_response_keeps_original_body_and_entity_headers','successful_nonidentity_encoding_stays_an_explicit_policy_error']){
  assert.ok(response.after.includes('async fn '+name+'()'));
  assert.ok(caller.currentAfter.includes('async fn '+name+'()'));
  assert.equal(caller.after.includes('async fn '+name+'()'),false);
 }
 assert.equal(proposal.sourceAuthority,false);
 assert.equal(proposal.semanticAuthority,false);
 assert.equal(proposal.verification,'UNRUN');
 assert.equal(caller.sourceInstalled,false);
 assert.equal(caller.wholeFunctionAdmitted,false);
});

test('object rebuild correction preserves the original runtime source equation and exact successor',{timeout:900000},()=>{
 const proposal=proposeModelAliasJsonCoreSources20261104(),runtime=proposal.files.find(row=>row.path==='tools/translation/json-state-runtime.mjs');
 assert.equal(proposal.runtimeCorrections.length,1);
 const correction=proposal.runtimeCorrections[0];
 assert.equal(correction.before,runtime.after);
 assert.equal(correction.after,runtime.currentAfter);
 assert.equal(correction.inverse,runtime.after);
 assert.deepEqual(runtime.laterHistories,[correction]);
 assert.ok(runtime.after.includes('return changed?object(rows):value;'));
 assert.ok(runtime.currentAfter.includes('return changed?json_macro_object(rows):value;'));
 assert.deepEqual(correction.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of correction.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);
  assert.equal(stage.history.inverse,stage.before);
 }
 for(const file of proposal.files.filter(row=>row!==runtime))assert.deepEqual(file.laterHistories,[]);
 assert.equal(proposal.semanticAuthority,false);
 assert.equal(proposal.nativeBindingQualified,false);
});
