// Independent actual cancellation/queue source cases. All remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceCancellableDeadlineSources} from '../../prepare-http-resource-cancellable-deadline-sources.mjs';
const limits={timeout:60000};
const imports=`import {router_async_with_deadline as deadline,router_async_sleep as sleep,router_async_send as send,router_async_receive as receive,router_cancel_is_set as isSet,router_cancel_new as cancelNew,router_cancel_set as set} from './runtime/async-control-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
`;
const source=imports+`export function slept(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async child=>await sleep(0n,child));});}
export function sent(sender:Parameters<typeof send>[0],text:string,cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async child=>await send(sender,text,child));});}
export function timeout(sender:Parameters<typeof send>[0],cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1n,cancellation,async child=>await send(sender,"Yg==",child));});}
export function typed(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async(child:ReturnType<typeof cancelNew>):Promise<Awaited<ReturnType<typeof sleep>>>=>{;return await sleep(0n,child);;});});}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual cancellable sleep/send tails preserve nested Result values and both typed targets',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 await verifyHttpResourceTargets(result,async(api,{control})=>{const cancellation=control.router_cancel_new();assert.deepEqual(await api.slept(cancellation),{$:'Ok',field0:{$:'Ok',field0:null}});assert.deepEqual(await api.typed(cancellation),{$:'Ok',field0:{$:'Ok',field0:null}});const pair=control.router_async_channel(1n);assert.equal(pair.$,'Ok');const [sender,receiver]=pair.field0;try{assert.deepEqual(await api.sent(sender,'YQ==',cancellation),{$:'Ok',field0:{$:'Ok',field0:null}});assert.deepEqual(await control.router_async_receive(receiver,cancellation),{$:'Ok',field0:{$:'Some',field0:'YQ=='}});control.router_cancel_set(cancellation);assert.deepEqual(await api.sent(sender,'Yg==',cancellation),{$:'Err',field0:{$:'Cancelled'}});}finally{control.router_async_dispose(receiver);}});
 assert.equal(JSON.parse(result.meta).functions.find(row=>row.name==='sent').returns,'result:result:unit');assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('timed-out send removes its pending writer and leaves no late queued payload',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source));await verifyHttpResourceTargets(result,async(api,{control})=>{const cancellation=control.router_cancel_new(),pair=control.router_async_channel(1n);assert.equal(pair.$,'Ok');const [sender,receiver]=pair.field0;try{assert.deepEqual(await control.router_async_send(sender,'YQ==',cancellation),{$:'Ok',field0:null});assert.deepEqual(await api.timeout(sender,cancellation),{$:'Err',field0:{$:'Timeout'}});assert.deepEqual(await control.router_async_receive(receiver,cancellation),{$:'Ok',field0:{$:'Some',field0:'YQ=='}});control.router_async_close(receiver);assert.deepEqual(await control.router_async_receive(receiver,cancellation),{$:'Ok',field0:{$:'None'}});}finally{control.router_async_dispose(receiver);}});
});
test('canonical native cancellable factories retain exact actual child use through full inverses',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.match(result.javascript,/await /u);assert.equal(result.rustExecuted,false);
 const data=JSON.parse(translated.meta);data.functions.find(row=>row.name==='sent').flow.tail.value.args[2].flow.tail.value.args[2].name='cancellation';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(data),source,input(source),{language:'TypeScript'}));
});
test('parent cancellation post-await effects exclusive captures and unknown asynchronous helpers refuse',limits,()=>{
 for(const body of [
  'export function bad(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async child=>await sleep(0n,cancellation));});}',
  'export function bad(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async child=>{const value=await sleep(0n,child);return value;});});}',
  'export function bad(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async child=>{await sleep(0n,child);return set(child);});});}',
  'export function bad(receiver:Parameters<typeof receive>[0],cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async child=>await receive(receiver,child));});}',
  'function helper(cancellation:Parameters<typeof isSet>[0]){return sleep(0n,cancellation);}export function bad(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async child=>await helper(child));});}',
  'export function bad(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1000n,cancellation,async child=>await deadline(1n,child,async next=>true));});}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
});
test('all complete cancellation-tail originals retain language repository sequences and full inverses',limits,()=>{
 const plan=prepareHttpResourceCancellableDeadlineSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
