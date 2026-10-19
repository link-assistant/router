import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
// Original source output cases; generated trait execution remains unimplemented.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {inventoryDeriveQuoteMeta,createQuoteFragmentCompiler,inspectQuoteFragment} from '../derive-quote-meta.mjs';
import {proveSerdeDeserializeBangFootprint,isSerdeDeserializeBangFootprint} from '../serde-deserialize-bang-footprints.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {originalCsvContext} from './original-csv-context.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
function input(source,rootSource='mod model;'){
  return createDeriveFootprintContext({dependencies,compilationProfile:PRODUCTION_PROFILE,modules:[{file:'src/lib.rs',path:[],source:rootSource},{file:'src/model.rs',path:['model'],source}]});
}
function prove(source){const context=input(source),certificate=context.certificates.find(value=>value.name==='Payload');assert.ok(certificate,'Genuine selected input ownership is required');return proveSerdeDeserializeBangFootprint({context,certificate});}

test('actual named field Type/Ident/Lifetime splices close both feature outputs, without trait authority',()=>{
  const result=prove('#[derive(serde::Deserialize)] pub struct Payload { name:String, values:Vec<(u64,String)> }');
  assert.equal(isSerdeDeserializeBangFootprint(result),true);assert.equal(result.selectedOwnerBangComplete,true);
  assert.equal(result.inventoryCounts.sourceMembers,28);assert.equal(result.inventoryCounts.quoteGroups,330);
  assert.deepEqual(result.outputs.map(value=>value.feature),['disabled','enabled']);
  assert.equal(result.featureEvidence.activation,'unresolved Cargo feature union');
  assert.deepEqual(result.featureEvidence.defaultFeatures,[]);
  for(const output of result.outputs){assert.equal(output.semanticSyntaxRoundTrip,true);assert.deepEqual(output.observation.definitions,[]);assert.deepEqual(output.observation.macroExports,[]);assert.equal(output.observation.bangCalls.length,1);}
  assert.equal(result.generatedImplBehavior,false);assert.equal(result.dimensions.typeNamespaceComplete,false);
  const types=result.bindingProofs.find(value=>value.binding==='field Type / Ident / Lifetime / literal aliases');
  assert.deepEqual(types.fields.map(value=>value.name),['name','values']);assert.deepEqual(types.implicitBorrowedLifetimes,[]);
});

test('deny_unknown_fields selects identifier errors without granting flattened format_args output',()=>{
  const result=prove('#[derive(serde::Deserialize)] #[serde(deny_unknown_fields)] pub struct Payload { value:u8 }');
  assert.ok(result.branchProofs.some(value=>value.predicate==='deny_unknown_fields'&&value.value===true));
  const flatten=result.branchProofs.find(value=>value.predicate==='!has_flatten');
  assert.equal(flatten.value,true);assert.equal(flatten.excludedOutputSource.bangMacro,'format_args');
  assert.ok(flatten.basis.includes('any(flatten && !skip)'));
  assert.ok(result.outputs.every(value=>value.observation.bangCalls.every(call=>call.writtenPath.join('::')==='_serde::__require_serde_not_serde_core')));
});

test('empty named fields preserve vacuous all predicate and denied impossible field match',()=>{
  const result=prove('#[derive(serde::Deserialize)] #[serde(deny_unknown_fields)] pub struct Payload {}');
  assert.ok(result.branchProofs.some(value=>value.predicate==='all fields deserialize_with'&&value.value===true));
  assert.equal(result.outputs[0].outputSyntaxSha256,result.outputs[1].outputSyntaxSha256,'Both outcomes emit no inplace method for the actual empty iterator');
});

test('borrowed fields, custom helpers and other source owners remain separate obligations',()=>{
  const borrowed=input('#[derive(serde::Deserialize)] pub struct Payload { value:&\'static str }');
  assert.ok(borrowed.certificates[0]);assert.throws(()=>proveSerdeDeserializeBangFootprint({context:borrowed,certificate:borrowed.certificates[0]}),/borrowed field lifetime/);
  for(const source of [
    '#[derive(serde::Deserialize)] #[serde(default)] pub struct Payload { value:u8 }',
    '#[derive(serde::Deserialize)] pub struct Payload { #[serde(alias="v")] value:u8 }',
    '#[derive(serde::Deserialize)] pub struct Payload { #[serde(skip)] value:u8 }',
  ]){const context=input(source);assert.ok(context.certificates[0]);assert.throws(()=>proveSerdeDeserializeBangFootprint({context,certificate:context.certificates[0]}),/helper branches/);}
  const generic=input('#[derive(serde::Deserialize)] pub struct Payload<T>{value:T}');assert.equal(generic.certificates.length,1);assert.equal(generic.certificates[0].genericParameters.genericTypeInstantiation,false);assert.throws(()=>proveSerdeDeserializeBangFootprint({context:generic,certificate:generic.certificates[0]}),/original named fields/);
  for(const source of ['use custom::Deserialize; #[derive(Deserialize)] pub struct Payload { value:u8 }','#[derive(serde::Deserialize)] pub struct Payload { #[serde(flatten)] value:Other }'])assert.equal(input(source).certificates.length,0);
});

