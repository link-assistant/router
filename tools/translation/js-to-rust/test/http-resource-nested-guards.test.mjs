// Independent actual nested numeric ingress SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNestedGuardSources} from '../../prepare-http-resource-nested-guard-sources.mjs';
const limits={timeout:60000},minimum=-9223372036854775808n,maximum=9223372036854775807n;
const imports=`import {router_async_with_deadline as deadline} from './runtime/async-control-runtime.mjs';
import {router_option_i64_some as some,router_option_u64_some as unsignedSome} from './runtime/primitive-option-runtime.mjs';
import {router_integer_i64_min as signed} from './runtime/integer-runtime.mjs';
import {router_owned_result_i64_ok as okay} from './runtime/owned-result-runtime.mjs';
`;
const nestedGuard=name=>'if('+name+'.$==="Ok"&&'+name+'.field0.$==="Some"&&(typeof '+name+'.field0.field0!=="bigint"||'+name+'.field0.field0< -9223372036854775808n||'+name+'.field0.field0>9223372036854775807n)){throw new RangeError("Resource i64 payload outside native range");}';
const controlGuard=name=>'if('+name+'.$==="Ok"&&(typeof '+name+'.field0!=="bigint"||'+name+'.field0< -9223372036854775808n||'+name+'.field0>9223372036854775807n)){throw new RangeError("Resource i64 payload outside native range");}';
const resultGuard=name=>'if('+name+'.$==="Ok"&&'+name+'.field0.$==="Ok"&&(typeof '+name+'.field0.field0!=="bigint"||'+name+'.field0.field0< -9223372036854775808n||'+name+'.field0.field0>9223372036854775807n)){throw new RangeError("Resource i64 payload outside native range");}';
const source=imports+`type Completed<T>=Awaited<ReturnType<typeof deadline<T>>>;
export function nested(value:Completed<ReturnType<typeof some>>){${nestedGuard('value')}return value;}
export function control(value:Completed<ReturnType<typeof signed>>){${controlGuard('value')}return value;}
export function outcomes(value:Completed<ReturnType<typeof okay>>){${resultGuard('value')}return value;}
export function natural(value:Completed<bigint>){${controlGuard('value')}return value;}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual nested numeric guards preserve every constructor and successful payload native range',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 await verifyHttpResourceTargets(result,api=>{for(const integer of [minimum,-1n,0n,maximum]){const nested=Object.freeze({$:'Ok',field0:Object.freeze({$:'Some',field0:integer})}),control=Object.freeze({$:'Ok',field0:integer}),outcome=Object.freeze({$:'Ok',field0:Object.freeze({$:'Ok',field0:integer})});assert.equal(api.nested(nested),nested);assert.equal(api.control(control),control);assert.equal(api.natural(control),control);assert.equal(api.outcomes(outcome),outcome);}const absent=Object.freeze({$:'Ok',field0:Object.freeze({$:'None'})}),cancelled=Object.freeze({$:'Err',field0:Object.freeze({$:'Cancelled'})}),failure=Object.freeze({$:'Ok',field0:Object.freeze({$:'Err',field0:'missing'})});assert.equal(api.nested(absent),absent);assert.equal(api.nested(cancelled),cancelled);assert.equal(api.outcomes(failure),failure);for(const value of [minimum-1n,maximum+1n,0,'1']){assert.throws(()=>api.nested({$:'Ok',field0:{$:'Some',field0:value}}),/Resource i64 payload outside native range/u);assert.throws(()=>api.control({$:'Ok',field0:value}),/Resource i64 payload outside native range/u);}});
 const rows=JSON.parse(result.meta).functions;assert.equal(rows.find(row=>row.name==='nested').parameters[0].type,'result:optional:i64');assert.equal(rows.find(row=>row.name==='natural').parameters[0].type,'result:i64');assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('actual nested native signatures retain current generic type witnesses canonical guards and full inverses',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.match(result.javascript,/\.field0\.field0/u);assert.equal(result.rustExecuted,false);
});
test('nested guards cannot skip constructors use a different payload path change fixed native domains or weaken a bound',limits,()=>{
 for(const body of [
  'export function bad(value:Awaited<ReturnType<typeof deadline<ReturnType<typeof some>>>>){return value;}',
  'export function bad(value:Awaited<ReturnType<typeof deadline<ReturnType<typeof some>>>>){'+nestedGuard('value').replace('value.field0.$==="Some"&&','')+'return value;}',
  'export function bad(value:Awaited<ReturnType<typeof deadline<ReturnType<typeof some>>>>){'+nestedGuard('value').replace('Some','None')+'return value;}',
  'export function bad(value:Awaited<ReturnType<typeof deadline<ReturnType<typeof some>>>>){'+nestedGuard('value').replace('value.field0.field0>','value.field0>')+'return value;}',
  'export function bad(value:Awaited<ReturnType<typeof deadline<ReturnType<typeof some>>>>){'+nestedGuard('value').replace('9223372036854775807n','9223372036854775808n')+'return value;}',
  'export function bad(value:Awaited<ReturnType<typeof deadline<ReturnType<typeof unsignedSome>>>>){'+nestedGuard('value')+'return value;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='nested').inputGuards[0].type='result:i64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('all complete recursive guard originals retain ordered language/repository stages and exact inverses',limits,()=>{
 const plan=prepareHttpResourceNestedGuardSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
