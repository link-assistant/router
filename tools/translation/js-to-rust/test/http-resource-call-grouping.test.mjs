// Independent grouping and original no-op SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceCallGroupingSources} from '../../prepare-http-resource-call-grouping-sources.mjs';
const limits={timeout:60000};
const imports=`import {router_integer_i64_min as signed} from './runtime/integer-runtime.mjs';
import {router_async_sleep as sleep,router_cancel_is_set as isSet,router_async_with_deadline as deadline} from './runtime/async-control-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
`;
const guard='if(typeof value!=="bigint"||value< -9223372036854775808n||value>9223372036854775807n){throw new RangeError("Resource i64 input outside native range");}';
const source=imports+`export function forward<T>(value:T):T{;return ((identity))<T>(value);;}
export function identity<T>(value:T):T{return value;}
export function scalar(){return ((forward))<ReturnType<typeof signed>>(1n);}
export function guarded(value:ReturnType<typeof signed>){;;;${guard};;;return ((forward))(value);;;}
export function cold(cancellation:Parameters<typeof isSet>[0]){;;;return (((defer))(((async()=>{;;;return await (((sleep))(0n,cancellation));;;}))));;;}
export function completion(cancellation:Parameters<typeof isSet>[0]){return ((defer))((async()=>{return await ((deadline))<boolean>(1000n,cancellation,((async child=>((isSet))(child))));}));}
`;
const javascript=imports+`/** @template T @param {T} value @returns {T} */
export function forward(value){return ((identity))(value);}
/** @template T @param {T} value @returns {T} */
export function identity(value){return value;}
/** @param {ReturnType<typeof signed>} value */
export function guarded(value){;;;${guard};;;return ((forward))(value);;;}
/** @param {Parameters<typeof isSet>[0]} cancellation */
export function cold(cancellation){;;;return (((defer))(((async()=>{;;;return await (((sleep))(0n,cancellation));;;}))));;;}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('grouped original calls forward generic dependencies numeric domains and deferred complete bodies',limits,async()=>{
 for(const [language,value]of [['TypeScript',source],['JavaScript',javascript]]){
  const result=language==='TypeScript'?translateHttpResourceCallerTypeScript(value,input(value)):translateHttpResourceCallerJavaScript(value,input(value,'caller.mjs'));
  const paired=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,paired.rust));assert.equal(language==='TypeScript'?result.typescript:result.javascript,value);
  await verifyHttpResourceTargets(result,async(api,{control})=>{const token=control.router_cancel_new();assert.equal(api.forward('é😀'),'é😀');for(const integer of [-9223372036854775808n,0n,9223372036854775807n])assert.equal(api.guarded(integer),integer);for(const integer of [-9223372036854775809n,9223372036854775808n])assert.throws(()=>api.guarded(integer),RangeError);assert.deepEqual(await api.cold(token),{$:'Ok',field0:null});if(language==='TypeScript'){assert.equal(api.scalar(),1n);assert.deepEqual(await api.completion(token),{$:'Ok',field0:false});}});
  const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,inverse.rust));assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 }
});
test('grouping cannot supply a function signature property binding weakened guard or dependency cycle',limits,()=>{
 for(const declaration of [
  'function bad(){return (/** @type {boolean} */ (signed))();}',
  'function bad(){return (({signed}).signed)();}',
  'function bad<T>(value:T):T{return ((later))(value);} function later<T>(value:T):T{return ((bad))(value);}',
  'function bad(value:ReturnType<typeof signed>){;;return value;}',
  'function bad(value:ReturnType<typeof signed>){;;'+guard.replace('9223372036854775807n','9223372036854775808n')+'return value;}',
  'function bad(cancellation:Parameters<typeof isSet>[0]){return ((defer))((/** @type {boolean} */ (async()=>{return await sleep(0n,cancellation);})));}',
  'function bad(cancellation:Parameters<typeof isSet>[0]){return ((defer))((async()=>{return await deadline(1n,cancellation,(/** @type {boolean} */ (async child=>true)));}));}',
  'function bad(){return '+'('.repeat(17)+'signed'+')'.repeat(17)+'();}',
  'function bad(){'+';'.repeat(4097)+'return true;}',
 ]){const value=imports+declaration;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),declaration.slice(0,160));}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='guarded').inputGuards[0].maximum='9223372036854775808';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('all complete grouping sources preserve the original two phases full inverses and physical joins',limits,()=>{
 const plan=prepareHttpResourceCallGroupingSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
