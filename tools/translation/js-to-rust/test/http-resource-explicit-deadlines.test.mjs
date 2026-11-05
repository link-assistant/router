// Independent explicit settled-slot and signed roundtrip SOURCE. All unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceExplicitDeadlineSources} from '../../prepare-http-resource-explicit-deadline-sources.mjs';
const limits={timeout:60000};
const imports=`import {router_async_with_deadline as deadline,router_async_sleep as sleep,router_cancel_is_set as isSet} from './runtime/async-control-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
import {router_integer_i64_min as signed} from './runtime/integer-runtime.mjs';
import {router_option_bool_some as some} from './runtime/primitive-option-runtime.mjs';
`;
const source=imports+`type Signed=ReturnType<typeof signed>;
export function positive(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline<Signed>(1000n,cancellation,async child=>1n);});}
export function maximum(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline<Signed>(1000n,cancellation,async child=>9223372036854775807n);});}
export function choice(cancellation:Parameters<typeof isSet>[0],flag:boolean){return defer(async()=>{return await deadline<Signed>(1000n,cancellation,async child=>flag?1n:2n);});}
export function called(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline<boolean>(1000n,cancellation,async child=>isSet(child));});}
export function optional(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline<ReturnType<typeof some>>(1000n,cancellation,async child=>some(true));});}
export function slept(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline<Awaited<ReturnType<typeof sleep>>>(1000n,cancellation,async child=>await sleep(0n,child));});}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('explicit actual deadline slots remain whole callback obligations and signed domains survive erasure',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.javascript,/@type/u);assert.doesNotMatch(result.javascript,/deadline<Signed>/u);for(const name of ['positive','maximum','choice'])assert.equal(JSON.parse(result.meta).functions.find(row=>row.name===name).returns,'result:i64');
 await verifyHttpResourceTargets(result,async(api,{control})=>{const cancellation=control.router_cancel_new();assert.deepEqual(await api.positive(cancellation),{$:'Ok',field0:1n});assert.deepEqual(await api.maximum(cancellation),{$:'Ok',field0:9223372036854775807n});assert.deepEqual(await api.choice(cancellation,true),{$:'Ok',field0:1n});assert.deepEqual(await api.choice(cancellation,false),{$:'Ok',field0:2n});assert.deepEqual(await api.called(cancellation),{$:'Ok',field0:false});assert.deepEqual(await api.optional(cancellation),{$:'Ok',field0:{$:'Some',field0:true}});assert.deepEqual(await api.slept(cancellation),{$:'Ok',field0:{$:'Ok',field0:null}});});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('native inferred positive i64 deadline outputs carry genuine target type witnesses and exact inverses',limits,async()=>{
 for(const value of ['1_i64','9223372036854775807_i64']){const native='pub async fn chosen(cancellation: &crate::translation_async_control_core::Cancellation) -> Result<i64, crate::translation_async_control_core::ControlError> { crate::translation_async_control_core::with_deadline(1000_u64, cancellation, |_child: crate::translation_async_control_core::Cancellation| async move { '+value+' }).await }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));assert.match(result.javascript,/@type/u);await verifyHttpResourceTargets(result,async(api,{control})=>assert.deepEqual(await api.chosen(control.router_cancel_new()),{$:'Ok',field0:BigInt(value.split('_')[0])}));assert.equal(result.rustExecuted,false);}
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),inverse=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,inverse.rust));
});
test('explicit generic slot arity actual return width source owners and erased body obligations retain refusals',limits,()=>{
 const prefix='export function bad(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await ',suffix=';});}';for(const expression of [
  'deadline<boolean>(1000n,cancellation,async child=>1n)',
  'deadline<ReturnType<typeof signed>>(1000n,cancellation,async child=>9223372036854775808n)',
  'deadline<boolean,bigint>(1000n,cancellation,async child=>true)',
  'deadline<any>(1000n,cancellation,async child=>true)',
  'deadline<Promise<boolean>>(1000n,cancellation,async child=>true)',
  'deadline<ReturnType<typeof some>>(1000n,cancellation,async child=>true)',
  'deadline<boolean>(1000n,cancellation,async child=>{await sleep(0n,child);return true;})',
  'sleep<boolean>(0n,cancellation)',
 ]){const value=imports+prefix+expression+suffix;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),expression);}
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),data=JSON.parse(translated.meta);data.functions.find(row=>row.name==='positive').flow.tail.value.args[2].flow.tail.value.type='u64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(data),source,input(source),{language:'TypeScript'}));
 const weakened=translated.javascript.replace(/@type \{ReturnType<typeof signed>\}/u,'@type {boolean}');assert.notEqual(weakened,translated.javascript);assert.throws(()=>translateHttpResourceCallerJavaScript(weakened,input(weakened,'caller.mjs')));
});
test('all complete explicit-slot call and source repair histories retain both phases and full inverses',limits,()=>{
 const plan=prepareHttpResourceExplicitDeadlineSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
