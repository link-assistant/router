import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {actualJsonCapabilityProfile,DEFAULT_JSON_PARSER_PROFILE,isJsonCapabilityProfile} from '../json-capabilities.mjs';
import {checkProgram,parseRust} from '../extensions/host-contracts.mjs';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {JSON_CONTRACTS} from '../extensions/json-contracts.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8');
const profile=()=>actualJsonCapabilityProfile({manifest,lock,compilationProfile:PRODUCTION_PROFILE});
const project=(source,jsonParserProfile)=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,...(jsonParserProfile?{jsonParserProfile}:{})});
const fromString='pub fn decode(value:&str)->Result<serde_json::Value,serde_json::Error>{serde_json::from_str::<serde_json::Value>(value)}';
const fromBytes='pub fn decode(value:&[u8])->Result<serde_json::Value,serde_json::Error>{serde_json::from_slice::<serde_json::Value>(value)}';
const bits=value=>{const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value);return view.getBigUint64(0);};

test('private actual Cargo context proves selected float_roundtrip and carries default parser capability',()=>{
  const target=profile();assert.equal(target.kind,'actual-locked-Cargo-profile');assert.equal(isJsonCapabilityProfile(target),true);assert.equal(target.features.includes('float_roundtrip'),true);assert.equal(target.serdeCoreStd,true);assert.equal(target.parseAvailable,false);assert.match(target.diagnostic,/float_roundtrip/);
  assert.equal(target.parserSource.sha256,'4998d7e252eb513be85b298e287048b4fb283882e9ba7df905f572f07200f3f3');assert.equal(target.runtimeParity,false);assert.equal(target.generatedTraitBehavior,false);assert.equal(isJsonCapabilityProfile(structuredClone(target)),false);
});

test('the original selected branch and exact rational midpoint distinguish default decoding without Rust observation',()=>{
  const source=gunzipSync(readFileSync(new URL('../source-profiles/json-capabilities/serde_json-1.0.151-de.rs.gz',import.meta.url))).toString('utf8');assert.equal(createHash('sha256').update(source).digest('hex'),'4998d7e252eb513be85b298e287048b4fb283882e9ba7df905f572f07200f3f3');
  assert.match(source,/#\[cfg\(feature = "float_roundtrip"\)\]\s*fn f64_from_parts[\s\S]*?lexical::parse_concise_float::<f64>/);assert.match(source,/fn parse_decimal_overflow[\s\S]*?self\.parse_long_decimal/);
  // Decimal 1 + 11/10^17 is below the exact halfway 1 + 2^-53.
  // The locked lexical nearest-rounding expectation is derived, not Rust-observed.
  assert.equal(11n*(1n<<53n)<10n**17n,true);assert.equal(bits(1),0x3ff0000000000000n);
  const defaultResult=serde_json_from_str('1.000000000000000110000');assert.equal(defaultResult.$,'Ok');assert.equal(bits(defaultResult.field0.field0.field0),0x3ff0000000000001n);
});

test('explicit standalone default targets retain unchanged decimal adapter behavior in JS and strict TS',async()=>{
  const result=translateSource(fromString,'default.rs',{jsonParserProfile:DEFAULT_JSON_PARSER_PROFILE});assert.equal(result.ir.items.find(item=>item.name==='decode').status,'executable');assert.equal(result.ir.jsonParserProfile.kind,'explicit-registered-standalone-default-profile');
  await verifyTypedTargets(result,api=>{const value=api.decode('1.000000000000000110000');assert.equal(value.$,'Ok');assert.equal(bits(value.field0.field0.field0),0x3ff0000000000001n);});
});

test('both actual parse call paths and resolved aliases carry a source-bearing feature diagnostic',()=>{
  for(const source of [fromString,fromBytes,'use serde_json::from_str as parse; '+fromString.replace('serde_json::from_str','parse'),'use serde_json::from_slice as parse; '+fromBytes.replace('serde_json::from_slice','parse')]){
    const result=project(source,profile());assert.equal(result.meta.executable.some(item=>item.name==='decode'),false);const refused=result.meta.refused.find(item=>item.name==='decode');assert.match(refused.message,/float_roundtrip/);assert.equal(refused.file,'src/lib.rs');assert.equal(refused.span.start>=source.indexOf('fn decode'),true);assert.equal(refused.span.end<=source.length,true);
  }
});

test('actual missing unsupported or command-line feature profiles never fall back to default parser',()=>{
  for(const target of [actualJsonCapabilityProfile(),actualJsonCapabilityProfile({manifest:manifest+'\n',lock}),actualJsonCapabilityProfile({manifest,lock,compilationProfile:{values:{feature:['unknown']}}})]){assert.equal(target.parseAvailable,false);for(const source of [fromString,fromBytes])assert.equal(project(source,target).meta.executable.some(item=>item.name==='decode'),false);}
  for(const source of [fromString,fromBytes]){const result=project(source);assert.equal(result.meta.jsonParserProfile.kind,'actual-Cargo-profile-unavailable');assert.equal(result.meta.executable.some(item=>item.name==='decode'),false);}
});

test('canonical Number constructors keep their independent actual feature-compatible contracts both targets',async()=>{
  assert.equal(JSON_CONTRACTS.find(contract=>contract.id==='serde_json_number_from_f64').assumptions.some(value=>value.includes('not(float_roundtrip)')),false);
  for(const id of ['serde_json_from_str','serde_json_from_slice'])assert.equal(JSON_CONTRACTS.find(contract=>contract.id===id).assumptions.some(value=>value.includes('not(float_roundtrip)')),true);
  const source='pub fn number(value:f64)->Option<serde_json::Number>{serde_json::Number::from_f64(value)}',result=project(source,profile());assert.equal(result.meta.executable.some(item=>item.name==='number'),true);
  await verifyTypedTargets(result,api=>{assert.deepEqual(api.number(256),{$:'Some',field0:{$:'Float',field0:256}});assert.deepEqual(api.number(Infinity),{$:'None'});assert.deepEqual(api.number(NaN),{$:'None'});assert.equal(Object.is(api.number(-0).field0.field0,-0),true);});
});

test('caller-forged and cloned profile flags cannot authorize parsing in the highest checker',()=>{
  for(const target of [structuredClone(profile()),structuredClone(DEFAULT_JSON_PARSER_PROFILE),{parseAvailable:true,features:['std'],kind:'actual-locked-Cargo-profile'}])assert.throws(()=>checkProgram(parseRust(fromString+' fn main(){}'),{jsonParserProfile:target}),/private explicit default|exact actual Cargo/);
});

test('project-to-per-file profile propagation and explicit bulk-equivalent options cannot resurrect parsing',()=>{
  const target=profile(),result=project(fromString,target),scoped=translateSource(fromString,'src/lib.rs',{projectSourceScopes:result.sourceScopes,projectDeclarations:result.executableDeclarations});assert.equal(scoped.ir.items.find(item=>item.name==='decode').status,'carried');
  for(const source of [fromString,fromBytes]){const isolated=translateSource(source,'unreached.rs',{jsonParserProfile:target});assert.equal(isolated.ir.items.find(item=>item.name==='decode').status,'carried');assert.match(isolated.ir.items.find(item=>item.name==='decode').diagnostic.message,/float_roundtrip/);}
});
