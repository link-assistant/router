// Independent collection/callback regression SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceCallerContract} from '../http-resource-caller-contracts.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceCallbackSources} from '../../prepare-http-resource-callback-sources.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_object as object,json_macro_array as array} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},imports=`import {router_state_json_values_copy as copyValues,router_state_json_append as append,router_state_json_object_has as has,router_state_json_array_len as length} from './runtime/json-state-runtime.mjs';
import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {router_core_json_map as map,router_core_json_filter_map as filterMap} from './runtime/json-collections-runtime.mjs';
import {router_core_json_filter as filter,router_core_json_any as any,router_core_json_all as all,router_core_json_find as find,router_core_json_fold as fold} from './runtime/json-iteration-runtime.mjs';
import {router_carrier_json_some as some,router_carrier_json_none as none} from './runtime/owned-outcome-runtime.mjs';
import {json_macro_array as array} from './runtime/json-macro-runtime.mjs';
`;
const source=imports+`/** @param {Parameters<typeof copyValues>[0]} values */ export function mapped(values){return map(values,copiedValue);}
/** @param {Parameters<typeof copyValues>[0]} values */ export function selected(values){return filter(values,(kept));}
/** @param {Parameters<typeof copyValues>[0]} values */ export function inlineSelected(values){return filter(values,value=>has(value,'keep'));}
/** @param {Parameters<typeof copyValues>[0]} values */ export function optionalMap(values){return filterMap(values,value=>{if(has(value,'keep')){return some(value);}else{return none();}});}
/** @param {Parameters<typeof copyValues>[0]} values */ export function found(values){return find(values,value=>has(value,'keep'));}
/** @param {Parameters<typeof copyValues>[0]} values */ export function anyKept(values){return any(values,value=>has(value,'keep'));}
/** @param {Parameters<typeof copyValues>[0]} values */ export function allKept(values){return all(values,value=>{const present=has(value,'keep');if(present){return true;}else{return false;}});}
/** @param {Parameters<typeof copyValues>[0]} values */ export function folded(values){return fold(values,array([]),(acc,value)=>append(acc,copy(value)));}
/** @param {Parameters<typeof copyValues>[0]} values */ export function never(values){return any(values,value=>false);}
/** @param {Parameters<typeof copyValues>[0]} values */ export function nullMatched(values){return find(values,value=>true);}
/** @param {Parameters<typeof copyValues>[0]} values */ export function shortAny(values){return any(values,value=>{if(has(value,'keep')){return true;}return length(value)===0n;});}
/** @param {Parameters<typeof copyValues>[0]} values */ export function shortAll(values){return all(values,value=>{if(has(value,'stop')){return false;}return length(value)===0n;});}
export function _value(){return null;}
/** @param {Parameters<typeof has>[0]} value */ function kept(value){return has(value,'keep');}
/** @param {Parameters<typeof has>[0]} value */ function copiedValue(value){return copy(value);}
`;
function input(value,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('whole local and capture-free inline collection callbacks preserve values variants order and strict TS targets',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/\|_value_: &crate::translation_core::Json\|/u);assert.match(result.rust,/\|acc: crate::translation_core::Json, value: &crate::translation_core::Json\|/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 const first=object([['keep',bool(true)],['value',text('é😀')]]),middle=object([['skip',nil()]]),last=object([['keep',bool(false)]]),values=Object.freeze([first,middle,last]),matching=Object.freeze([first,last]);await verifyHttpResourceTargets(result,async api=>{assert.deepEqual(api.mapped(values),values);assert.notStrictEqual(api.mapped(values),values);for(const name of ['selected','inlineSelected','optionalMap'])assert.deepEqual(api[name](values),matching);assert.deepEqual(api.found(values),{$:'Some',field0:first});assert.equal(api.anyKept(values),true);assert.equal(api.allKept(values),false);assert.deepEqual(api.folded(values),array(values));assert.equal(api.never(values),false);const empty=Object.freeze([]);assert.equal(api.anyKept(empty),false);assert.equal(api.allKept(empty),true);assert.deepEqual(api.found(empty),{$:'None'});assert.deepEqual(api.nullMatched(Object.freeze([nil()])),{$:'Some',field0:nil()});assert.deepEqual(api.folded(empty),array([]));assert.equal(api.shortAny(Object.freeze([first,nil()])),true);assert.equal(api.shortAll(Object.freeze([object([['stop',nil()]]),nil()])),false);assert.throws(()=>api.shortAny(Object.freeze([nil()])),TypeError);});
});
test('callback contracts are immutable DATA and fresh semantic source rejects forged callback flows',limits,()=>{
 const contract=httpResourceCallerContract('router_core_json_filter');assert.throws(()=>{contract.callbackContract.ret='json';},TypeError);assert.throws(()=>{contract.callbackContract.args[0]='u64';},TypeError);
 const result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='inlineSelected').flow.tail.value.args[1].flow.type='json';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));
});
test('captures async callbacks wrong domains parameter annotations missing owned copies and standard constructor shadows refuse',limits,()=>{
 for(const body of [
  '/** @param {Parameters<typeof copyValues>[0]} values @param {boolean} fallback */ export function bad(values,fallback){return filter(values,value=>fallback);}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){return filter(values,async value=>has(value,\'keep\'));}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){return map(values,value=>value);}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){return filter(values,value=>copy(value));}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){return fold(values,array([]),value=>copy(value));}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){return map(values,predicate);}/** @param {Parameters<typeof has>[0]} value */ function predicate(value){return has(value,\'keep\');}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(value,input(value)),body);}
 const typed=imports+'export function bad(values:Parameters<typeof copyValues>[0]){return filter(values,(value:Parameters<typeof has>[0])=>true);}';assert.throws(()=>translateHttpResourceCallerTypeScript(typed,input(typed,'caller.mts')));
 for(const name of ['Some','None','Ok','Err']){const value='export function '+name+'(){return null;}';assert.throws(()=>translateHttpResourceCallerJavaScript(value,input(value)),name);}
});
test('whole handwritten canonical native typed closures reproduce every original token',limits,()=>{
 for(const native of [
  'pub fn mapped(values: &[crate::translation_core::Json]) -> ::std::vec::Vec<crate::translation_core::Json> { crate::translation_core::json_map(values, |value: &crate::translation_core::Json| { crate::translation_core::json_copy(value) }) }\n',
  'pub fn never(values: &[crate::translation_core::Json]) -> bool { crate::translation_collections_core::json_any(values, |_value: &crate::translation_core::Json| { false }) }\n',
 ]){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));}
});
test('complete original contracts flow dependency graph reader projection and source histories retain both inverses',limits,()=>{
 const plan=prepareHttpResourceCallbackSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
