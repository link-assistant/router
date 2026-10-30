// Independent authoritative native guard source/inverse regression SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateAsyncControlCallerRust} from '../async-control-rust.mjs';
import {translateAsyncControlCallerJavaScript,translateAsyncControlCallerTypeScript,readAsyncControlCallerMeta} from '../async-control-callers.mjs';
import {readAsyncControlRustFunction} from '../async-control-rust-syntax.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareAsyncNativeGuardSources} from '../../prepare-async-native-guard-sources.mjs';
import {asyncControlReceivingInput,verifyAsyncControlTargets} from './async-control-receiving-fixture.mjs';
const limits={timeout:60000},native=`pub fn guarded(first:bool,second:bool)->bool{
 if first { return true; }
 if second { return false; }
 true
}
pub fn less(left:u64,right:u64)->bool{
 if (left < right) { return true; }
 false
}
pub async fn selected(skip:bool,token:&crate::translation_async_control_core::Cancellation)->Result<(),crate::translation_async_control_core::ControlError>{
 if skip { return crate::translation_async_control_core::sleep(18446744073709551615_u64,token).await; }
 crate::translation_async_control_core::sleep(0_u64,token).await
}
`;
function inverse(source=native){const {options}=asyncControlReceivingInput();return translateAsyncControlCallerRust(source,{sourcePath:'rust/src/caller.rs',javascriptPath:options.sourcePath,runtimePath:options.runtimePath,runtimeSource:options.runtimeSource,nativeRootSource:options.nativeRootSource,nativeSource:options.nativeSource});}
test('actual original native guards retain complete authoritative Rust tokens checked JS flow and strict TS behavior',limits,async()=>{
 const result=inverse();assert.equal(sameRustSourceSyntax(result.rust,native),true);assert.equal(result.originalRust,native);assert.equal(result.asyncControlRustSourceHistory.equation.inverse,native);assert.equal(result.runtimeParity,false);assert.equal(result.rustExecuted,false);const functions=JSON.parse(result.meta).functions;assert.equal(functions.length,3);assert.ok(functions.every(row=>row.flow.tail.sourceContinuation));const selected=functions.find(row=>row.name==='less');assert.equal(selected.inputGuards.length,2);await verifyAsyncControlTargets(result,async(api,runtime)=>{for(const [a,b,wanted]of [[false,false,true],[false,true,false],[true,false,true],[true,true,true]])assert.equal(api.guarded(a,b),wanted);for(const [a,b,wanted]of [[0n,0n,false],[0n,1n,true],[1n,0n,false],[9007199254740992n,9007199254740993n,true],[18446744073709551615n,18446744073709551615n,false]])assert.equal(api.less(a,b),wanted);assert.throws(()=>api.less(-1n,0n),RangeError);const token=runtime.router_cancel_new();assert.deepEqual(await api.selected(false,token),{$:'Ok',field0:null});assert.deepEqual(await api.selected(true,token),{$:'Err',field0:{$:'InvalidInput'}});const cold=api.selected(false,token);runtime.router_cancel_set(token);assert.deepEqual(await cold,{$:'Err',field0:{$:'Cancelled'}});});
});
test('both target languages and serialized source-bound control meta independently reproduce every original native guard',limits,()=>{
 const original=inverse(),javascript=translateAsyncControlCallerJavaScript(original.javascript,asyncControlReceivingInput().options),typescript=translateAsyncControlCallerTypeScript(original.typescript,asyncControlReceivingInput('caller.mts').options);assert.equal(sameRustSourceSyntax(javascript.rust,native),true);assert.equal(sameRustSourceSyntax(typescript.rust,native),true);const data=JSON.parse(original.meta);data.functions[0].flow.tail.sourceContinuation.statementCount=99;assert.throws(()=>readAsyncControlCallerMeta(JSON.stringify(data),original.javascript,asyncControlReceivingInput().options),/differ/u);assert.ok(original.rust.includes('return true;'));assert.ok(original.rust.includes('return crate::translation_async_control_core::sleep'));
});
test('a guard tail that is not an explicit native return cannot pretend to terminate and exact-source differences remain fatal',limits,()=>{
 for(const source of [native.replace('if first { return true; }','if first { true }'),native.replace('return crate::translation_async_control_core::sleep(18446744073709551615_u64,token).await;','return crate::translation_async_control_core::sleep(18446744073709551615_u64,token);'),native.replace('if first { return true; }','if first { assert!(false); return true; }'),native.replace('if second { return false; }\n true','if second { return false; }\n return true;')])assert.throws(()=>inverse(source));const observation=readAsyncControlRustFunction('pub fn guarded(first:bool)->bool{if first{return true;}false}');assert.equal(observation.body.statements[0].kind,'if-guard');assert.equal(observation.body.statements[0].yes.statements[0].kind,'return');assert.equal(observation.body.tail.kind,'boolean');
});
test('four complete source equations retain actual native class source both phases and full inverses',limits,()=>{
 const plan=prepareAsyncNativeGuardSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
