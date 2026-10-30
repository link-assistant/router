// Independent common-caller composition SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceCommonSources} from '../../prepare-http-resource-common-sources.mjs';
const limits={timeout:60000};
const imports=`import {router_text_trim as trim,router_text_replace as replace,router_text_repeat as repeat,router_text_strip_prefix as prefix,router_text_len_utf8 as length} from './runtime/text-runtime.mjs';
import {router_owned_result_u64_ok as ok,router_owned_result_u64_unwrap_or as fallback,router_owned_result_str_ok as borrowed,router_owned_result_str_is_ok as succeeded,router_owned_result_str_ok_option as optional,router_owned_result_text_ok as owned} from './runtime/owned-result-runtime.mjs';
import {router_carrier_json_ok as valueResult,router_carrier_json_result_to_option as toOption} from './runtime/owned-outcome-runtime.mjs';
`;
const body=`/** @param {string} input */ export function cleaned(input){const changed=replace(input,'x',' ');const view=trim(changed);return repeat(view,1n);}
/** @param {string} input */ export function stripped(input){return prefix(input,'x');}
/** @param {string} input */ export function wrapped(input){return optional(borrowed(input));}
/** @param {string} input */ export function bytes(input){const result=ok(length(input));return fallback(result,0n);}
/** @param {Parameters<typeof valueResult>[0]} input */ export function jsonOption(input){return toOption(valueResult(input));}
`;
function input(source,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source}])};}
test('existing native text Result and JSON carrier families compose under JS and strict TS',limits,async()=>{
 const source=imports+body,result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/Option<&'a str>/u);assert.match(result.rust,/Option<crate::translation_core::Json>/u);assert.equal(result.rustExecuted,false);
 await verifyHttpResourceTargets(result,async api=>{assert.equal(api.cleaned(' xé😀x '),'é😀');assert.deepEqual(api.stripped('xé'),{$:'Some',field0:'é'});assert.deepEqual(api.stripped('é'),{$:'None'});assert.deepEqual(api.wrapped('é😀'),{$:'Some',field0:'é😀'});assert.equal(api.bytes('é😀'),6n);assert.deepEqual(api.jsonOption({$:'Null'}),{$:'Some',field0:{$:'Null'}});});
});
test('local borrowed views cannot escape or outlive moved owned values and results move once',limits,()=>{
 for(const body of [
  "/** @param {string} input */ export function bad(input){const changed=replace(input,'x',' ');return trim(changed);}",
  "/** @param {string} input */ export function bad(input){const changed=replace(input,'x',' ');const view=trim(changed);return owned(changed);}",
  "/** @param {string} input */ export function bad(input){const result=borrowed(input);const first=succeeded(result);return succeeded(result);}",
  "/** @param {Parameters<typeof valueResult>[0]} input */ export function bad(input){const result=toOption(valueResult(input));return result.field0;}",
 ]){const source=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(source,input(source)),body);}
});
test('complete canonical native shared roots Option domains and carrier composition reproduce',limits,()=>{
 const native=`pub fn stripped<'a>(input: &'a str) -> Option<&'a str> { crate::translation_text_core::strip_prefix(input, "x") }
pub fn bytes(input: &str) -> u64 { crate::translation_owned_results_core::u64_unwrap_or(crate::translation_owned_results_core::u64_ok(crate::translation_text_core::len_utf8(input)), 0_u64) }
pub fn optional_json(input: &crate::translation_core::Json) -> Option<crate::translation_core::Json> { crate::translation_carriers_core::json_result_to_option(crate::translation_carriers_core::json_ok(input)) }
`,result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,native));
});
test('new interface mappings still require all complete actual original native sources',limits,()=>{
 const source=imports+body;for(const path of ['src/translation_text_core.rs','src/translation_owned_results_core.rs','src/translation_carriers_core.rs']){const data=input(source);data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateHttpResourceCallerJavaScript(source,data));}
 const plan=prepareHttpResourceCommonSources();assert.equal(plan.files.length,4);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
});
