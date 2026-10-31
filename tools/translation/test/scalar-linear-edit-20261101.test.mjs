// Actual edited JS/TS -> private meta/Rust -> receiving target SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {proposeScalarLinearKernel,translateScalarLinearKernelProjection} from '../scalar-linear-kernel-20261101.mjs';
import {translateEditedScalarLinearKernel,readEditedScalarLinearKernelMeta} from '../scalar-linear-edit-20261101.mjs';
import {primitiveVectorLiteralReceivingData as receiving} from '../js-to-rust/test/primitive-vector-literal-receiving-data.mjs';
import {verifyScalarReceivingTargets} from './scalar-target-receiving-20261101.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
const limits={timeout:60000},u64="import('./runtime/primitive-operator-runtime.mjs').RustU64";
function fixture(family='outcome',typed=false,conditional=false){
 const path=typed?'caller.mts':'caller.mjs',head=typed?'export function collection(input: readonly ('+u64+')[])':'/** @param {readonly ('+u64+')[]} input */\nexport function collection(input)',
  text=head+(conditional?'{const values=input.map(item=>item===0n?7n:item).filter(item=>item>1n);return values;}\n':'{const values=input.map(item=>item+1n).filter(item=>item>2n);return values;}\n'),
  data=receiving(family,text,path),options={family,modules:[{sourcePath:path,rustPath:'caller.rs',chains:[{function:'collection',local:'values',domains:['u64','u64']}]}]},baseline=proposeScalarLinearKernel(data,options);
 return {path,text,data,options,baseline};
}
function edited(input,language,conditional=false){
 const artifact=input.baseline.modules[0].artifacts.find(row=>row.language===language),source=conditional?artifact.source.replace('(7n)','(9n)').replace('__ro_item > (1n)','__ro_item >= (1n)'):artifact.source.replace('__ro_integerArithmetic(__ro_item, (1n), 64, false, "add")','__ro_integerArithmetic(__ro_item, (2n), 64, false, "mul")').replace('__ro_item > (2n)','__ro_item >= (4n)');
 assert.notEqual(source,artifact.source);return {artifact,source,configuration:{sourcePath:artifact.path,language}};
}
const verifyArithmetic=`(target,core)=>{
 assert.deepEqual(target.collection(Object.freeze([])),[]);
 assert.deepEqual(target.collection(Object.freeze([0n,1n,2n,3n])),[4n,6n]);
 const full=target.collection(Object.freeze(Array(4096).fill(2n)));assert.deepEqual(full,Array(4096).fill(4n));assert.equal(Object.isFrozen(full),true);assert.equal(core.router_vec_u64_len(full),4096n);
 assert.throws(()=>target.collection(Object.freeze(Array(4097).fill(2n))));
 assert.throws(()=>target.collection(Object.freeze([18446744073709551615n])),error=>error.message==='attempt to multiply with overflow');
 assert.throws(()=>target.collection(Object.freeze([-1n])));assert.throws(()=>target.collection(Object.freeze([1])));
}`;
for(const family of ['outcome','cancellation'])for(const language of ['JavaScript','TypeScript'])test(family+' authoritative edited '+language+' literal/arithmetic/predicate changes privately produce Rust and actual JS/strict-TS targets',limits,async t=>{
 const startedAt=performance.now(),input=fixture(family,language==='TypeScript'),edit=edited(input,language),result=translateEditedScalarLinearKernel(input.data,input.options,edit.source,edit.configuration);
 assert.equal(result.authoritativeTargetExactlyReproduced,true);assert.equal(result.nativeImportSymbolsJoined,true);
 assert.match(result.rust,/checked_mul/);assert.notEqual(result.rust,input.baseline.modules[0].canonicalRust);
 assert.equal(result.source,edit.source);assert.equal(result.histories[0].inverse,edit.artifact.source);assert.equal(result.histories[1].inverse,input.text);
 assert.deepEqual(result.ruleTrace.map(row=>row.phase),['language','repository']);
 const report=await verifyScalarReceivingTargets(t,result.proposal.receivingData,result.proposal,{verifySource:verifyArithmetic,startedAt});
 assert.equal(report.compilerVersion,'Version 5.9.3');assert.equal(report.targets.length,2);assert.equal(report.cleanupSucceeded,true);
 assert.equal(input.data.files.find(row=>row.path===input.path).source,input.text);assert.equal(result.newNativeAbi,false);assert.equal(result.runtimeExecuted,false);
});
for(const language of ['JavaScript','TypeScript'])test(language+' conditional branch and predicate edits reproduce complete authoritative target bytes',limits,async t=>{
 const startedAt=performance.now(),input=fixture('outcome',language==='TypeScript',true),edit=edited(input,language,true),result=translateEditedScalarLinearKernel(input.data,input.options,edit.source,edit.configuration);
 assert.equal(result.source,edit.source);assert.match(result.bridge,/9n/);
 const verifySource=`(target,core)=>{assert.deepEqual(target.collection(Object.freeze([0n,1n,2n])),[9n,1n,2n]);const full=target.collection(Object.freeze(Array(4096).fill(0n)));assert.deepEqual(full,Array(4096).fill(9n));assert.equal(core.router_vec_u64_len(full),4096n);}`;
 const report=await verifyScalarReceivingTargets(t,result.proposal.receivingData,result.proposal,{verifySource,startedAt});assert.equal(report.targets.length,2);
});
test('edited semantic meta reissues whole current source and both native directions instead of accepting copied stage flags',limits,()=>{
 const input=fixture(),edit=edited(input,'JavaScript'),result=translateEditedScalarLinearKernel(input.data,input.options,edit.source,edit.configuration),reissued=readEditedScalarLinearKernelMeta(input.data,input.options,result.meta);
 assert.ok(sameRustSourceSyntax(reissued.rust,result.rust));assert.equal(reissued.meta,result.meta);
 assert.throws(()=>translateScalarLinearKernelProjection(input.data,input.options,edit.source,edit.configuration));
 const forged=JSON.parse(result.meta);forged.bridge=forged.originalSource;assert.throws(()=>readEditedScalarLinearKernelMeta(input.data,input.options,JSON.stringify(forged)));
 const changed={...input.data,files:input.data.files.map(row=>row.path===input.path?{...row,source:row.source.replace('item+1n','item+3n')}:row)};assert.throws(()=>readEditedScalarLinearKernelMeta(changed,input.options,result.meta));
});
test('actual edited captures effects imports type/domain metadata and noncanonical incomplete source remain refused',limits,()=>{
 const input=fixture(),edit=edited(input,'JavaScript');
 for(const source of [edit.source.replace('scalar-linear-kernel-20261101-runtime.mjs','forged-kernel.mjs'),edit.source.replace('(__ro_item, (2n), 64, false, "mul")','(__ro_item, (2n), 32, false, "mul")'),
  edit.source.replace('__ro_integerArithmetic(__ro_item, (2n), 64, false, "mul")','captured'),edit.source.replace('__ro_integerArithmetic(__ro_item, (2n), 64, false, "mul")','globalThis.capture(__ro_item)'),
  edit.source.replace('__ro_integerArithmetic(__ro_item, (2n), 64, false, "mul")','__ro_item++'),edit.source.replace('(__ro_item >= (4n))','1n'),edit.source+'\n',edit.source.replace('"map", "u64"','"map", "bool"')])assert.throws(()=>translateEditedScalarLinearKernel(input.data,input.options,source,edit.configuration));
 const corrupt={...input.data,files:input.data.files.map(row=>row.path==='runtime/primitive-operator-runtime.mjs'?{...row,source:row.source+'\nexport const forgedOwner=true;\n'}:row)};assert.throws(()=>translateEditedScalarLinearKernel(corrupt,input.options,edit.source,edit.configuration));
 let reads=0;const config={language:'JavaScript'};Object.defineProperty(config,'sourcePath',{get(){reads++;throw Error('must not invoke');},enumerable:true});assert.throws(()=>translateEditedScalarLinearKernel(input.data,input.options,edit.source,config));assert.equal(reads,0);
});
