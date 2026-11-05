// Independent canonical native source/inverse SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateAsyncControlCallerRust} from '../async-control-rust.mjs';
import {translateAsyncControlCallerJavaScript,translateAsyncControlCallerTypeScript} from '../async-control-callers.mjs';
import {readAsyncControlRustFunction} from '../async-control-rust-syntax.mjs';
import {prepareAsyncControlInverseSources} from '../../prepare-async-control-inverse-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {asyncControlReceivingInput,verifyAsyncControlTargets} from './async-control-receiving-fixture.mjs';
const limits={timeout:60000};
const rust=`pub async fn slept(token:&crate::translation_async_control_core::Cancellation)->Result<(),crate::translation_async_control_core::ControlError>{crate::translation_async_control_core::sleep(0_u64,token).await}
pub async fn timed(token:&crate::translation_async_control_core::Cancellation)->Result<Result<(),crate::translation_async_control_core::ControlError>,crate::translation_async_control_core::ControlError>{crate::translation_async_control_core::with_deadline(1000_u64,token,move |child|async move{crate::translation_async_control_core::sleep(0_u64,&child).await}).await}
pub async fn transferred(encoded:&str,token:&crate::translation_async_control_core::Cancellation)->Result<Option<String>,crate::translation_async_control_core::ControlError>{
 let pair=crate::translation_async_control_core::channel(1_u64)?;
 let(sender,mut receiver)=pair;
 let sent=match crate::translation_async_control_core::send(&sender,encoded,token).await {Ok(__ro_control_value)=>__ro_control_value,Err(__ro_control_error)=>{crate::translation_async_control_core::dispose(&mut receiver);return Err(__ro_control_error);}};
 let received=match crate::translation_async_control_core::receive(&mut receiver,token).await {Ok(__ro_control_value)=>__ro_control_value,Err(__ro_control_error)=>{crate::translation_async_control_core::dispose(&mut receiver);return Err(__ro_control_error);}};
 crate::translation_async_control_core::close(&mut receiver);crate::translation_async_control_core::dispose(&mut receiver);Ok(received)
}
pub async fn borrowed(receiver:&mut crate::translation_async_control_core::Receiver,token:&crate::translation_async_control_core::Cancellation)->Result<Result<Option<String>,crate::translation_async_control_core::ControlError>,crate::translation_async_control_core::ControlError>{
 {let __ro_control_capture_0=&mut *receiver;crate::translation_async_control_core::with_deadline(1000_u64,token,move |child|async move{crate::translation_async_control_core::receive(&mut *__ro_control_capture_0,&child).await}).await}
}
`;
function translated(source=rust){const {options}=asyncControlReceivingInput();return translateAsyncControlCallerRust(source,{sourcePath:'rust/src/caller.rs',javascriptPath:options.sourcePath,runtimePath:options.runtimePath,runtimeSource:options.runtimeSource,nativeRootSource:options.nativeRootSource,nativeSource:options.nativeSource});}
test('actual original canonical awaits tuples cleanup and exclusive closure captures restore JS strict TS and complete Rust',limits,async()=>{
 const result=translated();assert.ok(sameRustSourceSyntax(result.rust,rust));assert.equal(result.asyncControlRustSourceHistory.equation.inverse,rust);assert.equal(result.originalRust,rust);assert.equal(result.nativeRustGrammarChecked,false);assert.equal(result.crossInvocationCache,false);assert.equal(result.receivingExecuted,false);
 await verifyAsyncControlTargets(result,async(api,runtime)=>{
  const token=runtime.router_cancel_new();assert.deepEqual(await api.slept(token),{$:'Ok',field0:null});assert.deepEqual(await api.timed(token),{$:'Ok',field0:{$:'Ok',field0:null}});assert.deepEqual(await api.transferred('aGk=',token),{$:'Ok',field0:{$:'Some',field0:'aGk='}});assert.deepEqual(await api.transferred('invalid base64',token),{$:'Err',field0:{$:'InvalidInput'}});
  const pair=runtime.router_async_channel(1n);assert.equal(pair.$,'Ok');const [sender,receiver]=pair.field0;await runtime.router_async_send(sender,'',token);assert.deepEqual(await api.borrowed(receiver,token),{$:'Ok',field0:{$:'Ok',field0:{$:'Some',field0:''}}});runtime.router_async_dispose(receiver);runtime.router_cancel_set(token);assert.deepEqual(await api.slept(token),{$:'Err',field0:{$:'Cancelled'}});
 });
});
test('Rust authority rechecks both target directions and retains the original body/source mapping',limits,()=>{
 const original=translated(),javascript=translateAsyncControlCallerJavaScript(original.javascript,asyncControlReceivingInput().options),typescript=translateAsyncControlCallerTypeScript(original.typescript,asyncControlReceivingInput('caller.mts').options);assert.ok(sameRustSourceSyntax(javascript.rust,rust));assert.ok(sameRustSourceSyntax(typescript.rust,rust));assert.ok(original.asyncControlRustSourceHistory.projection.source.includes('async (child) =>'));assert.deepEqual(original.asyncControlRustRuleTrace.map(row=>row.phase),['language','language','language','language','repository']);
});
test('canonical syntax observations cannot grant missing borrows cleanup await or unrelated source permission',limits,()=>{
 for(const source of [
  rust.replace('send(&sender,encoded,token)','send(sender,encoded,token)'),
  rust.replace('dispose(&mut receiver);return Err(__ro_control_error);','return Err(__ro_control_error);'),
  rust.replace('sleep(0_u64,token).await','sleep(0_u64,token)'),
  rust.replace('async move{crate::translation_async_control_core::sleep','async {crate::translation_async_control_core::sleep'),
  rust.replace('close(&mut receiver);','unknown(&mut receiver);'),
  '#[unresolved]\n'+rust,
  rust+'\npub const EXTRA:u64=1;\n',
 ])assert.throws(()=>translated(source));
 const observation=readAsyncControlRustFunction('pub async fn bare(token:&crate::translation_async_control_core::Cancellation)->(){crate::translation_async_control_core::cancel_wait(token).await}');assert.equal(observation.asynchronous,true);assert.equal(observation.body.tail.kind,'field');assert.equal(observation.body.tail.name,'await');
});
test('the complete original Rust reader and consumer retain genuine class/function source selections',limits,()=>{
 const plan=prepareAsyncControlInverseSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);const reader=plan.files.find(row=>row.path.endsWith('/async-control-rust-syntax.mjs'));assert.ok(reader.originalPath.endsWith('/originals/filesystem-control-rust-syntax.mjs.txt'));assert.ok(reader.nativeSelections.language.some(row=>row.kind==='class'&&row.name==='OwnedRustReader'));assert.ok(reader.after.includes('kind:asynchronous?'));
});
