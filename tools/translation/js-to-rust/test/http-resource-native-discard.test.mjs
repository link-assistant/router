// Independent explicit discard source. Every implementation/case is unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHttpResourceRustBindings} from '../http-resource-native-bindings.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNativeDiscardSources} from '../../prepare-http-resource-native-discard-sources.mjs';
const limits={timeout:60000};
const source=`pub fn set(cancellation: &crate::translation_async_control_core::Cancellation) { let _ = crate::translation_async_control_core::cancel_set(cancellation); }
pub fn twice(cancellation: &crate::translation_async_control_core::Cancellation) { let _ = crate::translation_async_control_core::cancel_set(cancellation); let _ = crate::translation_async_control_core::cancel_set(cancellation); }
pub fn literals() { let _ = true; let _ = 18446744073709551615_u64; let _ = -9223372036854775808_i64; let _ = "é😀"; let _ = (); }
pub fn disposed(receiver: &mut crate::translation_async_control_core::Receiver) { let _ = crate::translation_async_control_core::dispose(&mut *receiver); }
`;
function input(value,sourcePath='src/caller.rs'){return {sourcePath,javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual discarded checked calls execute their original effects once in order and preserve the established unit return',limits,async()=>{
 const result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory;assert.equal(result.originalRust,source);assert.equal(history.equation.inverse,source);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));assert.doesNotMatch(history.normalizedSource,/let _/u);
 await verifyHttpResourceTargets(result,async(api,{control})=>{const first=control.router_cancel_new();assert.equal(control.router_cancel_is_set(first),false);assert.equal(api.set(first),null);assert.equal(control.router_cancel_is_set(first),true);assert.equal(api.set(first),null);const second=control.router_cancel_new();assert.equal(api.twice(second),null);assert.equal(control.router_cancel_is_set(second),true);assert.equal(api.literals(),null);const pair=control.router_async_channel(1n);assert.equal(pair.$,'Ok');const receiver=pair.field0[1];try{assert.equal(api.disposed(receiver),null);assert.deepEqual(await control.router_async_receive(receiver,control.router_cancel_new()),{$:'Ok',field0:{$:'None'}});}finally{control.router_async_dispose(receiver);}});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('explicit discard cannot bypass Result owning-resource unknown-effect wildcard-binding or typed-drop obligations',limits,()=>{
 for(const value of [
  'pub fn bad() { let _ = crate::translation_owned_results_core::bool_ok(true); }',
  'pub fn bad() { let _ = crate::translation_async_control_core::cancel_new(); }',
  'pub fn bad() { let _ = unknown(); }',
  'pub fn bad() { let _: bool = true; }',
  'pub fn bad() -> bool { let _ = true; _ }',
  'pub fn bad() { let _ = 18446744073709551616_u64; }',
 ])assert.throws(()=>translateHttpResourceShadowCallerRust(value,input(value)),value);
 const changed=input(source);changed.files=changed.files.map(row=>row.path==='src/caller.rs'?{...row,source:source+'\n'}:row);assert.throws(()=>translateHttpResourceShadowCallerRust(source,changed));
});
test('original discard prefixes and literal comments remain in exact complete source inverses',limits,()=>{
 const value='pub fn selected() { let /* original */ _ = /* literal */ true; }',plan=normalizeHttpResourceRustBindings(value);assert.equal(plan.equation.inverse,value);assert.ok(plan.selections.some(row=>row.kind==='discarded-native-literal'&&row.source.includes('/* original */')));assert.equal(plan.semanticAuthority,false);assert.equal(plan.namespaceAuthority,false);assert.equal(plan.crossInvocationCache,false);
});
test('all complete discard sources retain both ordered substitution phases and exact full inverses',limits,()=>{
 const plan=prepareHttpResourceNativeDiscardSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
