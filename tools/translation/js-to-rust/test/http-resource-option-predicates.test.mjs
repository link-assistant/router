// Independent existing-ABI predicate reverse receiving SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},some=field0=>({$:'Some',field0}),none={$:'None'};
const source=`import {router_option_callback_str_to_bool_map as predicate} from './runtime/primitive-option-callback-runtime.mjs';
import {router_option_bool_unwrap_or as fallback} from './runtime/primitive-option-runtime.mjs';
/** @param {Parameters<typeof predicate>[0]} value */
export function some(value){return fallback(predicate(value,text=>text!=="identity"),false);}
/** @param {Parameters<typeof predicate>[0]} value */
export function none(value){return fallback(predicate(value,text=>text!=="identity"),true);}
`;
const input=(value=source,sourcePath='caller.mjs')=>({sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])});
test('composed predicates receive JavaScript strict TypeScript and full native Rust source inverse',limits,async()=>{const result=translateHttpResourceCallerJavaScript(source,input()),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));await verifyHttpResourceTargets(result,async api=>{assert.equal(api.some(none),false);assert.equal(api.none(none),true);for(const value of ['identity','','é😀']){assert.equal(api.some(some(value)),value!=='identity');assert.equal(api.none(some(value)),value!=='identity');}});const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);});
