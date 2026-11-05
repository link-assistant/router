// Independent Result callback text/native inverse SOURCE; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const source=`import {router_owned_result_text_to_text_map as map,router_owned_result_text_map_err as mapError,router_owned_result_text_unwrap_or_else as recover,router_owned_result_text_or_else as alternative,router_owned_result_text_err as failed} from './runtime/owned-result-runtime.mjs';
import {router_text_to_owned as own,router_text_trim as trim} from './runtime/text-runtime.mjs';
/** @param {Parameters<typeof map>[0]} value */
export function success(value){return map(value,item=>own(trim(item)));}
/** @param {Parameters<typeof mapError>[0]} value */
export function failure(value){return mapError(value,error=>{const cleaned=own(trim(error));return cleaned;});}
/** @param {Parameters<typeof recover>[0]} value */
export function recovered(value){return recover(value,error=>own(trim(error)));}
/** @param {Parameters<typeof alternative>[0]} value */
export function rethrown(value){return alternative(value,error=>failed(trim(error)));}
`;
const input=(value=source,sourcePath='caller.mjs')=>({sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])});
test('Result success/error text operations and local owning temporaries receive JS strict TS and full Rust inverse',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input()),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));await verifyHttpResourceTargets(result,async api=>{assert.deepEqual(api.success(ok(' é😀 ')),ok('é😀'));assert.deepEqual(api.success(err(' untouched ')),err(' untouched '));for(const name of ['failure','rethrown']){assert.deepEqual(api[name](err(' é😀 ')),err('é😀'));assert.deepEqual(api[name](ok(' untouched ')),ok(' untouched '));}assert.equal(api.recovered(err(' é😀 ')),'é😀');assert.equal(api.recovered(ok(' untouched ')),' untouched ');});const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);
});
