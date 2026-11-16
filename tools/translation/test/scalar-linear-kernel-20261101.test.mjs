// Independent linear runtime/adoption/meta/inverse/receiving SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {scalarLinearStage} from '../extensions/scalar-linear-kernel-20261101-runtime.mjs';
import {proposeScalarLinearKernel,readScalarLinearKernelMeta,translateScalarLinearKernelProjection,evaluateScalarLinearKernel,evaluateScalarLinearKernelBatch} from '../scalar-linear-kernel-20261101.mjs';
import {primitiveVectorLiteralReceivingData as receiving} from '../js-to-rust/test/primitive-vector-literal-receiving-data.mjs';
import {verifyScalarReceivingTargets} from './scalar-target-receiving-20261101.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
const limits={timeout:60000},u64="import('./runtime/primitive-operator-runtime.mjs').RustU64";
function fixture(family='outcome',typed=false,one=false){
 const head=name=>typed?'export function '+name+'(input: readonly ('+u64+')[])':'/** @param {readonly ('+u64+')[]} input */\nexport function '+name+'(input)',path=typed?'caller.mts':'caller.mjs';
 const text=head('collection')+'{const values=input.map(item=>item+1n).filter(item=>item>2n);return values;}\n'+(one?'':
  head('ordered')+'{const values=input.map(item=>item+1n).map(item=>item/0n);return values;}\n'+
  head('booleans')+'{const values=input.map(item=>item>1n).filter(flag=>flag);return values;}\n'+
  head('mixed')+'{const values=input.map(item=>item>1n).map(flag=>flag?10n+2n:0n).filter(item=>item>0n);return values;}\n');
 const chains=[{function:'collection',local:'values',domains:['u64','u64']},...(one?[]:[{function:'ordered',local:'values',domains:['u64','u64']},{function:'booleans',local:'values',domains:['bool','bool']},{function:'mixed',local:'values',domains:['bool','u64','u64']}])];
 return {text,path,data:receiving(family,text,path),options:{family,modules:[{sourcePath:path,rustPath:'caller.rs',chains}]}};
}
test('the linear stage keeps all eleven primitive carrier/scalar domains and eager callback order',limits,()=>{
 const domains=[['bool',false,true],['u8',0n,255n],['i8',-128n,127n],['u16',0n,65535n],['i16',-32768n,32767n],['u32',0n,4294967295n],['i32',-2147483648n,2147483647n],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['u128',0n,340282366920938463463374607431768211455n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
 for(const [domain,minimum,maximum]of domains){const seen=[],input=Object.freeze([minimum,maximum]),result=scalarLinearStage(input,domain,'map',domain,value=>{seen.push(value);return value;});assert.deepEqual(result,[minimum,maximum]);assert.deepEqual(seen,[minimum,maximum]);assert.equal(Object.isFrozen(result),true);assert.notEqual(result,input);}
 const full=Object.freeze(Array(4096).fill(3n));assert.deepEqual(scalarLinearStage(full,'u64','map','u64',value=>value),Array(4096).fill(3n));
 assert.deepEqual(scalarLinearStage(Object.freeze([]),'u64','filter','u64',()=>{throw Error('empty must not call');}),[]);
});
test('linear kernel preserves genuine frozen dense descriptor proxy bitwidth bounds and scalar failure timing',limits,()=>{
 let reads=0,calls=0;const identity=value=>{calls++;return value;},bad=[];Object.defineProperty(bad,'0',{get(){reads++;throw Error('must not invoke');},enumerable:true});Object.freeze(bad);
 const proxy=new Proxy(Object.freeze([0n]),{get(){reads++;throw Error('must not invoke');},ownKeys(){reads++;throw Error('must not invoke');}});
 for(const input of [bad,proxy,Object.freeze([,]),[0n],Object.freeze([-1n]),Object.freeze([18446744073709551616n]),Object.freeze(Array(4097).fill(0n))])assert.throws(()=>scalarLinearStage(input,'u64','map','u64',identity));
 assert.equal(reads,0);assert.equal(calls,0);
 assert.throws(()=>scalarLinearStage(Object.freeze([0n,1n]),'u64','map','u8',value=>{calls++;return value===0n?256n:0n;}));assert.equal(calls,1);
 assert.throws(()=>scalarLinearStage(Object.freeze([true]),'bool','filter','bool',()=>1n));
 assert.throws(()=>scalarLinearStage(Object.freeze([0n]),'u64','map','u64',async value=>value));
 assert.throws(()=>scalarLinearStage(Object.freeze([0n]),'u64','map','u64',new Proxy(identity,{})));
 assert.throws(()=>scalarLinearStage(Object.freeze([]),'u64','map','unknown',identity));
});
const verifySource=`(target,core)=>{
 assert.deepEqual(target.collection(Object.freeze([])),[]);assert.deepEqual(target.collection(Object.freeze([0n,1n,2n,3n])),[3n,4n]);
 const full=target.collection(Object.freeze(Array(4096).fill(2n)));assert.deepEqual(full,Array(4096).fill(3n));assert.equal(Object.isFrozen(full),true);
 assert.throws(()=>target.collection(Object.freeze(Array(4097).fill(2n))));
 assert.deepEqual(target.booleans(Object.freeze([0n,2n,1n,8n])),[true,true]);
 assert.deepEqual(target.mixed(Object.freeze([0n,2n,1n,8n])),[12n,12n]);
 assert.throws(()=>target.ordered(Object.freeze([0n,18446744073709551615n])),error=>error.message==='attempt to add with overflow');
 assert.throws(()=>target.ordered(Object.freeze([0n])),error=>error.message==='attempt to divide by zero');
 assert.throws(()=>target.collection(Object.freeze([-1n])));assert.throws(()=>target.collection(Object.freeze([1])));
 assert.equal(core.router_vec_u64_len(full),4096n);
}`;
for(const family of ['outcome','cancellation'])for(const typed of [false,true])test(family+' '+(typed?'written TS':'JS')+' actual qualified linear JS/strict TS receiving targets keep full capacity and stage errors',limits,async t=>{
 const startedAt=performance.now(),input=fixture(family,typed),proposal=proposeScalarLinearKernel(input.data,input.options),report=await verifyScalarReceivingTargets(t,proposal.receivingData,proposal,{verifySource,startedAt});
 assert.equal(report.compilerVersion,'Version 5.9.3');assert.equal(report.targets.length,2);assert.equal(report.cleanupSucceeded,true);
 assert.equal(proposal.newNativeAbi,false);assert.equal(proposal.wholeFunctionsSpecialized,4);assert.equal(proposal.runtimeExecuted,false);
 for(const row of proposal.modules){assert.match(row.canonicalJavaScript,/__ro_linearStage/);assert.match(row.typescript,/__ro_linearStage/);assert.equal(row.histories.length,2);for(const history of row.histories)assert.equal(history.inverse,history.before);}
});
test('single and complete batch interpreters freshly reissue actual source/meta and execute the same full linear stages',limits,()=>{
 const input=fixture('outcome',false,true),full=Object.freeze(Array(4096).fill(2n));
 assert.deepEqual(evaluateScalarLinearKernel(input.data,input.options,'collection',[full]),Array(4096).fill(3n));
 assert.deepEqual(evaluateScalarLinearKernelBatch(input.data,input.options,[['collection',[Object.freeze([])]],['collection',[Object.freeze([0n,2n,3n])]],['collection',[full]]]),[[],[3n,4n],Array(4096).fill(3n)]);
 assert.throws(()=>evaluateScalarLinearKernelBatch(input.data,input.options,[['collection',[Object.freeze([-1n])]],['collection',[full]]]));
});
test('complete specialized meta and both exact target inverses reproduce current checked Rust and refuse edited projections',limits,()=>{
 const input=fixture('outcome',false,true),proposal=proposeScalarLinearKernel(input.data,input.options),meta=readScalarLinearKernelMeta(input.data,input.options,proposal.semanticMeta);assert.equal(meta.programs.length,1);
 for(const artifact of proposal.modules[0].artifacts.filter(row=>row.language!=='Rust')){
  const inverse=translateScalarLinearKernelProjection(input.data,input.options,artifact.source,{sourcePath:artifact.path,language:artifact.language});assert.ok(sameRustSourceSyntax(inverse.rust,proposal.modules[0].canonicalRust));assert.equal(typeof inverse.inverse,'string');
  assert.throws(()=>translateScalarLinearKernelProjection(input.data,input.options,artifact.source+'\n',{sourcePath:artifact.path,language:artifact.language}));
 }
 const forged=JSON.parse(proposal.semanticMeta);forged.modules[0].functions[0].stages[0].domain='bool';assert.throws(()=>readScalarLinearKernelMeta(input.data,input.options,JSON.stringify(forged)));
});
test('extra whole-function observations aliases and unsupported callback captures cannot select the kernel',limits,()=>{
 for(const suffix of ['const observed=1n;return values;','const alias=values;return alias;']){
  const input=fixture('outcome',false,true),text=input.text.replace('return values;',suffix),data={...input.data,files:input.data.files.map(row=>row.path===input.path?{...row,source:text}:row)};assert.throws(()=>proposeScalarLinearKernel(data,input.options));
 }
 const input=fixture('outcome',false,true),text=input.text.replace('item+1n','captured+1n'),data={...input.data,files:input.data.files.map(row=>row.path===input.path?{...row,source:text}:row)};assert.throws(()=>proposeScalarLinearKernel(data,input.options));
});
test('authored runtime spelling and forged projection accessors grant no kernel or source authority',limits,()=>{
 const input=fixture('outcome',false,true),data={...input.data,files:[...input.data.files,{path:'runtime/scalar-linear-kernel-20261101-runtime.mjs',source:'export const scalarLinearStage=()=>Object.freeze([]);\n'}]};
 assert.throws(()=>proposeScalarLinearKernel(data,input.options));
 let reads=0;const configuration={language:'JavaScript'};Object.defineProperty(configuration,'sourcePath',{get(){reads++;throw Error('must not invoke');},enumerable:true});
 assert.throws(()=>translateScalarLinearKernelProjection(input.data,input.options,'export {};',configuration));assert.equal(reads,0);
});
