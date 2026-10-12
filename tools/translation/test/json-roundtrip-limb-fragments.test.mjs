import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadJsonMacroSourceProof,jsonMacroOriginalSource} from '../json-macro-sources.mjs';
import {compilePinnedJsonLimbFragments,isPinnedJsonLimbFragments,projectPinnedJsonLimbFragment} from '../json-roundtrip-limb-fragments.mjs';
const root=new URL('../../../',import.meta.url),dependencies=()=>loadJsonMacroSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')}),project=(proof,path,args,bits=32)=>projectPinnedJsonLimbFragment(proof,path,args,bits);
test('original scalar, mutable scalar loop and hi64 function spans become serializable source-derived IR',()=>{
  const input=dependencies(),proof=compilePinnedJsonLimbFragments(input),source=jsonMacroOriginalSource(input,'serde_json','src/lexical/math.rs');
  assert.equal(isPinnedJsonLimbFragments(proof),true);assert.equal(proof.program.functions.length,13);assert.doesNotThrow(()=>JSON.stringify(proof.program));
  for(const fn of proof.program.functions){assert.equal(createHash('sha256').update(source.source.slice(fn.span.start,fn.span.end)).digest('hex'),fn.sha256);assert.equal(source.source.slice(fn.bodySpan.start,fn.bodySpan.end).startsWith('{'),true);}
  const loop=proof.program.functions.find(fn=>fn.name==='small::imul');assert.equal(loop.ir.statements.some(statement=>statement.kind==='for'),true);
  assert.equal(loop.ir.statements.some(statement=>statement.kind==='if'),true);
});
test('both original Limb/Wide interpretations retain the maximal wide scalar product and actual mutation',()=>{
  const proof=compilePinnedJsonLimbFragments(dependencies());for(const bits of [32,64]){const q=1n<<BigInt(bits),maximum=q-1n;
    const mul=project(proof,'scalar::mul',[maximum,maximum,maximum],bits);assert.deepEqual(mul.value,[0n,maximum]);assert.deepEqual(mul.mutations,[]);
    const imul=project(proof,'scalar::imul',[maximum,maximum,maximum],bits);assert.equal(imul.value,maximum);assert.deepEqual(imul.mutations,[0n]);
  }
});
test('original mutable-limb for loop carries and appends once without a replacement multiplication body',()=>{
  const proof=compilePinnedJsonLimbFragments(dependencies());for(const bits of [32,64]){const q=1n<<BigInt(bits),m=q-1n;
    const result=project(proof,'small::imul',[[m,m],m],bits);assert.deepEqual(result.value,[]);assert.deepEqual(result.mutations,[[1n,m,q-2n]]);
    assert.deepEqual(project(proof,'small::imul',[[m,m],0n],bits).mutations,[[0n,0n]]);
    assert.deepEqual(project(proof,'small::imul',[[],m],bits).mutations,[[]]);
  }
});
test('source hi64 match preserves shift-zero branch and exact discarded-bit sticky',()=>{
  const proof=compilePinnedJsonLimbFragments(dependencies()),q=1n<<64n;
  assert.deepEqual(project(proof,'u64_to_hi64_1',[1n]).value,[1n<<63n,false]);
  assert.deepEqual(project(proof,'u64_to_hi64_2',[1n,1n]).value,[1n<<63n,true]);
  assert.deepEqual(project(proof,'u64_to_hi64_2',[1n,1n<<63n]).value,[3n<<62n,false]);
  assert.deepEqual(project(proof,'u64_to_hi64_2',[q-1n,q-1n]).value,[q-1n,true]);
  assert.throws(()=>project(proof,'u64_to_hi64_1',[0n]),/precondition/);
});
test('source model seals, scalar domains and descriptor guards cannot grant original execution authority',()=>{
  const proof=compilePinnedJsonLimbFragments(dependencies());assert.equal(isPinnedJsonLimbFragments(structuredClone(proof)),false);assert.throws(()=>project(structuredClone(proof),'scalar::mul',[1n,2n,0n]),/Unsealed/);
  assert.throws(()=>compilePinnedJsonLimbFragments(structuredClone(dependencies())),/private/);assert.throws(()=>project(proof,'scalar::mul',[1n<<32n,1n,0n]),RangeError);
  let reads=0;const vector=[1n];Object.defineProperty(vector,0,{get(){reads++;return 1n;}});assert.throws(()=>project(proof,'small::imul',[vector,1n]),/own scalar data/);assert.equal(reads,0);
  const proxy=new Proxy([1n],{get(){reads++;throw Error('read');}});assert.throws(()=>project(proof,'small::imul',[proxy,1n]),/vector domain/);assert.equal(reads,0);
  for(const key of ['sourceOwnerVerified','sourceLoopFidelityVerified','hi64StickyEquivalenceVerified','boundedDispatchVerified','parseAdmission','namespaceAuthority','applicationEffectCompleteness','runtimeParity'])assert.equal(proof[key],false,key);
});

test('original grade-school body uses emitted source slice/zip/enumerate/carry recurrences in both word models',()=>{
  const proof=compilePinnedJsonLimbFragments(dependencies());for(const bits of [32,64]){const q=1n<<BigInt(bits),m=q-1n,result=project(proof,'large::long_mul',[[m,m],[m,m]],bits);assert.deepEqual(result.value,[1n,0n,q-2n,m]);
    const value=result.value.reduceRight((n,limb)=>n*q+limb,0n);assert.equal(value,(q*q-1n)**2n);
    assert.deepEqual(project(proof,'large::long_mul',[[1n,0n,1n],[1n,1n]],bits).value,[1n,1n,1n,1n]);
    assert.throws(()=>project(proof,'large::long_mul',[[1n],[]],bits),/index bound/);
  }
});
test('original offset-add loop preserves boolean carry propagation beyond an all-max prefix',()=>{
  const proof=compilePinnedJsonLimbFragments(dependencies());for(const bits of [32,64]){const q=1n<<BigInt(bits),m=q-1n;
    assert.deepEqual(project(proof,'small::iadd_impl',[[m,m],1n,0n],bits).mutations,[[0n,0n,1n]]);
    assert.deepEqual(project(proof,'large::iadd_impl',[[m,m],[1n],0n],bits).mutations[0],[0n,0n,1n]);
    assert.deepEqual(project(proof,'large::iadd_impl',[[1n],[m],1n],bits).mutations[0],[1n,m]);
  }
});
