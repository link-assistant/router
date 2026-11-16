import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {builtinCloneDataInputs,builtinDeriveDataInputs,builtinDebugDataInputs,builtinPayloadDataInputs} from '../builtin-derive-data-inputs.mjs';
import {prepareTupleDerive} from '../prepare-tuple-derive.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {proveBuiltinDeriveBangFootprint} from '../builtin-derive-bang-footprints.mjs';
import {validateBuiltinCloneAstOutput} from '../builtin-clone-ast-route.mjs';
import {createDeriveEnclosingNamespaceContext} from '../derive-enclosing-namespace-context.mjs';
import {resolveEnclosingNamespaceModuleBindings} from '../module-bindings.mjs';
import {translateProjectWithFlatEnclosingSemanticMeta} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url);
const manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8');
const lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest,lock});
function selected(source){
 const modules=[{file:'src/lib.rs',path:[],source}],context=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
 const certificate=context.certificates.find(row=>row.name==='Tuple');assert.ok(certificate);
 const attribute=certificate.attributes.find(row=>row.derives?.some(path=>path[0]==='Clone'));assert.ok(attribute);
 return {modules,context,certificate,invocation:{path:['Clone'],attributeSpan:attribute.span}};
}
const syntax=source=>builtinCloneDataInputs({source,span:{start:0,end:source.length}});
test('the actual producer retains complete original sources native selections CST phases and inverses',{timeout:60000},()=>{
 const plan=prepareTupleDerive();assert.equal(plan.files.length,5);assert.equal(plan.generatedCloneBehavior,false);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.stages.every(stage=>stage.completeInverse));assert.ok(row.nativeSelections.length>0);}
});
test('Clone tuple syntax retains every numbered field type visibility and whole-source interval',{timeout:60000},()=>{
 const source='#[derive(Clone)] pub struct Tuple(pub u8, pub(crate) String, Arc<dyn CookieStore>);';
 const value=syntax(source);assert.equal(value.style,'tuple-struct');assert.deepEqual(value.fields.map(field=>field.name),['0','1','2']);assert.deepEqual(value.fields.map(field=>field.typeSource),['u8','String','Arc<dyn CookieStore>']);
 for(const field of value.fields){assert.equal(source.slice(field.typeSpan.start,field.typeSpan.end),field.typeSource);assert.equal(field.nameSpan,null);assert.equal(field.unnamed,true);}
 assert.equal(value.namespaceAuthority,false);assert.equal(value.ownerAuthority,false);assert.equal(value.generatedImplBehavior,false);
 assert.equal(syntax('#[derive(Clone)] struct Tuple();').fields.length,0);
 for(const old of [builtinDeriveDataInputs,builtinDebugDataInputs,builtinPayloadDataInputs])assert.throws(()=>old({source,span:{start:0,end:source.length}}),/named struct/);
});
test('tuple field macros conditional attributes defaults const bodies and malformed tails remain refused',{timeout:60000},()=>{
 for(const source of ['struct Tuple(type!());','struct Tuple(#[cfg(feature="x")] u8);','struct Tuple(u8=7);','struct Tuple([u8;{call()}]);','struct Tuple(u8) trailing;','struct Tuple<T>(T);'])assert.throws(()=>syntax(source),TypeError);
 let reads=0;const input=Object.defineProperty({},'source',{get(){reads++;return 'struct Tuple(u8);'}});
 assert.throws(()=>builtinCloneDataInputs(input),/accessor|missing/);assert.equal(reads,0);
});
test('tuple Clone closes both original resolver outcomes and rejects modified positive output trees',{timeout:60000},()=>{
 for(const source of ['#[derive(Clone)] pub struct Tuple(u8);','#[derive(Clone)] pub struct Tuple(u8,String);','#[derive(Clone)] pub struct Tuple();']){
  const args=selected(source),proof=proveBuiltinDeriveBangFootprint(args),branches=proof.route.branches;
  assert.equal(proof.selectedOwnerBangComplete,true);assert.equal(proof.generatedImplBehavior,false);assert.equal(proof.copyAuthority,false);
  assert.equal(proof.route.typedSource.inputSyntax.style,'tuple-struct');assert.deepEqual(branches.map(branch=>branch.feature),['has_derive_copy=false','has_derive_copy=true']);
  const full=branches[0].output.items[0].body.statements[0].expr;
  assert.equal(full.constructor.variant.name,'Call');assert.deepEqual(full.slots.expr.slots.path.segments,['Tuple']);assert.equal(full.slots.args.length,proof.route.typedSource.fields.length);
  assert.equal(validateBuiltinCloneAstOutput(proof.route,branches),true);
  const changed=structuredClone(branches);changed[0].output.items[0].body.statements[0].expr.slots.args.push({kind:'unproved'});
  assert.throws(()=>validateBuiltinCloneAstOutput(proof.route,changed),/positive AST/);
 }
});
test('actual tuple Clone owner closes enclosing names without admitting trait execution or unknown sibling owners',{timeout:60000},()=>{
 const args=selected('#[derive(Clone)]pub struct Tuple(u8);pub fn empty(value:&str)->bool{value.is_empty()}');
 const deriveBangContext=createDeriveEnclosingNamespaceContext({deriveContext:args.context});
 const bindings=resolveEnclosingNamespaceModuleBindings({modules:args.modules,deriveContext:args.context,deriveBangContext,externalModules:deriveFootprintExternalModules(args.context),compilationProfile:PRODUCTION_PROFILE});
 assert.equal(bindings.scopes[0].unresolvedTypeScope,false);assert.equal(deriveBangContext.generatedImplBehavior,false);
 const unknownModules=[{file:'src/lib.rs',path:[],source:'#[derive(Clone,Unknown)]pub struct Tuple(u8);'}],unknown=createDeriveFootprintContext({modules:unknownModules,dependencies,compilationProfile:PRODUCTION_PROFILE});
 const incomplete=createDeriveEnclosingNamespaceContext({deriveContext:unknown});assert.ok(incomplete.diagnostics.length||unknown.certificates.length===0);
});
test('a complete function beside a tuple owner executes generated JavaScript and strict TypeScript',{timeout:60000},async()=>{
 const source='#[derive(Clone)]pub struct Tuple(u8);pub fn empty(value:&str)->bool{value.is_empty()}';
 const output=translateProjectWithFlatEnclosingSemanticMeta({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
 assert.ok(output.meta.executable.some(row=>row.name==='empty'));assert.equal(output.meta.runtimeParity,false);
 await verifyTypedTargets(output,api=>{assert.equal(api.empty(''),true);assert.equal(api.empty(' '),false);assert.equal(api.empty('Ω😀'),false);},{childTimeoutMs:20000});
});


import {proveBuiltinDebugEnclosingNamespace,requireBuiltinDebugEnclosingNamespace} from '../builtin-derive-bang-footprints.mjs';
function selectedDebug(source){
 const modules=[{file:'src/lib.rs',path:[],source}],context=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
 const certificate=context.certificates.find(row=>row.name==='Tuple');assert.ok(certificate);
 const attribute=certificate.attributes.find(row=>row.derives?.some(path=>path[0]==='Debug'));assert.ok(attribute);
 return {modules,context,certificate,invocation:{path:['Debug'],attributeSpan:attribute.span}};
}
test('tuple Debug closes empty small cutoff and large-field branches from the original compiler',{timeout:60000},()=>{
 for(const count of [0,1,5,6]){
  const args=selectedDebug('#[derive(Debug)]pub struct Tuple('+Array(count).fill('u8').join(',')+');');
  const proof=proveBuiltinDeriveBangFootprint(args),route=proof.route,full=route.branches.at(-1);
  assert.equal(proof.selectedOwnerBangComplete,true);assert.equal(proof.generatedImplBehavior,false);
  assert.equal(route.input.style,'tuple-struct');assert.equal(route.typedSource.fields.length,count);
  assert.equal(full.body.constructor.variant.name,'Call');
  const target=full.body.slots.expr.slots.path.segments.at(-1);
  if(!count){assert.equal(target,'write_str');assert.equal(full.statements.length,0);}
  else if(count<=5){assert.equal(target.originalFormat,'debug_tuple_field{}_finish');assert.equal(target.argument,count);assert.equal(full.body.slots.args.length,2+count);assert.equal(full.statements.length,0);}
  else{assert.equal(target,'debug_tuple_fields_finish');assert.equal(full.body.slots.args.length,3);assert.equal(full.statements.length,1);assert.equal(full.statements[0].local.pattern.ident,'values');}
  assert.ok(route.recipes.some(row=>row.source==='compiler/rustc_parse/src/parser/item.rs'));
 }
});
test('the real tuple Debug enclosing issuer joins current source and refuses forged public DATA',{timeout:60000},()=>{
 const args=selectedDebug('#[derive(Debug)]pub struct Tuple(u8,u8,u8,u8,u8,u8);');
 const token=proveBuiltinDebugEnclosingNamespace(args);assert.ok(token);
 const facts=requireBuiltinDebugEnclosingNamespace(token,args.context,args.certificate,args.invocation);
 assert.equal(facts.model.grammar.inputStyle,'tuple-struct');assert.equal(facts.model.runtimeAuthority,false);
 assert.equal(facts.model.grammar.branches.at(-1).statements,1);
 assert.throws(()=>requireBuiltinDebugEnclosingNamespace(structuredClone(token),args.context,args.certificate,args.invocation),/private|invocation/);
});
test('complete Clone and Debug tuple owners share the checked enclosing namespace beside real function behavior',{timeout:60000},async()=>{
 const source='#[derive(Clone,Debug)]pub struct Tuple(u8);pub fn empty(value:&str)->bool{value.is_empty()}';
 const output=translateProjectWithFlatEnclosingSemanticMeta({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
 assert.ok(output.meta.executable.some(row=>row.name==='empty'));assert.equal(output.meta.runtimeParity,false);
 await verifyTypedTargets(output,api=>{assert.equal(api.empty(''),true);assert.equal(api.empty('\0'),false);assert.equal(api.empty('Ω😀'),false);},{childTimeoutMs:20000});
});
