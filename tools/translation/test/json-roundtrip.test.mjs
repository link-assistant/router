import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {roundPositiveRationalBinary64} from '../extensions/exact-binary64.mjs';
import {decimalToBinary64,JSON_ROUNDTRIP_MAX_DIGITS} from '../extensions/json-roundtrip-numbers.mjs';
import {serde_json_roundtrip_from_str as parse,serde_json_roundtrip_from_slice as bytes,JSON_ROUNDTRIP_MAX_BYTES} from '../extensions/json-roundtrip-runtime.mjs';
import {serde_json_from_str as defaultParse} from '../extensions/json-runtime.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {jsonRoundtripCandidateProfile,isJsonRoundtripCandidateProfile} from '../json-roundtrip-capabilities.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),dependency=()=>loadJsonMacroSourceProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
function bits(value){const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value);return view.getBigUint64(0);}
const number=source=>{const result=parse(source);assert.equal(result.$,'Ok',source);assert.equal(result.field0.$,'Number');return result.field0.field0;};

test('actual locked roundtrip source/feature candidate is sealed while admission and algorithm equivalence remain unverified',()=>{
  const profile=jsonRoundtripCandidateProfile({dependencies:dependency()});assert.equal(isJsonRoundtripCandidateProfile(profile),true);assert.equal(isJsonRoundtripCandidateProfile(structuredClone(profile)),false);
  assert.equal(profile.features.features.includes('float_roundtrip'),true);assert.equal(profile.sources.length,23);
  assert.equal(profile.sources.find(pin=>pin.path==='src/de.rs').sha256,'4998d7e252eb513be85b298e287048b4fb283882e9ba7df905f572f07200f3f3');
  assert.equal(profile.defaultNumericAdapterChanged,false);assert.equal(profile.actualParserGuardChanged,false);
  for(const key of ['parseAdmission','algorithmEquivalenceVerified','namespaceAuthority','expansionAuthority','applicationEffectCompleteness','runtimeParity','rustExecution'])assert.equal(profile[key],false,key);
  assert.throws(()=>jsonRoundtripCandidateProfile({dependencies:structuredClone(dependency())}),/sealed/);
  assert.throws(()=>jsonRoundtripCandidateProfile({dependencies:dependency(),compilationProfile:{values:{feature:['custom']}}}),/override/);
});

test('shared exact ratio operation resolves normal ties in both directions without decimal Number coercion',()=>{
  assert.equal(roundPositiveRationalBinary64((1n<<53n)+1n,1n<<53n),0x3ff0000000000000n);
  assert.equal(roundPositiveRationalBinary64((1n<<53n)+3n,1n<<53n),0x3ff0000000000002n);
  const evenHalf=((1n<<53n)+1n)*5n**53n,oddHalf=((1n<<53n)+3n)*5n**53n;
  assert.equal(bits(decimalToBinary64(String(evenHalf),-53)),0x3ff0000000000000n);
  assert.equal(bits(decimalToBinary64(String(evenHalf+1n),-53)),0x3ff0000000000001n);
  assert.equal(bits(decimalToBinary64(String(oddHalf),-53)),0x3ff0000000000002n);
  const text='1.000000000000000110000';assert.equal(number(text).field0,1);assert.equal(defaultParse(text).field0.field0.field0,1.0000000000000002);
});

test('exact subnormal half, minimum-normal carry, maximum finite and overflow thresholds follow independent binary formulae',()=>{
  // These decimal coefficients are exact identities 5^k * 10^-k = 2^-k;
  // expectations are derived from binary spacing, never measured with Rust.
  const half=5n**1075n;
  assert.equal(bits(decimalToBinary64(String(half),-1075)),0n);
  assert.equal(bits(decimalToBinary64(String(half+1n),-1075)),1n);
  assert.equal(bits(decimalToBinary64(String(half-1n),-1075,true)),1n<<63n);
  const normalBoundary=((1n<<53n)-1n)*half;
  assert.equal(bits(decimalToBinary64(String(normalBoundary),-1075)),0x0010000000000000n);
  assert.equal(bits(decimalToBinary64(String(normalBoundary-1n),-1075)),0x000fffffffffffffn);
  const overflow=((1n<<54n)-1n)*(1n<<970n);
  assert.equal(bits(decimalToBinary64(String(overflow-1n),0)),0x7fefffffffffffffn);
  assert.throws(()=>decimalToBinary64(String(overflow),0),error=>error.code==='ERR_JSON_ROUNDTRIP_NUMBER_RANGE');
  assert.equal(parse(String(overflow)).field0.message,'number out of range');
});

