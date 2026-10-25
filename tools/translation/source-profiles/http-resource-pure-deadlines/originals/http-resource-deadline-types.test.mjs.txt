// Independent actual generic deadline type SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {requireHttpResourceDeadlineTypeSource} from '../http-resource-deadline-type-source.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceDeadlineTypeSources} from '../../prepare-http-resource-deadline-type-sources.mjs';
const limits={timeout:60000};
const imports=`import {router_async_with_deadline as deadline,router_cancel_is_set as isSet} from './runtime/async-control-runtime.mjs';
import {router_option_bool_some as some} from './runtime/primitive-option-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
`;
const guard='if(typeof value!=="bigint"||value<0n||value>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}';
const source=imports+`type Completed<T>=Awaited<ReturnType<typeof deadline<T>>>;
export function control(value:Completed<boolean>){return value;}
export function nested(value:Completed<ReturnType<typeof some>>){return value;}
export function count(value:Parameters<typeof deadline>[0]){${guard}return value;}
export function cancellation(value:Parameters<typeof deadline>[1]){return isSet(value);}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual generic deadline type equations retain original constructor domains and generic-independent inputs',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 await verifyHttpResourceTargets(result,(api,{control})=>{for(const value of [Object.freeze({$:'Ok',field0:true}),Object.freeze({$:'Err',field0:Object.freeze({$:'Timeout'})})])assert.equal(api.control(value),value);const value=Object.freeze({$:'Ok',field0:Object.freeze({$:'Some',field0:true})});assert.equal(api.nested(value),value);assert.equal(api.count(1n),1n);assert.equal(api.cancellation(control.router_cancel_new()),false);});
 const rows=JSON.parse(result.meta).functions;assert.equal(rows.find(row=>row.name==='control').parameters[0].type,'result:bool');assert.equal(rows.find(row=>row.name==='nested').parameters[0].type,'result:optional:bool');assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('complete real native control-result inputs receive checked generic witnesses and exact inverses',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.match(result.javascript,/router_async_with_deadline/u);assert.equal(result.rustExecuted,false);
});
test('a generic type witness cannot grant an uninstantiated domain unsupported factory input or deadline execution',limits,()=>{
 for(const body of [
  'export function bad(value:Awaited<ReturnType<typeof deadline>>){return value;}',
  'export function bad(value:Parameters<typeof deadline<boolean>>[2]){return value;}',
  'export function bad(value:Awaited<ReturnType<typeof deadline<boolean,bigint>>>){return value;}',
  'export function bad(cancellation:Parameters<typeof isSet>[0]){return defer(async()=>{return await deadline(1n,cancellation,async child=>true);});}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='nested').parameters[0].type='optional:bool';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('original complete generic deadline declaration and actual slot owners remain independently current',limits,()=>{
 const declaration=readFileSync(new URL('../../async-control-runtime.d.mts',import.meta.url),'utf8'),record=requireHttpResourceDeadlineTypeSource({source:declaration,path:'runtime/async-control-runtime.d.mts'});assert.equal(record.source,declaration);assert.equal(record.sourceAuthority,false);assert.equal(record.semanticAuthority,false);
 for(const source of [declaration.replace('router_async_with_deadline<T>(argument0:bigint','router_async_with_deadline<T>(argument0:boolean'),declaration.replace('child:Cancellation','child:Sender'),declaration.replace('Deferred<ControlResult<T>>','PromiseLike<T>')])assert.throws(()=>requireHttpResourceDeadlineTypeSource({source,path:'runtime/async-control-runtime.d.mts'}));
});
test('complete deadline type original sources retain both ordered substitution stages and exact inverses',limits,()=>{
 const plan=prepareHttpResourceDeadlineTypeSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
