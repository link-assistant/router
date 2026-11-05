// Independent optional text/resource receiving SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},some=field0=>({$:'Some',field0}),none={$:'None'};
const source=`import {router_option_text_owned_filter_nonempty as filter,router_option_text_owned_unwrap_or_default as empty,router_option_text_owned_unwrap_or as fallback,router_option_text_owned_and as both,router_option_text_owned_or as either,router_option_str_filter_nonempty as borrowed} from './runtime/primitive-option-runtime.mjs';
/** @param {Parameters<typeof filter>[0]} value @param {boolean} trim */
export function selected(value,trim){return filter(value,trim);}
/** @param {Parameters<typeof filter>[0]} value @param {boolean} trim */
export function defaulted(value,trim){const chosen=filter(value,trim);return empty(chosen);}
/** @param {Parameters<typeof fallback>[0]} value @param {Parameters<typeof fallback>[1]} other */
export function recovered(value,other){return fallback(value,other);}
/** @param {Parameters<typeof both>[0]} value @param {Parameters<typeof both>[1]} other */
export function combined(value,other){return both(value,other);}
/** @param {Parameters<typeof either>[0]} value @param {Parameters<typeof either>[1]} other */
export function alternative(value,other){return either(value,other);}
/** @param {Parameters<typeof borrowed>[0]} value @param {boolean} trim */
export function view(value,trim){return borrowed(value,trim);}
`;
function input(value=source,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('consuming owning Option<String> and borrowed filters receive JS strict TS and complete Rust inverse',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input()),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));await verifyHttpResourceTargets(result,async api=>{for(const trim of [false,true]){assert.deepEqual(api.selected(some('  é😀 \n'),trim),some('  é😀 \n'));assert.deepEqual(api.selected(some('  '),trim),trim?none:some('  '));assert.deepEqual(api.view(some('\ufeff'),trim),some('\ufeff'));assert.equal(api.defaulted(none,trim),'');}assert.equal(api.recovered(none,'é😀'),'é😀');assert.deepEqual(api.combined(none,some('x')),none);assert.deepEqual(api.alternative(none,some('x')),some('x'));});const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);
});
for(const body of ['filter(value,false);return filter(value,true);','const chosen=filter(value,false);return value;','return both(value,value);'])test('full resource flow still refuses owning optional-text reuse '+body,limits,()=>{
 const source="import {router_option_text_owned_filter_nonempty as filter,router_option_text_owned_and as both} from './runtime/primitive-option-runtime.mjs';\n/** @param {Parameters<typeof filter>[0]} value */\nexport function reused(value){"+body+"}";assert.throws(()=>translateHttpResourceCallerJavaScript(source,input(source)),/moved|move|own|used|statement/u);
});
