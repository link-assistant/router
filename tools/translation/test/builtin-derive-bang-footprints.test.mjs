import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
// Source/AST namespace cases; generated trait execution remains unimplemented.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {builtinDeriveAstSourceProfile,isBuiltinDeriveAstProfile,builtinAstOriginal,originalAstFunction,assertOriginalAstFunction} from '../builtin-derive-ast-meta.mjs';
import {planBuiltinDeriveBangOutput,isBuiltinDeriveBangPlan,proveBuiltinDeriveBangFootprint,isBuiltinDeriveBangFootprint} from '../builtin-derive-bang-footprints.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {proveSerdeSerializeBangFootprint} from '../serde-bang-footprints.mjs';
import {proveSerdeDeserializeBangFootprint} from '../serde-deserialize-bang-footprints.mjs';
import {proveSchemarsBangFootprint} from '../schemars-bang-footprints.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {originalCsvContext} from './original-csv-context.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const retain=(name,value)=>{const directory=process.env.ROUTER_BUILTIN_BANG_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeJsonGzip(directory+'/'+name+'.json.gz',value,(_,item)=>typeof item==='bigint'?{$integer:item.toString()}:item);}};
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
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

test('source-closed Clone Hash and fieldless Debug retain independent original callback recipes',()=>{
  const args=selected('#[derive(Clone,Debug,Copy,PartialEq,Eq,Hash,serde::Serialize)] pub enum Payload { A,B }');
  for(const name of ['Clone','Hash']){
    const plan=planBuiltinDeriveBangOutput({...args,invocation:{...args.invocation,path:[name]}});
    assert.equal(isBuiltinDeriveBangPlan(plan),true);assert.equal(plan.closed,false);assert.equal(plan.generatedImplBehavior,false);
    assert.ok(plan.callbackRecipes.length);assert.ok(plan.conditionalOutputs.length);
    const output=proveBuiltinDeriveBangFootprint({...args,invocation:{...args.invocation,path:[name]}});
    assert.equal(output.selectedOwnerBangComplete,true);assert.equal(output.generatedImplBehavior,false);
    assert.equal(output.dimensions.typeNamespaceComplete,false);assert.equal(output.dimensions.valueNamespaceComplete,false);
  }
  const debug=planBuiltinDeriveBangOutput({...args,invocation:{...args.invocation,path:['Debug']}});assert.ok(debug.conditionalOutputs.includes('FmtDebug None/Shallow/Full'));
  const debugOutput=proveBuiltinDeriveBangFootprint({...args,invocation:{...args.invocation,path:['Debug']}});assert.equal(debugOutput.selectedOwnerBangComplete,true);assert.equal(debugOutput.generatedImplBehavior,false);assert.equal(debugOutput.route.branches.length,2);
  const clone=planBuiltinDeriveBangOutput({...args,invocation:{...args.invocation,path:['Clone']}});assert.ok(clone.conditionalOutputs.includes('resolver.has_derive_copy chooses simple/full'));
});

test('joined per-owner namespace proofs keep invalid Copy ownership independent',()=>{
  const args=selected('#[derive(Copy,serde::Serialize)] pub struct Payload { value:u8 }');
  const context=createDeriveBangContext({deriveContext:args.context});assert.equal(context.certificates[0].dimensions.bangMacroComplete,true);
  const bindings=resolveModuleBindings({modules:args.modules,compilationProfile:PRODUCTION_PROFILE,deriveContext:args.context,deriveBangContext:context,externalModules:deriveFootprintExternalModules(args.context)});
  assert.equal(bindings.scopes.find(scope=>scope.file==='src/model.rs').unresolvedBangMacroScope,false);
  const other=selected('#[derive(Clone,Copy,serde::Serialize)] pub struct Payload { value:u8 }');
  assert.equal(createDeriveBangContext({deriveContext:other.context}).certificates[0].dimensions.bangMacroComplete,true);
  const unproved=selected('#[derive(Clone,Copy,serde::Serialize)] pub struct Payload { value:String }'),output=createDeriveBangContext({deriveContext:unproved.context});assert.equal(output.certificates[0].dimensions.bangMacroComplete,true);assert.deepEqual(output.certificates[0].residualOwners,[]);assert.equal(output.generatedImplBehavior,false);
});

