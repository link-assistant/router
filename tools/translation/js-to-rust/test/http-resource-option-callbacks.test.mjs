// Independent Option callback composition SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceOptionCallbackSources} from '../../prepare-http-resource-option-callback-sources.mjs';
const limits={timeout:60000},imports=`import {router_option_callback_bool_to_u64_map as map,router_option_callback_bool_to_u64_and_then as chain,router_option_callback_u64_unwrap_or_else as fallbackOp,router_option_callback_str_to_u64_map as measure} from './runtime/primitive-option-callback-runtime.mjs';
import {router_option_u64_some as some} from './runtime/primitive-option-runtime.mjs';
import {router_text_strip_prefix as prefix,router_text_len_utf8 as length} from './runtime/text-runtime.mjs';
import {router_owned_result_u64_unwrap as unwrap,router_owned_result_u64_err as err} from './runtime/owned-result-runtime.mjs';
`;
const source=imports+`export function mapped(input:Parameters<typeof map>[0]){return map(input,value=>{if(value){return 4n;}else{return 2n;}});}
export function chained(input:Parameters<typeof chain>[0]){return chain(input,value=>{if(value){return some(7n);}else{return some(3n);}});}
export function fallback(input:Parameters<typeof fallbackOp>[0]){return fallbackOp(input,()=>9n);}
export function fallbackHelper(input:Parameters<typeof fallbackOp>[0]){return fallbackOp(input,defaultCount);}
function defaultCount(){return 9n;}
export function measured(input:string){const value=prefix(input,'x');return measure(value,text=>length(text));}
export function never(input:Parameters<typeof map>[0]){return map(input,value=>unwrap(err('callback executed')));}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceOptionCallbackReceivingData([{path:sourcePath,source:value}])};}
const some=value=>Object.freeze({$:'Some',field0:value}),none=Object.freeze({$:'None'});
test('actual Option map chaining and zero-argument fallback callbacks preserve selection and ownership',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.rust,/\|\| \{ 9_u64 \}/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);await verifyHttpResourceTargets(result,async api=>{assert.deepEqual(api.mapped(some(true)),some(4n));assert.deepEqual(api.mapped(some(false)),some(2n));assert.deepEqual(api.mapped(none),none);assert.deepEqual(api.chained(some(true)),some(7n));assert.deepEqual(api.chained(some(false)),some(3n));assert.deepEqual(api.chained(none),none);for(const name of ['fallback','fallbackHelper']){assert.equal(api[name](none),9n);assert.equal(api[name](some(5n)),5n);}assert.deepEqual(api.measured('xé😀'),some(6n));assert.deepEqual(api.measured('absent'),none);assert.deepEqual(api.never(none),none);assert.throws(()=>api.never(some(true)),/callback executed/u);});
});
test('whole canonical native zero-argument Option closure reproduces every original token',limits,()=>{
 const native='pub fn fallback(input: Option<u64>) -> u64 { crate::translation_primitive_option_callbacks_core::u64_unwrap_or_else(input, || { 9_u64 }) }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
});
test('actual optional native sources zero-argument arity domains and original meta cannot be forged',limits,()=>{
 for(const body of [
  'export function bad(input:Parameters<typeof fallbackOp>[0]){return fallbackOp(input,value=>9n);}',
  'export function bad(input:Parameters<typeof fallbackOp>[0]){return fallbackOp(input,()=>true);}',
  'export function bad(input:Parameters<typeof map>[0]){return map(input,value=>\'wrong\');}',
  'export function bad(input:Parameters<typeof map>[0]){return map(input,async value=>1n);}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 for(const path of ['src/translation_primitive_option_callbacks_core.rs','runtime/primitive-option-callback-runtime.mjs']){const options=input(source);options.files=options.files.filter(row=>row.path!==path);assert.throws(()=>translateHttpResourceCallerTypeScript(source,options),path);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='fallback').flow.tail.value.args[1].returns='bool';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete original source and private physical transaction fixture copies retain both inverse phases',limits,()=>{
 const plan=prepareHttpResourceOptionCallbackSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
