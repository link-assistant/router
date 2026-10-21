import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
// Eight SOURCE-ONLY authored cases, all UNRUN. No generated trait execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction} from '../builtin-derive-ast-meta.mjs';
import {createBuiltinAstBuilderMetaCompiler,inventoryBuiltinAstCallbackCalls} from '../builtin-ast-builder-meta.mjs';
import {createBuiltinAstCallerEnvironments,assertBuiltinAstCallerEnvironments,isBuiltinAstCallerEnvironments} from '../builtin-ast-caller-environments.mjs';
import {createBuiltinDeriveAstCallbackBridge,assertBuiltinDeriveAstCallbackBridge,isBuiltinDeriveAstCallbackBridge} from '../builtin-ast-callback-bridge.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {originalCsvContext} from './original-csv-context.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
const profile=builtinDeriveAstSourceProfile(dependencies);
function selected(source,name='Clone'){
  const context=createDeriveFootprintContext({dependencies,compilationProfile:PRODUCTION_PROFILE,modules:[{file:'src/lib.rs',path:[],source:'mod data;'},{file:'src/data.rs',path:['data'],source}]}),certificate=context.certificates[0];assert.ok(certificate);
  const attribute=certificate.attributes.find(value=>value.derives?.some(path=>path.length===1&&path[0]===name));assert.ok(attribute);
  return {context,certificate,invocation:{path:[name],attributeSpan:attribute.span}};
}
function sourceFrames(path,name){const compiler=createBuiltinAstBuilderMetaCompiler(profile),fragment=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/'+path,name),inventory=inventoryBuiltinAstCallbackCalls(compiler,fragment);return {compiler,inventory,frames:createBuiltinAstCallerEnvironments(compiler,profile,inventory)};}
function findTag(node,tag,found=[]){if(!node||typeof node!=='object')return found;if(node.tag===tag)found.push(node);for(const [key,value]of Object.entries(node))if(!['syntax','recipe','originalEntry','sourceConstructor','schema','sourceBinding','environment','builderContracts','original'].includes(key))if(Array.isArray(value))value.forEach(value=>findTag(value,tag,found));else findTag(value,tag,found);return found;}

test('actual typed Clone closure receiver has a fresh identity rather than its enclosing cx',()=>{
  const {frames}=sourceFrames('clone.rs','cs_clone'),root=frames.declarations.find(value=>value.kind==='function-parameter'&&value.name==='cx'),closure=frames.declarations.find(value=>value.kind==='closure-parameter'&&value.name==='cx');
  assert.ok(root);assert.ok(closure);assert.notEqual(closure.id,root.id);assert.deepEqual(closure.receiverOwner.target,['rustc_expand','base','ExtCtxt']);
  const localCall=frames.calls.find(value=>value.call.method==='expr_call_global');assert.equal(localCall.receiverId,closure.id);
  const fieldSlots=frames.declarations.filter(value=>value.kind==='closure-parameter'&&value.name==='field');
  assert.ok(fieldSlots.length>=2,'Actual map closure field binds independently of the typed subcall closure field');
  assert.equal(new Set(fieldSlots.map(value=>value.id)).size,fieldSlots.length);
  assert.equal(frames.selectedOwnerBangComplete,false);assert.ok(frames.obligations.some(value=>value.kind==='unproved-arm-pattern'));
});

test('actual local function Debug cx does not capture outer function parameters',()=>{
  const {frames}=sourceFrames('debug.rs','show_substructure'),nested=frames.declarations.find(value=>value.kind==='nested-function-parameter'&&value.name==='cx');assert.ok(nested);
  const call=frames.calls.find(value=>value.call.method==='expr_addr_of');assert.equal(call.receiverId,nested.id);
  const environment=new Set(call.environment);assert.equal(frames.declarations.some(value=>value.kind==='function-parameter'&&environment.has(value.id)),false);
  assert.ok(call.controlPath.some(value=>value.kind==='source-nested-function'));
});

test('actual Clone builder result substitutes arguments into positive AST source constructors',()=>{
  const args=selected('#[derive(Clone,serde::Serialize)] struct Payload { value:u8 }'),bridge=createBuiltinDeriveAstCallbackBridge(args);
  assert.equal(isBuiltinDeriveAstCallbackBridge(bridge),true);assert.equal(bridge.callbacks.length,2);
  assert.ok(findTag(bridge.callbacks,'source-built-ast-enum').some(value=>value.owner==='ExprKind'&&value.variant==='Unary'));
  assert.ok(findTag(bridge.callbacks,'builder-slot-substitution').length);
  assert.ok(bridge.builderContracts.some(value=>value.recipe.source==='compiler/rustc_ast/src/ptr.rs'));
  assert.equal(bridge.selectedOwnerBangComplete,false);assert.equal(bridge.allocationPhaseBehavior,false);
});

test('each actual callback family retains conditional source paths and unsupported helpers',()=>{
  const source='#[derive(Clone,Debug,PartialEq,Eq,Hash,serde::Serialize)] struct Payload { value:u8 }';
  for(const name of ['Clone','Debug','PartialEq','Hash']){
    const bridge=createBuiltinDeriveAstCallbackBridge(selected(source,name));assert.ok(bridge.callbacks.length);assert.ok(bridge.conditionalSourcePlans.length);
    assert.equal(bridge.selectedOwnerBangComplete,false);assert.equal(bridge.generatedImplBehavior,false);assert.equal(bridge.featureCompleteness,false);
    assert.ok(bridge.callbacks.some(value=>value.unproved||value.environment?.obligations.length||value.payloads.some(value=>findTag(value,'unproved-source-call').length)));
  }
});

test('original Fn/AssocItem alias and Impl construction remains source meta with unjoined body inputs',()=>{
  const bridge=createBuiltinDeriveAstCallbackBridge(selected('#[derive(Clone,serde::Serialize)] struct Payload;'));
  assert.equal(bridge.methodBodyMeta.record.name,'Fn');assert.equal(bridge.methodBodyMeta.associatedRecord.name,'AssocItem');
  assert.equal(bridge.methodBodyMeta.associatedAlias.text,'pub type AssocItem = Item<AssocItemKind>;');
  assert.equal(bridge.implementationMeta.record.name,'Impl');assert.match(bridge.methodBodyMeta.bindingStatus,/unproved/);
  assert.ok(bridge.methodBodyMeta.record.fields.some(value=>value.name==='body'));
  assert.deepEqual(bridge.methodBodyMeta.callbackBodyInputs,bridge.callbacks.map(value=>value.callbackDigest));
});

test('private caller/bridge identities reject cloned payloads altered invocations and unrelated compilers',()=>{
  const {compiler,inventory,frames}=sourceFrames('clone.rs','cs_clone_simple');assert.equal(isBuiltinAstCallerEnvironments(structuredClone(frames)),false);
  assert.throws(()=>assertBuiltinAstCallerEnvironments(structuredClone(frames),compiler,inventory),/original private/);
  assert.throws(()=>createBuiltinAstCallerEnvironments(compiler,profile,structuredClone(inventory)),/original private/);
  const args=selected('#[derive(Clone,serde::Serialize)] struct Payload;'),bridge=createBuiltinDeriveAstCallbackBridge(args);
  assert.equal(isBuiltinDeriveAstCallbackBridge(structuredClone(bridge)),false);
  assert.throws(()=>assertBuiltinDeriveAstCallbackBridge(bridge,args.context,args.certificate,{path:['Clone'],attributeSpan:{start:0,end:1}}),/original source invocation/);
  assert.throws(()=>createBuiltinDeriveAstCallbackBridge({...args,certificate:structuredClone(args.certificate)}),/sealed/);
  const originalInvocation=structuredClone(args.invocation);args.invocation.path[0]='Debug';
  assert.throws(()=>assertBuiltinDeriveAstCallbackBridge(bridge,args.context,args.certificate,args.invocation),/original source invocation/);
  assert.equal(assertBuiltinDeriveAstCallbackBridge(bridge,args.context,args.certificate,originalInvocation),bridge);
});

test('original input bounds and unresolved field syntax cannot become namespace/runtime completeness',()=>{
  const many=Array.from({length:129},(_,i)=>'field'+i+':u8').join(','),args=selected('#[derive(Clone,serde::Serialize)] struct Payload {'+many+'}');
  assert.throws(()=>createBuiltinDeriveAstCallbackBridge(args),/field count/);
  const value=createBuiltinDeriveAstCallbackBridge(selected('#[derive(Clone,serde::Serialize)] struct Payload { value:String }'));
  assert.equal(value.originalInput.fields.length,1);assert.equal(value.selectedOwnerBangComplete,false);assert.equal(value.generatedImplBehavior,false);
  assert.ok(value.obligations.some(value=>value.includes('field expression')));
});

test('complete unchanged provider/catalog inputs retain actual fields and both resolver callback routes',{timeout:60_000},()=>{
  const original=originalCsvContext(),graph=resolveModuleGraph({entry:'src/lib.rs',paths:original.inputs.sources.map(row=>row.source),readSource:original.source,compilationProfile:PRODUCTION_PROFILE}),context=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
  for(const [source,name,sha,fields] of [
    ['src/subscription/types.rs','SubscriptionProvider','74996ec0b4a32cb6e8d8c6a5e4cf2057a09238acff6d141ad58b592184c12c26',0],
    ['src/model_catalog.rs','CatalogRecord','2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5',8],
  ]){
    const certificate=context.certificates.find(value=>value.source===source&&value.name===name);assert.ok(certificate);const attribute=certificate.attributes.find(value=>value.derives?.some(path=>path.length===1&&path[0]==='Clone'));assert.ok(attribute);
    const bridge=createBuiltinDeriveAstCallbackBridge({context,certificate,invocation:{path:['Clone'],attributeSpan:attribute.span}});
    assert.equal(bridge.sourceSha256,sha);assert.equal(bridge.originalInput.fields?.length??0,fields);assert.equal(bridge.callbacks.length,2);
    assert.equal(bridge.selectedOwnerBangComplete,false);assert.equal(bridge.featureCompleteness,false);assert.equal(bridge.generatedImplBehavior,false);
  }
});