test('fake builtin invocations source fragments and detached certificates cannot create closure',()=>{
  const args=selected('#[derive(Copy,serde::Serialize)] pub struct Payload;'),profile=builtinDeriveAstSourceProfile(dependencies),fragment=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/bounds.rs','expand_deriving_copy');
  assert.throws(()=>assertOriginalAstFunction(profile,structuredClone(fragment)),/Unsealed/);
  assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,certificate:structuredClone(args.certificate)}),/sealed/);
  assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,invocation:{...args.invocation,path:['Clone']}}),/exact original/);
  assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,invocation:{path:['Copy'],attributeSpan:{start:0,end:1}}}),/exact original/);
  assert.equal(isBuiltinDeriveBangFootprint(structuredClone(proveBuiltinDeriveBangFootprint(args))),false);
});

test('custom Copy stays unresolved and bounded generic Copy retains only its zero-item namespace sink',()=>{
  assert.equal(createDeriveFootprintContext(input('use custom::Copy; #[derive(Copy,serde::Serialize)] pub struct Payload;')).certificates.length,0);
  const source='#[derive(Copy,serde::Serialize)] pub struct Payload<T>{value:T}',args=selected(source),proof=proveBuiltinDeriveBangFootprint(args);
  assert.equal(args.context.certificates.length,1);assert.equal(args.certificate.genericParameters.genericTypeInstantiation,false);assert.equal(proof.selectedOwnerBangComplete,true);assert.equal(proof.slotProofs.outputKind.associatedItems,0);assert.equal(proof.slotProofs.outputKind.bodyCallbacksEvaluated,0);assert.equal(proof.generatedImplBehavior,false);
  const joined=createDeriveBangContext({deriveContext:args.context});assert.equal(joined.certificates[0].dimensions.bangMacroComplete,false);assert.ok(joined.certificates[0].residualOwners.some(owner=>owner.target?.join('::')==='serde::Serialize'));
});

