import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {reviewInitialSourceGenericLayouts,reviewSourceAdmittedHostLayouts} from '../../../scripts/review-source-generic-layouts.mjs';
import {reviewGeneratedMethods} from '../../../scripts/review-translation-draft.mjs';
import {translateProject,resolveModuleGraph} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {createJsonMacroContext} from '../json-macro-context.mjs';
import {captureOriginalCargoEdition,originalCargoEditionEvidence} from '../cargo-edition-context.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {createToolAttributeContext} from '../tool-attributes.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {originalMatchesNamespaceBindings} from '../matches-macro-context.mjs';
import {lockedTomlValueNamespaceBindings} from '../toml-value-namespace.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const manifest=readFileSync(new URL('../../../Cargo.toml',import.meta.url),'utf8'),lock=readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8');
const dependencies=loadDeriveDependencyProof({manifest,lock}),jsonDependencies=loadJsonMacroSourceProof({manifest,lock});
const payload='#[derive(Default)]pub struct Payload{pub value:Option<i64>}pub fn make()->Payload{Payload::default()}';
function retain(label,value){const directory=process.env.ROUTER_REVIEW_GENERIC_LAYOUT_VECTORS;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,label+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}}
function setup(source,{files={'src/lib.rs':source},cargoManifest=null,jsonMacroDependencies=null}={}){
 const paths=Object.keys(files),graph=resolveModuleGraph({entry:'src/lib.rs',paths,readSource:name=>files[name],compilationProfile:PRODUCTION_PROFILE});
 const externalModules=registeredStandardHostBindings([...originalMatchesNamespaceBindings(),...lockedTomlValueNamespaceBindings(dependencies)]),deriveContext=createDeriveFootprintContext({modules:graph.modules,dependencies,externalModules,compilationProfile:graph.compilationProfile}),resolved=deriveFootprintExternalModules(deriveContext),toolContext=createToolAttributeContext({modules:graph.modules,externalModules:resolved,deriveContext,compilationProfile:graph.compilationProfile}),deriveBangContext=createDeriveBangContext({deriveContext}),binding=resolveModuleBindings({modules:graph.modules,externalModules:resolved,deriveContext,deriveBangContext,toolContext,compilationProfile:graph.compilationProfile});
 const expectedCargoEdition=originalCargoEditionEvidence(cargoManifest===null?null:captureOriginalCargoEdition(cargoManifest)),expectedJsonContext=jsonMacroDependencies?createJsonMacroContext({modules:graph.modules,dependencies:jsonMacroDependencies,compilationProfile:graph.compilationProfile}):null;
 const options={graph,binding,toolContext,deriveContext,deriveDependencies:dependencies,cargoManifest,expectedCargoEdition,jsonMacroDependencies,expectedJsonContext};
 return {options,files,layouts:reviewInitialSourceGenericLayouts(options)};
}
function compile(source,{files={'src/lib.rs':source},cargoManifest=null,jsonMacroDependencies=null}={}){
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:name=>files[name],compilationProfile:PRODUCTION_PROFILE,deriveDependencies:dependencies,...(cargoManifest===null?{}:{cargoManifest}),...(jsonMacroDependencies?{jsonMacroDependencies}:{})});
 const meta=JSON.parse(JSON.stringify(result.meta)),row={entry:'src/lib.rs',checkedGeneratedMethods:meta.checkedGeneratedMethods?.length??0};
 const review=(value=meta)=>reviewGeneratedMethods(value,row,{readSource:name=>files[name],dependencies,...(cargoManifest===null?{}:{cargoManifest}),...(jsonMacroDependencies?{jsonMacroDependencies}:{})});
 return {result,meta,row,review,files};
}
function generic(meta){return meta.checkedSemanticProgram.program.declarations.$map.map(([,entry])=>entry).find(entry=>entry.standardGeneric?.kind==='Option'&&entry.standardGeneric.arguments[0].rustPrimitiveName==='i64');}
function selected(layouts){return layouts.declarations.find(row=>row.surface.standardGeneric?.kind==='Option'&&row.surface.standardGeneric.arguments[0].rustPrimitiveName==='i64');}

