// Independent original value/error match SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHttpResourceRustBindings} from '../http-resource-native-bindings.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNativeResultMatchSources} from '../../prepare-http-resource-native-result-match-sources.mjs';
const limits={timeout:60000};
const source=`pub fn ordinary(value: Result<bool, String>) -> Result<bool, String> { let value = match value { Ok(value) => value, Err(error) => return Err(error) }; Ok(value) }
pub fn reversed(value: Result<bool, String>) -> Result<bool, String> { let selected: bool = match value { Err(error) => { return Err(error); }, Ok(payload) => { payload } }; Ok(selected) }
pub fn called(flag: bool) -> Result<bool, String> { let value = match crate::translation_owned_results_core::bool_ok(flag) { Ok(payload) => payload, Err(error) => return Err(error) }; Ok(value) }
pub fn control(value: Result<bool, crate::translation_async_control_core::ControlError>) -> Result<bool, crate::translation_async_control_core::ControlError> { let value = match value { Ok(payload) => payload, Err(error) => { return Err(error); } }; Ok(value) }
`;
function input(value,sourcePath='src/caller.rs'){return {sourcePath,javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('original Result extraction preserves both exact successful values and exact captured errors through checked propagation',limits,async()=>{
 const result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory;assert.equal(result.originalRust,source);assert.equal(history.equation.inverse,source);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));assert.ok(history.lexicalBindings.selections.some(row=>row.kind==='result-match-arms'));
 await verifyHttpResourceTargets(result,api=>{for(const flag of [false,true]){const value=Object.freeze({$:'Ok',field0:flag});assert.strictEqual(api.ordinary(value),value);assert.strictEqual(api.reversed(value),value);assert.strictEqual(api.control(value),value);assert.deepEqual(api.called(flag),value);}for(const text of ['','é😀','unavailable']){const error=Object.freeze({$:'Err',field0:text});assert.strictEqual(api.ordinary(error),error);assert.strictEqual(api.reversed(error),error);}for(const tag of ['Cancelled','Timeout','Closed']){const error=Object.freeze({$:'Err',field0:Object.freeze({$:tag})});assert.strictEqual(api.control(error),error);}});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('value/error captures cannot be replaced copied from an outer scope discarded converted across error families or accompanied by effects',limits,()=>{
 for(const expression of [
  'match value { Ok(payload) => false, Err(error) => return Err(error) }',
  'match value { Ok(payload) => payload, Err(error) => return Err(value) }',
  'match value { Ok(payload) => payload, Err(error) => return Err("changed") }',
  'match value { Ok(payload) => payload, Err(error) => { crate::translation_owned_results_core::bool_ok(true); return Err(error); } }',
  'match value { Ok(mut payload) => payload, Err(error) => return Err(error) }',
  'match value { Ok(payload) => payload, Err(_) => return Err(value) }',
  'match value { Ok(payload) => payload, _ => return Err(value) }',
 ]){const native='pub fn bad(value: Result<bool, String>) -> Result<bool, String> { let selected = '+expression+'; Ok(selected) }';assert.throws(()=>translateHttpResourceShadowCallerRust(native,input(native)),expression);}
 const cross='pub fn bad(value: Result<bool, String>) -> Result<bool, crate::translation_async_control_core::ControlError> { let selected = match value { Ok(payload) => payload, Err(error) => return Err(error) }; Ok(selected) }';assert.throws(()=>translateHttpResourceShadowCallerRust(cross,input(cross)));
 const shadow='pub fn bad(value: Result<bool, String>, Err: bool) -> Result<bool, String> { let selected = match value { Ok(payload) => payload, Err(error) => return Err(error) }; Ok(selected) }';assert.throws(()=>translateHttpResourceShadowCallerRust(shadow,input(shadow)));
 const wrong=input(source);wrong.files=wrong.files.map(row=>row.path==='src/caller.rs'?{...row,source:source+'\n'}:row);assert.throws(()=>translateHttpResourceShadowCallerRust(source,wrong));
});
test('original Result arm comments and previous initializer bindings remain in exact full source inverses',limits,()=>{
 const native='pub fn selected(value: Result<bool, String>) -> Result<bool, String> { let value = match /* input */ value { Ok(payload) => payload, Err(error) => { /* keep error */ return Err(error); } }; Ok(value) }',plan=normalizeHttpResourceRustBindings(native);assert.equal(plan.equation.inverse,native);assert.match(plan.after,/let router_shadow_\d+ = value\?;/u);assert.ok(plan.selections.some(row=>row.kind==='result-match-arms'&&row.source.includes('/* keep error */')));assert.equal(plan.semanticAuthority,false);assert.equal(plan.namespaceAuthority,false);assert.equal(plan.crossInvocationCache,false);
});
test('complete Result match sources retain both ordered phases and full source inverses',limits,()=>{
 const plan=prepareHttpResourceNativeResultMatchSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
