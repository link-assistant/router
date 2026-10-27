// Independent lazy Option error JS/strict TS/native inverse SOURCE; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},source=`import {router_option_callback_bool_ok_or_else as flag,router_option_callback_u64_ok_or_else as count,router_option_callback_i64_ok_or_else as signed,router_option_callback_text_owned_ok_or_else as text} from './runtime/primitive-option-callback-runtime.mjs';
export function boolValue(input:Parameters<typeof flag>[0]){return flag(input,()=> 'missing');}
export function countValue(input:Parameters<typeof count>[0]){return count(input,()=> 'missing');}
export function signedValue(input:Parameters<typeof signed>[0]){return signed(input,()=> 'missing');}
export function textValue(input:Parameters<typeof text>[0]){return text(input,()=> 'missing');}
`,some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
function input(value,path='caller.mts'){return {sourcePath:path,...httpResourceOptionCallbackReceivingData([{path,source:value}])};}
test('four owning or Copy result domains preserve both source languages actual inverse and lazy branch results',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),js=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs')),native=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,js.rust));assert.ok(sameRustSourceSyntax(result.rust,native.rust));assert.equal(native.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);await verifyHttpResourceTargets(result,api=>{for(const [name,value]of [['boolValue',false],['countValue',0n],['signedValue',-9223372036854775808n],['textValue',''],['textValue','Ω😀']]){assert.deepEqual(api[name](some(value)),ok(value));assert.deepEqual(api[name](none),err('missing'));}});
});
