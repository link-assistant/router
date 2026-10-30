// Independent lexical binding SOURCE. All translation/target cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHttpResourceRustBindings} from '../http-resource-native-bindings.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNativeBindingSources} from '../../prepare-http-resource-native-binding-sources.mjs';
const limits={timeout:60000};
const source=`// 🌍 original offsets and comments stay intact\r
pub fn twice(input: bool) -> bool { let input = (!input); let input = (!input); input }
pub fn once(input: bool) -> bool { let input = (!input); input }
pub fn nested(input: bool) -> bool { { let input = false; } input }
pub fn identity<T>(value: T) -> T { let value = value; value }
pub fn forward<T>(identity: T) -> T { identity }
pub fn collision(router_shadow_0: bool) -> bool { let router_shadow_0 = (!router_shadow_0); router_shadow_0 }
`;
function input(value,sourcePath='src/caller.rs'){return {sourcePath,javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('original sequential initializers lexical exits generic moves and fresh-name collisions retain behavior',limits,async()=>{
 const result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory;assert.equal(result.originalRust,source);assert.equal(history.equation.inverse,source);assert.equal(history.lexicalBindings.equation.inverse,source);assert.ok(history.lexicalBindings.edits.length>0);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));assert.match(history.normalizedSource,/router_shadow_/u);assert.ok(history.normalizedSource.includes('// 🌍 original offsets and comments stay intact\r\n'));
 await verifyHttpResourceTargets(result,api=>{for(const flag of [false,true]){assert.equal(api.twice(flag),flag);assert.equal(api.once(flag),!flag);assert.equal(api.nested(flag),flag);assert.equal(api.collision(flag),!flag);}const original=Object.freeze({original:true});assert.strictEqual(api.identity(original),original);assert.strictEqual(api.forward(original),original);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 assert.throws(()=>translateHttpResourceCallerRust(source,input(source)));
});
test('actual moved child callbacks can shadow an outer cancellation name with distinct source bindings',limits,async()=>{
 const native='pub async fn selected(cancellation: &crate::translation_async_control_core::Cancellation) -> Result<bool, crate::translation_async_control_core::ControlError> { crate::translation_async_control_core::with_deadline(1000_u64, cancellation, |cancellation: crate::translation_async_control_core::Cancellation| async move { crate::translation_async_control_core::cancel_is_set(&cancellation) }).await }\n',result=translateHttpResourceShadowCallerRust(native,input(native));assert.equal(result.originalRust,native);assert.ok(result.httpResourceRustSourceHistory.lexicalBindings.edits.length>=2);await verifyHttpResourceTargets(result,async(api,{control})=>assert.deepEqual(await api.selected(control.router_cancel_new()),{$:'Ok',field0:false}));assert.ok(sameRustSourceSyntax(result.httpResourceRustSourceHistory.normalizedSource,result.rust));
});
test('renaming cannot grant hidden pattern macro guard function-value move or original-source authority',limits,()=>{
 for(const value of [
  'pub fn bad(input: bool) -> bool { let input = match input { true => false, false => true }; input }',
  'pub fn bad(input: bool) -> bool { assert!(input); let input = false; input }',
  'pub fn bad(input: bool) -> bool { let __ro_saved = input; __ro_saved }',
  'pub fn bad(input: bool) -> bool { let input = input; input() }',
  'pub fn bad(input: bool) -> bool { let (input, input) = input; input }',
  'pub fn bad(input: bool) -> bool { let _ = input; _ }',
  'pub fn bad(input: bool) -> bool { let return = input; return }',
 ])assert.throws(()=>normalizeHttpResourceRustBindings(value));
 const owning='pub fn bad(input: String) -> String { let input = input; let again = input; input }\n';assert.throws(()=>translateHttpResourceShadowCallerRust(owning,input(owning)));
 const duplicate='pub fn bad(input: bool, input: bool) -> bool { input }\n';assert.throws(()=>translateHttpResourceShadowCallerRust(duplicate,input(duplicate)));
 const wrong=input(source);wrong.files=wrong.files.map(row=>row.path==='src/caller.rs'?{...row,source:source+'\n'}:row);assert.throws(()=>translateHttpResourceShadowCallerRust(source,wrong));
 const changed=source.replace('(!input)','true'),plan=normalizeHttpResourceRustBindings(source),fresh=normalizeHttpResourceRustBindings(changed);assert.notEqual(plan.after,fresh.after);assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.namespaceAuthority,false);assert.equal(plan.crossInvocationCache,false);
});
test('the original canonical domain survives unsupported normalization without accepting new source',limits,()=>{
 const native='pub fn chosen() -> bool { true }\n',original=translateHttpResourceCallerRust(native,input(native)),result=translateHttpResourceShadowCallerRust(native,input(native));assert.ok(sameRustSourceSyntax(original.rust,result.rust));assert.equal(result.httpResourceRustSourceHistory.lexicalBindings.edits.length,0);
});
test('complete source reader translator unit and export histories retain both phases and all original inverses',limits,()=>{
 const plan=prepareHttpResourceNativeBindingSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
