// Independent JSON storage caller regression SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceJsonStateSources} from '../../prepare-http-resource-json-state-sources.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_u64 as scalar,json_macro_array as array,json_macro_object as object} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},imports=`import {router_core_json_copy as copy,router_core_json_with_field as field,router_core_json_parse as parse} from './runtime/json-update-runtime.mjs';
import {router_state_json_append as append,router_state_json_with_index as replace,router_state_json_without_field as remove,router_state_json_merge as merge,router_state_json_object_keys as keys,router_state_json_array_len as length,router_state_json_object_has as has} from './runtime/json-state-runtime.mjs';
import {json_macro_array as array,json_macro_string as text,json_macro_u64 as scalar} from './runtime/json-macro-runtime.mjs';
import {router_integer_u64_saturating_add as increment} from './runtime/integer-runtime.mjs';
import {router_carrier_json_some as some} from './runtime/owned-outcome-runtime.mjs';
`;
const source=imports+`/** @param {Parameters<typeof length>[0]} base @param {Parameters<typeof length>[0]} patch */ export function patchObject(base,patch){let current=copy(base);current=field(current,'greeting',text('é😀'));if(has(current,'remove')){current=remove(current,'remove');}current=merge(current,patch);return current;}
export function arrayBuilt(){let current=array([]);let count=0n;while(count<3n){current=append(current,scalar(count));count=increment(count,1n);}return current;}
/** @param {Parameters<typeof length>[0]} base */ export function replaced(base){let current=copy(base);current=replace(current,0n,scalar(9n));return current;}
/** @param {Parameters<typeof length>[0]} base */ export function objectKeys(base){return keys(base);}
/** @param {Parameters<typeof length>[0]} base */ export function arrayLength(base){return length(base);}
/** @param {string} input */ export function parsed(input){const value=parse(input);if(value.$==='None'){return value;}const base=value.field0;return some(field(base,'parsed',scalar(1n)));}
/** @param {string} input */ export function rawParse(input){return parse(input);}
`;
function input(value,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('existing owned JSON storage parse and loop operations agree under JS and strict TS',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/let mut current/u);assert.match(result.rust,/crate::translation_state_core::json_append/u);assert.match(result.rust,/crate::translation_core::json_parse/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 const base=object([['keep',scalar(7n)],['remove',nil()]]),patch=object([['added',text('λ')]]),expected=object([['keep',scalar(7n)],['greeting',text('é😀')],['added',text('λ')]]);
 await verifyHttpResourceTargets(result,async api=>{assert.deepEqual(api.patchObject(base,patch),expected);assert.deepEqual(api.patchObject(nil(),patch),object([['greeting',text('é😀')],['added',text('λ')]]));assert.deepEqual(api.arrayBuilt(),array([scalar(0n),scalar(1n),scalar(2n)]));assert.deepEqual(api.replaced(array([nil(),text('last')])),array([scalar(9n),text('last')]));assert.deepEqual(api.objectKeys(base),array([text('keep'),text('remove')]));assert.equal(api.arrayLength(array([nil(),text('a')])),2n);assert.deepEqual(api.parsed('{}'),{$:'Some',field0:object([['parsed',scalar(1n)]])});assert.deepEqual(api.parsed('{'),{$:'None'});assert.deepEqual(api.rawParse('null'),{$:'Some',field0:nil()});assert.throws(()=>api.replaced(array([])),TypeError);});assert.deepEqual(base,object([['keep',scalar(7n)],['remove',nil()]]));assert.deepEqual(patch,object([['added',text('λ')]]));
});
test('complete native sources module edges runtime ownership and metadata remain mandatory',limits,()=>{
 for(const path of ['src/translation_state_core.rs','src/translation_core/primitives.rs','runtime/json-state-runtime.mjs','runtime/json-update-runtime.mjs']){const changed=input(source);changed.files.find(row=>row.path===path).source+='\n// changed source\n';assert.throws(()=>translateHttpResourceCallerJavaScript(source,changed),path);}
 const changed=input(source);changed.files.find(row=>row.path==='src/lib.rs').source=changed.files.find(row=>row.path==='src/lib.rs').source.replace('pub mod translation_state_core;','');assert.throws(()=>translateHttpResourceCallerJavaScript(source,changed));
 const result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='arrayBuilt').flow.steps.find(row=>row.kind==='while').body.steps.find(row=>row.kind==='assign').value.operation='router_state_json_without_field';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));
});
test('borrowed JSON reassignment duplicate moves domain changes and list erasure refuse',limits,()=>{
 for(const body of [
  '/** @param {Parameters<typeof length>[0]} base */ export function bad(base){let current=base;return copy(current);}',
  'export function bad(){let current=array([]);current=append(current,current);return current;}',
  'export function bad(){let current=array([]);current=true;return current;}',
  '/** @param {Parameters<typeof merge>[0]} base */ export function bad(base){return base;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(value,input(value)),body);}
});
test('whole handwritten canonical owned JSON state reproduces every native token',limits,()=>{
 const native='pub fn assembled() -> crate::translation_core::Json { let mut current = crate::translation_core::json!([]); current = crate::translation_state_core::json_append(current, crate::translation_core::json!(1_u64)); current }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
});
test('full original contracts captures flow projection and source histories retain both inverses',limits,()=>{
 const plan=prepareHttpResourceJsonStateSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
