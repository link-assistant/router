import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadJsonMacroSourceProof,jsonMacroOriginalSource} from '../json-macro-sources.mjs';
import {JSON_LEXICAL_CACHE_SOURCE,JSON_LEXICAL_CACHE_SOURCE_SHA256} from '../extensions/json-roundtrip-cache-source.mjs';
import {lexicalConciseFloat64,lexicalTruncatedFloat64,lexicalModerateTrace,sourceLexicalMantissa,lexicalConciseTrace,lexicalTruncatedTrace} from '../extensions/json-roundtrip-lexical.mjs';
import {serde_json_roundtrip_from_str} from '../extensions/json-roundtrip-runtime.mjs';
const root=new URL('../../../',import.meta.url);
function bits(value){const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value);return view.getBigUint64(0);}
test('runtime cache input is the whole exact pinned original source, never manually copied constants',()=>{
  const input=loadJsonMacroSourceProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')}),original=jsonMacroOriginalSource(input,'serde_json','src/lexical/cached_float80.rs');
  assert.equal(JSON_LEXICAL_CACHE_SOURCE,original.source);assert.equal(JSON_LEXICAL_CACHE_SOURCE_SHA256,original.sha256);assert.equal(createHash('sha256').update(JSON_LEXICAL_CACHE_SOURCE).digest('hex'),original.sha256);
});
test('original concise/truncated branch selection retains normal halfways and the truncated-prefix multiply-ten exception',()=>{
  const negative=lexicalConciseTrace(10000000000000001110n,-19);assert.equal(negative.branch,'fallback-negative');assert.equal(bits(negative.value),0x3ff0000000000000n);
  assert.equal(bits(lexicalConciseFloat64(10000000000000001110n,-19)),bits(negative.value));
  const even=((1n<<53n)+1n)*5n**53n,odd=((1n<<53n)+3n)*5n**53n;
  assert.equal(bits(lexicalTruncatedFloat64(String(even),'',-53)),0x3ff0000000000000n);
  assert.equal(bits(lexicalTruncatedFloat64(String(odd),'',-53)),0x3ff0000000000002n);
  // Minimum overflow-prefix×10 fitsu64. Preserve the actual source decision;
  // do not assume that its nine-unit acceptance bound always proves ideal math.
  const trace=lexicalModerateTrace(1844674407370955161n,-19,true),large=13611294676837538538n;
  assert.equal(trace.mantissa,large-4n);assert.equal(trace.exponent,-66);assert.equal(trace.errors,9);
  const low=(large-4n)&2047n;assert.equal(trace.accepted,!(1015n<low&&low<1033n));
});
test('direct positive hi64/sticky and original native rounding retain carry and overflow behavior',()=>{
  const positive=lexicalTruncatedTrace('9007199254740993','',0);assert.equal(positive.branch,'fallback-positive');assert.equal(bits(positive.value),0x4340000000000000n);
  assert.equal(bits(lexicalTruncatedFloat64('9007199254740993','',0)),bits(positive.value));
  assert.equal(bits(lexicalTruncatedFloat64('9007199254740995','',0)),0x4340000000000002n);
  const overflow=((1n<<54n)-1n)*(1n<<970n);
  assert.equal(bits(lexicalTruncatedFloat64(String(overflow-1n),'',0)),0x7fefffffffffffffn);
  assert.equal(lexicalTruncatedFloat64(String(overflow),'',0),Infinity);
  const half=5n**1075n;
  assert.equal(bits(lexicalTruncatedFloat64(String(half),'',-1075)),0n);
  assert.equal(bits(lexicalTruncatedFloat64(String(half+1n),'',-1075)),1n);
});
test('source-derived retention preserves the valid769-digit integer zero-tail case through the real lexical and reader path',()=>{
  const original=((1n<<53n)+1n)*5n**53n*10n**715n,parsed=sourceLexicalMantissa(String(original),'');
  assert.equal(parsed.coefficient,original+1n);assert.equal(parsed.count,769);assert.equal(parsed.tailSynthesized,true);assert.equal(parsed.tailActuallyNonzero,false);
  assert.equal(bits(lexicalTruncatedFloat64(String(original),'',-768)),0x3ff0000000000001n);
  const result=serde_json_roundtrip_from_str(original+'e-768');assert.equal(result.$,'Ok');assert.equal(bits(result.field0.field0.field0),0x3ff0000000000001n);
  assert.throws(()=>serde_json_roundtrip_from_str(original+'0e-769'),error=>error.code==='ERR_JSON_ROUNDTRIP_CAPABILITY_BOUND');
  assert.throws(()=>sourceLexicalMantissa('1','0'),TypeError);
  for(const pair of [['','0'],['','000'],['','']])assert.throws(()=>lexicalTruncatedFloat64(...pair,0),TypeError);
  assert.equal(lexicalConciseFloat64(0n,-2147483648),0);
});
test('raw leading integer/fraction zeros count toward the source-derived769-digit bound and sign/error positions stay separate',()=>{
  assert.throws(()=>serde_json_roundtrip_from_str('0.'+'0'.repeat(768)+'1'),error=>error.code==='ERR_JSON_ROUNDTRIP_CAPABILITY_BOUND');
  assert.equal(Object.is(serde_json_roundtrip_from_str('-0.0').field0.field0.field0,-0),true);
  const exponent=serde_json_roundtrip_from_str('1e214748364899999');assert.equal(exponent.$,'Err');assert.equal(exponent.field0.message,'number out of range');assert.equal(exponent.field0.column,12n);
  const eof=serde_json_roundtrip_from_str('1e+');assert.equal(eof.field0.category.$,'Eof');assert.equal(eof.field0.column,3n);
});
