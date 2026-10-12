import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadJsonMacroSourceProof,jsonMacroOriginalSource} from '../json-macro-sources.mjs';
import {compilePinnedJsonStorageFragments,isPinnedJsonStorageFragments,projectPinnedJsonStorageFragment,compilePinnedJsonStorageForwarding,projectPinnedJsonStorageForwarding} from '../json-roundtrip-storage-fragments.mjs';
import {compileArithmeticSourceFragments,bindArithmeticSourceData,bindArithmeticRecordSource,extendArithmeticSourceData,extendArithmeticCalleeSource,projectArithmeticSource} from '../arithmetic-source-fragments.mjs';
import {compileArithmeticSourceData} from '../arithmetic-source-data.mjs';
import {compileArithmeticRecordSource,isArithmeticRecordSource} from '../arithmetic-record-source.mjs';
const root=new URL('../../../',import.meta.url),dependencies=()=>loadJsonMacroSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')}),project=(proof,path,args,bits=32)=>projectPinnedJsonStorageFragment(proof,path,args,bits);
test('whole original Bigint source retains exact class/receiver/body spans and original Default allocation IR',()=>{
  const input=dependencies(),proof=compilePinnedJsonStorageFragments(input),original=jsonMacroOriginalSource(input,'serde_json','src/lexical/bignum.rs');assert.equal(original.sha256,'db688e8112389998d0f91906f6857e28f9b510a8b4065ad476c8e8be2f77becf');assert.equal(proof.recordSource.layouts.length,1);assert.equal(proof.recordSource.layouts[0].attributes.length,2);
  for(const fn of proof.sourceProgram.functions)assert.equal(createHash('sha256').update(original.source.slice(fn.span.start,fn.span.end)).digest('hex'),fn.sha256);
  const shared=proof.sourceProgram.functions.find(fn=>fn.method==='data'),mutable=proof.sourceProgram.functions.find(fn=>fn.method==='data_mut'),allocate=proof.sourceProgram.functions.find(fn=>fn.method==='default');assert.equal(original.source.slice(shared.params[0].receiverSource.span.start,shared.params[0].receiverSource.span.end),'&self');assert.equal(original.source.slice(mutable.params[0].receiverSource.span.start,mutable.params[0].receiverSource.span.end),'&mut self');assert.equal(shared.ir.tail.kind,'borrow');assert.equal(mutable.ir.tail.mutable,true);assert.equal(allocate.ir.tail.kind,'record');assert.equal(allocate.ir.tail.fields[0].value.args[0].value,'20');
});
test('original shared/mutable storage getters project only source-declared fields for both word variants',()=>{
  const proof=compilePinnedJsonStorageFragments(dependencies());for(const bits of [32,64]){const data=[1n,(1n<<BigInt(bits))-1n],shared=project(proof,'impl::Math::Bigint::data',[{data}],bits),mutable=project(proof,'impl::Math::Bigint::data_mut',[{data}],bits);assert.deepEqual(shared.value,data);assert.deepEqual(mutable.value,data);assert.deepEqual(shared.mutations,[{data}]);assert.equal(shared.recordSourceBindingProjected,true);assert.equal(shared.parseAdmission,false);}
});
test('nonempty original Default remains an allocation/owner obligation, never fabricated successful storage',()=>{
  const proof=compilePinnedJsonStorageFragments(dependencies());assert.throws(()=>project(proof,'impl::Default::Bigint::default',[]),error=>error.code==='ERR_ARITHMETIC_SOURCE_EFFECT_OBLIGATION');for(const key of ['sourceOwnerVerified','sourceBehaviorFidelityVerified','borrowContractVerified','copyContractVerified','allocatorContractVerified','applicationEffectCompleteness','parseAdmission','namespaceAuthority','runtimeParity'])assert.equal(proof[key],false,key);
});
test('private record seals, descriptor/word domains and exact source field sets reject hostile data',()=>{
  const proof=compilePinnedJsonStorageFragments(dependencies());assert.equal(isPinnedJsonStorageFragments(structuredClone(proof)),false);assert.equal(isArithmeticRecordSource(structuredClone(proof.recordSource)),false);assert.throws(()=>project(structuredClone(proof),'impl::Math::Bigint::data',[{data:[1n]}]),/Unsealed/);assert.throws(()=>project(proof,'impl::Math::Bigint::data',[{data:[1n],extra:0}]),/field set/);assert.throws(()=>project(proof,'impl::Math::Bigint::data',[{data:[1n<<32n]}]),RangeError);
  let reads=0;const bad={};Object.defineProperty(bad,'data',{enumerable:true,get(){reads++;return [1n];}});assert.throws(()=>project(proof,'impl::Math::Bigint::data',[bad]),/own data/);assert.equal(reads,0);const proxy=new Proxy({data:[1n]},{get(){reads++;throw Error('trap');}});assert.throws(()=>project(proof,'impl::Math::Bigint::data',[proxy]),/plain own/);assert.equal(reads,0);assert.throws(()=>compileArithmeticRecordSource('struct C {x:u32,x:u32}',['m']),/ambiguous/);
  for(const [name,body,diagnostic] of [['bad','&mut self.items',/cannot become mutable/],['moved','self.items',/aggregate field move/]]){const source='struct C{items:Vec<u32>} impl Read for C{fn '+name+'(&self)->&Vec<u32>{'+body+'}}',module=['m'],program=bindArithmeticRecordSource(bindArithmeticSourceData(compileArithmeticSourceFragments(source,['impl::Read::C::'+name]),module,[compileArithmeticSourceData(source,module)]),[compileArithmeticRecordSource(source,module)]);assert.throws(()=>projectArithmeticSource(program,'impl::Read::C::'+name,[{items:[1n]}]),diagnostic);}
});