test('literal byte and original Type grammars cannot inject macro or attribute syntax',()=>{
  const compiler=createQuoteFragmentCompiler(inventoryDeriveQuoteMeta(dependencies));
  const literal=compiler.byteString('quoted"\\#[macro_export]\u{10000}',{role:'actual literal bytes'});
  assert.deepEqual(inspectQuoteFragment(literal).macroExports,[]);
  const type=compiler.sourceType('std::vec::Vec<(String, Option<u64>)>',{role:'original Type source'});
  assert.equal(type.provenance.category,'original syn::Type');assert.equal(type.provenance.sourceSha256,hash('std::vec::Vec<(String, Option<u64>)>'));
  const reference=compiler.sourceType("&'static [u8]",{role:'source Type grammar only, no borrowed-field selection authority'});
  assert.equal(reference.syntax[0].text,'&');assert.equal(reference.syntax[1].tokenType,'lifetime');assert.equal(reference.syntax[1].text,"'static");
  for(const source of ['evil!()','u8; macro_rules! x{}','Vec<{callback()}>','impl Trait','fn()->u8','#[unknown]u8'])assert.throws(()=>compiler.sourceType(source,{}),/Type|declarative|delimiter/);
  assert.throws(()=>compiler.token("'de + Unknown",'lifetime',{}),/token category/);
  assert.throws(()=>compiler.genericLifetimes([compiler.token('de','ident',{})],{}),/Lifetime leaves/);
  assert.throws(()=>compiler.byteString('\uD800',{}),/Unicode scalar/);
});

test('source context/certificates and generated attributes retain their own sealed owners',()=>{
  const context=input('#[derive(serde::Deserialize)] pub struct Payload { value:u8 }'),certificate=context.certificates[0];
  assert.throws(()=>proveSerdeDeserializeBangFootprint({context:structuredClone(context),certificate}),/sealed/);
  assert.throws(()=>proveSerdeDeserializeBangFootprint({context,certificate:structuredClone(certificate)}),/sealed/);
  const result=proveSerdeDeserializeBangFootprint({context,certificate});assert.equal(isSerdeDeserializeBangFootprint(structuredClone(result)),false);
  const shadow=input('#[derive(serde::Deserialize)] pub struct Payload { value:u8 }','use custom::inline; mod model;');
  assert.ok(shadow.certificates[0]);assert.throws(()=>proveSerdeDeserializeBangFootprint({context:shadow,certificate:shadow.certificates[0]}),/attribute.*shadowed/);
});

test('Serialize and Schemars remain residual owners rather than a blanket scope certificate',()=>{
  const result=prove('#[derive(serde::Serialize,serde::Deserialize,schemars::JsonSchema)] pub struct Payload { value:u8 }');
  assert.equal(result.selectedOwnerBangComplete,true);assert.equal(result.dimensions.bangMacroComplete,false);
  assert.deepEqual(result.residualOwners.map(owner=>owner.target.join('::')),['serde::Serialize','schemars::JsonSchema']);
});

test('complete original CatalogRecord parents/source pins retain neutral macro uncertainty',{timeout:60_000},()=>{
  const original=originalCsvContext(),paths=original.inputs.sources.map(value=>value.source).filter(path=>path.endsWith('.rs'));
  // Namespace source analysis only; never invoke the separate full semantic
  // .result translation from this authentic source-set capture.
  const graph=resolveModuleGraph({entry:'src/lib.rs',paths,readSource:original.source,compilationProfile:PRODUCTION_PROFILE});
  const context=createDeriveFootprintContext({dependencies,modules:graph.modules,compilationProfile:PRODUCTION_PROFILE});
  const certificate=context.certificates.find(value=>value.source==='src/model_catalog.rs'&&value.name==='CatalogRecord');
  assert.ok(certificate,'Complete original graph must prove the invocation; no thinned/handwritten source');
  assert.equal(certificate.sourceSha256,'2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5');
  assert.deepEqual(certificate.span,{start:1956,end:2355});assert.equal(certificate.itemSha256,'3a3ce14fae59aa072caeee14af08b6e3810b15caccb661c9165ccab3dc43132a');
  const result=proveSerdeDeserializeBangFootprint({context,certificate});assert.equal(result.selectedOwnerBangComplete,true);assert.equal(result.generatedImplBehavior,false);
  const bindings=resolveModuleBindings({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE,deriveContext:context});
  assert.equal(bindings.scopes.find(value=>value.path.length===0).unresolvedBangMacroScope,true,'Unrelated conditional/macro output remains unresolved');
});
