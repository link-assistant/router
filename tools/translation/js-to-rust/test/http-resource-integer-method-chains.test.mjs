// Independent paired complete integer chain receiving SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000};
const source=`import {router_integer_u64_saturating_add as add,router_integer_u64_wrapping_mul as multiply,router_integer_u64_clamp as clamp} from './runtime/integer-runtime.mjs';
/** @param {Parameters<typeof add>[0]} value */
export function fused(value){return clamp(multiply(add(value,2n),3n),4n,100n);}
`;
const input=(value=source,sourcePath='caller.mjs')=>({sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])});
test('complete integer chains receive JS strict TypeScript and full native Rust source inverse',limits,async()=>{const result=translateHttpResourceCallerJavaScript(source,input()),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));await verifyHttpResourceTargets(result,async api=>{assert.equal(api.fused(0n),6n);assert.equal(api.fused(3n),15n);assert.equal(api.fused(18446744073709551615n),100n);});const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);});
