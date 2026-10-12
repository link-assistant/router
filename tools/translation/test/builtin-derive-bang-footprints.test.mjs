// Future source/AST namespace cases, all UNRUN. No generated trait execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {builtinDeriveAstSourceProfile,isBuiltinDeriveAstProfile,builtinAstOriginal,originalAstFunction,assertOriginalAstFunction} from '../builtin-derive-ast-meta.mjs';
import {planBuiltinDeriveBangOutput,isBuiltinDeriveBangPlan,proveBuiltinDeriveBangFootprint,isBuiltinDeriveBangFootprint} from '../builtin-derive-bang-footprints.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {originalCsvContext} from './original-csv-context.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
function input(source){const modules=[{file:'src/lib.rs',path:[],source:'mod model;'},{file:'src/model.rs',path:['model'],source}];return {modules,dependencies,compilationProfile:PRODUCTION_PROFILE};}
function selected(source,name='Copy'){
  const setup=input(source),context=createDeriveFootprintContext(setup),certificate=context.certificates[0];assert.ok(certificate);
  const attribute=certificate.attributes.find(attribute=>attribute.derives?.some(path=>path[0]===name));
  assert.ok(attribute);return {context,certificate,invocation:{path:[name],attributeSpan:attribute.span},...setup};
}

test('actual compiler and AST source profiles preserve original bytes/licenses and private identity',()=>{
  const profile=builtinDeriveAstSourceProfile(dependencies);assert.equal(isBuiltinDeriveAstProfile(profile),true);assert.equal(isBuiltinDeriveAstProfile(structuredClone(profile)),false);
  for(const entry of profile.sources){const origin=builtinAstOriginal(profile,entry.path);assert.equal(hash(origin.source),entry.sha256);assert.equal(Buffer.byteLength(origin.source),entry.bytes);}
  assert.ok(profile.sources.some(entry=>entry.path==='LICENSE-MIT'));assert.ok(profile.sources.some(entry=>entry.path==='LICENSE-APACHE'));
  assert.throws(()=>builtinAstOriginal(structuredClone(profile),'compiler/rustc_expand/src/build.rs'),/Unsealed/);
});

test('Copy namespace closure follows original Impl constructor and zero associated list, not absence text',()=>{
  const args=selected('#[derive(Copy,serde::Serialize)] pub struct Payload { value:u8 }'),proof=proveBuiltinDeriveBangFootprint(args);
  assert.equal(isBuiltinDeriveBangFootprint(proof),true);assert.equal(proof.selectedOwnerBangComplete,true);
  assert.equal(proof.slotProofs.outputKind.kind,'ItemKind::Impl');assert.equal(proof.slotProofs.outputKind.associatedItems,0);assert.equal(proof.slotProofs.outputKind.bodyCallbacksEvaluated,0);
  assert.equal(proof.slotProofs.methods.length,0);assert.equal(proof.slotProofs.associatedTypes.length,0);
  assert.deepEqual(proof.slotProofs.constness.outcomes,['Const::Yes','Const::No']);
  assert.equal(proof.generatedImplBehavior,false);assert.equal(proof.dimensions.typeNamespaceComplete,false);
  assert.ok(proof.recipes.every(recipe=>recipe.semanticSyntaxRoundTrip));
});

test('actual original struct/enum routes share the verified Copy sink without trait validity guesses',()=>{
  for(const source of [
    '#[derive(Copy,serde::Serialize)] pub enum Payload { A,B }',
    '#[derive(Copy,serde::Serialize)] pub struct Payload(u64);',
    '#[derive(Copy,serde::Serialize)] pub struct Payload { text:String }',
  ]){const proof=proveBuiltinDeriveBangFootprint(selected(source));assert.equal(proof.selectedOwnerBangComplete,true);assert.equal(proof.generatedImplBehavior,false,'Even invalid Copy implementations do not become callable/ownership certificates');}
});

test('callback routes preserve all original source recipes and conditional options but stay unclosed',()=>{
  const args=selected('#[derive(Clone,Debug,Copy,PartialEq,Eq,Hash,serde::Serialize)] pub enum Payload { A,B }');
  for(const name of ['Clone','Debug','PartialEq','Eq','Hash']){
    const plan=planBuiltinDeriveBangOutput({...args,invocation:{...args.invocation,path:[name]}});
    assert.equal(isBuiltinDeriveBangPlan(plan),true);assert.equal(plan.closed,false);assert.equal(plan.generatedImplBehavior,false);
    assert.ok(plan.callbackRecipes.length);assert.ok(plan.conditionalOutputs.length);
    assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,invocation:{...args.invocation,path:[name]}}),/callback\/conditional AST output obligations/);
  }
  const debug=planBuiltinDeriveBangOutput({...args,invocation:{...args.invocation,path:['Debug']}});assert.ok(debug.conditionalOutputs.includes('FmtDebug None/Shallow/Full'));
  const clone=planBuiltinDeriveBangOutput({...args,invocation:{...args.invocation,path:['Clone']}});assert.ok(clone.conditionalOutputs.includes('resolver.has_derive_copy chooses simple/full'));
});