test('roundtrip JSON grammar keeps integer constructors signed zero and original exponent overflow errors',()=>{
  assert.deepEqual(number('18446744073709551615'),{$:'PosInt',field0:18446744073709551615n});
  assert.deepEqual(number('-9223372036854775808'),{$:'NegInt',field0:-9223372036854775808n});
  assert.equal(number('18446744073709551616').$,'Float');
  for(const text of ['-0','-0.000','-0e999999999999999','-1e-999999999999999'])assert.equal(bits(number(text).field0),1n<<63n,text);
  assert.equal(number('0e999999999999999').field0,0);
  for(const text of ['','-','01','1.','1.e2','1e','1e+','1eX','1e999999999999999','1e309','1 true'])assert.deepEqual(parse(text),defaultParse(text),text);
  assert.equal(bits(number('5e-324').field0),1n);
  assert.equal(bits(number('1e-325').field0),0n);
});

test('resource-domain failures remain distinct from Rust syntax/range errors and bytes refuse proxy/accessor dispatch',()=>{
  assert.throws(()=>decimalToBinary64('1'.repeat(JSON_ROUNDTRIP_MAX_DIGITS+1),0),error=>error.code==='ERR_JSON_ROUNDTRIP_CAPABILITY_BOUND');
  assert.throws(()=>parse('0.'+'0'.repeat(JSON_ROUNDTRIP_MAX_DIGITS)),error=>error.code==='ERR_JSON_ROUNDTRIP_CAPABILITY_BOUND');
  assert.throws(()=>parse(' '.repeat(JSON_ROUNDTRIP_MAX_BYTES+1)),error=>error.code==='ERR_JSON_ROUNDTRIP_CAPABILITY_BOUND');
  assert.throws(()=>roundPositiveRationalBinary64(1n<<32768n,1n),error=>error.code==='ERR_EXACT_BINARY64_BOUND');
  assert.throws(()=>roundPositiveRationalBinary64(-1n,1n),TypeError);assert.throws(()=>decimalToBinary64('01',0),TypeError);
  let reads=0;const accessor=[49n];Object.defineProperty(accessor,'0',{get(){reads++;return 49n;}});
  assert.throws(()=>bytes(accessor),TypeError);assert.equal(reads,0);
  assert.throws(()=>bytes(new Proxy([49n],{get(){reads++;return 49n;}})),TypeError);assert.equal(reads,0);
  assert.throws(()=>bytes([256n]),TypeError);assert.throws(()=>bytes([49]),TypeError);assert.throws(()=>bytes(new Array(1)),TypeError);
  const text='[1.000000000000000110000,-0,5e-324]';assert.deepEqual(bytes(Array.from(Buffer.from(text),BigInt)),parse(text));
});

test('runtime ABI carrier executes independent midpoint outcomes in JavaScript and strict TypeScript',async()=>{
  // This carrier checks reusable runtime declarations, not an unchanged Router
  // body or a bypass of the still-authoritative CURRENT Cargo parsing guard.
  const import_='import {serde_json_roundtrip_from_str as parse,serde_json_roundtrip_from_slice as bytes} from "../runtime/json-roundtrip-runtime.mjs";',body='const r=parse(source);if(r.$!=="Ok"||r.field0.$!=="Number"||r.field0.field0.$!=="Float")throw new TypeError("expected float");return r.field0.field0.field0;';
  const result={javascript:import_+'function extract(source){'+body+'} export const translated=Object.freeze({parse,bytes,extract});',typescript:import_+'function extract(source:string):number{'+body+'} export const translated=Object.freeze({parse,bytes,extract});',meta:{entry:'src/module.rs',runtimeParity:false}};
  await verifyTypedTargets(result,translated=>{
    const text='1.000000000000000110000',value=translated.parse(text);assert.equal(value.$,'Ok');assert.equal(value.field0.field0.field0,1);
    assert.equal(translated.extract(text),1);
    assert.deepEqual(translated.bytes(Array.from(Buffer.from(text),BigInt)),value);
    assert.equal(translated.parse('1e309').field0.message,'number out of range');
  });
});
