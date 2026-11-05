// Independent awaited-resource regression SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedCancellationReceivingData} from './owned-cancellation-receiving-data.mjs';
import {translateAsyncControlCallerJavaScript,translateAsyncControlCallerTypeScript,translateAsyncControlCallerConcreteSyntaxMeta,readAsyncControlCallerMeta} from '../async-control-callers.mjs';
import {prepareReverseConcreteSource} from '../concrete-source.mjs';
import {prepareAsyncControlCallerSources} from '../../prepare-async-control-caller-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const prelude=`import {router_cancel_new as created,router_cancel_clone as cloned,router_cancel_set as signal,router_cancel_is_set as isSet,router_cancel_wait as wait,router_async_sleep as sleep,router_async_with_deadline as deadline,router_async_channel as channel,router_async_sender_clone as cloneSender,router_async_send as send,router_async_receive as receive,router_async_close as close,router_async_dispose as dispose} from './runtime/async-control-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
`;
const source=prelude+`
export function createdToken(){return created();}
/** @param {Parameters<typeof isSet>[0]} token */
export function duplicateToken(token){return cloned(token);}
/** @param {Parameters<typeof isSet>[0]} token */
export function status(token){return isSet(token);}
/** @param {Parameters<typeof isSet>[0]} token */
export function cancel(token){return signal(token);}
/** @param {Parameters<typeof wait>[0]} token */
export function waited(token){return wait(token);}
/** @param {Parameters<typeof sleep>[1]} token */
export function slept(token){return sleep(0n,token);}
/** @param {Parameters<typeof deadline>[1]} token */
export function timed(token){return defer(async()=>{return await deadline(1000n,token,async child=>{return await sleep(0n,child);});});}
/** @param {Parameters<typeof deadline>[1]} token */
export function timedOut(token){return defer(async()=>{return await deadline(0n,token,async child=>{return await sleep(1000n,child);});});}
export function endpoints(){return channel(1n);}
/** @param {string} encoded @param {Parameters<typeof send>[2]} token */
export function roundTrip(encoded,token){return defer(async()=>{
 const pair=channel(1n);if(pair.$==='Err'){return pair;}
 const [sender,receiver]=pair.field0;const second=cloneSender(sender);
 const sent=await send(second,encoded,token);if(sent.$==='Err'){dispose(receiver);return sent;}
 const received=await receive(receiver,token);if(received.$==='Err'){dispose(receiver);return received;}
 close(receiver);dispose(receiver);return received;
});}
/** @param {Parameters<typeof receive>[0]} receiver @param {Parameters<typeof receive>[1]} token */
export function borrowed(receiver,token){return defer(async()=>{return await deadline(1000n,token,async child=>{return await receive(receiver,child);});});}
`;
function inputs(caller=source,sourcePath='caller.mjs'){
 const data=ownedCancellationReceivingData([{path:sourcePath,source:caller}]),files=new Map(data.files.map(row=>[row.path,row.source]));return {data,options:{sourcePath,runtimePath:'runtime/async-control-runtime.mjs',runtimeSource:files.get('runtime/async-control-runtime.mjs'),nativeRootSource:files.get('src/lib.rs'),nativeSource:files.get('src/translation_async_control_core.rs')}};
}
const translate=caller=>translateAsyncControlCallerJavaScript(caller,inputs(caller).options);
test('actual cold wrappers channel cleanup and nested deadline results agree under JS and strict TypeScript',limits,async t=>{
 const {data,options}=inputs(),result=translateAsyncControlCallerJavaScript(source,options),directory=mkdtempSync(join(tmpdir(),'router-control-callers-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};for(const row of data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(row.path,row.source);write('caller.mjs',result.javascript);write('typed.mts',result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+row.path,row.source);
 for(const path of ['caller.mjs','out/typed.mjs']){
  const api=await import(pathToFileURL(join(directory,path))),fresh=api.createdToken(),copy=api.duplicateToken(fresh);assert.equal(api.status(copy),false);const cold=api.roundTrip('aGk=',fresh);assert.equal(typeof cold.then,'function');assert.deepEqual(await cold,{$:'Ok',field0:{$:'Some',field0:'aGk='}});assert.deepEqual(await api.roundTrip('invalid base64',fresh),{$:'Err',field0:{$:'InvalidInput'}});assert.deepEqual(await api.slept(fresh),{$:'Ok',field0:null});assert.deepEqual(await api.timed(fresh),{$:'Ok',field0:{$:'Ok',field0:null}});assert.deepEqual(await api.timedOut(fresh),{$:'Err',field0:{$:'Timeout'}});
  assert.equal(api.cancel(copy),true);assert.equal(api.status(fresh),true);assert.equal(await api.waited(fresh),null);assert.deepEqual(await api.slept(fresh),{$:'Err',field0:{$:'Cancelled'}});assert.deepEqual(await api.timed(fresh),{$:'Err',field0:{$:'Cancelled'}});
 }
 assert.ok(result.rust.includes('async fn roundTrip'));assert.ok(result.rust.includes('let (sender, mut receiver)'));assert.ok(result.rust.includes('&mut *receiver'));assert.ok(result.rust.includes('__ro_control_capture_'));assert.equal(result.nativeRustGrammarChecked,false);assert.equal(result.receivingExecuted,false);assert.equal(result.crossInvocationCache,false);
});
test('complete current source reissues semantic meta and preserves actual parameter and target CST inverses',limits,()=>{
 const {options}=inputs(),result=translateAsyncControlCallerJavaScript(source,options),typed=translateAsyncControlCallerTypeScript(result.typescript,inputs(result.typescript,'caller.mts').options);assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.equal(readAsyncControlCallerMeta(result.meta,source,options).functions.length,11);assert.throws(()=>readAsyncControlCallerMeta(result.meta,source.replace('sleep(0n,token)','sleep(1n,token)'),options),/differ/u);
 const concrete=prepareReverseConcreteSource(source),again=translateAsyncControlCallerConcreteSyntaxMeta(concrete.concreteSyntax.meta,options);assert.ok(sameRustSourceSyntax(again.rust,result.rust));for(const equation of result.targetSourceEquations)assert.equal(equation.inverse,source);
});
test('pending futures eager async source dropped receivers duplicated moves and unproved scalar domains refuse',limits,()=>{
 for(const body of [
  'export async function bad(){return await sleep(0n,created());}',
  '/** @param {Parameters<typeof sleep>[1]} token */ export function bad(token){return defer(async()=>{const pending=sleep(0n,token);return pending;});}',
  'export function bad(){const pair=channel(1n);if(pair.$==="Err"){return pair;}const [sender,receiver]=pair.field0;return sender;}',
  'export function bad(){const first=created();const second=first;return isSet(first);}',
  '/** @param {bigint} amount @param {Parameters<typeof sleep>[1]} token */ export function bad(amount,token){return sleep(amount,token);}',
  '/** @param {Parameters<typeof sleep>[1]} token */ export function bad(token){return sleep(18446744073709551616n,token);}',
  '/** @param {Parameters<typeof sleep>[1]} token */ export function bad(token){return defer(async()=>{return await deadline(1n,token,async child=>{const result=await sleep(0n,child);if(result.$==="Err"){return result;}signal(child);return result;});});}',
  '/** @param {Parameters<typeof sleep>[1]} token */ export function bad(token){return defer(async()=>{return await deadline(1n,token,async child=>{return await sleep(0n,token);});});}',
  '/** @param {Parameters<typeof sleep>[1]} token */ export function bad(token){return defer(async()=>{const result=await sleep(0n,token);if(result.$==="Err"){return result;}return true;});}',
 ])assert.throws(()=>translate(prelude+body),body);
});
test('complete native roots runtime input and operation-derived type bindings remain mandatory',limits,()=>{
 const {options}=inputs();for(const key of ['runtimeSource','nativeSource'])assert.throws(()=>translateAsyncControlCallerJavaScript(source,{...options,[key]:options[key]+'\n// modified'}));assert.throws(()=>translateAsyncControlCallerJavaScript(source,{...options,nativeRootSource:options.nativeRootSource+'\npub mod translation_async_control_core;'}));assert.throws(()=>translateAsyncControlCallerJavaScript(source,{...options,proof:{}}));assert.throws(()=>translate(source.replace("'./runtime/async-control-runtime.mjs'","'./unregistered/async-control-runtime.mjs'")));
});
test('complete original wrapper copy and both ordered native source substitutions stay reviewable',limits,()=>{
 const plan=prepareAsyncControlCallerSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);const wrapper=plan.files.find(row=>row.path.endsWith('/async-control-callers.mjs'));assert.ok(wrapper.originalPath.endsWith('/originals/filesystem-control.mjs.txt'));assert.ok(wrapper.before.includes('translateFilesystemControlJavaScript'));assert.ok(wrapper.after.includes('translateAsyncControlCallerJavaScript'));
});
