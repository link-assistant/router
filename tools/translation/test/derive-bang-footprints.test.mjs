import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
// Authored source-only draft cases. No execution receipt exists for this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof,deriveDependencySource} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {inventoryDeriveQuoteMeta,isDeriveQuoteMeta,createQuoteFragmentCompiler,inspectQuoteFragment} from '../derive-quote-meta.mjs';
import {proveSerdeSerializeBangFootprint,isSerdeSerializeBangFootprint,originalFunction,selectedTemplate} from '../serde-bang-footprints.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {originalCsvContext} from './original-csv-context.mjs';
import {staticSourceLifecycleContext} from './real-source-fixtures.mjs';
const staticOriginal=staticSourceLifecycleContext("derive-bang-footprints.test.mjs");
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
function context(source,rootSource='mod model;'){
  return createDeriveFootprintContext({dependencies,compilationProfile:PRODUCTION_PROFILE,modules:[{file:'src/lib.rs',path:[],source:rootSource},{file:'src/model.rs',path:['model'],source}]});
}
function proof(source,name='State'){
  const input=context(source),certificate=input.certificates.find(certificate=>certificate.name===name);
  assert.ok(certificate,'An actual original input certificate is required, not a caller schema');
  return proveSerdeSerializeBangFootprint({context:input,certificate});
}

test('all original Serde source quote groups retain their actual member/span digests',()=>{
  const inventory=inventoryDeriveQuoteMeta(dependencies);
  assert.equal(inventory.sourceMemberCount,28);assert.equal(inventory.quoteCount,330);
  assert.equal(isDeriveQuoteMeta(inventory),true);assert.equal(isDeriveQuoteMeta(structuredClone(inventory)),false);
  for(const member of inventory.members){
    const original=deriveDependencySource(dependencies,'serde_derive',member.source);
    assert.equal(original.sha256,member.sourceSha256);assert.equal(Buffer.byteLength(original.source),member.bytes);
    for(const template of member.quotes){assert.equal(hash(original.source.slice(template.span.start,template.span.end)),template.sha256);assert.equal(template.generatorBindingComplete,false);assert.equal(template.generatedImplBehavior,false);}
  }
});

test('original unit Serialize route separates fixed empty macro ownership from namespace confinement',()=>{
  const result=proof('use serde::Serialize; #[derive(Serialize)] pub struct State;');
  assert.equal(isSerdeSerializeBangFootprint(result),true);assert.equal(result.selectedOwnerBangComplete,true);
  assert.equal(result.dimensions.bangMacroComplete,true);assert.equal(result.dimensions.typeNamespaceComplete,false);
  assert.equal(result.generatedImplBehavior,false);assert.equal(result.semanticSyntaxRoundTrip,true);
  assert.deepEqual(result.outputObservation.definitions,[]);assert.deepEqual(result.outputObservation.macroExports,[]);
  assert.equal(result.outputObservation.macroOwnerComplete,false,'Raw structural inspection does not resolve a fixed macro');
  assert.deepEqual(result.fixedMacro.target,['serde','__require_serde_not_serde_core']);assert.equal(result.fixedMacro.outputTokens,0);
  assert.equal(result.fixedMacro.ownerResolution,'original-wrapper-extern-crate-locked-serde');
  assert.ok(result.attributeOwners.names.includes('automatically_derived'));
});

test('unit enum source order and typed Name/Ident splices survive semantic syntax roundtrip',()=>{
  const result=proof('use serde::Serialize; #[derive(Serialize)] #[serde(rename_all="snake_case")] pub enum State { First, #[serde(rename="{#[macro_export]}")] Last }');
  assert.equal(result.inputStyle,'unit-enum');assert.equal(result.selectedOwnerBangComplete,true);assert.equal(result.semanticSyntaxRoundTrip,true);
  assert.deepEqual(result.outputObservation.macroExports,[],'A rename is a string-literal category, not emitted attribute syntax');
  assert.ok(result.branchProofs.some(branch=>branch.predicate.includes('style=Unit')));
  assert.ok(result.bindingProofs.some(binding=>binding.category==='Serde Name -> syn::LitStr'));
  assert.ok(result.bindingProofs.some(binding=>binding.binding==='Match(Expr)'));
});

test('other actual derive invocations keep the joined bang dimension incomplete',()=>{
  const result=proof('use serde::{Serialize,Deserialize}; #[derive(Serialize,Deserialize)] pub enum State { First, Last }');
  assert.equal(result.selectedOwnerBangComplete,true);assert.equal(result.dimensions.bangMacroComplete,false);
  assert.deepEqual(result.owners.map(owner=>owner.target.join('::')),['serde::Serialize']);
  assert.deepEqual(result.residualOwners.map(owner=>owner.target.join('::')),['serde::Deserialize']);
  const schema=proof('#[derive(serde::Serialize,schemars::JsonSchema)] pub enum State { First }');
  assert.equal(schema.dimensions.bangMacroComplete,false);assert.deepEqual(schema.residualOwners[0].target,['schemars','JsonSchema']);
});

