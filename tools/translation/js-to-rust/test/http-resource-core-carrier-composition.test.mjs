// Independent complete resource composition SOURCE; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},some=field0=>({$:'Some',field0}),none={$:'None'};
const source=`import {router_option_u64_or as combine,router_option_u64_unwrap_or as fallback,router_option_text_owned_filter_nonempty as filter,router_option_text_owned_unwrap_or_default as empty} from './runtime/primitive-option-runtime.mjs';
import {router_text_to_owned as own,router_text_trim as trim} from './runtime/text-runtime.mjs';
/** @param {Parameters<typeof combine>[0]} left @param {Parameters<typeof combine>[1]} right */
export function count(left,right){const selected=combine(left,right);return fallback(selected,7n);}
/** @param {Parameters<typeof filter>[0]} value */
export function normalized(value){const selected=filter(value,true);return empty(selected);}
/** @param {string} value */
export function label(value){const owned=own(value);const cleaned=trim(owned);return own(cleaned);}
`;
const input=(value=source,sourcePath='caller.mjs')=>({sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])});
test('current core calls compose through independent JS strict TS and full Rust source inverse',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input()),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));await verifyHttpResourceTargets(result,async api=>{assert.equal(api.count(none,none),7n);assert.equal(api.count(none,some(18446744073709551615n)),18446744073709551615n);assert.equal(api.normalized(some('  ')),'');assert.equal(api.normalized(some(' é😀 ')),' é😀 ');assert.equal(api.label(' é😀 '),'é😀');});const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);
});
