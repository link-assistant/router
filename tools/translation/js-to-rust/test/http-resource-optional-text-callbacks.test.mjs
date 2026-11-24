// Independent owning optional callback resource SOURCE; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},some=field0=>({$:'Some',field0}),none={$:'None'};
const source=`import {router_option_callback_bool_to_text_owned_map as map,router_option_callback_bool_to_text_owned_and_then as chain,router_option_callback_text_owned_to_text_owned_map as identity,router_option_callback_text_owned_to_bool_map as empty,router_option_callback_text_owned_unwrap_or_else as recover,router_option_callback_text_owned_or_else as alternative} from './runtime/primitive-option-callback-runtime.mjs';
import {router_text_to_owned as own,router_text_is_empty as isEmpty} from './runtime/text-runtime.mjs';
/** @param {Parameters<typeof map>[0]} value */
export function mapped(value){return map(value,item=>own('é😀'));}
/** @param {Parameters<typeof chain>[0]} value */
export function chained(value){return chain(value,item=>({$:'Some',field0:own('é😀')}));}
/** @param {Parameters<typeof identity>[0]} value */
export function moved(value){return identity(value,item=>item);}
/** @param {Parameters<typeof empty>[0]} value */
export function observed(value){return empty(value,item=>isEmpty(item));}
/** @param {Parameters<typeof recover>[0]} value @param {string} label */
export function recovered(value,label){return recover(value,()=>own(label));}
/** @param {Parameters<typeof alternative>[0]} value @param {string} label */
export function fallback(value,label){return alternative(value,()=>({$:'Some',field0:own(label)}));}
`;
const input=(value=source,sourcePath='caller.mjs')=>({sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])});
test('owning maps chains moved parameters and lazy borrowed captures receive JS strict TS and complete native inverse',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input()),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));await verifyHttpResourceTargets(result,async api=>{for(const name of ['mapped','chained']){assert.deepEqual(api[name](some(false)),some('é😀'));assert.deepEqual(api[name](none),none);}assert.deepEqual(api.moved(some('')),some(''));assert.deepEqual(api.observed(some('')),some(true));assert.equal(api.recovered(some(''),'unused'),'');assert.equal(api.recovered(none,'é😀'),'é😀');assert.deepEqual(api.fallback(some(''),'unused'),some(''));assert.deepEqual(api.fallback(none,'é😀'),some('é😀'));});const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);
});
for(const body of ['return recover(value,()=>other);','return identity(value,item=>{own(item);return item;});'])test('complete resource callbacks still refuse captured owner moves and moved callback parameter reuse '+body,limits,()=>{
 const source="import {router_option_callback_text_owned_unwrap_or_else as recover,router_option_callback_text_owned_to_text_owned_map as identity} from './runtime/primitive-option-callback-runtime.mjs';\nimport {router_option_text_owned_some as own} from './runtime/primitive-option-runtime.mjs';\n/** @param {Parameters<typeof recover>[0]} value @param {Parameters<typeof own>[0]} other */\nexport function wrong(value,other){"+body+"}";assert.throws(()=>translateHttpResourceCallerJavaScript(source,input(source)),/captur|move|own|used|domain/u);
});
