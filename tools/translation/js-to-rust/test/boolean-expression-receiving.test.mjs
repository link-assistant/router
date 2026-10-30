// Independent logical callback target/reverse SOURCE; all cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},source=`import {router_option_callback_bool_to_bool_map as map,router_option_callback_u64_to_bool_map as relation} from './runtime/primitive-option-callback-runtime.mjs';
export function flags(input:Parameters<typeof map>[0]){return map(input,value=>!value||false);}
export function grouped(input:Parameters<typeof relation>[0]){return relation(input,value=>!((value+1n>=4n)&&(value<10n)));}
`,some=field0=>({$:'Some',field0}),none={$:'None'};
function input(value,path='caller.mts'){return {sourcePath:path,...httpResourceOptionCallbackReceivingData([{path,source:value}])};}
test('native logical precedence preserves both source languages complete reverse and actual target results',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),js=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs')),native=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,js.rust));assert.ok(sameRustSourceSyntax(result.rust,native.rust));assert.equal(native.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.flags(some(false)),some(true));assert.deepEqual(api.flags(some(true)),some(false));assert.deepEqual(api.flags(none),none);assert.deepEqual(api.grouped(some(3n)),some(false));assert.deepEqual(api.grouped(some(2n)),some(true));assert.deepEqual(api.grouped(some(11n)),some(true));assert.deepEqual(api.grouped(none),none);});
});
