// Independent numeric entry-domain regression SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateAsyncControlCallerJavaScript,translateAsyncControlCallerTypeScript,readAsyncControlCallerMeta} from '../async-control-callers.mjs';
import {translateAsyncControlCallerRust} from '../async-control-rust.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareAsyncControlU64Sources} from '../../prepare-async-control-u64-sources.mjs';
import {projectAsyncControlUnitJavaScript} from '../../async-control-unit-signatures.mjs';
import {asyncControlReceivingInput,verifyAsyncControlTargets} from './async-control-receiving-fixture.mjs';
const limits={timeout:60000};
const source=`import {router_async_sleep as sleep,router_async_channel as channel} from './runtime/async-control-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
/** @param {bigint} amount @param {Parameters<typeof sleep>[1]} token */
export function delayed(amount,token){return defer(async()=>{
 if(typeof amount!=="bigint"||amount<0n||amount>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}
 return await sleep(amount,token);
});}
/** @param {bigint} capacity */
export function bounded(capacity){
 if(typeof capacity!=="bigint"||capacity<0n||capacity>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}
 return channel(capacity);
}
`;
const native=`pub async fn delayed(amount:u64,token:&crate::translation_async_control_core::Cancellation)->Result<(),crate::translation_async_control_core::ControlError>{crate::translation_async_control_core::sleep(amount,token).await}
pub fn bounded(capacity:u64)->Result<(crate::translation_async_control_core::Sender,crate::translation_async_control_core::Receiver),crate::translation_async_control_core::ControlError>{crate::translation_async_control_core::channel(capacity)}
`;
const translated=code=>translateAsyncControlCallerJavaScript(code,asyncControlReceivingInput().options);
test('actual dominating guards qualify numeric parameters and preserve cold polling in JS and strict TypeScript',limits,async()=>{
 const result=translated(source);assert.ok(sameRustSourceSyntax(result.rust,native));assert.equal(result.javascript,source);const functions=JSON.parse(result.meta).functions;assert.deepEqual(functions.map(row=>row.parameters[0].type),['u64','u64']);assert.deepEqual(functions.map(row=>row.inputGuards.length),[1,1]);for(const fn of functions){const guard=fn.inputGuards[0];assert.equal(source.slice(guard.span.start,guard.span.end),guard.source);assert.equal(guard.maximum,'18446744073709551615');assert.equal(guard.semanticAuthority,false);}
 await verifyAsyncControlTargets(result,async(api,runtime)=>{
  const token=runtime.router_cancel_new();assert.deepEqual(await api.delayed(0n,token),{$:'Ok',field0:null});assert.deepEqual(await api.delayed(1n,token),{$:'Ok',field0:null});assert.deepEqual(await api.delayed(18446744073709551615n,token),{$:'Err',field0:{$:'InvalidInput'}});
  for(const value of [-1n,18446744073709551616n,1,undefined]){const cold=api.delayed(value,token);assert.equal(typeof cold.then,'function');await assert.rejects(()=>Promise.resolve(cold),RangeError);assert.throws(()=>api.bounded(value),RangeError);}
  for(const value of [0n,33n,18446744073709551615n])assert.deepEqual(api.bounded(value),{$:'Err',field0:{$:'InvalidInput'}});const pair=api.bounded(1n);assert.equal(pair.$,'Ok');runtime.router_async_dispose(pair.field0[1]);runtime.router_cancel_set(token);assert.deepEqual(await api.delayed(0n,token),{$:'Err',field0:{$:'Cancelled'}});
 });
});
test('canonical Rust u64 inputs receive actual JS guards and all directions reproduce the complete source',limits,()=>{
 const {options}=asyncControlReceivingInput(),result=translateAsyncControlCallerRust(native,{sourcePath:'rust/src/caller.rs',javascriptPath:options.sourcePath,runtimePath:options.runtimePath,runtimeSource:options.runtimeSource,nativeRootSource:options.nativeRootSource,nativeSource:options.nativeSource});assert.ok(result.javascript.includes('18446744073709551615n'));assert.ok(result.javascript.includes('typeof amount'));assert.ok(sameRustSourceSyntax(result.rust,native));assert.equal(result.asyncControlRustSourceHistory.equation.inverse,native);assert.ok(sameRustSourceSyntax(translateAsyncControlCallerTypeScript(result.typescript,asyncControlReceivingInput('caller.mts').options).rust,native));assert.equal(result.nativeRustGrammarChecked,false);
 const queried=translated(source.replace('@param {bigint} amount','@param {Parameters<typeof sleep>[0]} amount'));assert.ok(sameRustSourceSyntax(queried.rust,native));
});
test('bare types copied metadata weaker bounds misplaced guards different operands and nonnumeric inputs cannot qualify',limits,()=>{
 for(const code of [
  source.replace('if(typeof amount!=="bigint"||amount<0n||amount>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}',''),
  source.replace('amount<0n','amount<=0n'),
  source.replace('amount>18446744073709551615n','amount>18446744073709551616n'),
  source.replace('typeof amount!=="bigint"||',''),
  source.replace('amount<0n','capacity<0n'),
  source.replace('throw new RangeError','throw new Error'),
  source.replace('@param {bigint} amount','@param {boolean} amount'),
  source.replace(' if(typeof amount',' const before=true;\n if(typeof amount'),
 ])assert.throws(()=>translated(code));
 const result=translated(source),meta=JSON.parse(result.meta);meta.functions[0].inputGuards[0].maximum='18446744073709551616';assert.throws(()=>readAsyncControlCallerMeta(JSON.stringify(meta),source,asyncControlReceivingInput().options),/differ/u);assert.equal(result.crossInvocationCache,false);
});
test('full source checker projection and paired signature originals keep native selections and both inverse phases',limits,()=>{
 const plan=prepareAsyncControlU64Sources();assert.equal(plan.files.length,4);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.ok(plan.files.some(row=>row.path.endsWith('/async-control-unit-signatures.mjs')));
});
test('paired bigint annotations still require every original JS numeric entry guard',limits,()=>{
 const typed=translated(source).typescript,unannotated=source.replace(/\/\*\*[\s\S]*?\*\//gu,''),unit={paths:{JavaScript:'caller.mjs',TypeScript:'caller.ts'},runtimes:{JavaScript:'runtime',TypeScript:'runtime'}},options=asyncControlReceivingInput().options,proposal=projectAsyncControlUnitJavaScript(unannotated,{unit,current:{TypeScript:typed},options});assert.equal(proposal.history.equation.inverse,unannotated);assert.ok(sameRustSourceSyntax(translated(proposal.source).rust,native));
 const missing=unannotated.replace('if(typeof amount!=="bigint"||amount<0n||amount>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}',''),candidate=projectAsyncControlUnitJavaScript(missing,{unit,current:{TypeScript:typed},options});assert.throws(()=>translated(candidate.source),/range/u);
});
