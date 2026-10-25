// Independent original let-else SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHttpResourceRustBindings} from '../http-resource-native-bindings.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNativeOptionPatternSources} from '../../prepare-http-resource-native-option-pattern-sources.mjs';
const limits={timeout:60000};
const source=`pub fn optional(value: Option<bool>) -> Option<bool> { let Some(value) = value else { return None; }; Some(value) }
pub fn composed(value: Option<bool>) -> Option<bool> { let Some(first) = value else { return None; }; let Some(second) = crate::translation_primitive_option_core::bool_some(first) else { return None; }; Some(second) }
pub fn signed(value: Option<i64>) -> Option<i64> { let Some(value) = value else { return None; }; Some(value) }
pub fn natural(value: Option<u64>) -> Option<u64> { let Some(value) = value else { return None; }; Some(value) }
pub fn text(value: Option<String>) -> Option<String> { let Some(value) = value else { return None; }; Some(value) }
`;
function input(value,sourcePath='src/caller.rs'){return {sourcePath,javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual dominating Some/None let-else checks preserve absent and owned successful payloads through canonical propagation',limits,async()=>{
 const result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory;assert.equal(result.originalRust,source);assert.equal(history.equation.inverse,source);assert.equal(history.lexicalBindings.equation.inverse,source);assert.match(history.normalizedSource,/\?;/u);assert.doesNotMatch(history.normalizedSource,/let Some/u);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));
 await verifyHttpResourceTargets(result,api=>{const none=Object.freeze({$:'None'});for(const name of ['optional','composed','signed','natural','text'])assert.deepEqual(api[name](none),none);for(const flag of [false,true]){const value=Object.freeze({$:'Some',field0:flag});assert.strictEqual(api.optional(value),value);assert.deepEqual(api.composed(value),value);}for(const integer of [-9223372036854775808n,0n,9223372036854775807n])assert.deepEqual(api.signed(Object.freeze({$:'Some',field0:integer})),{$:'Some',field0:integer});for(const integer of [0n,18446744073709551615n])assert.deepEqual(api.natural(Object.freeze({$:'Some',field0:integer})),{$:'Some',field0:integer});const text=Object.freeze({$:'Some',field0:'é😀'});assert.strictEqual(api.text(text),text);assert.throws(()=>api.signed(Object.freeze({$:'Some',field0:9223372036854775808n})),RangeError);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('otherwise effects changed constructors mutable or nested patterns and shadowed prelude names cannot acquire propagation permission',limits,()=>{
 for(const declaration of [
  'pub fn bad(value: Option<bool>) -> Option<bool> { let Some(value) = value else { return crate::translation_primitive_option_core::bool_some(true); }; Some(value) }',
  'pub fn bad(value: Option<bool>) -> Option<bool> { let Some(value) = value else { crate::translation_primitive_option_core::bool_none(); return None; }; Some(value) }',
  'pub fn bad(value: Option<bool>) -> Option<bool> { let Some(mut value) = value else { return None; }; value = false; Some(value) }',
  'pub fn bad(value: Option<bool>) -> Option<bool> { let Some(Some(value)) = value else { return None; }; Some(value) }',
  'pub fn bad(value: Option<bool>) -> Option<bool> { let Some(value) = value else { None }; Some(value) }',
  'pub fn bad(Some: Option<bool>) -> Option<bool> { let Some(value) = Some else { return None; }; Some(value) }',
  'pub fn bad(value: Option<bool>, None: Option<bool>) -> Option<bool> { let Some(value) = value else { return None; }; Some(value) }',
 ])assert.throws(()=>translateHttpResourceShadowCallerRust(declaration,input(declaration)),declaration);
 for(const constructor of ['Some','None','Ok','Err','Box']){const value='pub fn bad(value: bool) -> bool { let '+constructor+' = value; '+constructor+' }';assert.throws(()=>normalizeHttpResourceRustBindings(value),constructor);}
 const wrong=input(source);wrong.files=wrong.files.map(row=>row.path==='src/caller.rs'?{...row,source:source+'\n'}:row);assert.throws(()=>translateHttpResourceShadowCallerRust(source,wrong));
});
test('actual let-else source history retains prior initializer binding and exact removed fallback trivia',limits,()=>{
 const native='pub fn selected(value: Option<bool>) -> Option<bool> { let Some(/* pattern */ value) = value else { /* absent */ return None; }; Some(value) }',plan=normalizeHttpResourceRustBindings(native);assert.equal(plan.equation.inverse,native);assert.match(plan.after,/let\s+\/\* pattern \*\/ router_shadow_/u);assert.match(plan.after,/= value\s+\?;/u);assert.ok(plan.selections.some(row=>row.kind==='option-none-alternative'&&row.source.includes('/* absent */')));assert.equal(plan.semanticAuthority,false);assert.equal(plan.namespaceAuthority,false);assert.equal(plan.crossInvocationCache,false);
});
test('all original Option pattern sources retain both ordered phases and full source inverses',limits,()=>{
 const plan=prepareHttpResourceNativeOptionPatternSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
