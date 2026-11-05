// Independent final helper/callback composition SOURCE; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},some=field0=>({$:'Some',field0}),none={$:'None'};
const source=`import {router_option_callback_text_owned_to_text_owned_map as map,router_option_callback_text_owned_to_text_owned_and_then as chain,router_option_callback_text_owned_unwrap_or_else as recover} from './runtime/primitive-option-callback-runtime.mjs';
import {router_text_to_owned as own,router_text_trim as trim} from './runtime/text-runtime.mjs';
/** @param {Parameters<typeof map>[0]} value */
export function cleaned(value){return map(value,item=>own(trim(item)));}
/** @param {Parameters<typeof chain>[0]} value */
export function local(value){return chain(value,item=>{const owned=own(trim(item));return {$:'Some',field0:owned};});}
/** @param {Parameters<typeof recover>[0]} value @param {string} label */
export function fallback(value,label){return recover(value,()=>own(trim(label)));}
`;
const input=(value=source,sourcePath='caller.mjs')=>({sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])});
test('callback text chains locals and borrowed captures receive JS strict TS and full Rust inverse',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input()),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));await verifyHttpResourceTargets(result,async api=>{for(const name of ['cleaned','local']){assert.deepEqual(api[name](some(' é😀 ')),some('é😀'));assert.deepEqual(api[name](none),none);}assert.equal(api.fallback(none,' é😀 '),'é😀');assert.equal(api.fallback(some(''),'unselected'),'');});const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);
});
