import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadJsonMacroSourceProof,jsonMacroOriginalSource} from '../json-macro-sources.mjs';
import {verifyPinnedJsonCachedPowerArithmetic,isPinnedJsonCachedPowerArithmetic} from '../json-roundtrip-cached-powers.mjs';
import {roundPositiveRationalBinary64} from '../extensions/exact-binary64.mjs';
import {serde_json_roundtrip_from_str} from '../extensions/json-roundtrip-runtime.mjs';
const root=new URL('../../../',import.meta.url),dependencies=()=>loadJsonMacroSourceProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});

test('original cached constants have a one-unit envelope; some are not nearest-rounded tables',()=>{
  const proof=verifyPinnedJsonCachedPowerArithmetic(dependencies());assert.equal(isPinnedJsonCachedPowerArithmetic(proof),true);assert.equal(isPinnedJsonCachedPowerArithmetic(structuredClone(proof)),false);
  assert.equal(proof.rows.length,76);const row=proof.rows.find(row=>row.kind==='large'&&row.decimalExponent===-20);
  assert.equal(row.mantissa,13611294676837538538n);assert.equal(row.nearest,false);assert.equal(row.signedErrorNumerator<0n,true);
  for(const key of ['coefficientTruncationPropagationVerified','moderateAcceptanceVerified','stickyTailBehaviorEquivalent','parseAdmission','algorithmEquivalenceVerified','namespaceAuthority','applicationEffectCompleteness','runtimeParity','rustExecution'])assert.equal(proof[key],false,key);
  assert.throws(()=>verifyPinnedJsonCachedPowerArithmetic(structuredClone(dependencies())),/private/);
});

test('source-linked integer padding trace exposes exact-rounding versus pinned sticky-tail discrepancy without Rust execution',()=>{
  const input=dependencies(),parse=jsonMacroOriginalSource(input,'serde_json','src/lexical/parse.rs'),bh=jsonMacroOriginalSource(input,'serde_json','src/lexical/bhcomp.rs');
  assert.equal(parse.sha256,'c2bfac4c70a19938ced61e991f4ec606764887cf12bac1a0978b5b5318a56aac');assert.equal(bh.sha256,'26f39d52008225a6b377d7246d326940d44200e160a7b4652733e712e1a45a04');
  assert.match(parse.source,/while fraction\.last\(\) == Some\(&b'0'\)/u);assert.match(bh.source,/if i < integer\.len\(\) \+ fraction\.len\(\)\s*\{\s*result\.imul_small\(10\);\s*result\.iadd_small\(1\);/u);
  const original=((1n<<53n)+1n)*5n**53n*10n**715n,text=original+'e-768';assert.equal(String(original).length,769);
  const receipt=JSON.parse(readFileSync(new URL('../fixtures/json-roundtrip/source-counterexample.json',import.meta.url),'utf8'));assert.equal(receipt.reproductionText,text);assert.equal(receipt.rustExecution,false);
  for(const snippet of receipt.originalSnippets){const source=jsonMacroOriginalSource(input,'serde_json',snippet.path).source,slice=source.slice(snippet.span.start,snippet.span.end);assert.equal(slice,snippet.source);assert.equal(createHash('sha256').update(slice).digest('hex'),snippet.sha256);}
  const m=10000000000000001110n,small=6250000000000000694n,large=13611294676837538538n,target=(1n<<62n)+512n;
  assert.equal((m*5n+4n)/8n,small);assert.equal((small*large+(1n<<63n))/(1n<<64n),target);
  assert.equal(small*large+(1n<<63n)-target*(1n<<64n),7385260164874040924n);
  // Source normalization: fp=(2^63+1024,-63), errors=26; normal extra bits
  // equal1024 at halfway1024, so the source rejects moderate acceptance.
  const fpMant=target<<1n,extra=fpMant&2047n;assert.equal(extra,1024n);assert.equal(1024n-26n<extra&&extra<1024n+26n,true);
  const kept=BigInt(String(original).slice(0,768));assert.equal(kept*10n+1n,original+1n);
  const theoretical=((1n<<53n)+1n)*5n**768n*(1n<<715n);assert.equal(theoretical,original);
  assert.equal(original+1n>theoretical,true); // Source small_atof chooses b.next_positive().
  const inferredSourceBits=0x3ff0000000000001n,exactBits=roundPositiveRationalBinary64(original,10n**768n);assert.equal(exactBits,0x3ff0000000000000n);assert.notEqual(inferredSourceBits,exactBits);
  assert.equal(serde_json_roundtrip_from_str(text).field0.field0.field0,1);
  // This is arithmetic/source-inferred evidence. No Rust program or translated
  // production body is executed; the full4096-digit candidate stays unadmitted.
});

test('all finite binary64 halfway boundaries terminate within768 significant decimal digits',()=>{
  const input=dependencies(),num=jsonMacroOriginalSource(input,'serde_json','src/lexical/num.rs'),bh=jsonMacroOriginalSource(input,'serde_json','src/lexical/bhcomp.rs');
  assert.match(num.source,/const MAX_DIGITS: usize = 769;/u);assert.match(bh.source,/let max_digits = F::MAX_DIGITS - 1;/u);
  // Halfway=(odd integer <2^54)*2^e, with -1075<=e<=970. Negative e
  // uses odd*5^-e and decimal scale e; positive e is at most1024 bits.
  assert.equal(((1n<<54n)-1n)*5n**1075n<10n**768n,true);
  assert.equal(((1n<<54n)-1n)*(1n<<970n)<10n**309n,true);
  // This closes boundary length, not the assertion that an omitted integer
  // tail is nonzero, nor the full moderate cached-power error propagation.
});
