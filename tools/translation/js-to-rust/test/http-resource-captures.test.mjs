// Independent read-only capture regression SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceCaptureSources} from '../../prepare-http-resource-capture-sources.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_object as object} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},imports=`import {router_state_json_values_copy as copyValues,router_state_json_object_has as has} from './runtime/json-state-runtime.mjs';
import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {router_core_json_map as map} from './runtime/json-collections-runtime.mjs';
import {router_core_json_filter as filter,router_core_json_any as any} from './runtime/json-iteration-runtime.mjs';
`;
const source=imports+`/** @param {Parameters<typeof copyValues>[0]} values @param {boolean} fallback */ export function flagSelected(values,fallback){return filter(values,value=>fallback);}
/** @param {Parameters<typeof copyValues>[0]} values @param {string} key */ export function selected(values,key){return filter(values,value=>has(value,key));}
/** @param {Parameters<typeof copyValues>[0]} values @param {Parameters<typeof copy>[0]} template @param {boolean} fallback */ export function replaced(values,template,fallback){return map(values,value=>{if(fallback){return copy(value);}return copy(template);});}
/** @param {Parameters<typeof copyValues>[0]} values @param {Parameters<typeof copyValues>[0]} other @param {string} key */ export function nested(values,other,key){return any(values,value=>any(other,probe=>has(value,key)));}
/** @param {Parameters<typeof copyValues>[0]} values @param {string} key */ export function shadowed(values,key){return filter(values,key=>has(key,'keep'));}
/** @param {Parameters<typeof copyValues>[0]} values */ export function localFlag(values){let allowed=true;const result=filter(values,value=>allowed);allowed=false;return result;}
`;
function input(value,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('immediate synchronous callbacks read genuine scalar JSON and slice captures with lexical scope',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/\|value: &crate::translation_core::Json\| \{ crate::translation_collections_core::json_any\(other/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 const first=object([['keep',text('é😀')]]),second=object([['other',nil()]]),template=object([['template',nil()]]),values=Object.freeze([first,second]),empty=Object.freeze([]);await verifyHttpResourceTargets(result,async api=>{assert.deepEqual(api.flagSelected(values,true),values);assert.deepEqual(api.flagSelected(values,false),empty);assert.deepEqual(api.flagSelected(empty,true),empty);assert.deepEqual(api.selected(values,'keep'),[first]);assert.deepEqual(api.selected(values,'missing'),empty);assert.deepEqual(api.replaced(values,template,true),values);assert.deepEqual(api.replaced(values,template,false),[template,template]);assert.equal(api.nested(values,values,'keep'),true);assert.equal(api.nested(values,empty,'keep'),false);assert.equal(api.nested(empty,values,'keep'),false);assert.deepEqual(api.shadowed(values,'other'),[first]);assert.deepEqual(api.localFlag(values),values);});
});
test('complete native closure scopes reproduce captured originals in both source directions',limits,()=>{
 for(const native of [
  'pub fn selected(values: &[crate::translation_core::Json], key: &str) -> ::std::vec::Vec<crate::translation_core::Json> { crate::translation_collections_core::json_filter(values, |value: &crate::translation_core::Json| { crate::translation_state_core::json_object_has(value, key) }) }\n',
  'pub fn flag_selected(values: &[crate::translation_core::Json], fallback: bool) -> ::std::vec::Vec<crate::translation_core::Json> { crate::translation_collections_core::json_filter(values, |_value: &crate::translation_core::Json| { fallback }) }\n',
 ]){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));}
});
test('captured mutation owned consumption and stored functions still require independent rules',limits,()=>{
 for(const body of [
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){let flag=false;return any(values,value=>{flag=true;return flag;});}',
  '/** @param {Parameters<typeof copyValues>[0]} values @param {Parameters<typeof copy>[0]} template */ export function bad(values,template){const owned=copy(template);return map(values,value=>owned);}',
  '/** @param {Parameters<typeof copyValues>[0]} values @param {Parameters<typeof copy>[0]} template */ export function bad(values,template){const owned=copy(template);return filter(values,value=>has(owned,\'keep\'));}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){const predicate=value=>true;return any(values,predicate);}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(value,input(value)),body);}
 const result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta),flow=meta.functions.find(row=>row.name==='selected').flow.tail.value.args[1].flow;flow.captures[0].type='json';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));
});
test('original source histories retain both substitutions and migrated original positive workload',limits,()=>{
 const plan=prepareHttpResourceCaptureSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
