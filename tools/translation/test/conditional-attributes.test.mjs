import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {itemConfiguration,isAbsentConditionalAttribute,isInertConditionalAttribute,compilationProfile,PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {CONDITIONAL_ATTRIBUTE_PROFILE} from '../conditional-attributes.mjs';
import {rustTokens,sourceItems} from '../rust-structure.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {inspectDeriveInput} from '../derive-inputs.mjs';
import {trackedSource} from '../source-corpus.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const condition=(source,profile=PRODUCTION_PROFILE)=>itemConfiguration(rustTokens(source),profile);
const hash=source=>createHash('sha256').update(source).digest('hex');
test('false conditional attributes retain original syntax and require private absence evidence',()=>{
  const source='// astral 😀\n#[cfg_attr(test, derive(Custom), owner::Expand(x), path = "other.rs",)] pub struct Visible;';
  const item=sourceItems(source).find(item=>item.term==='struct'),proof=condition(item.tokens.map(token=>token.text).join(' '));
  assert.equal(proof.status,'active');assert.equal(proof.attributes[0].evaluation.predicate.value,false);
  assert.equal(proof.attributes[0].evaluation.expansion,'absent');assert.equal(proof.attributes[0].evaluation.inputs.length,3);
  assert.equal(isAbsentConditionalAttribute(proof.attributes[0]),true);
  assert.equal(isAbsentConditionalAttribute(structuredClone(proof.attributes[0])),false);
  assert.equal(isAbsentConditionalAttribute({...proof.attributes[0]}),false);
  assert.equal(Object.isFrozen(proof.attributes[0].evaluation.inputs[0].tokens),true);
  const original=itemConfiguration(item.tokens,PRODUCTION_PROFILE).attributes[0];
  assert.equal(source.slice(original.span.start,original.span.end),'#[cfg_attr(test, derive(Custom), owner::Expand(x), path = "other.rs",)]');
  assert.equal(CONDITIONAL_ATTRIBUTE_PROFILE.activeExpansionAuthority,false);
});
test('unknown and true predicates retain transformation obligations without host selection',()=>{
  for(const [source,profile] of [
    ['#[cfg_attr(unix,custom::attribute)] fn value(){}',PRODUCTION_PROFILE],
    ['#[cfg_attr(test,derive(Custom))] struct Value;',compilationProfile({flags:{test:true}})],
    ['#[cfg_attr(not(test),custom::attribute)] fn value(){}',PRODUCTION_PROFILE],
    ['#[cfg_attr(test,derive(Custom))] fn value(){}',null],
  ]){const result=condition(source,profile);assert.equal(result.status,'unknown');assert.equal(isAbsentConditionalAttribute(result.attributes[0]),false);assert.ok(result.diagnostics.length);}
});
test('syntax is checked before a false predicate can remove any attribute',()=>{
  for(const input of ['test','all(test,unix)','test derive(Custom)','test,,derive(Custom)','test,derive(Custom) trailing','test,path=other','test,path=concat!("a.rs")','test,::owner','test,owner::','test,fn','test,unsafe(42)','test,r#gen','test,allow([)]']){
    const result=condition(`#[cfg_attr(${input})] struct Visible;`);
    assert.equal(result.status,'unknown',input);assert.equal(isAbsentConditionalAttribute(result.attributes[0]),false,input);
  }
  for(const input of ['test,','all(test,unix),','test,cfg_attr()','any(),custom([a,b],{c})'])assert.equal(condition(`#[cfg_attr(${input})] struct Visible;`).status,'active',input);
});
test('absence never removes a sibling attribute or overrides an inactive cfg',()=>{
  const source='#[cfg_attr(test,derive(Custom))] #[replace] #[cfg(not(test))] struct Value;';
  const proof=condition(source);assert.equal(proof.status,'active');assert.equal(proof.attributes.length,3);
  const bindings=resolveModuleBindings({modules:[{file:'src/lib.rs',path:[],source}],compilationProfile:PRODUCTION_PROFILE});
  assert.equal(bindings.scopes[0].unresolvedAttributeMacroScope,true);
  assert.equal(condition('#[cfg_attr(test,replace)] #[cfg(test)] struct Value;').status,'inactive');
});
test('known false outer attributes select the original default module file and close its binding scope',async()=>{
  const files={'src/lib.rs':'#[cfg_attr(test,path="alternate.rs",replace)] mod child; pub fn amount()->u8{child::amount()}','src/child.rs':'pub fn amount()->u8{7}','src/alternate.rs':'pub fn amount()->u8{99}'},reads=[];
  const options={entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>{reads.push(path);return files[path];},compilationProfile:PRODUCTION_PROFILE};
  const graph=resolveModuleGraph(options);assert.equal(graph.edges.length,1);assert.equal(graph.edges[0].to,'src/child.rs');assert.equal(reads.includes('src/alternate.rs'),false);
  const bindings=resolveModuleBindings({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE});
  assert.equal(bindings.scopes.every(scope=>!scope.unresolvedTypeScope&&!scope.unresolvedMacroScope),true);
  const translated=translateProject({...options,readSource:path=>files[path]});
  assert.equal(translated.meta.sources.every(entry=>entry.sha256===hash(files[entry.source])),true);
  assert.equal(translated.meta.executable.some(entry=>entry.name==='amount'),true);
  await verifyTypedTargets(translated,api=>assert.equal(api.amount(),7n));
});
test('known false inner attributes and inline module attributes retain complete source owners',async()=>{
  const source='#![cfg_attr(test,replace)]\n#[cfg_attr(test,derive(Custom))] mod child {#![cfg_attr(test,replace)] pub fn amount()->u8{7}} pub fn amount()->u8{child::amount()}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
  assert.equal(result.sourceScopes.every(scope=>scope.configurationCondition==='active'&&!scope.scope.unresolvedTypeScope),true);
  assert.equal(result.meta.executable.some(entry=>entry.name==='amount'),true);
  assert.equal(result.meta.sources.every(entry=>entry.sha256===hash(source)),true);
  await verifyTypedTargets(result,api=>assert.equal(api.amount(),7n));
});
test('absent procedural attributes preserve a checked unchanged function body and value domain',async()=>{
  const source='#[cfg_attr(test,custom::replace)] pub fn amount(value:u8)->u8{value+1}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
  const item=result.meta.executable.find(entry=>entry.name==='amount');assert.ok(item);
  await verifyTypedTargets(result,api=>{assert.equal(api.amount(1n),2n);assert.throws(()=>api.amount(255n),RangeError);});
  assert.equal(result.meta.sources[0].sha256,hash(source));
});
test('false conditional derives and helpers do not acquire an applied derive invocation',()=>{
  const source='#[derive(Clone,Copy)] #[cfg_attr(test,derive(Custom))] struct Value{#[cfg_attr(test,custom)] amount:u8}';
  const item=sourceItems(source).find(item=>item.term==='struct'),input=inspectDeriveInput(item,PRODUCTION_PROFILE);
  assert.deepEqual(input.derives.map(entry=>entry.path),[['Clone'],['Copy']]);assert.equal(input.absentConditionalAttributes.length,2);
  assert.equal(input.attributes.some(attribute=>attribute.name==='cfg_attr'),false);
  assert.throws(()=>inspectDeriveInput(item,compilationProfile({flags:{test:true}})),/active original compilation|conditional/);
});
test('whole unchanged production files pin actual conditional attributes and the request derive inputs',()=>{
  const root=fileURLToPath(new URL('../../../',import.meta.url));
  const pins=JSON.parse(readFileSync(new URL('./fixtures/conditional-attribute-frontier.json',import.meta.url),'utf8'));
  for(const pin of pins.files){const source=trackedSource(root,pin.path);assert.equal(hash(source),pin.sha256);for(const attribute of pin.attributes)assert.equal(hash(source.slice(attribute.span.start,attribute.span.end)),attribute.sha256);}
  const token=pins.files.find(pin=>pin.path==='src/token_admin.rs'),source=trackedSource(root,token.path);
  const item=sourceItems(source).find(item=>item.term==='struct'&&item.name==='IssueClientTokenRequest');assert.ok(item);
  const input=inspectDeriveInput(item,PRODUCTION_PROFILE);
  assert.deepEqual(input.derives.map(entry=>entry.path),[['serde','Deserialize'],['schemars','JsonSchema']]);
  assert.equal(input.absentConditionalAttributes.length,1);assert.equal(input.generatedImplBehavior,false);
  assert.equal(source.slice(input.absentConditionalAttributes[0].span.start,input.absentConditionalAttributes[0].span.end),'#[cfg_attr(test, derive(serde::Serialize))]');
  const lifecycle=pins.files.find(pin=>pin.path==='src/client_lifecycle/active.rs'),active=trackedSource(root,lifecycle.path);
  const inner=sourceItems(active).find(item=>item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!');assert.ok(inner);
  assert.equal(itemConfiguration(inner.tokens,compilationProfile({flags:{test:false,unix:true,windows:false}})).status,'active');
  assert.equal(itemConfiguration(inner.tokens,PRODUCTION_PROFILE).status,'active');
  assert.equal(itemConfiguration(inner.tokens,PRODUCTION_PROFILE).attributes[0].evaluation.predicate.value,null);
  assert.equal(itemConfiguration(inner.tokens,compilationProfile({flags:{test:false,unix:false,windows:true}})).status,'active');
});
test('checked exact dead_code lint alternatives retain unknown and true predicates without item authority',()=>{
  for(const profile of [null,PRODUCTION_PROFILE,compilationProfile({flags:{windows:true}})]){
    const proof=condition('#[cfg_attr(windows,allow(dead_code),allow(dead_code,))] fn amount()->u8{7}',profile),attribute=proof.attributes[0];
    assert.equal(proof.status,'active');assert.equal(attribute.evaluation.expansion,'inert-lint-alternatives');
    assert.equal(isAbsentConditionalAttribute(attribute),false);assert.equal(isInertConditionalAttribute(attribute),true);
    assert.equal(isInertConditionalAttribute(structuredClone(attribute)),false);
    assert.equal(attribute.evaluation.configurationSelected,profile?.flags.windows===true);
    assert.equal(attribute.evaluation.predicate.value,profile?.flags.windows===true?true:null);
  }
  for(const input of ['allow(other_lint)','warn(dead_code)','allow(dead_code, reason="unchecked")','custom::allow(dead_code)','allow(dead_code),derive(Custom)'])assert.equal(condition(`#[cfg_attr(windows,${input})] struct Value;`).status,'unknown',input);
  for(const predicate of ['custom(windows)','true','false','not(windows,)'])assert.equal(condition(`#[cfg_attr(${predicate},allow(dead_code))] struct Value;`).status,'unknown',predicate);
});
test('unknown conditional lint module headers keep their tracked child and checked source body',async()=>{
  const files={'src/lib.rs':'#[cfg_attr(windows,allow(dead_code))] mod child; pub fn amount()->u8{child::amount()}','src/child.rs':'#![cfg_attr(target_os="linux",allow(dead_code))]\npub fn amount()->u8{7}'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});
  assert.equal(result.sourceScopes.every(scope=>scope.configurationCondition==='active'&&!scope.scope.unresolvedTypeScope),true);
  assert.equal(result.meta.moduleEdges.length,1);assert.equal(result.meta.sources.length,2);
  assert.equal(result.meta.configurationEvidence.some(module=>module.items.some(item=>item.attributes.some(attribute=>attribute.evaluation?.predicate?.value===null&&attribute.evaluation.expansion==='inert-lint-alternatives'))),true);
  await verifyTypedTargets(result,api=>assert.equal(api.amount(),7n));
});
test('inert conditional field and container lints keep derive inputs distinct from absence',()=>{
  const source='#[derive(Clone,Copy)] #[cfg_attr(windows,allow(dead_code))] struct Value{#[cfg_attr(target_os="linux",allow(dead_code))] amount:u8}';
  const input=inspectDeriveInput(sourceItems(source).find(item=>item.term==='struct'),PRODUCTION_PROFILE);
  assert.equal(input.absentConditionalAttributes.length,0);assert.equal(input.inertConditionalAttributes.length,2);
  assert.deepEqual(input.derives.map(entry=>entry.path),[['Clone'],['Copy']]);assert.equal(input.generatedImplBehavior,false);
});
