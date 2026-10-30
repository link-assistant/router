// Independent whole-source regression DRAFT. No case has been executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourcePureDeadlineSources} from '../../prepare-http-resource-pure-deadline-sources.mjs';
const limits={timeout:60000};
const imports=`import {router_async_with_deadline as deadline,router_cancel_is_set as isSet,router_cancel_set as set,router_cancel_new as cancelNew,router_async_channel as channel} from './runtime/async-control-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
import {router_text_repeat as repeat} from './runtime/text-runtime.mjs';
import {router_integer_i64_min as signed} from './runtime/integer-runtime.mjs';
import {router_option_bool_some as some} from './runtime/primitive-option-runtime.mjs';
`;
const source=imports+`export function truth(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async child=>true);});}
export function text(cancellation:Parameters<typeof isSet>[0],value:string){return defer(async()=>{return await deadline(1000n,cancellation,async child=>repeat(value,2n));});}
export function low(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async child=>signed(-9223372036854775808n,0n));});}
export function optional(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async child=>some(!isSet(child)));});}
export function zero(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(0n,cancellation,async child=>true);});}
export function typed(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async(child:ReturnType<typeof cancelNew>):Promise<boolean>=>true);});}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('pure complete deadline callbacks retain owned return types cancellation and erased contextual annotations',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.rust,/\|[^|]*: crate::translation_async_control_core::Cancellation\| async move/u);
 await verifyHttpResourceTargets(result,async(api,{control})=>{const cancellation=control.router_cancel_new();assert.deepEqual(await api.truth(cancellation),{$:'Ok',field0:true});assert.deepEqual(await api.typed(cancellation),{$:'Ok',field0:true});assert.deepEqual(await api.text(cancellation,'é😀'),{$:'Ok',field0:'é😀é😀'});assert.deepEqual(await api.low(cancellation),{$:'Ok',field0:-9223372036854775808n});assert.deepEqual(await api.optional(cancellation),{$:'Ok',field0:{$:'Some',field0:true}});assert.deepEqual(await api.zero(cancellation),{$:'Err',field0:{$:'Timeout'}});control.router_cancel_set(cancellation);assert.deepEqual(await api.truth(cancellation),{$:'Err',field0:{$:'Cancelled'}});});
 const rows=JSON.parse(result.meta).functions;assert.equal(rows.find(row=>row.name==='low').returns,'result:i64');assert.equal(rows.find(row=>row.name==='text').returns,'result:text-owned');assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('native pure typed async closures rejoin source meta and reproduce every original native token',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.match(result.javascript,/async \(/u);assert.equal(result.rustExecuted,false);
 const forged=JSON.parse(translated.meta);forged.functions.find(row=>row.name==='truth').flow.tail.value.args[2].returns='u64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(forged),source,input(source),{language:'TypeScript'}));
});
test('late effects opaque resource outputs owned captures unknown helpers and Promise erasure refuse',limits,()=>{
 const prefix='export function bad(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,';
 for(const callback of ['async child=>set(child)','async child=>set(cancellation)','async child=>channel(1n)','async child=>{await deadline(1n,child,async nested=>true);return true;}','async child=>{set(child);return true;}','async child=>child','async(child):PromiseLike<boolean>=>true','child=>true','async(child):Promise<bigint>=>true']){const value=imports+prefix+callback+');});}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),callback);}
 for(const body of [
  'export function bad(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{const owned=repeat("x",1n);return await deadline(1000n,cancellation,async child=>repeat(owned,1n));});}',
  'function unknown(){return true;}export function bad(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async child=>unknown());});}',
  'export function bad(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{let mutable=true;return await deadline(1000n,cancellation,async child=>mutable);});}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
});
test('zero and precancelled real library factories do not execute and successful children are cancelled on settlement',limits,async()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source));await verifyHttpResourceTargets(translated,async(api,{control})=>{let calls=0,child;const cancellation=control.router_cancel_new(),factory=async current=>{calls++;child=current;return true;};assert.deepEqual(await control.router_async_with_deadline(0n,cancellation,factory),{$:'Err',field0:{$:'Timeout'}});assert.equal(calls,0);assert.deepEqual(await control.router_async_with_deadline(1000n,cancellation,factory),{$:'Ok',field0:true});assert.equal(calls,1);assert.equal(control.router_cancel_is_set(child),true);control.router_cancel_set(cancellation);assert.deepEqual(await control.router_async_with_deadline(1000n,cancellation,factory),{$:'Err',field0:{$:'Cancelled'}});assert.equal(calls,1);});
});
test('complete pure producer originals retain ordered language repository rules and full inverses',limits,()=>{
 const plan=prepareHttpResourcePureDeadlineSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
