import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import '../project.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {relocateSourceModule} from './relocate-source-module.mjs';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts} from '../matches-macro-context.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {compilationProfile,evaluateConfiguration} from '../cfg-profile.mjs';
import {captureOriginalExternalTraitDefaultContext,requireOriginalExternalTraitDefaultContext} from '../extensions/external-trait-default-context.mjs';
import {configureOriginalExternalLibraryDomain,captureOriginalExternalLibraryContext,requireOriginalExternalLibraryContext,originalExternalTraitLibraryClosure} from '../extensions/external-library-namespace.mjs';
import {captureOriginalNamespaceAttributeInputs,originalNamespaceAttributeInputs} from '../namespace-attribute-context.mjs';
import {createDeriveFootprintContext,deriveFootprintAt} from '../derive-footprints.mjs';
import {proveBuiltinDeriveEmptyEnclosingEffect,builtinDeriveEmptyEnclosingEffectFacts} from '../derive-output-effects.mjs';

const root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},dependencies=loadDeriveDependencyProof(cargo);
const path=['base64','Engine'],request=()=>({schema:'modeled-external-ordinary-library-v1',package:'base64',injectedCfg:[]});
function retain(name,value){const directory=process.env.ROUTER_EXTERNAL_LIBRARY_NAMESPACE_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeJsonGzip(join(directory,name+'.json.gz'),value);}}
function modules(source,profile=null){const file='src/lib.rs',capture=captureSourceModuleViews({source,sourcePath:file,compilationProfile:profile});return capture.views.map(sourceView=>({file,path:[...sourceView.modulePath],source,sourceView,compilationProfile:profile,configurationCondition:sourceView.configurationCondition}));}
function frame(source='pub fn identity(v:u8)->u8{v}',profile=null){const original=modules(source,profile),context=createMatchesMacroContext({modules:original,deriveDependencies:dependencies,compilationProfile:profile}),parser=new HostRustParser(tokenizeRust(source));parser.compilationProfile=profile;configureMatchesMacroParser(parser,context,{file:'src/lib.rs'});return {source,original,context,parser,state:matchesParserFacts(parser)};}
function capture(row=frame()){configureOriginalExternalLibraryDomain(row.parser,request());const token=captureOriginalExternalLibraryContext(row.parser,path);return {row,token,value:requireOriginalExternalLibraryContext(token,dependencies,path)};}
function noAuthority(value){for(const key of ['actualCargoConformance','actualEnvironmentObserved','actualConfigurationObserved','unitRoleProved','cfgTestProved','callerOwnerResolved','namespaceAuthority','traitExecutionAuthority','copyAuthority','noDropAuthority','nativeParity'])assert.equal(value[key],false,key);}

test('explicit modeled library inputs retain all thirty-nine complete originals and native Cargo uncertainty',{timeout:60000},()=>{
 const {row,token,value}=capture();assert.equal(value.modeledInput,true);noAuthority(value);assert.equal(value.sources.length,39);assert.equal(value.sources.reduce((sum,input)=>sum+input.bytes,0),404863);assert.equal(value.crateRoot,'src/lib.rs');assert.deepEqual(value.positiveDefaults.positiveFeatures,['alloc','simd-unsafe','std']);assert.equal(value.profile.flags.test,false);assert.deepEqual(value.profile.values.feature,['alloc','simd-unsafe','std']);
 assert.ok(value.sources.some(input=>input.path==='src/engine/tests.rs'));assert.ok(value.sources.some(input=>input.path==='LICENSE-MIT'));assert.ok(value.sources.some(input=>input.path==='LICENSE-APACHE'));assert.equal(evaluateConfiguration(tokenizeRust('test').filter(token=>token.kind!=='eof'),value.profile).value,false);assert.equal(evaluateConfiguration(tokenizeRust('target_arch="x86_64"').filter(token=>token.kind!=='eof'),value.profile).value,null);retain('00-complete-modeled-library',{cargo,source:row.source,token,value});
});

test('requests cannot imply a native unit or inject caller tests and target configuration',{timeout:60000},()=>{
 const row=frame();assert.throws(()=>captureOriginalExternalLibraryContext(row.parser,path),/no explicit modeled/u);
 for(const changed of [null,{}, {...request(),injectedCfg:['test']},{...request(),package:'unknown'},{...request(),extra:false},{...request(),schema:'proved-cargo-unit'}])assert.throws(()=>configureOriginalExternalLibraryDomain(row.parser,changed),/Original external library domain/u);
 let calls=0;const getter={...request()};Object.defineProperty(getter,'package',{get(){calls++;return 'base64';},enumerable:true});assert.throws(()=>configureOriginalExternalLibraryDomain(row.parser,getter),/own-data|fields/u);assert.equal(calls,0);
 const ordinary=capture(row),tested=capture(frame(undefined,compilationProfile({flags:{test:true},values:{target_arch:['x86_64']}})));assert.equal(tested.value.profile.flags.test,false);assert.deepEqual(tested.value.profile.values.feature,ordinary.value.profile.values.feature);assert.equal(tested.value.profile.values.target_arch,undefined);retain('01-explicit-input-domain',{ordinary:ordinary.value,tested:tested.value});
});

