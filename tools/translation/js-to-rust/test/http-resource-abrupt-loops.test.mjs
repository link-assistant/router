// Independent whole abrupt-loop regression SOURCE. Every case is unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceAbruptLoopSources} from '../../prepare-http-resource-abrupt-loop-sources.mjs';
const limits={timeout:60000},imports=`import {router_integer_u64_wrapping_add as add,router_integer_u64_saturating_add as increment} from './runtime/integer-runtime.mjs';
import {router_owned_result_u64_ok as ok,router_owned_result_u64_err as error} from './runtime/owned-result-runtime.mjs';
import {router_option_u64_some as some,router_option_u64_none as none} from './runtime/primitive-option-runtime.mjs';
import {router_text_find as find} from './runtime/text-runtime.mjs';
import {router_http_transport_client_dispose as dispose} from './runtime/http-transport-runtime.mjs';
`;
const guard='if(typeof limit!=="bigint"||limit<0n||limit>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}';
const source=imports+`/** @param {bigint} limit */ export function counted(limit){${guard}let count=0n;let total=0n;while(count<limit){count=increment(count,1n);if(count===2n){continue;}if(count===4n){break;}total=add(total,count);}return total;}
/** @param {bigint} limit */ export function early(limit){${guard}let count=0n;while(count<limit){count=increment(count,1n);if(count===3n){return count;}}return 0n;}
/** @param {boolean} succeeds */ export function propagated(succeeds){let count=0n;while(count<2n){const value=selected(succeeds);if(value.$==='Err'){return value;}count=increment(count,value.field0);}return ok(count);}
/** @param {boolean} succeeds */ function selected(succeeds){if(succeeds){return ok(3n);}else{return error('failed');}}
/** @param {string} input */ export function optional(input){let pending=true;while(pending){const value=find(input,'é');if(value.$==='None'){return value;}pending=false;}return some(0n);}
/** @param {Parameters<typeof dispose>[0]} client @param {boolean} immediate */ export function released(client,immediate){return release(client,immediate);}
/** @param {Parameters<typeof dispose>[0]} client @param {boolean} immediate */ function release(client,immediate){let pending=true;while(pending){if(immediate){dispose(client);return null;}pending=false;}dispose(client);return null;}
export function nested(){let pending=true;while(pending){let inner=true;while(inner){inner=false;continue;}pending=false;break;}return pending;}
`;
function input(text,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:text}])};}
test('break continue early returns carrier propagation and nested loops preserve JS and strict TS behavior',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/break;/u);assert.match(result.rust,/continue;/u);assert.match(result.rust,/return count;/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 await verifyHttpResourceTargets(result,async(api,{transport})=>{for(const [limit,total]of [[0n,0n],[1n,1n],[2n,1n],[3n,4n],[4n,4n],[8n,4n]])assert.equal(api.counted(limit),total);for(const limit of [0n,1n,2n,3n,6n])assert.equal(api.early(limit),limit<3n?0n:3n);assert.deepEqual(api.propagated(true),{$:'Ok',field0:3n});assert.deepEqual(api.propagated(false),{$:'Err',field0:'failed'});assert.deepEqual(api.optional('hello'),{$:'None'});assert.deepEqual(api.optional('é😀'),{$:'Some',field0:0n});assert.equal(api.nested(),false);for(const immediate of [false,true]){const client=transport.router_http_transport_client_new(0n,0n,0n,'');assert.equal(client.$,'Ok');assert.equal(api.released(client.field0,immediate),null);}});
});
test('loop boundaries cannot count as function release exits and metadata cannot forge those joins',limits,()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta),release=meta.functions.find(row=>row.name==='release');assert.deepEqual(release.flow.resourceExits,[[{name:'client',disposed:true}],[{name:'client',disposed:true}]]);const loop=release.flow.steps.find(row=>row.kind==='while').body;assert.deepEqual(loop.loopExits,[[{name:'client',disposed:false}]]);assert.deepEqual(loop.resourceExits,[[{name:'client',disposed:true}]]);
 release.flow.resourceExits.push([{name:'client',disposed:false}]);assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));
 const minimal=imports+'export function first(){let count=0n;while(count<1n){return count;}return count;} export function second(){let count=0n;while(count<1n){break;}return count;} export function third(){let count=0n;while(count<1n){continue;}return count;}';assert.equal(JSON.parse(translateHttpResourceCallerJavaScript(minimal,input(minimal)).meta).functions.length,3);
});
test('labels wrong return families escaping branch locals partial releases and conditional ownership changes refuse',limits,()=>{
 for(const body of [
  'export function bad(){let count=0n;while(count<1n){return true;}return count;}',
  'export function bad(){let count=0n;outer:while(count<1n){break outer;}return count;}',
  'export function bad(){let count=0n;outer:while(count<1n){continue outer;}return count;}',
  '/** @param {boolean} choice */ export function bad(choice){if(choice){const hidden=1n;}return hidden;}',
  '/** @param {Parameters<typeof dispose>[0]} client @param {boolean} choice */ export function bad(client,choice){while(choice){dispose(client);break;}return null;}',
  '/** @param {Parameters<typeof dispose>[0]} client @param {boolean} choice */ export function bad(client,choice){return partial(client,choice);}/** @param {Parameters<typeof dispose>[0]} client @param {boolean} choice */ function partial(client,choice){while(choice){dispose(client);return null;}return null;}',
  '/** @param {Parameters<typeof dispose>[0]} client @param {boolean} choice */ export function bad(client,choice){if(choice&&disposeBool(client)){return null;}else{return dispose(client);}}/** @param {Parameters<typeof dispose>[0]} client */ function disposeBool(client){dispose(client);return true;}',
 ]){const text=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(text,input(text)),body);}
});
test('whole handwritten canonical native loop controls and true function returns reproduce every token',limits,()=>{
 const native='pub fn selected() -> u64 { let mut count = 0_u64; while (count < 3_u64) { count = crate::translation_integer_core::u64_saturating_add(count, 1_u64); if (count == 2_u64) { continue; } else { if (count == 3_u64) { return count; } else { break; } } } 0_u64 }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
});
test('full original flow reader projection and source-history substitutions retain both CST inverses',limits,()=>{
 const plan=prepareHttpResourceAbruptLoopSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
