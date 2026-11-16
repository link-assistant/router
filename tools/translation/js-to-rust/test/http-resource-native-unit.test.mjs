// Independent native unit source cases. Every implementation/case is unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHttpResourceRustBindings} from '../http-resource-native-bindings.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNativeUnitSources} from '../../prepare-http-resource-native-unit-sources.mjs';
const limits={timeout:60000};
const source=`pub fn empty() {}
pub fn explicit() -> () {}
pub fn returned() { return; }
pub fn early(flag: bool) { if flag { return; } }
pub async fn cold() {}
pub async fn waited(cancellation: &crate::translation_async_control_core::Cancellation) { crate::translation_async_control_core::cancel_wait(cancellation).await; }
pub fn disposed(receiver: &mut crate::translation_async_control_core::Receiver) { crate::translation_async_control_core::dispose(&mut *receiver); }
pub async fn completed(cancellation: &crate::translation_async_control_core::Cancellation) -> Result<(), crate::translation_async_control_core::ControlError> { crate::translation_async_control_core::with_deadline(1000_u64, cancellation, |_child: crate::translation_async_control_core::Cancellation| async move {}).await }
`;
function input(value,sourcePath='src/caller.rs'){return {sourcePath,javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('original omitted signatures empty bodies bare returns and exact unit operations use the checked native unit ABI',limits,async()=>{
 const result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory;assert.equal(result.originalRust,source);assert.equal(history.equation.inverse,source);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));assert.ok(history.lexicalBindings.controls.some(row=>row.kind==='unit-function-signature'));assert.ok(history.lexicalBindings.controls.some(row=>row.kind==='unit-body-tail'));
 await verifyHttpResourceTargets(result,async(api,{control})=>{assert.equal(api.empty(),null);assert.equal(api.explicit(),null);assert.equal(api.returned(),null);assert.equal(api.early(false),null);assert.equal(api.early(true),null);assert.equal(await api.cold(),null);const cancelled=control.router_cancel_new();control.router_cancel_set(cancelled);assert.equal(await api.waited(cancelled),null);const token=control.router_cancel_new();assert.deepEqual(await api.completed(token),{$:'Ok',field0:null});const pair=control.router_async_channel(1n);assert.equal(pair.$,'Ok');const receiver=pair.field0[1];try{assert.equal(api.disposed(receiver),null);assert.deepEqual(await control.router_async_receive(receiver,token),{$:'Ok',field0:{$:'None'}});}finally{control.router_async_dispose(receiver);}});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('bare early return keeps its function target while a final bare return becomes one unit expression',limits,()=>{
 const original='pub fn selected(flag: bool) { if flag { return; } return; }',plan=normalizeHttpResourceRustBindings(original);assert.match(plan.after,/if flag \{ return \(\); \}/u);assert.equal(plan.equation.inverse,original);assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.crossInvocationCache,false);
});
test('unit defaults cannot admit a mismatched value non-unit missing return unsupported effect or modified original source',limits,()=>{
 for(const value of [
  'pub fn bad() { true }',
  'pub fn bad() { return true; }',
  'pub fn bad() -> bool {}',
  'pub fn bad() -> bool { return; }',
  'pub fn bad(flag: bool) { if flag { true } }',
  'pub fn bad() { unknown(); }',
  'pub fn bad() { unknown!(); }',
 ])assert.throws(()=>translateHttpResourceShadowCallerRust(value,input(value)),value);
 const wrong=input(source);wrong.files=wrong.files.map(row=>row.path==='src/caller.rs'?{...row,source:source+'\n'}:row);assert.throws(()=>translateHttpResourceShadowCallerRust(source,wrong));
});
test('complete original unit syntax and lexical sources retain both rule phases and exact inverses',limits,()=>{
 const plan=prepareHttpResourceNativeUnitSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
