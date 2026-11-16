// Independent final paired callback numeric/text receiving SOURCE; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const source=`import {router_option_callback_u64_to_u64_map as map,router_option_callback_u64_to_u64_and_then as chain} from './runtime/primitive-option-callback-runtime.mjs';
import {router_owned_result_text_to_u64_map as length} from './runtime/owned-result-runtime.mjs';
import {router_integer_u64_saturating_add as add,router_integer_u64_checked_add as checked} from './runtime/integer-runtime.mjs';
import {router_text_len_utf8 as bytes,router_text_trim as trim} from './runtime/text-runtime.mjs';
/** @param {Parameters<typeof map>[0]} value */
export function mapped(value){return map(value,item=>add(item,2n));}
/** @param {Parameters<typeof chain>[0]} value */
export function chained(value){return chain(value,item=>checked(item,2n));}
/** @param {Parameters<typeof length>[0]} value */
export function counted(value){return length(value,item=>{const count=bytes(trim(item));return add(count,2n);});}
`;
const input=(value=source,sourcePath='caller.mjs')=>({sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])});
test('callback core operations receive JavaScript strict TypeScript and complete native Rust source inverse',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input()),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));await verifyHttpResourceTargets(result,async api=>{assert.deepEqual(api.mapped(some(3n)),some(5n));assert.deepEqual(api.mapped(some(18446744073709551615n)),some(18446744073709551615n));assert.deepEqual(api.mapped(none),none);assert.deepEqual(api.chained(some(3n)),some(5n));assert.deepEqual(api.chained(some(18446744073709551615n)),none);assert.deepEqual(api.chained(none),none);assert.deepEqual(api.counted(ok(' é😀 ')),ok(8n));assert.deepEqual(api.counted(err('denied')),err('denied'));});const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);
});
