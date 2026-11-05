// Independently authored original control SOURCE. All cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHttpResourceRustBindings} from '../http-resource-native-bindings.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNativeControlSources} from '../../prepare-http-resource-native-control-sources.mjs';
const limits={timeout:60000};
const source=`// return and else if inside this comment stay original\r
pub fn early(flag: bool) -> bool { if flag { return false; } return true; }
pub fn choices(first: bool, second: bool) -> bool { if first { return true; } else if second { return false; } else { return true; } }
pub fn neither(first: bool, second: bool) -> bool { if first { return false; } else if second { return false; } return true; }
pub fn mutable(flag: bool) -> bool { let mut value: bool = false; if flag { value = true; } return value; }
pub fn loop_return(flag: bool) -> bool { while flag { return false; } return true; }
pub fn identity<T>(value: T) -> T { return value; }
`;
function input(value,sourcePath='src/caller.rs'){return {sourcePath,javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual final returns optional else and else-if chains preserve early exits mutation generic moves and lexical scopes',limits,async()=>{
 const result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory;assert.equal(result.originalRust,source);assert.equal(history.equation.inverse,source);assert.equal(history.lexicalBindings.equation.inverse,source);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));assert.ok(history.lexicalBindings.controls.some(row=>row.kind==='empty-else'));assert.ok(history.lexicalBindings.controls.some(row=>row.kind==='else-if-close'));assert.ok(history.normalizedSource.includes('// return and else if inside this comment stay original\r\n'));
 await verifyHttpResourceTargets(result,api=>{for(const flag of [false,true]){assert.equal(api.early(flag),!flag);assert.equal(api.mutable(flag),flag);assert.equal(api.loop_return(flag),!flag);}for(const first of [false,true])for(const second of [false,true]){assert.equal(api.choices(first,second),first||!second);assert.equal(api.neither(first,second),!first&&!second);}const original=Object.freeze({original:true});assert.strictEqual(api.identity(original),original);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('a callback final return exits its actual async child while an inner loop return keeps its function target',limits,async()=>{
 const native='pub async fn selected(cancellation: &crate::translation_async_control_core::Cancellation) -> Result<bool, crate::translation_async_control_core::ControlError> { return crate::translation_async_control_core::with_deadline(1000_u64, cancellation, |child: crate::translation_async_control_core::Cancellation| async move { return crate::translation_async_control_core::cancel_is_set(&child); }).await; }\n',result=translateHttpResourceShadowCallerRust(native,input(native));await verifyHttpResourceTargets(result,async(api,{control})=>assert.deepEqual(await api.selected(control.router_cancel_new()),{$:'Ok',field0:false}));assert.equal(result.httpResourceRustSourceHistory.equation.inverse,native);
 const loop='pub fn selected(flag: bool) -> bool { while flag { return false; } return true; }',plan=normalizeHttpResourceRustBindings(loop);assert.match(plan.after,/while flag \{ return false; \}/u);assert.doesNotMatch(plan.after,/return true/u);assert.equal(plan.equation.inverse,loop);
});
test('control spelling cannot admit missing values bad branch types unknown patterns incomplete source or forged origins',limits,()=>{
 for(const value of [
  'pub fn bad(flag: bool) -> bool { if flag { 1_u64 } return true; }',
  'pub fn bad(flag: bool) -> bool { if flag { return true; } }',
  'pub fn bad(flag: bool) -> bool { if let Some(value) = flag { return value; } return true; }',
  'pub fn bad(flag: bool) -> bool { if flag { return true; } else if { false } }',
  'pub fn bad(flag: bool) -> bool { unknown!(); return flag; }',
  'pub fn bad(flag: bool) -> bool { return; }',
 ])assert.throws(()=>translateHttpResourceShadowCallerRust(value,input(value)),value);
 const data=input(source);data.files=data.files.map(row=>row.path==='src/caller.rs'?{...row,source:source.replace('return true;','return false;')}:row);assert.throws(()=>translateHttpResourceShadowCallerRust(source,data));
 const text='pub fn literal() -> &str { "return else if" }',plan=normalizeHttpResourceRustBindings(text);assert.equal(plan.after,text);assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.crossInvocationCache,false);
});
test('all original control source copies retain both rule phases and exact complete inverses',limits,()=>{
 const plan=prepareHttpResourceNativeControlSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