test('private modeled contexts rejoin genuine parser dependencies and preserve the old std-only API',{timeout:60000},()=>{
 const {row,token,value}=capture(),old=captureOriginalExternalTraitDefaultContext(row.parser,path),std=requireOriginalExternalTraitDefaultContext(old,dependencies,path);assert.deepEqual(std.features,['std']);assert.equal(std.attributeOwnerResolved,false);assert.equal(std.namespaceAuthority,false);
 for(const changed of [null,{},structuredClone(token)])assert.throws(()=>requireOriginalExternalLibraryContext(changed,dependencies,path),/copied, foreign|changed/u);
 assert.throws(()=>requireOriginalExternalLibraryContext(token,structuredClone(dependencies),path),/copied, foreign|changed/u);assert.throws(()=>requireOriginalExternalLibraryContext(token,dependencies,['base64','Missing']),/copied, foreign|changed/u);
 configureOriginalExternalLibraryDomain(row.parser,request());assert.throws(()=>requireOriginalExternalLibraryContext(token,dependencies,path),/registration changed/u);assert.equal(value.actualCargoConformance,false);retain('02-private-context-controls',{old,std,value});
});

test('literal documentation inspection keeps full source and explicitly unresolved caller ownership',{timeout:60000},()=>{
 const source='\ufeff#![cfg_attr(feature="std",doc="猫😀")]\r\n#[cfg_attr(feature="other",doc="unknown")]pub fn value()->u8{1u8}\r\n',original=modules(source),context=captureOriginalNamespaceAttributeInputs({modules:original}),items=originalSourceModuleItems(original[0]),rows=items.map(item=>originalNamespaceAttributeInputs(context,original[0],item));assert.equal(rows.reduce((count,row)=>count+row.candidates.length,0),2);
 for(const row of rows){assert.equal(row.callerOwnerResolved,false);assert.equal(row.callerScopeComplete,false);assert.equal(row.namespaceAuthority,false);assert.equal(row.runtimeAuthority,false);assert.equal(row.original,source.slice(row.span.start,row.span.end));}
 assert.throws(()=>originalNamespaceAttributeInputs(structuredClone(context),original[0],items[0]),/genuine private/u);assert.throws(()=>originalNamespaceAttributeInputs(context,{...original[0]},items[0]),/differs/u);assert.throws(()=>originalNamespaceAttributeInputs(context,original[0],{...items[0],end:items[0].end-1}),/differs/u);
 const opaque='#![cfg_attr(feature="std",doc=include_str!("other"))]pub fn value()->u8{1u8}',foreign=modules(opaque),other=captureOriginalNamespaceAttributeInputs({modules:foreign});assert.throws(()=>originalNamespaceAttributeInputs(other,foreign[0],originalSourceModuleItems(foreign[0])[0]),{name:'TypeError',message:'Conditional attribute input is outside the bounded original grammar'});retain('03-complete-documentation-inputs',{source,original,rows,opaque});
});

function actualDeclarations(){const {value}=capture(),parent=value.sources.find(input=>input.path==='src/engine/mod.rs'),items=modules(parent.source).flatMap(module=>module.path.length?[]:originalSourceModuleItems(module));return {value,parent,items};}
function effect(source,name){const original=modules(source),context=createDeriveFootprintContext({modules:original,dependencies}),module=original[0],item=originalSourceModuleItems(module).find(item=>item.name===name),certificate=deriveFootprintAt(context,module,item);assert.ok(certificate,context.diagnostics?.map(row=>row.message).join('\n'));const token=proveBuiltinDeriveEmptyEnclosingEffect(context,module,item),value=builtinDeriveEmptyEnclosingEffectFacts(token,context,module,item);return {source,original,context,module,item,certificate,token,value};}

test('five actual padding enum owners independently reissue complete builtin Impl sinks',{timeout:60000},()=>{
 const {value,parent,items}=actualDeclarations(),item=items.find(item=>item.name==='DecodePaddingMode'),source=parent.source.slice(item.start,item.end),result=effect(source,'DecodePaddingMode');assert.deepEqual(result.value.alternatives.map(row=>row.invocation.path),[['Clone'],['Copy'],['Debug'],['PartialEq'],['Eq']]);assert.deepEqual(result.value.enclosingTypeBindings,[]);assert.deepEqual(result.value.enclosingUsableValueBindings,[]);assert.equal(result.value.runtimeAuthority,false);retain('04-five-original-owner-outputs',{packageInputs:value,fullParent:parent,selection:item,isolatedSource:source,result:result.value});
});