let completeOriginalBuiltin;
test('complete unchanged SubscriptionProvider and CatalogRecord retain original input and individual owner proofs',{timeout:60_000},()=>{
  const original=originalCsvContext(),paths=original.inputs.sources.map(value=>value.source).filter(path=>path.endsWith('.rs'));
  const graph=resolveModuleGraph({entry:'src/lib.rs',paths,readSource:original.source,compilationProfile:PRODUCTION_PROFILE});
  const context=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
  const provider=context.certificates.find(value=>value.source==='src/subscription/types.rs'&&value.name==='SubscriptionProvider');assert.ok(provider);
  assert.equal(provider.sourceSha256,'74996ec0b4a32cb6e8d8c6a5e4cf2057a09238acff6d141ad58b592184c12c26');assert.deepEqual(provider.span,{start:105,end:639});assert.equal(provider.itemSha256,'09c856cbd3b8c3b18b2215b9759acf347aad5ecd81ba3d0ba6e1bc3c837b04dd');
  const attribute=provider.attributes.find(value=>value.derives?.some(path=>path[0]==='Copy'));
  const proof=proveBuiltinDeriveBangFootprint({context,certificate:provider,invocation:{path:['Copy'],attributeSpan:attribute.span}});assert.equal(proof.selectedOwnerBangComplete,true);
  const record=context.certificates.find(value=>value.source==='src/model_catalog.rs'&&value.name==='CatalogRecord');assert.ok(record);
  assert.equal(record.sourceSha256,'2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5');assert.deepEqual(record.span,{start:1956,end:2355});assert.equal(record.itemSha256,'3a3ce14fae59aa072caeee14af08b6e3810b15caccb661c9165ccab3dc43132a');
  const recordAttribute=record.attributes.find(value=>value.derives?.some(path=>path[0]==='Eq'));
  const eq=proveBuiltinDeriveBangFootprint({context,certificate:record,invocation:{path:['Eq'],attributeSpan:recordAttribute.span}});assert.equal(eq.selectedOwnerBangComplete,true);assert.equal(eq.route.typedSource.fields.length,8);assert.equal(eq.generatedImplBehavior,false);
  const providerEq=proveBuiltinDeriveBangFootprint({context,certificate:provider,invocation:{path:['Eq'],attributeSpan:attribute.span}});assert.equal(providerEq.route.typedSource.inputStyle,'unit-enum');assert.equal(providerEq.route.typedSource.assertionCount.maximum,0);
  completeOriginalBuiltin={context,provider,record,graph};
  retain('08-complete-original-graph-and-owner-proofs',{originalInputs:original.inputs,modules:graph.modules,context,provider,record,copy:proof,recordEq:eq,providerEq});
});
test('complete unchanged SubscriptionProvider and CatalogRecord preserve full-graph residual owners and parents',{timeout:60_000},()=>{
  assert.ok(completeOriginalBuiltin,'whole original input and owner proofs must be checked');
  const {context,provider,record,graph}=completeOriginalBuiltin;
  const outputs=createDeriveBangContext({deriveContext:context});
  const providerOutput=outputs.certificates.find(value=>value.source===provider.source&&value.span.start===provider.span.start);
  const recordOutput=outputs.certificates.find(value=>value.source===record.source&&value.span.start===record.span.start);
  const routes=new Map([['serde::Serialize',proveSerdeSerializeBangFootprint],['serde::Deserialize',proveSerdeDeserializeBangFootprint],['schemars::JsonSchema',proveSchemarsBangFootprint]]),ownerProofs=providerOutput.actualOwners.map(invocation=>{const owner=provider.owners.find(owner=>JSON.stringify(owner.path)===JSON.stringify(invocation.path)),prove=owner?routes.get(owner.target.join('::')):null;return owner?prove({context,certificate:provider}):proveBuiltinDeriveBangFootprint({context,certificate:provider,invocation});});
  const bindings=resolveModuleBindings({modules:graph.modules,deriveContext:context,deriveBangContext:outputs,externalModules:deriveFootprintExternalModules(context),compilationProfile:PRODUCTION_PROFILE}),parent=bindings.scopes.find(scope=>scope.path.length===0),providerSource=graph.modules.find(module=>module.file===provider.source).source;
  retain('09-exact-original-provider-all-owner-proofs-and-unresolved-parent',{providerSource,originalDeriveItem:providerSource.slice(provider.span.start,provider.span.end),provider,providerOutput,record,recordOutput,ownerProofs,outputs,bindings,parent});
  assert.deepEqual(providerOutput.dimensions,{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false});assert.equal(providerOutput.actualOwners.length,9);assert.equal(providerOutput.selectedOwners.length,9);assert.deepEqual(providerOutput.residualOwners,[]);assert.ok(providerOutput.selectedOwners.some(owner=>owner.target?.join('::')==='schemars::JsonSchema'));assert.equal(providerOutput.generatedImplBehavior,false);assert.equal(outputs.scopeWideCompleteness,false);assert.equal(parent.unresolvedBangMacroScope,true);
  for(const proof of ownerProofs){assert.equal(proof.selectedOwnerBangComplete,true);assert.equal(proof.generatedImplBehavior,false);}
  assert.equal(recordOutput.dimensions.bangMacroComplete,true);assert.deepEqual(recordOutput.residualOwners,[]);assert.equal(recordOutput.selectedOwners.length,6);assert.equal(recordOutput.generatedImplBehavior,false);
});

