// Whole Rust-origin source adoption/receiving cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {proposeNativeIteratorAdoption} from '../native-iterator-adoption-20261101.mjs';
import {primitiveVectorLiteralReceivingData as receiving} from '../js-to-rust/test/primitive-vector-literal-receiving-data.mjs';
import {verifyScalarReceivingTargets} from './scalar-target-receiving-20261101.mjs';
const limits={timeout:60000};
// Independently authored native originals use actual observed production
// iter/copied/collect shapes; they are not emitted from a JS expectation table.
const original=`// Preserve this entire original module and every declaration.
pub fn copied(values: &[u64]) -> Vec<u64> {
    values.iter().copied().collect::<Vec<_>>()
}
pub fn selected(values: &[::core::primitive::u64]) -> ::std::vec::Vec<::core::primitive::u64> {
    values.iter().copied().map(|value| value + 1).filter(|value| *value > 2).collect()
}
pub fn ordered(values: &[u64]) -> Vec<u64> {
    values.iter().copied().map(|value| value + 1).map(|value| value / 0).collect::<Vec<u64>>()
}
pub fn flags(values: &[bool]) -> Vec<bool> {
    values.iter().copied().map(|flag| !flag).filter(|&flag| flag).collect()
}
pub fn bytes(values: &[u8]) -> Vec<u8> {
    values.iter().copied().collect()
}
`;
function input(family='outcome',source=original,functions=['copied','selected','ordered','flags','bytes']){return {data:receiving(family,source,'native.rs'),options:{family,sourcePath:'native.rs',javascriptPath:'caller.mjs',rustPath:'adopted.rs',functions}};}
const verifySource=`(target,core)=>{
 assert.deepEqual(target.copied(Object.freeze([])),[]);assert.deepEqual(target.copied(Object.freeze([0n,18446744073709551615n])),[0n,18446744073709551615n]);
 const full=target.copied(Object.freeze(Array(4096).fill(2n)));assert.deepEqual(full,Array(4096).fill(2n));assert.equal(Object.isFrozen(full),true);
 assert.deepEqual(target.selected(Object.freeze([0n,1n,2n,3n])),[3n,4n]);
 assert.deepEqual(target.selected(Object.freeze(Array(4096).fill(2n))),Array(4096).fill(3n));
 // Rust is lazy per element: division on the FIRST item precedes addition
 // overflow on a LATER item. Eager JS map/map materialization would be wrong.
 assert.throws(()=>target.ordered(Object.freeze([0n,18446744073709551615n])),error=>error.message==='attempt to divide by zero');
 assert.deepEqual(target.flags(Object.freeze([true,false,true])),[true]);assert.deepEqual(target.bytes(Object.freeze([0n,255n])),[0n,255n]);
 assert.throws(()=>target.copied(Object.freeze(Array(4097).fill(2n))));assert.throws(()=>target.bytes(Object.freeze([256n])));assert.equal(core.router_vec_u64_len(full),4096n);
}`;
for(const family of ['outcome','cancellation'])test(family+' complete native Rust identity/map/filter originals produce actual JS and strict TS with canonical native inverse',limits,async t=>{
 const startedAt=performance.now(),fixture=input(family),result=proposeNativeIteratorAdoption(fixture.data,fixture.options);
 assert.equal(result.originalSource,original);assert.equal(result.histories[0].inverse,original);assert.equal(result.originalFunctions.length,5);
 for(const row of result.originalFunctions)assert.equal(row.original,original.slice(...row.span));
 assert.equal(result.originalFunctions[0].stages.length,0);assert.equal(result.identityCollectSupported,true);
 assert.equal(result.originalIteratorOwnerQualified,false);assert.equal(result.originalPrimitiveTypeOwnerQualified,false);assert.equal(result.originalBorrowedCallbackEquivalence,false);assert.equal(result.originalInputContractEquivalent,false);assert.equal(result.productionSelected,false);
 assert.deepEqual(result.ruleTrace.map(row=>row.phase),['language','language','language','repository']);
 const report=await verifyScalarReceivingTargets(t,result.receivingData,result,{verifySource,startedAt});assert.equal(report.compilerVersion,'Version 5.9.3');assert.equal(report.targets.length,2);assert.equal(report.cleanupSucceeded,true);
 assert.equal(fixture.data.files.find(row=>row.path==='native.rs').source,original);assert.equal(fixture.data.files.some(row=>row.path==='adopted.rs'),false);
});
test('whole original scope attributes generics aliases mutations reference escapes captures and partial selection remain refused',limits,()=>{
 const base='pub fn copied(values:&[u64])->Vec<u64>{values.iter().copied().collect()}';
 for(const source of ['use custom::Vec;\n'+base,'#[cfg(feature="custom")]\n'+base,base+'\npub struct Hidden;',
  base.replace('values:&[u64]','values:&mut [u64]'),base.replace('values.iter().copied()','values.into_iter()'),
  base.replace('.collect()', '.map(|value| value + captured).collect()'),base.replace('.collect()', '.map(move |value| value).collect()'),
  base.replace('.collect()', '.map(|value| value.some_method()).collect()'),base.replace('.collect()', '.map(|value| &value).collect()'),
  base.replace('.collect()', '.filter(|value| value > 1).collect()'),base.replace('.collect()', '.collect();values.to_vec()')]){
  const fixture=input('outcome',source,['copied']);assert.throws(()=>proposeNativeIteratorAdoption(fixture.data,fixture.options));
 }
 const fixture=input('outcome',original,['copied']);assert.throws(()=>proposeNativeIteratorAdoption(fixture.data,fixture.options));
});
test('actual production files keep aggregate captured policy set-backed self and trait-sort prerequisites refused',limits,()=>{
 for(const path of ['client_policy.rs','model_routing_snapshot.rs','runtime.rs','with_command_claude_settings.rs']){
  const source=readFileSync(new URL('../../../rust/src/'+path,import.meta.url),'utf8'),fixture=input('outcome',source,['copied']);assert.throws(()=>proposeNativeIteratorAdoption(fixture.data,fixture.options));
  assert.equal(fixture.data.files.find(row=>row.path==='native.rs').source,source);
 }
});
