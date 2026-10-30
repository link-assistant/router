// Independent original Option match source. All cases are drafted and unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHttpResourceRustBindings} from '../http-resource-native-bindings.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNativeOptionMatchSources} from '../../prepare-http-resource-native-option-match-sources.mjs';
const limits={timeout:60000};
const source=`pub fn ordinary(value: Option<bool>) -> Option<bool> { let value = match value { Some(value) => value, None => return None }; Some(value) }
pub fn reversed(value: Option<bool>) -> Option<bool> { let selected = match value { None => { return None; }, Some(payload) => { payload } }; Some(selected) }
pub fn signed(value: Option<i64>) -> Option<i64> { let value: i64 = match value { Some(payload) => payload, None => return None }; Some(value) }
pub fn text(value: Option<String>) -> Option<String> { let value = match value { Some(payload) => payload, None => { return None; } }; Some(value) }
`;
function input(value,sourcePath='src/caller.rs'){return {sourcePath,javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual successful identity and absent return arms preserve Option payloads order scopes widths and ownership',limits,async()=>{
 const result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory;assert.equal(result.originalRust,source);assert.equal(history.equation.inverse,source);assert.doesNotMatch(history.normalizedSource,/match value/u);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));assert.ok(history.lexicalBindings.selections.some(row=>row.kind==='option-match-arms'));
 await verifyHttpResourceTargets(result,api=>{const none=Object.freeze({$:'None'});for(const name of ['ordinary','reversed','signed','text'])assert.deepEqual(api[name](none),none);for(const flag of [false,true]){const value=Object.freeze({$:'Some',field0:flag});assert.strictEqual(api.ordinary(value),value);assert.strictEqual(api.reversed(value),value);}for(const integer of [-9223372036854775808n,0n,9223372036854775807n])assert.deepEqual(api.signed(Object.freeze({$:'Some',field0:integer})),{$:'Some',field0:integer});const value=Object.freeze({$:'Some',field0:'é😀'});assert.strictEqual(api.text(value),value);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('match arms cannot change values binders fallback effects constructor owners or type obligations',limits,()=>{
 for(const expression of [
  'match value { Some(payload) => false, None => return None }',
  'match value { Some(payload) => value, None => return None }',
  'match value { Some(payload) => payload, None => return crate::translation_primitive_option_core::bool_some(true) }',
  'match value { Some(payload) => payload, None => { crate::translation_primitive_option_core::bool_none(); return None; } }',
  'match value { Some(mut payload) => payload, None => return None }',
  'match value { Some(Some(payload)) => payload, None => return None }',
  'match value { Some(payload) => payload, _ => return None }',
  'match value { Some(payload) => payload, None => return None, None => return None }',
 ]){const native='pub fn bad(value: Option<bool>) -> Option<bool> { let selected = '+expression+'; Some(selected) }';assert.throws(()=>translateHttpResourceShadowCallerRust(native,input(native)),expression);}
 const wrongType='pub fn bad(value: Option<bool>) -> Option<bool> { let value: i64 = match value { Some(payload) => payload, None => return None }; Some(value) }';assert.throws(()=>translateHttpResourceShadowCallerRust(wrongType,input(wrongType)));
 const shadow='pub fn bad(value: Option<bool>, None: Option<bool>) -> Option<bool> { let selected = match value { Some(payload) => payload, None => return None }; Some(selected) }';assert.throws(()=>translateHttpResourceShadowCallerRust(shadow,input(shadow)));
 const changed=input(source);changed.files=changed.files.map(row=>row.path==='src/caller.rs'?{...row,source:source+'\n'}:row);assert.throws(()=>translateHttpResourceShadowCallerRust(source,changed));
});
test('actual native typed Result propagation also checks the lexical payload rather than its retained complete carrier',limits,async()=>{
 const native='pub fn selected(flag: bool) -> Result<bool, String> { let value: bool = crate::translation_owned_results_core::bool_ok(flag)?; Ok(value) }\n',result=translateHttpResourceShadowCallerRust(native,input(native));assert.ok(sameRustSourceSyntax(result.httpResourceRustSourceHistory.normalizedSource,result.rust));await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.selected(false),{$:'Ok',field0:false});assert.deepEqual(api.selected(true),{$:'Ok',field0:true});});assert.equal(result.httpResourceRustSourceHistory.equation.inverse,native);
});
test('match substitutions retain exact original initializer references and every removed arm comment in full inverses',limits,()=>{
 const native='pub fn selected(value: Option<bool>) -> Option<bool> { let value = match /* original */ value { Some(payload) => payload, None => { /* absent */ return None; } }; Some(value) }',plan=normalizeHttpResourceRustBindings(native);assert.equal(plan.equation.inverse,native);assert.match(plan.after,/let router_shadow_\d+ = value\?;/u);assert.ok(plan.selections.some(row=>row.kind==='option-match-arms'&&row.source.includes('/* absent */')));assert.equal(plan.namespaceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.crossInvocationCache,false);
});
test('all original match syntax source copies retain both phases and exact source inverses',limits,()=>{
 const plan=prepareHttpResourceNativeOptionMatchSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
