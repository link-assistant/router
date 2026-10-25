// Independent shared iteration regression SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceSharedIterationSources} from '../../prepare-http-resource-shared-iteration-sources.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_object as object,json_macro_array as array} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},imports=`import {router_state_json_values_copy as copyValues,router_state_json_append as append,router_state_json_object_has as has} from './runtime/json-state-runtime.mjs';
import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {json_macro_array as array} from './runtime/json-macro-runtime.mjs';
`;
const source=imports+`/** @param {Parameters<typeof copyValues>[0]} values */ export function gathered(values){let result=array([]);for(const item of values){result=append(result,copy(item));}return result;}
/** @param {Parameters<typeof copyValues>[0]} values */ export function untilStop(values){let result=array([]);for(const item of values){if(has(item,'stop'))break;if(has(item,'skip'))continue;result=append(result,copy(item));}return result;}
/** @param {Parameters<typeof copyValues>[0]} values */ export function ownedGathered(values){const owned=copyValues(values);let result=array([]);for(const item of owned){result=append(result,copy(item));}return result;}
/** @param {Parameters<typeof copyValues>[0]} values @param {Parameters<typeof copy>[0]} fallback */ export function first(values,fallback){for(const item of values){return item;}return fallback;}
/** @param {Parameters<typeof copyValues>[0]} values */ export function nested(values){let result=array([]);for(const outer of values){for(const inner of values){result=append(result,copy(inner));break;}result=append(result,copy(outer));}return result;}
`;
function input(value,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('whole shared and owned-list borrowing preserves empty values identity order and nearest-loop exits',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/for item in values/u);assert.match(result.rust,/for item in &owned/u);assert.match(result.rust,/first<'a>/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 const first=object([['first',text('é😀')]]),skip=object([['skip',nil()]]),last=object([['last',nil()]]),stop=object([['stop',nil()]]),after=object([['after',nil()]]),values=Object.freeze([first,skip,last,stop,after]),empty=Object.freeze([]),fallback=text('fallback');await verifyHttpResourceTargets(result,async api=>{for(const name of ['gathered','ownedGathered']){assert.deepEqual(api[name](values),array(values));assert.deepEqual(api[name](empty),array([]));}assert.deepEqual(api.untilStop(values),array([first,last]));assert.deepEqual(api.untilStop(empty),array([]));assert.strictEqual(api.first(values,fallback),first);assert.strictEqual(api.first(empty,fallback),fallback);assert.deepEqual(api.nested(Object.freeze([first,last])),array([first,first,first,last]));assert.deepEqual(api.nested(empty),array([]));});
});
test('actual loop-bound element source cannot be forged in serialized semantic meta',limits,()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='gathered').flow.steps.find(row=>row.kind==='for-shared-json').iterable.name='missing';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));
});
test('iterator consumption mutation escaping local roots async syntax destructuring and binding shadows refuse',limits,()=>{
 for(const body of [
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){let owned=copyValues(values);for(const item of owned){owned=copyValues(values);}return owned;}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){for(const item of copyValues(values)){return copy(item);}return array([]);}',
  '/** @param {Parameters<typeof copyValues>[0]} values @param {Parameters<typeof copy>[0]} fallback */ export function bad(values,fallback){const owned=copyValues(values);for(const item of owned){return item;}return fallback;}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){for(let item of values){return copy(item);}return array([]);}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){for(const [item] of values){return copy(item);}return array([]);}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){for(const values of values){return copy(values);}return array([]);}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){for(const item of values) return copy(item);return array([]);}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){for(const item of values){return item;}return array([]);}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(value,input(value)),body);}
});
test('whole handwritten canonical native shared iteration reproduces every original token',limits,()=>{
 for(const native of [
  'pub fn gathered(values: &[crate::translation_core::Json]) -> crate::translation_core::Json { let mut result = crate::translation_core::json!([]); for item in values { result = crate::translation_state_core::json_append(result, crate::translation_core::json_copy(item)); } result }\n',
  "pub fn first<'a>(values: &'a [crate::translation_core::Json], fallback: &'a crate::translation_core::Json) -> &'a crate::translation_core::Json { for item in values { return item; } fallback }\n",
 ]){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));}
});
test('complete original flow native reader and native projection preserve ordered full inverses',limits,()=>{
 const plan=prepareHttpResourceSharedIterationSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