// Additional Eq source bridge cases; no generated trait execution.
test('Eq callback traces original type-only Local/Stmt/Block/Fn/Impl constructors',()=>{
  const args=selected('#[derive(Eq,serde::Serialize)] pub struct Payload { one:u8,two:u8,other:Option<&\'static str> }','Eq');
  const proof=proveBuiltinDeriveBangFootprint(args),route=proof.route;
  assert.equal(proof.selectedOwnerBangComplete,true);assert.equal(proof.generatedImplBehavior,false);
  assert.equal(route.typedSource.fields.length,3);assert.equal(route.typedSource.assertionCount.maximum,3);
  assert.equal(route.constructionFlow.statement.kind,'LocalKind::Decl');assert.equal(route.constructionFlow.statement.initializerCount,0);
  assert.equal(route.constructionFlow.block.optionalExpression,'None from original new_stmts');
  assert.equal(route.constructionFlow.associatedItem.kind,'AssocItemKind::Fn');
  assert.equal(route.constructionFlow.associatedItem.genericBounds,0);assert.equal(route.constructionFlow.associatedItem.nonselfArguments,0);
  assert.ok(route.recipes.every(value=>value.semanticSyntaxRoundTrip));assert.ok(route.positiveSchemas.every(value=>value.semanticSyntaxRoundTrip));
  assert.ok(route.typedSource.fields.every(value=>value.semanticSyntaxRoundTrip));
  assert.equal(route.positiveVariants.find(value=>value.owner==='LocalKind').arity,0);assert.equal(route.positiveVariants.find(value=>value.owner==='AssocItemKind').name,'Fn');
  assert.equal(route.typedSource.fields[0].sourceSha256,hash('u8'));
  assert.deepEqual(route.constructionFlow.constantBranches,['Const::Yes','Const::No']);
});

test('unit Eq and Clone fieldless routes close independently without trait execution',()=>{
  for(const source of ['#[derive(Eq,serde::Serialize)] pub struct Payload;','#[derive(Eq,serde::Serialize)] pub enum Payload { A,B }']){
    const args=selected(source,'Eq'),proof=proveBuiltinDeriveBangFootprint(args);assert.equal(proof.route.typedSource.assertionCount.maximum,0);
    const output=createDeriveBangContext({deriveContext:args.context});assert.equal(output.certificates[0].dimensions.bangMacroComplete,true);assert.equal(output.generatedImplBehavior,false);
  }
  const args=selected('#[derive(Clone,Eq,serde::Serialize)] pub struct Payload;','Eq');
  const output=createDeriveBangContext({deriveContext:args.context});assert.equal(output.certificates[0].dimensions.bangMacroComplete,true);assert.deepEqual(output.certificates[0].residualOwners,[]);assert.equal(output.generatedImplBehavior,false);
});

test('Eq cloned field Type macros and nested conditional fields retain output obligations',()=>{
  const observations=[];for(const [source,eqComplete] of [
    ['#[derive(Eq,serde::Serialize)] pub struct Payload { value:generated!() }',false],
    ['#[derive(Eq,serde::Serialize)] pub struct Payload { #[cfg(flag)] value:u8 }',false],
    ['#[derive(Eq,serde::Serialize)] pub enum Payload { A(u8) }',true],
  ]){
    const context=createDeriveFootprintContext(input(source)),certificate=context.certificates[0];
    let proof=null;if(certificate){const attribute=certificate.attributes.find(value=>value.derives?.some(path=>path[0]==='Eq')),args={context,certificate,invocation:{path:['Eq'],attributeSpan:attribute.span}};if(eqComplete){proof=proveBuiltinDeriveBangFootprint(args);assert.equal(proof.selectedOwnerBangComplete,true);assert.equal(proof.generatedImplBehavior,false);assert.equal(proof.route.typedSource.fields.length,1);assert.equal(proof.route.typedSource.fields[0].semanticSyntaxRoundTrip,true);}else assert.throws(()=>proveBuiltinDeriveBangFootprint(args));}
    if(eqComplete)assert.ok(proof);const output=createDeriveBangContext({deriveContext:context});assert.equal(output.certificates.some(value=>value.dimensions.bangMacroComplete),false);observations.push({source,eqComplete,context,proof,output});
  }
  retain('12-eq-owner-and-independent-output-obligations',observations);
});

test('Eq per-invocation proofs retain exact original field spans and private ownership',()=>{
  const source='#[derive(Eq,serde::Serialize)] pub struct Payload { value:String }',args=selected(source,'Eq'),proof=proveBuiltinDeriveBangFootprint(args);
  const field=proof.route.typedSource.fields[0];assert.equal(source.slice(field.span.start,field.span.end),'String');
  assert.equal(proof.dimensions.typeNamespaceComplete,false);assert.equal(proof.dimensions.valueNamespaceComplete,false);
  assert.equal(isBuiltinDeriveBangFootprint(structuredClone(proof)),false);
  assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,invocation:{...args.invocation,attributeSpan:{start:1,end:2}}}),/exact original/);
});