test('original Math hi64 forwards through original Bigint data and Hi64 bodies for both word models',()=>{
  const proof=compilePinnedJsonStorageForwarding(dependencies());
  for(const bits of [32,64])for(const [data,expected] of [[[],[0n,false]],[[1n],[1n<<63n,false]],[[0n,1n],[1n<<63n,false]],[[1n,0n,1n],[1n<<63n,true]]]){
    const result=projectPinnedJsonStorageForwarding(proof,'trait::Math::hi64',[{data}],bits);assert.deepEqual(result.value,expected);assert.equal(result.calls.some(call=>call.path==='impl::Math::Bigint::data'),true);assert.equal(result.calls.some(call=>call.path==='trait::Hi64::hi64'),true);assert.equal(result.associatedSourceBindingProjected,true);assert.equal(result.calleeSourceBindingProjected,true);
  }
  const fn=proof.limbs.program.functions.find(fn=>fn.name==='trait::Math::hi64');assert.equal(fn.ir.tail.kind,'method');assert.equal(fn.ir.tail.name,'hi64');assert.equal(fn.ir.tail.object.name,'as_slice');assert.equal(fn.ir.tail.object.object.name,'data');
});
test('original Math power forwarding reuses source limb loops while actual from_u64 allocation stays refused',()=>{
  const proof=compilePinnedJsonStorageForwarding(dependencies());for(const bits of [32,64]){
    const q=1n<<BigInt(bits),read=words=>words.reduceRight((value,word)=>value*q+word,0n);
    for(const exponent of [0n,1n,27n,1024n]){const result=projectPinnedJsonStorageForwarding(proof,'trait::Math::imul_pow5',[{data:[q-1n]},exponent],bits);assert.deepEqual(result.value,[]);assert.equal(read(result.mutations[0].data),(q-1n)*5n**exponent);assert.equal(result.calls.some(call=>call.path==='impl::Math::Bigint::data_mut'),true);assert.equal(result.calls.some(call=>call.path==='small::imul_pow5'),true);}
    assert.throws(()=>projectPinnedJsonStorageForwarding(proof,'trait::Math::from_u64',[1n],bits),error=>error.code==='ERR_ARITHMETIC_SOURCE_EFFECT_OBLIGATION');assert.throws(()=>projectPinnedJsonStorageForwarding(proof,'trait::Math::imul_pow5',[{data:[1n]},1100n],bits),error=>error.code==='ERR_JSON_ROUNDTRIP_CAPABILITY_BOUND');
  }
  for(const key of ['sourceBehaviorFidelityVerified','traitOwnerVerified','borrowContractVerified','copyContractVerified','allocatorContractVerified','parseAdmission','namespaceAuthority','applicationEffectCompleteness','runtimeParity'])assert.equal(proof[key],false,key);
});
test('context extension retains private original seals and refuses public clones or duplicated source ownership',()=>{
  const input=dependencies(),proof=compilePinnedJsonStorageForwarding(input),storage=compilePinnedJsonStorageFragments(input),source=jsonMacroOriginalSource(input,'serde_json','src/lexical/bignum.rs'),data=compileArithmeticSourceData(source.source,['lexical','bignum']);
  assert.throws(()=>projectPinnedJsonStorageForwarding(structuredClone(proof),'trait::Math::hi64',[{data:[1n]}]),/Unsealed/);
  assert.throws(()=>extendArithmeticSourceData(storage.program,[data]),/ambiguous/);assert.throws(()=>extendArithmeticSourceData(storage.program,[structuredClone(data)]),/private compiled source/);assert.throws(()=>extendArithmeticSourceData(structuredClone(storage.program),[data]),/private original context/);
  assert.throws(()=>extendArithmeticCalleeSource(storage.program,[{modulePath:['lexical','bignum'],program:structuredClone(storage.sourceProgram)}]),/private source programs/);assert.throws(()=>extendArithmeticCalleeSource(storage.program,[{modulePath:['lexical','bignum'],program:storage.sourceProgram}]),/ambiguous/);
});