test('review reparses first successful function generic before later Default fields without changing runtime bodies',{timeout:60000},async()=>{
 const source='pub fn first(value:Option<i64>)->Option<i64>{value}'+payload,inspection=setup(source),fixture=compile(source),selection=selected(inspection.layouts);
 assert.equal(selection.firstOwner.term,'fn');assert.equal(selection.firstOwner.name,'first');assert.deepEqual(generic(fixture.meta).span,selection.surface.span);assert.ok(selection.surface.span.start<source.indexOf('struct Payload'));
 const reviewed=fixture.review();assert.equal(reviewed.length,1);assert.equal(reviewed[0].name,'Payload.default');
 await verifyTypedTargets(fixture.result,api=>assert.deepEqual(api.make(),{$:'Payload',value:{$:'None'}}),{childTimeoutMs:20000});
 retain('first-function',{source,inspection:inspection.layouts,result:fixture.result,reviewed});
});
test('complete parsed function retains first generic ownership even when semantic checking refuses its body',()=>{
 const source='pub fn earlier(value:Option<i64>)->u32{missing()}'+payload,inspection=setup(source),fixture=compile(source);
 assert.equal(selected(inspection.layouts).firstOwner.name,'earlier');assert.ok(fixture.meta.refused.some(row=>row.term==='fn'&&row.name==='earlier'));assert.equal(fixture.meta.executable.some(row=>row.name==='earlier'),false);assert.equal(fixture.review().length,1);assert.deepEqual(generic(fixture.meta).span,selected(inspection.layouts).surface.span);
 retain('parsed-semantic-refusal',{source,inspection:inspection.layouts,result:fixture.result});
});
test('a parser that saw generics but fails its complete declaration never owns a layout',()=>{
 const source='pub fn broken(value:Option<i64>)->u32{let = 0u32;0u32}'+payload,inspection=setup(source),fixture=compile(source);
 assert.equal(inspection.layouts.parses.find(row=>row.name==='broken').status,'refused');assert.equal(selected(inspection.layouts).firstOwner.name,'Payload');assert.ok(fixture.meta.refused.some(row=>row.name==='broken'));assert.equal(fixture.review().length,1);assert.deepEqual(generic(fixture.meta).span,selected(inspection.layouts).surface.span);
 retain('failed-parser-excluded',{source,inspection:inspection.layouts,result:fixture.result});
});
test('an earlier tokenizer refusal is recorded and cannot abort review or seed later generic layouts',()=>{
 const source='pub fn broken(value:Option<i64>)->u8{b\'a\'suffix}'+payload,inspection=setup(source);
 const refusal=inspection.layouts.parses.find(row=>row.name==='broken');assert.equal(refusal.status,'refused');assert.match(refusal.diagnostic.message,/byte character literals do not accept a suffix/);assert.equal(selected(inspection.layouts).firstOwner.name,'Payload');
 let producerRefusal;try{compile(source);}catch(error){producerRefusal={name:error.name,message:error.message,stack:error.stack};}assert.ok(producerRefusal);assert.match(producerRefusal.message,/byte character literals do not accept a suffix/);
 retain('tokenizer-refusal-excluded',{source,inspection:inspection.layouts,producerRefusal,runtimeAdmissionClaim:false});
});
test('original constants and module/item traversal retain initial source origins without claiming later methods',()=>{
 const files={'src/lib.rs':'mod first;mod second;pub fn make()->second::Payload{second::Payload::default()}','src/first.rs':'pub const EMPTY:Option<i64>=None;','src/second.rs':payload.replace('pub fn make()->Payload{Payload::default()}','')},source=files['src/lib.rs'],inspection=setup(source,{files}),fixture=compile(source,{files}),selection=selected(inspection.layouts);
 assert.equal(selection.firstOwner.name,'EMPTY');assert.equal(selection.firstOwner.term,'const');assert.deepEqual(selection.sourceModuleOrigins,[{file:'src/first.rs',path:['first']},{file:'src/second.rs',path:['second']}]);assert.equal(inspection.layouts.phase,'initial-source-declaration-parse');assert.equal(inspection.layouts.methodOriginsReplayed,false);assert.deepEqual(generic(fixture.meta).span,selection.surface.span);assert.equal(fixture.review().length,1);
 retain('constant-module-order',{files,inspection:inspection.layouts,result:fixture.result});
});
test('inactive declarations do not seed generics and unknown conditional owners remain compiler refusals',()=>{
 const source='#[cfg(test)]pub fn absent(value:Option<i64>)->u32{0u32}'+payload,inspection=setup(source),fixture=compile(source);
 assert.equal(inspection.layouts.parses.some(row=>row.name==='absent'),false);assert.equal(selected(inspection.layouts).firstOwner.name,'Payload');assert.equal(fixture.review().length,1);
 const unknown='#[cfg(unix)]pub fn conditional(value:Option<i64>)->u32{0u32}'+payload,other=setup(unknown),compiled=compile(unknown);assert.equal(other.layouts.parses.find(row=>row.name==='conditional').status,'refused');assert.equal(selected(other.layouts).firstOwner.name,'Payload');assert.ok(compiled.meta.refused.some(row=>row.name==='conditional'));
 retain('configuration-selection',{source,inspection:inspection.layouts,result:fixture.result,unknown,other:other.layouts,compiled:compiled.result});
});
test('initial nominal parsing precedes a lexically earlier implementation method generic',()=>{
 const source='pub struct Early{value:u8}impl Early{pub fn before(&self,value:Option<i64>)->Option<i64>{value}}'+payload,inspection=setup(source),fixture=compile(source);
 assert.equal(selected(inspection.layouts).firstOwner.name,'Payload');assert.equal(inspection.layouts.parses.some(row=>row.name==='before'),false);assert.deepEqual(generic(fixture.meta).span,selected(inspection.layouts).surface.span);assert.equal(fixture.review().length,1);
 retain('method-phase-order',{source,inspection:inspection.layouts,result:fixture.result});
});
test('genuine original matches JSON and Cargo inputs are rejoined rather than skipping macro-containing earlier functions',()=>{
 const source='pub fn earlier(value:Option<i64>)->bool{matches!(value,Some(_))}'+payload,inspection=setup(source,{cargoManifest:manifest,jsonMacroDependencies:jsonDependencies}),fixture=compile(source,{cargoManifest:manifest,jsonMacroDependencies:jsonDependencies});
 assert.equal(inspection.layouts.parses.find(row=>row.name==='earlier').status,'parsed');assert.equal(selected(inspection.layouts).firstOwner.name,'earlier');assert.equal(fixture.review().length,1);
 const sourceContext=inspection.options.expectedJsonContext,persistedContext=fixture.meta.jsonMacroContext;assert.equal(Object.getPrototypeOf(sourceContext.originalModules[0].compilationProfile.flags),null);assert.equal(Object.getPrototypeOf(persistedContext.originalModules[0].compilationProfile.flags),Object.prototype);assert.equal(JSON.stringify(sourceContext),JSON.stringify(persistedContext));retain('complete-json-protocol-prototypes',{source,sourceContext,persistedContext,sourceProtocol:JSON.stringify(sourceContext),persistedProtocol:JSON.stringify(persistedContext),sourceFlagsPrototype:'null',persistedFlagsPrototype:'Object.prototype'});
 assert.throws(()=>reviewInitialSourceGenericLayouts({...inspection.options,cargoManifest:null}),/Cargo edition mismatch/);
 assert.throws(()=>reviewInitialSourceGenericLayouts({...inspection.options,jsonMacroDependencies:null}),/JSON macro context mismatch/);
 assert.throws(()=>reviewInitialSourceGenericLayouts({...inspection.options,jsonMacroDependencies:structuredClone(jsonDependencies)}),/JSON macro context mismatch/);
 const withoutJson=structuredClone(fixture.meta);delete withoutJson.jsonMacroContext;assert.throws(()=>fixture.review(withoutJson),/JSON macro context mismatch/);
 for(const mode of ['deleted','null']){const withoutEdition=structuredClone(fixture.meta);if(mode==='deleted')delete withoutEdition.originalCargoEditionInput;else withoutEdition.originalCargoEditionInput=null;assert.throws(()=>fixture.review(withoutEdition),/Cargo edition mismatch/);}
 assert.throws(()=>reviewGeneratedMethods(fixture.meta,fixture.row,{readSource:name=>fixture.files[name],dependencies,jsonMacroDependencies:jsonDependencies}),/Cargo edition mismatch/);
 const jsonSource='pub fn json_earlier(value:Option<i64>)->bool{let json=serde_json::json!(null);true}'+payload,jsonInspection=setup(jsonSource,{cargoManifest:manifest,jsonMacroDependencies:jsonDependencies}),jsonFixture=compile(jsonSource,{cargoManifest:manifest,jsonMacroDependencies:jsonDependencies});assert.equal(jsonInspection.layouts.parses.find(row=>row.name==='json_earlier').status,'parsed');assert.equal(selected(jsonInspection.layouts).firstOwner.name,'json_earlier');assert.equal(jsonFixture.review().length,1);retain('actual-json-initial-parse',{source:jsonSource,inspection:jsonInspection.layouts,result:jsonFixture.result});
 retain('source-context-joins',{source,inspection:inspection.layouts,result:fixture.result});
});
test('null producer edition stays null despite genuine dependency Cargo inputs and changed evidence is refused',()=>{
 const source='pub fn earlier(value:Option<i64>)->Option<i64>{value}'+payload,inspection=setup(source),fixture=compile(source);
 assert.equal(fixture.meta.originalCargoEditionInput,null);assert.equal(fixture.review().length,1);
 assert.throws(()=>reviewInitialSourceGenericLayouts({...inspection.options,cargoManifest:manifest}),/Cargo edition mismatch/);
 const changed=structuredClone(fixture.meta);changed.originalCargoEditionInput={...originalCargoEditionEvidence(captureOriginalCargoEdition(manifest)),sourceSha256:'0'.repeat(64)};assert.throws(()=>fixture.review(changed),/Cargo edition mismatch/);
 retain('edition-null-and-forgery',{source,inspection:inspection.layouts,result:fixture.result,changed});
});
test('mirrored canonical and flattened generic source spans or field layouts still fail full independent comparison',()=>{
 const source='pub fn earlier(value:Option<i64>)->Option<i64>{value}'+payload,fixture=compile(source);assert.equal(fixture.review().length,1);
 for(const mode of ['span','layout']){
  const changed=structuredClone(fixture.meta),original=generic(changed),name=original.fullName,target=changed.targetSemanticProgram.program.declarations.$map.find(([key])=>key==='rp_'+Buffer.from(name).toString('hex'))[1];
  for(const entry of [original,target])if(mode==='span'){entry.span.start++;entry.span.end++;}else entry.ctors.find(ctor=>ctor.name==='Some').fields[0].type.bits=32;
  assert.throws(()=>fixture.review(changed),/whole checked generic layout mismatch|whole checked constructor|type|fixed/i);retain('mirrored-tamper-'+mode,{source,changed});
 }
});
test('earlier original root declarations suppress same-named canonical generic registration without an overwrite',()=>{
 const source='pub struct RouterOption_3_i64{pub value:u8}'+payload,inspection=setup(source);
 assert.equal(selected(inspection.layouts),undefined);assert.ok(inspection.layouts.collisions.some(row=>row.name==='RouterOption_3_i64'&&row.existingOwner.name==='RouterOption_3_i64'&&row.attemptedOwner.name==='Payload'));
 retain('canonical-root-collision',{source,inspection:inspection.layouts});
});
test('registered external payload layouts close recursively without requiring payload Default',{timeout:60000},async()=>{
 const source='use serde_json::Value;#[derive(Default)]pub struct Payload{pub payload:Option<Value>}pub fn make()->Payload{Payload::default()}',fixture=compile(source),inspection=setup(source),support=reviewSourceAdmittedHostLayouts([...inspection.layouts.declarations,...inspection.layouts.shadowDeclarations]);
 assert.ok(support.some(row=>row.name==='serde_json.Value'));assert.ok(support.some(row=>row.name==='serde_json.Number'));const reviewed=fixture.review();assert.equal(reviewed.length,1);assert.equal(reviewed[0].name,'Payload.default');assert.equal(fixture.meta.checkedGeneratedMethods.some(row=>row.name==='Value.default'),false);
 await verifyTypedTargets(fixture.result,api=>assert.deepEqual(api.make(),{$:'Payload',payload:{$:'None'}}),{childTimeoutMs:20000});
 retain('registered-external-payload',{source,inspection:inspection.layouts,support,result:fixture.result,reviewed,externalDefaultAuthority:false});
});
test('full reachable registered external and recursive descendant layouts reject mirrored tampering',()=>{
 const source='use serde_json::Value;#[derive(Default)]pub struct Payload{pub payload:Option<Value>}pub fn make()->Payload{Payload::default()}',fixture=compile(source);assert.equal(fixture.review().length,1);
 for(const name of ['serde_json.Value','serde_json.Number','serde_json.Map_String_Value','serde_json.MapEntry']){
  const changed=structuredClone(fixture.meta),checked=changed.checkedSemanticProgram.program.declarations.$map.find(([key])=>key===name)[1],target=changed.targetSemanticProgram.program.declarations.$map.find(([key])=>key==='rp_'+Buffer.from(name).toString('hex'))[1];
  checked.ctors[0].name+='Forged';target.ctors[0].name+='Forged';assert.throws(()=>fixture.review(changed),/Container Default whole checked generic layout mismatch/);retain('external-mirrored-'+name.replaceAll('.','_'),{source,changed});
 }
});
test('genuine source module shadows remove registered payload layouts and retain original caller refusal',()=>{
 const source='mod serde_json{pub struct Value{pub count:u8}}#[derive(Default)]pub struct Payload{pub value:Option<serde_json::Value>}pub fn make()->Payload{Payload::default()}',inspection=setup(source),support=reviewSourceAdmittedHostLayouts([...inspection.layouts.declarations,...inspection.layouts.shadowDeclarations]);
 assert.equal(support.some(row=>row.name==='serde_json.Value'),false);const refusal=inspection.layouts.parses.find(row=>row.name==='Payload');assert.equal(refusal.status,'refused');assert.match(refusal.diagnostic.message,/requires actual crate type resolution/);
 let result,error;try{result=compile(source).result;}catch(thrown){error={name:thrown.name,message:thrown.message,stack:thrown.stack};assert.match(error.message,/source|scope|shadow|type|requires|unknown/i);}
 if(result){assert.equal(result.meta.checkedGeneratedMethods?.some(row=>row.name==='Payload.default')??false,false);assert.equal(result.meta.executable.some(row=>row.name==='make'),false);}
 retain('source-shadow-external-refusal',{source,inspection:inspection.layouts,support,result,error,registeredExternalAdmission:false});
});
test('actual original clamp_ttl and TtlRequest first-origin witness remains complete and source-only',()=>{
 const admin=readFileSync(new URL('../../../src/admin.rs',import.meta.url),'utf8'),api=readFileSync(new URL('../../../src/admin_api.rs',import.meta.url),'utf8');
 assert.match(admin.slice(28682,28888),/fn clamp_ttl/u);assert.match(api.slice(5576,5782),/struct TtlRequest/u);
 const witness={actual:{source:'src/admin.rs',owner:'clamp_ttl',offset:139259,span:{start:167965,end:167976},original:admin.slice(28682,28888)},oldReviewer:{source:'src/admin_api.rs',owner:'TtlRequest',offset:169786,span:{start:175554,end:175565},original:api.slice(5576,5782)},fullCrateCandidateReviewExecuted:false};
 assert.match(witness.actual.original,/Option<i64>/u);assert.match(witness.oldReviewer.original,/Option<i64>/u);retain('actual-original-witness',witness);
});
