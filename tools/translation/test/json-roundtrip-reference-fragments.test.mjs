import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {compilePinnedJsonSliceReferenceFragments,pinnedJsonSliceReferencePrograms} from '../json-roundtrip-reference-fragments.mjs';
import {compileArithmeticSourceFragments,bindArithmeticSourceData,projectArithmeticSource} from '../arithmetic-source-fragments.mjs';
import {compilePinnedJsonLimbFragments,projectPinnedJsonLimbFragment} from '../json-roundtrip-limb-fragments.mjs';
const root=new URL('../../../',import.meta.url),dependencies=()=>loadJsonMacroSourceProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
test('actual full pinned core slice AsRef body and generic receiver header survive source IR serialization',()=>{
  const proof=compilePinnedJsonSliceReferenceFragments(dependencies()),original=gunzipSync(readFileSync(new URL('../source-profiles/json-macro/standard/library-core-src-convert-mod.rs.gz',import.meta.url))).toString('utf8'),fn=proof.program.functions[0];
  assert.equal(createHash('sha256').update(original).digest('hex'),proof.source.sha256);assert.equal(createHash('sha256').update(original.slice(fn.span.start,fn.span.end)).digest('hex'),fn.sha256);assert.equal(original.slice(fn.params[0].receiverSource.span.start,fn.params[0].receiverSource.span.end),'&self');assert.equal(fn.name,'impl::AsRef::slice_T::as_ref');assert.equal(fn.generics[0].name,'T');assert.equal(fn.ir.tail.kind,'name');assert.deepEqual(fn.ir.tail.path,['self']);assert.equal(proof.program.privateMetaRoundtrip,true);
  for(const key of ['traitOwnerVerified','referenceContractVerified','primitiveCopyVerified','toolchainIdentityVerified','namespaceAuthority','parseAdmission','applicationEffectCompleteness','runtimeParity'])assert.equal(proof[key],false,key);assert.throws(()=>pinnedJsonSliceReferencePrograms(structuredClone(proof)),/Unsealed/);assert.throws(()=>compilePinnedJsonSliceReferenceFragments({}),/private original/);
});
test('original generic slice AsRef body is executed inside both Hi64 word projections without resolving unsupported forwarding',()=>{
  const proof=compilePinnedJsonSliceReferenceFragments(dependencies()),{program,data,modulePath}=pinnedJsonSliceReferencePrograms(proof),bound=bindArithmeticSourceData(program,modulePath,[data]),limbs=compilePinnedJsonLimbFragments(dependencies());
  for(const bits of [32,64]){const input=[1n,(1n<<BigInt(bits))-1n];assert.deepEqual(projectArithmeticSource(bound,proof.path,[input],{limbBits:bits}).value,input);const result=projectPinnedJsonLimbFragment(limbs,'trait::Hi64::hi64',[[1n,0n,1n]],bits);assert.deepEqual(result.value,[1n<<63n,true]);assert.equal(result.calls.some(row=>row.path===proof.path),true);assert.equal(result.parseAdmission,false);}
  assert.throws(()=>bindArithmeticSourceData(structuredClone(program),modulePath,[data]),/private compiled source/);
  for(const source of ['impl<T> AsRef<[T]> for [T] where T: Copy {fn as_ref(&self)->&[T]{self}}','impl<T> AsRef<[u32]> for [T] {fn as_ref(&self)->&[u32]{self}}'])assert.throws(()=>compileArithmeticSourceFragments(source,['impl::AsRef::slice_T::as_ref']),/Actual arithmetic function absent/);
  const ufcs='impl<T> AsRef<[T]> for [T] {fn as_ref(&self)->&[T]{<T as AsRef<T>>::as_ref(self)}}';assert.throws(()=>compileArithmeticSourceFragments(ufcs,['impl::AsRef::slice_T::as_ref']),error=>error instanceof TypeError&&error.message==='Unproved arithmetic expression token <');
});