test('default named payloads lift actual member/name field splices without generated trait authority',()=>{
  const result=proof('#[derive(serde::Serialize)] pub struct State { pub values:Vec<(String,u64)>, #[serde(rename="#[macro_export]")] value:u8 }');
  assert.equal(result.inputStyle,'named-struct');assert.equal(result.selectedOwnerBangComplete,true);
  assert.equal(result.generatedImplBehavior,false);assert.equal(result.semanticSyntaxRoundTrip,true);
  assert.deepEqual(result.outputObservation.definitions,[]);assert.deepEqual(result.outputObservation.macroExports,[]);
  assert.ok(result.branchProofs.some(branch=>branch.predicate.startsWith('!flatten')));
  const member=result.bindingProofs.find(binding=>binding.binding==='Member::Named');
  assert.deepEqual(member.fields.map(field=>field.name),['values','value']);
});

test('named payload empty field sequence retains the original nonmutating length branch',()=>{
  const result=proof('#[derive(serde::Serialize)] pub struct State {}');
  assert.equal(result.inputStyle,'named-struct');assert.equal(result.selectedOwnerBangComplete,true);
  assert.deepEqual(result.bindingProofs.find(binding=>binding.binding==='Member::Named').fields,[]);
});

test('unselected payload and helper-controlled generator routes remain explicit obligations',()=>{
  for(const source of [
    '#[derive(serde::Serialize)] pub struct State(u8);',
    '#[derive(serde::Serialize)] pub enum State { Item(u8) }',
    '#[derive(serde::Serialize)] #[serde(tag="kind")] pub enum State { First }',
    '#[derive(serde::Serialize)] pub enum State { #[serde(skip)] First }',
    '#[derive(serde::Serialize)] pub enum State { #[serde(with="crate::codec")] First }',
  ])assert.throws(()=>proof(source),/unit|payload|helper|branches/);
  for(const source of [
    '#[derive(serde::Serialize)] #[serde(remote="Other")] pub enum State { First }',
    'use custom::Serialize; #[derive(Serialize)] pub enum State { First }',
    '#[derive(serde::Serialize)] pub enum State { First } #[unknown] struct Other;',
  ])assert.equal(context(source).certificates.length,0,source);
});

test('original generic input does not acquire the nongeneric Serialize output route',()=>{
  const source='#[derive(serde::Serialize)] pub enum State<T> { Item(T) }';assert.equal(context(source).certificates.length,1);assert.throws(()=>proof(source),/nongeneric/);
});

test('generated attribute owners cannot be borrowed from a clean unrelated context',()=>{
  const source='use custom::automatically_derived; #[derive(serde::Serialize)] pub struct State;';
  const input=context(source),certificate=input.certificates.find(certificate=>certificate.name==='State');
  assert.ok(certificate);assert.throws(()=>proveSerdeSerializeBangFootprint({context:input,certificate}),/attribute.*shadowed/);
  const rootShadow=context('#[derive(serde::Serialize)] pub struct State;','use custom::allow; mod model;');
  const rootCertificate=rootShadow.certificates.find(certificate=>certificate.name==='State');
  assert.ok(rootCertificate);assert.throws(()=>proveSerdeSerializeBangFootprint({context:rootShadow,certificate:rootCertificate}),/attribute.*shadowed/);
});

test('caller-cloned certificates contexts and proposed closed flags have no proof identity',()=>{
  const input=context('#[derive(serde::Serialize)] pub struct State;'),certificate=input.certificates[0];
  assert.throws(()=>proveSerdeSerializeBangFootprint({context:structuredClone(input),certificate}),/sealed/);
  assert.throws(()=>proveSerdeSerializeBangFootprint({context:input,certificate:structuredClone(certificate)}),/sealed/);
  const other=context('#[derive(serde::Serialize)] pub struct State;');
  assert.throws(()=>proveSerdeSerializeBangFootprint({context:other,certificate}),/sealed/);
  const result=proveSerdeSerializeBangFootprint({context:input,certificate});
  assert.equal(isSerdeSerializeBangFootprint(structuredClone(result)),false);
  assert.equal(isSerdeSerializeBangFootprint({dimensions:{bangMacroComplete:true},sourceSha256:result.sourceSha256}),false);
});

test('quote interpolation and repetition require private typed fragments and exact ordered lengths',()=>{
  const inventory=inventoryDeriveQuoteMeta(dependencies),compiler=createQuoteFragmentCompiler(inventory);
  const wrapper=inventory.members.find(member=>member.source==='src/dummy.rs').quotes.find(template=>JSON.stringify(template.syntax).includes('use_serde')&&JSON.stringify(template.syntax).includes('code'));
  assert.ok(wrapper);assert.throws(()=>compiler.instantiate(wrapper,new Map([['code',{syntax:[],category:'TokenStream'}]]),{}),/Unproved generator splice/);
  assert.throws(()=>createQuoteFragmentCompiler(structuredClone(inventory)),/Unsealed/);
  const enumMatch=inventory.members.find(member=>member.source==='src/ser.rs').quotes.find(template=>template.syntax[0]?.text==='match'&&JSON.stringify(template.syntax).includes('arms'));
  assert.ok(enumMatch);
  assert.throws(()=>compiler.instantiate(enumMatch,new Map([['self_var',compiler.token('self','ident',{})],['arms',[]]]),{}),/checked sequence/);
  assert.throws(()=>compiler.token('#[macro_export]','ident',{}),/token category/);
  assert.throws(()=>compiler.token('macro_rules! x{}','string',{}),/literal token/);
});

