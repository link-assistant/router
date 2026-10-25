// Independent Result callback composition SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceOutcomeCallbackSources} from '../../prepare-http-resource-outcome-callback-sources.mjs';
const limits={timeout:60000},imports=`import {router_owned_result_bool_to_u64_map as map,router_owned_result_u64_to_u64_and_then as chain,router_owned_result_text_map_err as mapError,router_owned_result_text_unwrap_or_else as recover,router_owned_result_text_to_u64_map as measure,router_owned_result_u64_ok as ok,router_owned_result_u64_err as err,router_owned_result_u64_unwrap as unwrap} from './runtime/owned-result-runtime.mjs';
import {router_text_repeat as repeat,router_text_replace as replace,router_text_len_utf8 as length} from './runtime/text-runtime.mjs';
import {router_integer_u64_saturating_add as add} from './runtime/integer-runtime.mjs';
`;
const source=imports+`export function mapped(input:Parameters<typeof map>[0]){return map(input,(value:Parameters<Parameters<typeof map>[1]>[0]):bigint=>{if(value){return 4n;}else{return 2n;}});}
export function chained(input:Parameters<typeof chain>[0]){return chain(input,value=>ok(add(value,1n)));}
export function remapped(input:Parameters<typeof mapError>[0],key:string){return mapError(input,error=>replace(error,'bad',key));}
export function recovered(input:Parameters<typeof recover>[0],fallback:string){return recover(input,error=>repeat(fallback,1n));}
export function measured(input:Parameters<typeof measure>[0]){return measure(input,size);}
function size(input:ReturnType<typeof repeat>){return length(input);}
export function never(input:Parameters<typeof map>[0]){return map(input,value=>unwrap(err('callback executed')));}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
const ok=value=>Object.freeze({$:'Ok',field0:value}),err=value=>Object.freeze({$:'Err',field0:value});
test('actual Result callbacks preserve success error owning payload recovery and contextual input types',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.rust,/\|error: String\|/u);assert.match(result.rust,/\|value: u64\|/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);await verifyHttpResourceTargets(result,async api=>{assert.deepEqual(api.mapped(ok(true)),ok(4n));assert.deepEqual(api.mapped(ok(false)),ok(2n));assert.deepEqual(api.mapped(err('é😀')),err('é😀'));assert.deepEqual(api.chained(ok(7n)),ok(8n));assert.deepEqual(api.chained(ok(18446744073709551615n)),ok(18446744073709551615n));assert.deepEqual(api.chained(err('missing')),err('missing'));assert.deepEqual(api.remapped(err('bad bad'),'é😀'),err('é😀 é😀'));assert.deepEqual(api.remapped(ok('kept'),'replacement'),ok('kept'));assert.equal(api.recovered(err('ignored'),'fallback'),'fallback');assert.equal(api.recovered(ok('é😀'),'fallback'),'é😀');assert.deepEqual(api.measured(ok('é😀')),ok(6n));assert.deepEqual(api.measured(err('failure')),err('failure'));assert.deepEqual(api.never(err('skip callback')),err('skip callback'));assert.throws(()=>api.never(ok(true)),/callback executed/u);});
});
test('whole canonical native Result closures and owning helper callbacks reproduce every original token',limits,()=>{
 for(const native of [
  'pub fn mapped(input: Result<bool, String>) -> Result<u64, String> { crate::translation_owned_results_core::bool_to_u64_map(input, |value: bool| { if value { 4_u64 } else { 2_u64 } }) }\n',
  'pub fn remapped(input: Result<String, String>, key: &str) -> Result<String, String> { crate::translation_owned_results_core::text_map_err(input, |error: String| { crate::translation_text_core::replace(&error, "bad", key) }) }\n',
 ]){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));}
});
test('callbacks cannot supply wrong domains consume a Result twice return local loans or become async',limits,()=>{
 for(const body of [
  'export function bad(input:Parameters<typeof map>[0]){return map(input,value=>true);}',
  'export function bad(input:Parameters<typeof map>[0]){return map(input,async value=>1n);}',
  'export function bad(input:Parameters<typeof recover>[0],fallback:string){return recover(input,error=>fallback);}',
  'export function bad(input:Parameters<typeof recover>[0]){return recover(input,error=>length(error));}',
  'export function bad(input:Parameters<typeof map>[0]){const first=map(input,value=>1n);return map(input,value=>2n);}',
  'export function bad(input:Parameters<typeof map>[0]){return map(input,(value:string)=>1n);}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='remapped').flow.tail.value.args[1].parameters[0].type='str';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
 const changed=input(source);changed.files.find(row=>row.path==='src/translation_owned_results_core.rs').source+='\n// changed\n';assert.throws(()=>translateHttpResourceCallerTypeScript(source,changed));
});
test('full original caller source contracts callback reader and native copies retain both inverse phases',limits,()=>{
 const plan=prepareHttpResourceOutcomeCallbackSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
