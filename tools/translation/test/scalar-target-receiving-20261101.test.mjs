// Actual emitted-target receiving case SOURCE. All new execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {verifyScalarReceivingTargets} from './scalar-target-receiving-20261101.mjs';
import {primitiveVectorLiteralReceivingData as receiving} from '../js-to-rust/test/primitive-vector-literal-receiving-data.mjs';
import {proposePrimitiveVectorIteratorBulk} from '../primitive-vector-iterator-bulk-20261101.mjs';
import {proposeCollectionCallbackBulk} from '../collection-callback-bulk-20261101.mjs';
import {proposeScalarChainBulk} from '../scalar-chain-bulk-20261101.mjs';
const limits={timeout:60000},u64="import('./runtime/primitive-operator-runtime.mjs').RustU64";
function source(kind,typed){
 const head=(name,role=u64)=>typed?'export function '+name+'(input: readonly ('+role+')[])':'/** @param {readonly ('+role+')[]} input */\nexport function '+name+'(input)';
 if(kind==='vector')return head('copied')+'{const values=[];for(const item of input){values.push(item);}return values;}\n'+head('truthy','boolean')+'{const values=[];for(const item of input){if(item){values.push(item);}}return values;}\n';
 if(kind==='callback')return head('mapped')+'{const values=input.map(item=>item+1n);return values;}\n'+head('selected')+'{const values=input.filter(item=>item>1n);return values;}\n'+head('truthy','boolean')+'{const values=input.filter(item=>item);return values;}\n';
 return head('chained')+'{const values=input.map(item=>item+1n).filter(item=>item>2n).map(item=>item*2n);return values;}\n'+head('ordered')+'{const values=input.map(item=>item+1n).map(item=>item/0n);return values;}\n'+head('truthy')+'{const values=input.map(item=>item>1n).filter(flag=>flag);return values;}\n';
}
function proposal(kind,family,text,path){
 const data=receiving(family,text,path);
 if(kind==='vector')return {data,proposal:proposePrimitiveVectorIteratorBulk(data,{family,modules:[{sourcePath:path,rustPath:'caller.rs',vectors:[{function:'copied',local:'values',domain:'u64'},{function:'truthy',local:'values',domain:'bool'}]}]})};
 if(kind==='callback')return {data,proposal:proposeCollectionCallbackBulk(data,{family,modules:[{sourcePath:path,rustPath:'caller.rs',callbacks:[{function:'mapped',local:'values',domain:'u64'},{function:'selected',local:'values',domain:'u64'},{function:'truthy',local:'values',domain:'bool'}]}]})};
 return {data,proposal:proposeScalarChainBulk(data,{family,modules:[{sourcePath:path,rustPath:'caller.rs',chains:[{function:'chained',local:'values',domains:['u64','u64','u64']},{function:'ordered',local:'values',domains:['u64','u64']},{function:'truthy',local:'values',domains:['bool','bool']}]}]})};
}
// Literal expectations are independent of translator tables and interpreters.
const common=`
 const empty=core.router_vec_u64_new();assert.deepEqual(empty,[]);assert.equal(Object.isFrozen(empty),true);
 const single=core.router_vec_u64_push(empty,18446744073709551615n);
 assert.deepEqual(single,[18446744073709551615n]);assert.deepEqual(core.router_vec_u64_get(single,0n),{$:'Some',field0:18446744073709551615n});
 assert.deepEqual(core.router_vec_u64_get(single,1n),{$:'None'});assert.equal(core.router_vec_u64_len(single),1n);
 assert.throws(()=>core.router_vec_u64_push(empty,-1n));assert.throws(()=>core.router_vec_u64_push(empty,18446744073709551616n));assert.throws(()=>core.router_vec_u64_push(empty,1));
 assert.throws(()=>core.router_vec_u64_get(single,-1n));assert.throws(()=>core.router_vec_u64_get(single,18446744073709551616n));
 assert.throws(()=>core.router_vec_u64_push(Object.freeze(Array(4096).fill(0n)),1n));
 assert.throws(()=>core.router_vec_u64_len(Object.freeze(Array(4097).fill(0n))));
 assert.throws(()=>core.router_vec_u64_len(Object.freeze([,])));
 assert.throws(()=>core.router_vec_u64_len([0n]));
 let reads=0;const getter=[];Object.defineProperty(getter,'0',{get(){reads++;throw Error('must not run');},enumerable:true});Object.freeze(getter);
 assert.throws(()=>core.router_vec_u64_len(getter));assert.equal(reads,0);
 const proxy=new Proxy(Object.freeze([0n]),{get(){reads++;throw Error('must not run');},ownKeys(){reads++;throw Error('must not run');},getOwnPropertyDescriptor(){reads++;throw Error('must not run');}});
 assert.throws(()=>core.router_vec_u64_len(proxy));assert.equal(reads,0);
`;
function verifier(kind){
 const own=kind==='vector'?`
  assert.deepEqual(target.copied(Object.freeze([])),[]);
  assert.deepEqual(target.copied(Object.freeze([0n,18446744073709551615n])),[0n,18446744073709551615n]);
  const full=target.copied(Object.freeze(Array(4096).fill(9n)));assert.deepEqual(full,Array(4096).fill(9n));assert.equal(Object.isFrozen(full),true);
  assert.throws(()=>target.copied(Object.freeze(Array(4097).fill(9n))));
  assert.deepEqual(target.truthy(Object.freeze([false,true,false,true])),[true,true]);
 `:kind==='callback'?`
  assert.deepEqual(target.mapped(Object.freeze([])),[]);assert.deepEqual(target.mapped(Object.freeze([0n,1n,10n])),[1n,2n,11n]);
  assert.deepEqual(target.selected(Object.freeze([0n,2n,1n,18446744073709551615n])),[2n,18446744073709551615n]);
  const full=target.mapped(Object.freeze(Array(4096).fill(9n)));assert.deepEqual(full,Array(4096).fill(10n));assert.equal(Object.isFrozen(full),true);
  assert.throws(()=>target.mapped(Object.freeze(Array(4097).fill(9n))));
  assert.throws(()=>target.mapped(Object.freeze([18446744073709551615n])),error=>error.message==='attempt to add with overflow');
  assert.deepEqual(target.truthy(Object.freeze([false,true,false,true])),[true,true]);
 `:`
  assert.deepEqual(target.chained(Object.freeze([])),[]);assert.deepEqual(target.chained(Object.freeze([0n,1n,2n,3n])),[6n,8n]);
  const full=target.chained(Object.freeze(Array(4096).fill(2n)));assert.deepEqual(full,Array(4096).fill(6n));assert.equal(Object.isFrozen(full),true);
  assert.throws(()=>target.chained(Object.freeze(Array(4097).fill(2n))));
  assert.throws(()=>target.ordered(Object.freeze([0n,18446744073709551615n])),error=>error.message==='attempt to add with overflow');
  assert.throws(()=>target.ordered(Object.freeze([0n])),error=>error.message==='attempt to divide by zero');
  assert.deepEqual(target.truthy(Object.freeze([0n,2n,1n,8n])),[true,true]);
 `;
 return '(target,core)=>{'+own+common+'}';
}
for(const kind of ['vector','callback','chain'])for(const family of ['outcome','cancellation'])for(const typed of [false,true])test(kind+' '+family+' '+(typed?'written-TS':'JS')+' actual emitted JS and strict-compiled TS receiving targets retain complete independent workloads',limits,async t=>{
 const startedAt=performance.now(),path=typed?'caller.mts':'caller.mjs',text=source(kind,typed),input=proposal(kind,family,text,path),report=await verifyScalarReceivingTargets(t,input.data,input.proposal,{verifySource:verifier(kind),startedAt});
 assert.equal(report.compilerVersion,'Version 5.9.3');assert.equal(report.compilerPackageVersion,'5.9.3');assert.equal(report.lockfileVersion,'5.9.3');
 assert.deepEqual(report.targets.map(row=>row.kind),['emitted-javascript','strict-compiled-typescript']);
 assert.equal(report.targets.every(row=>row.engine===(process.versions.bun?'Bun':'Node')),true);
 assert.equal(report.commands.every(row=>row.status===0&&row.rawComplete&&row.elapsedMs<=row.timeoutMs),true);
 assert.equal(report.elapsedMs<=60000,true);assert.equal(report.cleanupSucceeded,true);
 assert.equal(input.data.files.find(row=>row.path===path).source,text);assert.equal(report.runtimeParity,false);
});
test('strict compiler failure retains actual version complete diagnostic streams exact status and finally cleanup',limits,async t=>{
 const startedAt=performance.now(),input=proposal('vector','outcome',source('vector',false),'caller.mjs'),module=input.proposal.modules[0],broken={...input.proposal,modules:[{...module,artifacts:module.artifacts.map(row=>row.language==='TypeScript'?{...row,source:'export const value: ScalarReceivingMissingType = 1;\n'}:row)}]};
 let failure;try{await verifyScalarReceivingTargets(t,input.data,broken,{verifySource:'()=>{}',startedAt});}catch(error){failure=error;}
 assert.ok(failure);const report=failure.scalarReceivingEvidence;assert.equal(report.compilerVersion,'Version 5.9.3');
 const diagnostic=report.commands.find(row=>row.kind==='strict-typescript');assert.ok(diagnostic.status!==0);assert.equal(diagnostic.rawComplete,true);assert.match(diagnostic.stdout+diagnostic.stderr,/ScalarReceivingMissingType/);assert.equal(report.cleanupSucceeded,true);assert.deepEqual(report.targets,[]);
});
