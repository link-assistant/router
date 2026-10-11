import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {configureDeriveLayout} from '../derive-layout.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
const root=new URL('../../../',import.meta.url);
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
const project=files=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,deriveDependencies:dependencies});

test('written string borrow and allocation chains retain the actual outer operation',async()=>{
  const result=project({'src/lib.rs':'pub fn classify(raw:&str)->u8 {match raw.to_ascii_lowercase().as_str() {"minimal"=>7,_=>9}} pub fn equal(raw:&str)->bool {raw.to_ascii_lowercase().as_str()=="minimal"} pub fn allocate(raw:String)->String {raw.as_str().to_ascii_lowercase()}'});
  assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.classify('MINIMAL'),7n);assert.equal(api.classify('other'),9n);assert.equal(api.equal('MINIMAL'),true);assert.equal(api.equal('low'),false);assert.equal(api.allocate('MiXeD'),'mixed');});
  for(const source of [
    'pub fn bad(raw:&str)->String {raw.to_ascii_lowercase().as_str()}',
    "pub fn bad(raw:&str)->&'static str {raw.to_ascii_lowercase().as_str()}",
    'pub fn bad(raw:String)->&str {raw.as_str().to_ascii_lowercase()}',
    "pub fn bad(raw:String)->&'static str {raw.as_str().to_ascii_lowercase()}",
  ]){const invalid=project({'src/lib.rs':source});assert.equal(invalid.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.ok(invalid.meta.refused.length);}
});

test('sealed actual derive attributes retain layout source and do not implement serialization',async()=>{
  for(const entry of ['/outside.rs','../outside.rs','src/../../outside.rs','C:\\outside.rs','src//entry.rs'])await assert.rejects(verifyTypedTargets({meta:{entry}},()=>assert.fail('unsafe entry must not execute')),/safe repository-relative/);
  const result=project({'src/lib.rs':'mod model; pub fn value()->u8 { model::Kind::Ready.code() }','src/model.rs':'use serde::{Serialize,Deserialize}; use schemars::JsonSchema; #[derive(Clone,Copy,Serialize,Deserialize,JsonSchema)] #[serde(rename_all="snake_case")] pub enum Kind { Ready, Paused } impl Kind {pub fn code(self)->u8 {match self {Self::Ready=>7,Self::Paused=>9}}}'});
  assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.deriveNamespaceFootprints.certificates.length,1);
  const layout=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('model.Kind');
  assert.ok(layout);assert.deepEqual(layout.deriveTraits,['Clone','Copy']);
  assert.ok(layout.rustAttributes.some(attribute=>attribute.name==='serde'&&attribute.tokens.includes('"snake_case"')));
  assert.deepEqual(layout.rustAttributes.find(attribute=>attribute.kind==='derive').unimplementedDerives,[['Serialize'],['Deserialize'],['JsonSchema']]);
  assert.equal(result.meta.deriveNamespaceFootprints.certificates[0].generatedImplBehavior,false);
  const certificate=result.meta.deriveNamespaceFootprints.certificates[0],source='use serde::{Serialize,Deserialize}; use schemars::JsonSchema; #[derive(Clone,Copy,Serialize,Deserialize,JsonSchema)] #[serde(rename_all="snake_case")] pub enum Kind { Ready, Paused } impl Kind {pub fn code(self)->u8 {match self {Self::Ready=>7,Self::Paused=>9}}}',slice=source.slice(certificate.span.start,certificate.span.end);
  assert.throws(()=>configureDeriveLayout(new HostRustParser(tokenizeRust(slice)),structuredClone(certificate),slice,certificate.span.start),/Unsealed/);
  assert.throws(()=>configureDeriveLayout(new HostRustParser(tokenizeRust(slice+' ')),certificate,slice+' ',certificate.span.start),/mismatched/);
  assert.throws(()=>configureDeriveLayout(new HostRustParser(tokenizeRust(slice)),certificate,slice,certificate.span.start+1),/mismatched/);
  const scoped=()=>{const parser=new HostRustParser(tokenizeRust(slice));parser.sourceNamespaceEvidence={source:certificate.source,module:[...certificate.module]};parser.compilationProfile=certificate.compilationProfile;return parser;};
  assert.equal(configureDeriveLayout(scoped(),certificate,slice,certificate.span.start).sourceNamespaceEvidence.source,certificate.source);
  for(const changed of [parser=>{parser.sourceNamespaceEvidence.module=['other'];},parser=>{parser.sourceNamespaceEvidence.source='src/other.rs';},parser=>{parser.compilationProfile=null;}]){const parser=scoped();changed(parser);assert.throws(()=>configureDeriveLayout(parser,certificate,slice,certificate.span.start),/original module/);}
  await verifyTypedTargets(result,api=>assert.equal(api.value(),7n));
  const invalid=project({'src/lib.rs':'use serde::Serialize; #[derive(Serialize)] pub struct Entry {value:u8} pub fn bad(value:Entry)->String {value.to_string()}'});
  assert.equal(invalid.meta.executable.some(entry=>entry.name==='bad'),false);
});

