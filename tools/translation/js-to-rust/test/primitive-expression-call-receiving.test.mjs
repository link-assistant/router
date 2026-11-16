// Independent paired JavaScript/strict TypeScript/reverse SOURCE; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},source=`import {router_option_callback_u64_to_u64_map as map,router_option_callback_u64_to_bool_map as relation} from './runtime/primitive-option-callback-runtime.mjs';
export function arithmetic(input:Parameters<typeof map>[0]){return map(input,value=>value+2n);}
export function compared(input:Parameters<typeof relation>[0]){return relation(input,value=>value+1n>=4n);}
`,some=field0=>({$:'Some',field0}),none={$:'None'};
function input(value,path='caller.mts'){return {sourcePath:path,...httpResourceOptionCallbackReceivingData([{path,source:value}])};}
test('numeric callback expressions preserve both source languages native inverse and branch behavior',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),js=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs')),native=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,js.rust));assert.ok(sameRustSourceSyntax(result.rust,native.rust));assert.equal(native.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.arithmetic(some(3n)),some(5n));assert.deepEqual(api.arithmetic(none),none);assert.deepEqual(api.compared(some(3n)),some(true));assert.deepEqual(api.compared(some(2n)),some(false));assert.deepEqual(api.compared(none),none);});
});
