// Authored future namespace-consumer cases. All UNRUN; no runtime trait claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules,deriveFootprintSourceContext,deriveFootprintOriginalModule} from '../derive-footprints.mjs';
import {createDeriveBangContext,isDeriveBangContext,deriveBangModules,deriveBangOutputAt} from '../derive-bang-context.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {parserSourceScope} from '../source-scopes.mjs';
import {compilationProfile,PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {originalCsvContext} from './original-csv-context.mjs';
const root=new URL('../../../',import.meta.url);
const dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
function setup(source,rootSource='mod model;',profile=PRODUCTION_PROFILE){
  const modules=[{file:'src/lib.rs',path:[],source:rootSource},{file:'src/model.rs',path:['model'],source}];
  const deriveContext=createDeriveFootprintContext({modules,dependencies,compilationProfile:profile});
  const externalModules=deriveFootprintExternalModules(deriveContext);
  return {modules,deriveContext,externalModules,compilationProfile:profile};
}
function resolve(input,deriveBangContext=createDeriveBangContext(input)){
  return resolveModuleBindings({...input,deriveBangContext});
}
const model=bindings=>bindings.scopes.find(scope=>scope.file==='src/model.rs');

test('joined original Serialize and Deserialize outputs narrow only their invocation bang dimension',()=>{
  const input=setup('#[derive(serde::Serialize,serde::Deserialize)] pub struct Payload { value:u8 } pub fn label(v:&str)->String{format!("{v}")}');
  const before=resolveModuleBindings(input),context=createDeriveBangContext(input),after=resolve(input,context);
  assert.equal(model(before).unresolvedBangMacroScope,true);assert.equal(model(after).unresolvedBangMacroScope,false);
  assert.equal(context.scopeWideCompleteness,false);assert.equal(context.generatedImplBehavior,false);
  assert.deepEqual(context.certificates[0].selectedOwners.map(owner=>owner.target),[['serde','Serialize'],['serde','Deserialize']]);
  const deserialize=context.certificates[0].selectedOwners.find(owner=>owner.target.at(-1)==='Deserialize');
  assert.deepEqual(deserialize.featureOutputDigests.map(value=>value.feature),['disabled','enabled']);
  assert.equal(context.certificates[0].dimensions.typeNamespaceComplete,false);
  assert.equal(parserSourceScope(model(after),after.scopes).unresolvedBangMacroScope,false);
});

test('an exact registered nested helper span closes; independent sibling and source macro bindings remain',()=>{
  const input=setup('#[derive(serde::Serialize)] pub struct Payload { #[serde(rename="#[macro_export]")] value:u8 }');
  const context=createDeriveBangContext(input),after=resolve(input,context);
  assert.equal(context.certificates[0].dimensions.bangMacroComplete,true);assert.equal(model(after).unresolvedBangMacroScope,false);
  const unknown=setup(input.modules[1].source+' #[unknown] pub struct Other;');
  assert.equal(model(resolve(unknown)).unresolvedBangMacroScope,true,'Unrelated expansions remain explicit');
  const shadow=setup(input.modules[1].source+' macro_rules! format { () => { 9u8 }; }');
  const binding=resolve(shadow),scope=parserSourceScope(model(binding),binding.scopes);
  assert.equal(scope.shadowedBuiltinMacros.has('format'),true,'Closing derive output cannot acquire a custom macro owner');
});

test('Schemars, omitted builtin derives, generic/custom helper outputs remain residual',()=>{
  for(const source of [
    '#[derive(serde::Serialize,schemars::JsonSchema)] pub struct Payload { value:u8 }',
    '#[derive(Clone,Debug,serde::Serialize)] pub struct Payload { value:u8 }',
    '#[derive(serde::Deserialize)] #[serde(default)] pub struct Payload { value:u8 }',
  ]){const input=setup(source),context=createDeriveBangContext(input);assert.equal(context.certificates[0].dimensions.bangMacroComplete,false);assert.ok(context.certificates[0].residualOwners.length);assert.equal(model(resolve(input,context)).unresolvedBangMacroScope,true);}
  const generic=setup('#[derive(serde::Serialize)] pub struct Payload<T>{value:T}');
  assert.equal(createDeriveBangContext(generic).certificates.length,0);assert.equal(model(resolve(generic)).unresolvedBangMacroScope,true);
});

test('original and generated attribute names require actual ancestor closure',()=>{
  for(const name of ['serde','automatically_derived','inline']){
    const input=setup('#[derive(serde::Serialize,serde::Deserialize)] pub struct Payload { '+(name==='serde'?'#[serde(rename="value")] ':'')+'value:u8 }','use custom::'+name+'; mod model;');
    const context=createDeriveBangContext(input);assert.equal(context.certificates[0].dimensions.bangMacroComplete,false);
    assert.ok(context.certificates[0].residualOwners.some(owner=>owner.reason.includes('attribute')));
    assert.equal(parserSourceScope(model(resolve(input,context)),resolve(input,context).scopes).unresolvedBangMacroScope,true);
  }
  const unused=setup('#[derive(serde::Serialize,serde::Deserialize)] pub struct Payload { value:u8 }','use custom::serde;mod model;');
  assert.equal(createDeriveBangContext(unused).certificates[0].dimensions.bangMacroComplete,true,'An unused name adds no original/generated attribute obligation');
  // Imported same-name attribute uncertainty is conservatively retained; this
  // test does not claim precedence over a registered inert derive helper.
});

test('cloned contexts and source/profile/external/module mutations cannot consume closure',()=>{
  const input=setup('#[derive(serde::Serialize)] pub struct Payload;'),context=createDeriveBangContext(input);
  assert.equal(isDeriveBangContext(context),true);assert.equal(isDeriveBangContext(structuredClone(context)),false);
  assert.throws(()=>resolve(input,structuredClone(context)),/Unsealed/);
  assert.throws(()=>resolve({...input,modules:input.modules.slice(1)},context),/module set is incomplete/);
  assert.throws(()=>resolve({...input,modules:input.modules.map(module=>({...module,source:module.source+' '}))},context),/module.*changed/);
  assert.throws(()=>resolve({...input,modules:input.modules.map(module=>({...module,path:[...module.path,'elsewhere']}))},context),/module.*changed/);
  assert.throws(()=>resolve({...input,compilationProfile:compilationProfile({flags:{test:false,unix:true}})},context),/profile.*changed/);
  const external=new Map(input.externalModules);external.set('custom',{complete:true,bindings:[]});
  assert.throws(()=>resolve({...input,externalModules:external},context),/external namespaces changed/);
  const other=setup(input.modules[1].source);assert.throws(()=>resolve({...input,deriveContext:other.deriveContext},context),/original complete source/);
});

test('supplied parsed item subsets cannot erase original sibling declarations',()=>{
  const input=setup('#[derive(serde::Serialize)] pub struct Payload; mod absent;'),context=createDeriveBangContext(input);
  const before=resolve(input,context);assert.equal(model(before).unresolvedBangMacroScope,true);
  assert.throws(()=>resolve({...input,modules:input.modules.map(module=>({...module,items:[],allItems:[]}))},context),/item carrier changed/);
  assert.ok(before.diagnostics.some(diagnostic=>diagnostic.message.includes('module target has no unconditional tracked body')));
});

test('neutral and explicit family contexts never borrow each other or erase unknown conditions',()=>{
  const source='#[derive(serde::Serialize)] pub struct Payload;',rootSource='mod model; #[cfg(unix)] mod unix_side;';
  const neutral=setup(source,rootSource),context=createDeriveBangContext(neutral);
  assert.equal(parserSourceScope(model(resolve(neutral,context)),resolve(neutral,context).scopes).unresolvedBangMacroScope,true);
  const windows=setup(source,rootSource,compilationProfile({flags:{test:false,unix:false,windows:true}}));
  assert.throws(()=>resolve(windows,context),/original complete source/);
  assert.equal(parserSourceScope(model(resolve(windows)),resolve(windows).scopes).unresolvedBangMacroScope,false);
});

test('complete unchanged original library keeps omitted standard owners and unrelated root gaps',{timeout:60_000},()=>{
  const original=originalCsvContext(),paths=original.inputs.sources.map(value=>value.source).filter(path=>path.endsWith('.rs'));
  const graph=resolveModuleGraph({entry:'src/lib.rs',paths,readSource:original.source,compilationProfile:PRODUCTION_PROFILE});
  const deriveContext=createDeriveFootprintContext({dependencies,modules:graph.modules,compilationProfile:PRODUCTION_PROFILE});
  const input={modules:graph.modules,deriveContext,externalModules:deriveFootprintExternalModules(deriveContext),compilationProfile:PRODUCTION_PROFILE};
  const context=createDeriveBangContext(input),record=context.certificates.find(value=>value.source==='src/model_catalog.rs'&&value.span.start===1956);
  assert.ok(record);assert.equal(record.sourceSha256,'2972dab979148c9b1deb3ec2cfb4e2800e8445585044d93c629e83538be01ed5');
  assert.deepEqual(record.span,{start:1956,end:2355});assert.equal(record.itemSha256,'3a3ce14fae59aa072caeee14af08b6e3810b15caccb661c9165ccab3dc43132a');
  assert.equal(record.dimensions.bangMacroComplete,false);assert.ok(record.residualOwners.some(owner=>owner.path[0]==='Debug'));
  const bindings=resolve(input,context);assert.equal(bindings.scopes.find(scope=>scope.path.length===0).unresolvedBangMacroScope,true);
  assert.equal(deriveFootprintSourceContext(deriveContext).modules.length,graph.modules.length);
});


// Source-only composition cases. Genuine graph views, not re-sealed copies.
test('same-file sibling derive output routes retain private original views and scoped items',()=>{
  const source='pub mod first{#[derive(Copy,Eq,serde::Serialize)]pub struct Payload{value:u8}}pub mod second{#[derive(serde::Serialize,serde::Deserialize)]pub struct Payload{value:String}}';
  const graph=resolveModuleGraph({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
  const deriveContext=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE}),externalModules=deriveFootprintExternalModules(deriveContext),input={modules:graph.modules,deriveContext,externalModules,compilationProfile:PRODUCTION_PROFILE};
  const context=createDeriveBangContext(input);assert.equal(context.certificates.length,2);assert.ok(context.certificates.every(value=>value.dimensions.bangMacroComplete));
  const snapshots=deriveBangModules(context,input);assert.equal(snapshots.length,3);
  const aliases={...input,modules:input.modules.map(module=>({...module}))};assert.equal(deriveBangModules(context,aliases),snapshots,'A plain carrier aliases the SAME genuine view; it does not mint source authority');
  for(const module of graph.modules){const actual=snapshots.find(value=>value.path.join('.')===module.path.join('.'));assert.equal(actual.sourceView,module.sourceView);assert.equal(actual.source,source);assert.deepEqual(actual.items.map(value=>[value.start,value.end,value.name]),module.items.map(value=>[value.start,value.end,value.name]));}
  for(const certificate of deriveContext.certificates){const module=graph.modules.find(value=>value.path.join('.')===certificate.module.join('.')),item=module.items.find(value=>value.start===certificate.span.start);assert.equal(deriveFootprintOriginalModule(deriveContext,certificate).sourceView,module.sourceView);assert.ok(deriveBangOutputAt(context,deriveContext,module,item));const sibling=graph.modules.find(value=>value.path.length&&value!==module);assert.equal(deriveBangOutputAt(context,deriveContext,sibling,item),null);}
  assert.equal(resolve(input,context).scopes.find(value=>value.path.join('.')==='first').unresolvedBangMacroScope,false);
  assert.equal(resolve(input,context).scopes.find(value=>value.path.join('.')==='second').unresolvedBangMacroScope,false);
});

test('bang consumer rejects replaced views/keys/source/profile and cannot omit scoped unknown siblings',()=>{
  const source='pub mod first{#[derive(Copy,Eq,serde::Serialize)]pub struct Payload{value:u8}mod absent;}pub mod second{pub struct Other;}';
  const graph=resolveModuleGraph({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE}),deriveContext=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
  const input={modules:graph.modules,deriveContext,externalModules:deriveFootprintExternalModules(deriveContext),compilationProfile:PRODUCTION_PROFILE},context=createDeriveBangContext(input),first=graph.modules.find(value=>value.path.join('.')==='first'),other=graph.modules.find(value=>value.path.join('.')==='second');
  for(const change of [{sourceView:structuredClone(first.sourceView)},{sourceView:other.sourceView},{moduleScopeKey:'forged'},{items:first.items.map(item=>({...item,name:'Changed'}))},{source:source+' '},{compilationProfile:{flags:{test:true}}}])assert.throws(()=>deriveBangModules(context,{...input,modules:input.modules.map(module=>module===first?{...module,...change}:module)}),/changed|profile|view/);
  const withoutView={...first};delete withoutView.sourceView;assert.throws(()=>deriveBangModules(context,{...input,modules:input.modules.map(module=>module===first?withoutView:module)}),/changed/);
  const suppliedEmpty={...input,modules:input.modules.map(module=>({...module,items:[],allItems:[]}))};
  assert.throws(()=>resolve(suppliedEmpty,context),/item carrier changed/);
  const result=resolve(input,context);assert.equal(result.scopes.find(value=>value.path.join('.')==='first').unresolvedBangMacroScope,true);assert.ok(result.diagnostics.some(value=>value.message.includes('module target has no unconditional tracked body')));
  const original=deriveFootprintSourceContext(deriveContext);assert.equal(original.modules.find(value=>value.path.join('.')==='first').sourceView,first.sourceView);
  assert.throws(()=>deriveFootprintOriginalModule(deriveContext,structuredClone(deriveContext.certificates[0])),/sealed/);
});