test('unchanged whole tracked thinking file retains unproved task-local and Copy provenance',()=>{
  const source=readFileSync(new URL('src/thinking/mod.rs',root),'utf8');
  assert.equal(createHash('sha256').update(source).digest('hex'),'26a39c5916007a8fd5ca6c65b25e2135b788ba6831d9ba77674b7b80da1e1b3b');
  const paths=execFileSync('git',['ls-files','-z','--','src/thinking'],{cwd:root,encoding:'utf8'}).split('\0').filter(path=>path.endsWith('.rs'));
  const result=translateProject({entry:'src/thinking/mod.rs',paths,readSource:path=>readFileSync(new URL(path,root),'utf8'),compilationProfile:PRODUCTION_PROFILE,deriveDependencies:dependencies});
  assert.equal(result.meta.deriveNamespaceFootprints.certificates.some(certificate=>certificate.source==='src/thinking/mod.rs'),false);
  assert.ok(result.meta.deriveNamespaceFootprints.diagnostics.some(diagnostic=>diagnostic.source==='src/thinking/mod.rs'&&diagnostic.name==='ThinkingLevel'));
  for(const [name,start,end,digest] of [
    ['ThinkingLevel.as_str',1125,1433,'93428a56749ed178b8d152ca7d012c6f612c3b62ccd51d9c9410a3efc31bb9e4'],
    ['ThinkingLevel.budget',1518,1805,'9309cb019590f9da60b98120bb8fd5dc7918611805521e73cacafe1e018296b9'],
  ]){
    assert.equal(createHash('sha256').update(source.slice(start,end)).digest('hex'),digest);
    assert.equal(result.meta.checkedMethods.some(method=>method.source==='src/thinking/mod.rs'&&method.name===name),false);
    const refusal=result.meta.refused.find(item=>item.file==='src/thinking/mod.rs'&&item.term==='method'&&item.name.endsWith(name)&&item.span.start===start&&item.span.end===end);
    assert.ok(refusal);assert.match(refusal.message,/ownership|derive|attribute|type|provenance/);
  }
});

test('unchanged whole subscription file checks proven original Copy and shared expiry behavior',async()=>{
  const path='src/subscription/types.rs',source=readFileSync(new URL(path,root),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
  assert.equal(hash(source),'74996ec0b4a32cb6e8d8c6a5e4cf2057a09238acff6d141ad58b592184c12c26');
  const result=translateProject({entry:path,paths:[path],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,deriveDependencies:dependencies});
  const method=result.meta.checkedMethods.find(method=>method.source===path&&method.name==='SubscriptionToken.is_expired');
  assert.ok(method);assert.deepEqual(method.span,{start:6721,end:6850});assert.equal(method.receiver,'shared');
  assert.equal(hash(source.slice(method.span.start,method.span.end)),'e83bced63445758eaec0237fbad7f91eb1e895191ba8eaed92548862ee4286ad');
  assert.ok(result.meta.deriveNamespaceFootprints.certificates.some(certificate=>certificate.source===path&&certificate.name==='SubscriptionToken'));
  for(const name of ['SubscriptionProvider.as_str','SubscriptionProvider.home_subdir']){
    assert.equal(result.meta.checkedMethods.some(method=>method.name===name),true);
    assert.equal(result.meta.refused.some(item=>item.term==='method'&&item.name.endsWith(name)),false);
  }
  assert.equal(result.meta.runtimeParity,false);
  const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),emitted=[...target.declarations.values()].find(entry=>entry.impl?.method==='is_expired');assert.ok(emitted);
  const alias=`\nexport {${emitted.name} as originalIsExpired};`;
  await verifyTypedTargets({...result,javascript:result.javascript+alias,typescript:result.typescript+alias},(_api,_result,module)=>{
    const tag=($,fields={})=>Object.freeze({$,...fields}),record=expiry=>tag('SubscriptionToken',{access_token:'fixture',refresh_token:tag('None'),expires_at_ms:expiry,account_id:tag('None'),resource_url:tag('None')});
    for(const [expiry,now,expected]of [[null,0n,false],[0n,-1n,false],[0n,0n,true],[0n,1n,true],[-1n,-1n,true],[-9223372036854775808n,-9223372036854775808n,true],[9223372036854775807n,9223372036854775806n,false],[9223372036854775807n,9223372036854775807n,true]]){
      assert.equal(module.originalIsExpired(record(expiry===null?tag('None'):tag('Some',{field0:expiry})),now),expected);
    }
    assert.throws(()=>module.originalIsExpired(record(tag('Some',{field0:1})),0n),TypeError);
    assert.throws(()=>module.originalIsExpired(record(tag('None')),9223372036854775808n),RangeError);
  });
});
