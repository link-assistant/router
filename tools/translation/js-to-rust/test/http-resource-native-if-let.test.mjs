// Independent original Option branch SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHttpResourceRustBindings} from '../http-resource-native-bindings.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNativeIfLetSources} from '../../prepare-http-resource-native-if-let-sources.mjs';
const limits={timeout:60000};
const source=`pub fn optional(value: Option<bool>) -> Option<bool> { if let Some(value) = value { return Some(value); } else { return None; } }
pub fn natural(value: Option<u64>) -> Option<u64> { if let Some(payload) = value { Some(payload) } else { return None; } }
pub fn signed(value: Option<i64>) -> Option<i64> { if let Some(payload) = value { return Some(payload); } else { return None; } }
pub fn text(value: Option<String>) -> Option<String> { if let Some(value) = value { Some(value) } else { return None; } }
pub fn composed(value: Option<bool>) -> Option<bool> { if let Some(first) = value { if let Some(second) = crate::translation_primitive_option_core::bool_some(first) { return Some(second); } else { return None; } } else { return None; } }
pub fn chained(flag: bool, value: Option<bool>) -> Option<bool> { if flag { return crate::translation_primitive_option_core::bool_some(false); } else if let Some(value) = value { return Some(value); } else { return None; } }
`;
function input(value,sourcePath='src/caller.rs'){return {sourcePath,javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('original Some branch extraction preserves absence numeric widths ownership and nested conditional returns',limits,async()=>{
 const result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory;assert.equal(result.originalRust,source);assert.equal(history.equation.inverse,source);assert.equal(history.lexicalBindings.equation.inverse,source);assert.doesNotMatch(history.normalizedSource,/if\s+let/u);assert.match(history.normalizedSource,/\?;/u);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));assert.ok(history.lexicalBindings.selections.some(row=>row.kind==='option-if-lexical-block'));
 await verifyHttpResourceTargets(result,api=>{const none=Object.freeze({$:'None'});for(const name of ['optional','natural','signed','text','composed'])assert.deepEqual(api[name](none),none);for(const value of [false,true]){const some=Object.freeze({$:'Some',field0:value});assert.deepEqual(api.optional(some),some);assert.deepEqual(api.composed(some),some);assert.deepEqual(api.chained(false,some),some);assert.deepEqual(api.chained(true,some),{$:'Some',field0:false});}assert.deepEqual(api.chained(false,none),none);assert.deepEqual(api.chained(true,none),{$:'Some',field0:false});for(const integer of [0n,18446744073709551615n])assert.deepEqual(api.natural({$:'Some',field0:integer}),{$:'Some',field0:integer});for(const integer of [-9223372036854775808n,0n,9223372036854775807n])assert.deepEqual(api.signed({$:'Some',field0:integer}),{$:'Some',field0:integer});for(const value of ['','é😀','\0'])assert.deepEqual(api.text({$:'Some',field0:value}),{$:'Some',field0:value});assert.throws(()=>api.signed({$:'Some',field0:9223372036854775808n}),RangeError);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('generic owned payloads retain actual identity without asserting Option wrapper identity',limits,async()=>{
 const native='pub fn selected<T>(value: Option<T>) -> Option<T> { if let Some(value) = value { return Some(value); } else { return None; } }',result=translateHttpResourceShadowCallerRust(native,input(native));await verifyHttpResourceTargets(result,api=>{const value=Object.freeze({owned:17}),some=api.selected(Object.freeze({$:'Some',field0:value}));assert.equal(some.$,'Some');assert.strictEqual(some.field0,value);assert.deepEqual(api.selected(Object.freeze({$:'None'})),{$:'None'});});assert.equal(result.httpResourceRustSourceHistory.equation.inverse,native);
});
test('initializer scope branch-local shadowing fallback trivia and earlier loop returns retain complete original spans',limits,()=>{
 const native='pub fn selected(value: Option<bool>) -> Option<bool> { if /* condition */ let Some(/* pattern */ value) = value { return Some(value); } else { /* absent */ return None; } }',plan=normalizeHttpResourceRustBindings(native);assert.equal(plan.equation.inverse,native);assert.match(plan.after,/\{ \/\* condition \*\/ let\s+\/\* pattern \*\/ router_shadow_/u);assert.match(plan.after,/= value \?;/u);assert.ok(plan.selections.some(row=>row.kind==='option-if-none-alternative'&&row.source.includes('/* absent */')));assert.equal(plan.semanticAuthority,false);assert.equal(plan.crossInvocationCache,false);
 const loop='pub fn selected(value: Option<bool>) -> Option<bool> { loop { if let Some(payload) = value { return Some(payload); } else { return None; } } }',loopPlan=normalizeHttpResourceRustBindings(loop);assert.match(loopPlan.after,/return Some\(payload\);/u);assert.equal(loopPlan.equation.inverse,loop);
 const literal='pub fn literal() -> &\'static str { "if let Some(value) = input else return None" }';assert.equal(normalizeHttpResourceRustBindings(literal).after,literal);
});
test('wider fallback effects missing return scopes malformed types and nonmatching patterns remain refused',limits,()=>{
 for(const declaration of [
  'pub fn bad(value: Option<bool>) -> Option<bool> { if let Some(value) = value { Some(value) } else { crate::translation_primitive_option_core::bool_none(); return None; } }',
  'pub fn bad(value: Option<bool>) -> Option<bool> { if let Some(value) = value { Some(value) } else { return Some(false); } }',
  'pub fn bad(value: Option<bool>) -> Option<bool> { if let Some(value) = value { Some(value) } else { None } }',
  'pub fn bad(value: Option<bool>) -> Option<bool> { if let Some(mut value) = value { value = false; Some(value) } else { return None; } }',
  'pub fn bad(value: Option<bool>) -> Option<bool> { if let Some(Some(value)) = value { Some(value) } else { return None; } }',
  'pub fn bad(input: Option<bool>) -> Option<bool> { if let Some(value) = input { crate::translation_primitive_option_core::bool_some(value); } else { return None; } Some(value) }',
  'pub fn bad(value: bool) -> bool { if let Some(value) = value { value } else { return None; } }',
  'pub fn bad(value: Option<bool>) -> Option<bool> { if let Some(value) = value { Some(value) } }',
 ])assert.throws(()=>translateHttpResourceShadowCallerRust(declaration,input(declaration)),declaration);
 const wrong=input(source);wrong.files=wrong.files.map(row=>row.path==='src/caller.rs'?{...row,source:source+'\n'}:row);assert.throws(()=>translateHttpResourceShadowCallerRust(source,wrong));
});
test('three complete if-let source equations retain native owner bounds both phases and inverses',limits,()=>{
 const plan=prepareHttpResourceNativeIfLetSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
