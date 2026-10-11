import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadJsonMacroSourceProof,jsonMacroOriginalSource} from '../json-macro-sources.mjs';
import {verifyPinnedJsonLimbArithmetic,isPinnedJsonLimbArithmetic} from '../json-roundtrip-limb-arithmetic.mjs';
const root=new URL('../../../',import.meta.url),dependencies=()=>loadJsonMacroSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
test('all original32/64 limb power arrays retain exact little-endian arithmetic and declaration source',()=>{
  const input=dependencies(),proof=verifyPinnedJsonLimbArithmetic(input);assert.equal(isPinnedJsonLimbArithmetic(proof),true);assert.equal(proof.rows.length,100);
  for(const bits of [32,64]){
    const rows=proof.rows.filter(row=>row.kind==='large'&&row.bits===bits);assert.equal(rows.length,14);
    const boundary=rows.find(row=>row.exponent===1024);assert.equal(boundary.value,5n**1024n);assert.equal(boundary.limbs,bits===32?75:38);
    const original=jsonMacroOriginalSource(input,'serde_json','src/lexical/large_powers'+bits+'.rs');
    for(const row of rows)assert.equal(createHash('sha256').update(original.source.slice(row.span.start,row.span.end)).digest('hex'),row.declarationSha256);
  }
  assert.equal(proof.originalPowerTablesExact,true);assert.equal(proof.limbCarryBoundsVerified,true);
});
test('source-sealed arithmetic facts cannot grant parser admission or certify source loops by clone/flags',()=>{
  const proof=verifyPinnedJsonLimbArithmetic(dependencies());assert.equal(isPinnedJsonLimbArithmetic(structuredClone(proof)),false);
  assert.equal(isPinnedJsonLimbArithmetic({...proof,parseAdmission:true}),false);assert.throws(()=>verifyPinnedJsonLimbArithmetic(structuredClone(dependencies())),/private/);
  for(const key of ['sourceLoopEquivalenceVerified','boundedDispatchVerified','hi64StickyEquivalenceVerified','parseAdmission','algorithmEquivalenceVerified','namespaceAuthority','applicationEffectCompleteness','runtimeParity','rustExecution'])assert.equal(proof[key],false,key);
  for(const variant of proof.variants){const q=1n<<BigInt(variant.bits);assert.equal(variant.scalarMax,q*q-q);assert.equal(variant.accumulationMax,q*q-1n);assert.equal(variant.accumulationMax<1n<<BigInt(variant.wideBits),true);}
});