test('three actual metadata owners independently reissue complete builtin Impl sinks',{timeout:60000},()=>{
 const {value,parent,items}=actualDeclarations(),item=items.find(item=>item.name==='DecodeMetadata'),source=parent.source.slice(item.start,item.end),result=effect(source,'DecodeMetadata');assert.deepEqual(result.value.alternatives.map(row=>row.invocation.path),[['PartialEq'],['Eq'],['Debug']]);for(const row of result.value.alternatives)assert.equal(row.originalCompleteOutput.sink.kind,'ItemKind::Impl');retain('05-three-original-owner-outputs',{packageInputs:value,fullParent:parent,selection:item,isolatedSource:source,result:result.value});
});

test('builtin output effects reject copied tokens changed source and custom derive owners',{timeout:60000},()=>{
 const result=effect('#[derive(Copy)]pub struct Value;','Value');assert.throws(()=>builtinDeriveEmptyEnclosingEffectFacts(structuredClone(result.token),result.context,result.module,result.item),/copied, foreign|changed/u);assert.throws(()=>builtinDeriveEmptyEnclosingEffectFacts(result.token,result.context,{...result.module,source:result.source+' '},result.item),/copied, foreign|changed/u);assert.throws(()=>builtinDeriveEmptyEnclosingEffectFacts(result.token,result.context,result.module,{...result.item,end:result.item.end-1}),/copied, foreign|changed/u);
 for(const source of ['#[derive(Unknown)]pub struct Value;','mod core{}#[derive(Copy)]pub struct Value;','#[derive(Copy)]pub struct Value<T>(T);']){const original=modules(source),context=createDeriveFootprintContext({modules:original,dependencies}),item=originalSourceModuleItems(original[0]).find(item=>item.name==='Value');assert.throws(()=>proveBuiltinDeriveEmptyEnclosingEffect(context,original[0],item),/genuine current|Standard-only|unsealed|Unsealed/u);}retain('06-effect-controls',{source:result.source,value:result.value});
});

test('modeled inputs retain independent source ABI proofs while foreign producers keep the original refusal',{timeout:60000},async t=>{
 const {row,token,value}=capture(),closure=originalExternalTraitLibraryClosure(dependencies,path,token),proof=closure.declaration.originalProducerSourceABI;
 assert.deepEqual(proof.items.map(item=>item.name),['DecodePaddingMode','DecodeMetadata']);assert.equal(proof.standardProviderSlots.length,6);assert.equal(proof.sourceNamespaceOnly,true);assert.equal(proof.developmentEdgesExcluded,true);assert.deepEqual(proof.cfgBranches,['false','true']);
 for(const key of ['cfgTestProved','wholePackageNamespaceAuthority','wholeStandardNamespaceComplete','actualNativeCallerOwnerResolved','actualInvocationObserved','nativeSysrootConformance','nativeParity','runtimeAuthority'])assert.equal(proof[key],false,key);
 assert.equal(closure.wholeTraitAuthority,false);assert.equal(closure.runtimeParity,false);assert.deepEqual(closure.modeledLibraryInput,value);noAuthority(closure.modeledLibraryInput);assert.deepEqual(closure.declaration.supertraits.map(item=>[item.closure.name,item.closure.source]),[['Send','library/core/src/marker.rs'],['Sync','library/core/src/marker.rs']]);
 const origin=new URL('../extensions/external-trait-sources.mjs',import.meta.url),source=readFileSync(origin,'utf8'),relocation=relocateSourceModule(source,origin.href),directory=mkdtempSync(join(tmpdir(),'router-foreign-external-producer-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const target=join(directory,'external-trait-sources.mjs');writeFileSync(target,relocation.text,{flag:'wx'});assert.equal(relocation.inverse,source);const foreign=await import(pathToFileURL(target).href),defaultContext=captureOriginalExternalTraitDefaultContext(row.parser,path);
 assert.throws(()=>foreign.originalExternalTraitClosure(dependencies,path,defaultContext),/Original external trait source: original outer item has an unproved attribute producer/u);
 for(const input of [structuredClone(token),Object.freeze({...token})])assert.throws(()=>originalExternalTraitLibraryClosure(dependencies,path,input),/copied, foreign|changed/u);
 const root=value.sources.find(input=>input.path===value.crateRoot),original=modules(root.source,value.profile),inputs=captureOriginalNamespaceAttributeInputs({modules:original,compilationProfile:value.profile}),candidates=originalSourceModuleItems(original[0]).map(item=>originalNamespaceAttributeInputs(inputs,original[0],item));assert.ok(candidates.some(item=>item.candidates.length));assert.ok(candidates.every(item=>item.callerOwnerResolved===false&&item.namespaceAuthority===false));assert.equal(matchesParserFacts(row.parser),row.state);retain('07-honest-remaining-closure',{value,root,candidates,closure,relocation,remaining:'source ABI only; actual invocation, caller ownership, whole package and standard namespaces remain unproved'});
});
