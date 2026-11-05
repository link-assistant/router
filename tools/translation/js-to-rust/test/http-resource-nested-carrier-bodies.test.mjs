// Independent paired nested carrier receiving SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const source=`import {router_option_callback_u64_to_u64_and_then as optionChain,router_option_callback_u64_to_u64_map as optionMap} from './runtime/primitive-option-callback-runtime.mjs';
import {router_result_u64_to_u64_and_then as resultChain} from './runtime/primitive-result-runtime.mjs';
import {router_option_u64_ok_or as required} from './runtime/primitive-option-runtime.mjs';
import {router_integer_u64_saturating_add as add} from './runtime/integer-runtime.mjs';
/** @param {Parameters<typeof optionChain>[0]} value @param {Parameters<typeof optionMap>[0]} inner */
export function option(value,inner){return optionChain(value,outer=>optionMap(inner,number=>add(number,outer)));}
/** @param {Parameters<typeof resultChain>[0]} value @param {Parameters<typeof optionMap>[0]} inner */
export function result(value,inner){return resultChain(value,outer=>required(optionMap(inner,number=>add(number,outer)),"missing"));}
`;
const input=(value=source,sourcePath='caller.mjs')=>({sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])});
test('nested carrier callbacks receive JavaScript strict TypeScript and complete native Rust inverse',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input()),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));await verifyHttpResourceTargets(result,async api=>{assert.deepEqual(api.option(some(3n),some(4n)),some(7n));assert.deepEqual(api.option(none,some(4n)),none);assert.deepEqual(api.option(some(3n),none),none);assert.deepEqual(api.result(ok(3n),some(4n)),ok(7n));assert.deepEqual(api.result(ok(3n),none),err('missing'));assert.deepEqual(api.result(err('Ω😀'),some(4n)),err('Ω😀'));});const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);
});