test('joined per-owner context admits only Copy plus independently closed Serde output',()=>{
  const args=selected('#[derive(Copy,serde::Serialize)] pub struct Payload { value:u8 }');
  const context=createDeriveBangContext({deriveContext:args.context});assert.equal(context.certificates[0].dimensions.bangMacroComplete,true);
  const bindings=resolveModuleBindings({modules:args.modules,compilationProfile:PRODUCTION_PROFILE,deriveContext:args.context,deriveBangContext:context,externalModules:deriveFootprintExternalModules(args.context)});
  assert.equal(bindings.scopes.find(scope=>scope.file==='src/model.rs').unresolvedBangMacroScope,false);
  const other=selected('#[derive(Clone,Copy,serde::Serialize)] pub struct Payload { value:u8 }');
  assert.equal(createDeriveBangContext({deriveContext:other.context}).certificates[0].dimensions.bangMacroComplete,false);
});

test('fake builtin invocations source fragments and detached certificates cannot create closure',()=>{
  const args=selected('#[derive(Copy,serde::Serialize)] pub struct Payload;'),profile=builtinDeriveAstSourceProfile(dependencies),fragment=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/bounds.rs','expand_deriving_copy');
  assert.throws(()=>assertOriginalAstFunction(profile,structuredClone(fragment)),/Unsealed/);
  assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,certificate:structuredClone(args.certificate)}),/sealed/);
  assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,invocation:{...args.invocation,path:['Clone']}}),/exact original/);
  assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,invocation:{path:['Copy'],attributeSpan:{start:0,end:1}}}),/exact original/);
  assert.equal(isBuiltinDeriveBangFootprint(structuredClone(proveBuiltinDeriveBangFootprint(args))),false);
});

test('custom imported Copy derives and generic headers never use builtin recipes',()=>{
  for(const source of ['use custom::Copy; #[derive(Copy,serde::Serialize)] pub struct Payload;','#[derive(Copy,serde::Serialize)] pub struct Payload<T>{value:T}'])assert.equal(createDeriveFootprintContext(input(source)).certificates.length,0);
});

test('complete unchanged SubscriptionProvider and CatalogRecord preserve residual owners and parents',()=>{
  const original=originalCsvContext(),paths=original.inputs.sources.map(value=>value.source).filter(path=>path.endsWith('.rs'));
  const graph=resolveModuleGraph({entry:'src/lib.rs',paths,readSource:original.source,compilationProfile:PRODUCTION_PROFILE});
  const context=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
  const provider=context.certificates.find(value=>value.source==='src/subscription/types.rs'&&value.name==='SubscriptionProvider');assert.ok(provider);
  assert.equal(provider.sourceSha256,'74996ec0b4a32cb6e8d8c6a5e4cf2057a09238acff6d141ad58b592184c12c26');assert.deepEqual(provider.span,{start:105,end:639});assert.equal(provider.itemSha256,'09c856cbd3b8c3b18b2215b9759acf347aad5ecd81ba3d0ba6e1bc3c837b04dd');
  const attribute=provider.attributes.find(value=>value.derives?.some(path=>path[0]==='Copy'));
  const proof=proveBuiltinDeriveBangFootprint({context,certificate:provider,invocation:{path:['Copy'],attributeSpan:attribute.span}});assert.equal(proof.selectedOwnerBangComplete,true);
  const record=context.certificates.find(value=>value.source==='src/model_catalog.rs'&&value.name==='CatalogRecord');assert.ok(record);
  assert.equal(record.sourceSha256,'2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5');assert.deepEqual(record.span,{start:1956,end:2355});assert.equal(record.itemSha256,'3a3ce14fae59aa072caeee14af08b6e3810b15caccb661c9165ccab3dc43132a');
  const outputs=createDeriveBangContext({deriveContext:context});
  const providerOutput=outputs.certificates.find(value=>value.source===provider.source&&value.span.start===provider.span.start);assert.equal(providerOutput.dimensions.bangMacroComplete,false);assert.ok(providerOutput.residualOwners.some(owner=>owner.target?.[0]==='schemars'));
  assert.equal(outputs.certificates.find(value=>value.source===record.source&&value.span.start===record.span.start).dimensions.bangMacroComplete,false);
});
