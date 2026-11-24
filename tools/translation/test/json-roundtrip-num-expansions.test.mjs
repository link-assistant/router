import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {compilePinnedJsonNumericExpansions,isPinnedJsonNumericExpansions,projectedPinnedIntegerZero,compilePinnedJsonNumericArithmetic,isPinnedJsonNumericArithmetic,projectPinnedJsonIntegerCast} from '../json-roundtrip-num-expansions.mjs';
const root=new URL('../../../',import.meta.url),dependencies=()=>loadJsonMacroSourceProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
test('original numeric macros expand actual typed method and associated constant syntax without copied bodies',()=>{
  const candidate=compilePinnedJsonNumericExpansions(dependencies());assert.equal(candidate.expansions.length,8);assert.equal(candidate.items.filter(item=>item.kind==='method').length,42);assert.equal(candidate.items.filter(item=>item.kind==='constant').length,4);
  for(const type of ['u32','u64','u128','usize'])assert.equal(projectedPinnedIntegerZero(candidate,type),0n);assert.throws(()=>projectedPinnedIntegerZero(candidate,'f64'),/absent/);
  const cast=candidate.items.find(item=>item.trait==='AsPrimitive'&&item.target==='u64'&&item.name==='as_u128');assert.deepEqual(cast.body.children.map(node=>node.text),['self','as','u128']);
});
test('macro syntax inventories retain genuine lineage while all trait/owner/behavior authorities stay false',()=>{
  const candidate=compilePinnedJsonNumericExpansions(dependencies());assert.equal(isPinnedJsonNumericExpansions(candidate),true);assert.equal(isPinnedJsonNumericExpansions(structuredClone(candidate)),false);assert.throws(()=>projectedPinnedIntegerZero(structuredClone(candidate),'u32'),/Unsealed/);assert.throws(()=>compilePinnedJsonNumericExpansions(structuredClone(dependencies())),/private/);
  for(const row of candidate.expansions){assert.equal(row.definition.sourceVerified,true);assert.equal(row.expansion.ownerVerified,false);assert.equal(row.expansion.namespaceComplete,false);assert.equal(row.expansion.generatedBehavior,false);}
  for(const key of ['sourceOwnerVerified','traitOwnerVerified','primitiveTypeOwnerVerified','attributeOwnerVerified','generatedBehaviorVerified','namespaceAuthority','parseAdmission','applicationEffectCompleteness','runtimeParity'])assert.equal(candidate[key],false,key);
});

test('original expanded integer cast bodies automatically lower to source IR in both width directions',()=>{
  const candidate=compilePinnedJsonNumericArithmetic(dependencies());assert.equal(candidate.program.functions.length,12);assert.equal(candidate.program.expansionSources.length,8);
  for(const from of ['u32','u64','u128'])for(const to of ['u32','u64','u128']){const sourceBits=BigInt(from.slice(1)),targetBits=BigInt(to.slice(1)),value=(1n<<sourceBits)-1n,result=projectPinnedJsonIntegerCast(candidate,from,to,value);assert.equal(result.value,value&((1n<<targetBits)-1n));assert.equal(result.parseAdmission,false);const fn=candidate.program.functions.find(fn=>fn.name==='impl::AsPrimitive::'+from+'::as_'+to);assert.equal(fn.ir.tail.kind,'cast');assert.equal(fn.params[0].receiverSource.ownerVerified,false);}
  for(const to of ['u32','u64','u128']){const fn=candidate.program.functions.find(fn=>fn.name==='impl::AsCast::'+to+'::as_cast');assert.equal(fn.generics[0].bound,'AsPrimitive');assert.equal(fn.ir.tail.kind,'method');assert.equal(fn.ir.tail.name,'as_'+to);}
});
test('expanded-source IR seals and primitive input domains do not certify cast or source owners',()=>{
  const candidate=compilePinnedJsonNumericArithmetic(dependencies());assert.equal(isPinnedJsonNumericArithmetic(structuredClone(candidate)),false);assert.throws(()=>projectPinnedJsonIntegerCast(structuredClone(candidate),'u64','u32',1n),/private original/);assert.throws(()=>projectPinnedJsonIntegerCast(candidate,'u64','f64',1n),/bounded source/);assert.throws(()=>projectPinnedJsonIntegerCast(candidate,'usize','u64',1n),/bounded source/);assert.throws(()=>projectPinnedJsonIntegerCast(candidate,'u32','u64',1n<<32n),RangeError);
  for(const key of ['sourceBehaviorFidelityVerified','traitOwnerVerified','primitiveTypeOwnerVerified','attributeOwnerVerified','parseAdmission','namespaceAuthority','applicationEffectCompleteness','runtimeParity'])assert.equal(candidate[key],false,key);
});
