import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {compilePinnedJsonNumericExpansions,isPinnedJsonNumericExpansions,projectedPinnedIntegerZero} from '../json-roundtrip-num-expansions.mjs';
const root=new URL('../../../',import.meta.url),dependencies=()=>loadJsonMacroSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
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