test('original formatting owner census retains complete file and declaration byte identities',()=>{
  const frontier=JSON.parse(readFileSync(new URL('../fixtures/formatting-owner-frontier.json',import.meta.url),'utf8'));
  assert.equal(frontier.firstRefusals,404);assert.deepEqual(frontier.terms,{fn:307,method:97});
  assert.equal(frontier.directLiteralFirstTemplates,404);assert.equal(frontier.typeOrExecutionProof,false);
  assert.equal(frontier.overlappingTextualFeatureCounts.basic,396);
  for(const file of frontier.originalFiles){const bytes=Buffer.from(staticOriginal.source(file.source),'utf8');assert.equal(hash(bytes),file.sha256);assert.equal(bytes.length,file.bytes);}
  for(const pin of frontier.focusedPins){const source=staticOriginal.source(pin.source);assert.equal(hash(source),pin.sourceSha256);assert.equal(hash(source.slice(pin.span.start,pin.span.end)),pin.sha256);}
});

test('complete original library RunState proof keeps unrelated neutral macro uncertainty',{timeout:30000},()=>{
  const original=staticOriginal,paths=original.inputs.sources.map(entry=>entry.source).filter(path=>path.endsWith('.rs'));
  // Namespace/quote analysis only. Deliberately do not read .result, which
  // would request the separate, expensive full semantic project translation.
  const graph=resolveModuleGraph({entry:'src/lib.rs',paths,readSource:original.source,compilationProfile:PRODUCTION_PROFILE});
  const input=createDeriveFootprintContext({dependencies,modules:graph.modules,compilationProfile:PRODUCTION_PROFILE});
  const certificate=input.certificates.find(certificate=>certificate.source==='src/deploy_local/inventory.rs'&&certificate.name==='RunState');
  assert.ok(certificate,'Whole original parents/imports must prove this input; no isolated declaration substitution');
  const result=proveSerdeSerializeBangFootprint({context:input,certificate});
  assert.equal(result.sourceSha256,'0e10cb035695fa23bb3fb8c72191a657ac6b04df319694856aceffd3a5a03e96');
  assert.deepEqual(result.span,{start:135,end:626});assert.equal(result.itemSha256,'6166fc6655d0e208e8f7e82ba792cf63a3a4f0a1c6912535b6dede552a6fee96');
  assert.equal(result.selectedOwnerBangComplete,true);assert.equal(result.generatedImplBehavior,false);
  const binding=resolveModuleBindings({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE,deriveContext:input});
  assert.equal(binding.scopes.find(scope=>scope.path.length===0).unresolvedBangMacroScope,true);
  assert.ok(graph.diagnostics.some(diagnostic=>original.source(diagnostic.file).slice(diagnostic.span.start,diagnostic.span.end).includes('unix_listener')));
});


test('typed fragment metadata normalization retains separate token/cell/depth limits',()=>{
  const inventory=inventoryDeriveQuoteMeta(dependencies),compiler=createQuoteFragmentCompiler(inventory),leaf=compiler.sourceType('u8',{source:'budget-type-leaf'});
  // Repeated original source spans increase serialized evidence while actual
  // token spelling stays small; no runtime/certificate authority is granted.
  assert.doesNotThrow(()=>compiler.roundTrip(compiler.join(Array(5000).fill(leaf),{role:'bounded source metadata positive'})));
  assert.throws(()=>compiler.join(Array(10000).fill(leaf),{role:'metadata bound'}),/metadata-byte budget/);
  const long=compiler.token('x'.repeat(4096),'ident',{role:'bounded identifier leaf'});
  assert.throws(()=>compiler.join(Array(63).fill(long),{role:'token spelling bound'}),/token-byte budget/);
  assert.throws(()=>compiler.join(Array(16001).fill(leaf),{role:'cell bound'}),/value budget/);
  const definition=originalFunction(dependencies,'src/de.rs','deserialize_seq'),wrapper=selectedTemplate(inventory,definition,text=>text.startsWith('#type_path ('));
  let value=compiler.token('X','ident',{role:'grammar-only name'});assert.throws(()=>{for(let depth=0;depth<70;depth++)value=compiler.instantiate(wrapper,new Map([['type_path',compiler.token('X','ident',{role:'source tuple constructor slot'})],['vars',compiler.sequence([value],{role:'one source argument'})]]),{role:'original wrapper depth bound'});},/depth budget/);
});
