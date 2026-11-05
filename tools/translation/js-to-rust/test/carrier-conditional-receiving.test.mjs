// Independent conditional callback target/reverse SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},source=`import {router_option_callback_u64_to_u64_map as map,router_option_callback_u64_to_bool_map as ladder} from './runtime/primitive-option-callback-runtime.mjs';
export function conditional(input:Parameters<typeof map>[0]){return map(input,value=>value>=3n?value+1n:0n);}
export function nested(input:Parameters<typeof ladder>[0]){return ladder(input,value=>value<2n?false:value<5n?true:false);}
`,some=field0=>({$:'Some',field0}),none={$:'None'};
function input(value,path='caller.mts'){return {sourcePath:path,...httpResourceOptionCallbackReceivingData([{path,source:value}])};}
test('both source languages retain conditional native inverse and actual selected branch behavior',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),js=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs')),native=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,js.rust));assert.ok(sameRustSourceSyntax(result.rust,native.rust));assert.equal(native.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.conditional(some(3n)),some(4n));assert.deepEqual(api.conditional(some(2n)),some(0n));assert.deepEqual(api.conditional(none),none);for(const [value,wanted]of [[0n,false],[2n,true],[4n,true],[5n,false]])assert.deepEqual(api.nested(some(value)),some(wanted));assert.deepEqual(api.nested(none),none);});
});
