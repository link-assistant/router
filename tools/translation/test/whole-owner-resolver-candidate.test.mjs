import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareWholeOwnerResolverCandidate} from '../prepare-whole-owner-resolver-candidate.mjs';
import {wholeOwnerResolverInputsCallbackFree} from '../whole-owner-resolver-inputs.mjs';
import {originalAttributeOwnerBulkCryptoReady} from '../attribute-owner-bulk-crypto.mjs';
import {createWholeOwnerDeriveBangContext,isDeriveBangContext} from '../whole-owner-derive-bang-context-candidate.mjs';
import {resolveWholeOwnerModuleBindings,resolveModuleBindings,isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from '../whole-owner-resolver-candidate.mjs';
import {withWholeOriginalAttributeOwnerOperation} from '../whole-owner-serde-bang-footprints-candidate.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
function setup(source='#[derive(Clone,Debug,serde::Serialize)] pub struct Payload { value:u8 }'){
 const sources=new Map([['src/lib.rs','mod model;'],['src/model.rs',source]]),graph=resolveModuleGraph({entry:'src/lib.rs',paths:[...sources.keys()],readSource:path=>sources.get(path),compilationProfile:PRODUCTION_PROFILE}),deriveContext=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE}),input={modules:graph.modules,externalModules:deriveFootprintExternalModules(deriveContext),deriveContext,compilationProfile:PRODUCTION_PROFILE};
 return {...input,deriveBangContext:createWholeOwnerDeriveBangContext(input)};
}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}

test('native complete resolver effects and private bootstrap copies retain actual wrappers complete sources and CST inverses',{timeout:60000},()=>{
 const plan=prepareWholeOwnerResolverCandidate();assert.equal(plan.files.length,3);assert.equal(plan.originalDefaultResolverUnchanged,true);assert.equal(plan.originalLimitsChanged,false);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.performanceQualified,false);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(row.sequence.languageRules.length,1);assert.equal(row.sequence.repositoryRules.length,1);}
 const resolver=plan.files.find(row=>row.path.endsWith('whole-owner-module-bindings-candidate.mjs')),bootstrap=plan.files.find(row=>row.path.endsWith('whole-owner-original-binding-bootstrap.mjs')),effects=plan.files.find(row=>row.path.endsWith('whole-owner-derive-output-effects-candidate.mjs'));
 assert.equal(resolver.selection.originalWrapperUnchanged,true);assert.equal(resolver.selection.originalUnscopedSource,bootstrap.selection.originalUnscopedSource);assert.equal(bootstrap.selection.publicEntryNeverCalled,true);assert.match(bootstrap.after,/resolveUnscopedModuleBindings/u);assert.doesNotMatch(bootstrap.after,/function resolveModuleBindings/u);assert.equal(effects.selection.completePrivateEffectsIssuer,true);assert.equal(effects.selection.imports.length,2);
});

test('actual genuine graph and copied effects issue complete equal fresh resolver output without losing type closure',{timeout:60000},()=>{
 const input=setup(),eligible=wholeOwnerResolverInputsCallbackFree(input,isDeriveBangContext);assert.equal(eligible,originalAttributeOwnerBulkCryptoReady());
 const baseline=resolveModuleBindings(input),first=resolveWholeOwnerModuleBindings(input),second=resolveWholeOwnerModuleBindings(input);assert.deepStrictEqual(first,baseline);assert.deepStrictEqual(second,baseline);assert.notEqual(first,second);assert.equal(isResolvedSourceScopeSet(first.scopes),true);assert.equal(assertResolvedSourceScopeOrigin(first.scopes,input),first.scopes);
 const model=first.scopes.find(row=>row.file==='src/model.rs');assert.equal(model.unresolvedBangMacroScope,false);assert.equal(model.unresolvedTypeScope,false);assert.deepStrictEqual(first.diagnostics,[]);
});

test('repeated nested and source-carrier alias resolver calls retain complete output after creator closure',{timeout:60000},()=>{
 const input=setup(),eligible=originalAttributeOwnerBulkCryptoReady(),outer=withWholeOriginalAttributeOwnerOperation(input.deriveContext,()=>{const before=resolveWholeOwnerModuleBindings(input),after=resolveWholeOwnerModuleBindings(input);assert.deepStrictEqual(after,before);return after;});assert.deepStrictEqual(outer,resolveModuleBindings(input));
 assert.equal(wholeOwnerResolverInputsCallbackFree(input,isDeriveBangContext),eligible);const replacement={...input,modules:input.modules.map(module=>({...module}))};assert.equal(wholeOwnerResolverInputsCallbackFree(replacement,isDeriveBangContext),eligible);assert.deepStrictEqual(resolveWholeOwnerModuleBindings(replacement),outer);
});

test('independent cold warm and same-context engines retain every JSON and Hash callback of complete creation and resolution',{timeout:60000},()=>{
 const fixture=fileURLToPath(new URL('./fixtures/whole-owner-resolver-hook-child.mjs',import.meta.url));for(const kind of ['json-hook','hash-hook']){
  const runs=['legacy','whole'].map(mode=>spawnSync(process.execPath,[fixture,mode,kind],{encoding:'utf8',timeout:12500,maxBuffer:64*1024*1024}));for(const run of runs){assert.equal(run.error,undefined);assert.equal(run.signal,null);assert.equal(run.status,0,run.stderr);assert.equal(run.stderr,'');}
  const [baseline,candidate]=runs.map(run=>JSON.parse(run.stdout));assert.deepStrictEqual(candidate,baseline);assert.equal(baseline.kind,kind);assert.equal(baseline.engine.execPath,process.execPath);assert.equal(baseline.workloads.length,3);for(const row of baseline.workloads){assert.ok(row.tape.length>0);assert.ok(row.result.value);}
  const corrupt=structuredClone(candidate);corrupt.workloads[0].tape.find(row=>typeof row.value==='string').value+=' ';assert.throws(()=>assert.deepStrictEqual(corrupt,baseline),assert.AssertionError);
 }
});

test('source getters proxy carriers and external iterator hooks retain exact complete old callback order and output',{timeout:60000},()=>{
 const input=setup();
 for(const kind of ['source-getter','module-proxy','external-iterator']){
  function run(resolver){const tape=[],modules=input.modules.map(module=>({...module}));let externalModules=input.externalModules;
   if(kind==='source-getter'){const source=modules[1].source;Object.defineProperty(modules[1],'source',{enumerable:true,get(){tape.push({operation:'source',value:source});return source;}});}
   if(kind==='module-proxy')modules[1]=new Proxy(modules[1],{get(target,key,receiver){tape.push({operation:'get',key});return Reflect.get(target,key,receiver);}});
   if(kind==='external-iterator'){externalModules=new Map(input.externalModules);const iterator=Map.prototype[Symbol.iterator];Object.defineProperty(externalModules,Symbol.iterator,{value:function(){tape.push({operation:'external-iterator'});return Reflect.apply(iterator,this,[]);}});}
   const supplied={...input,modules,externalModules};assert.equal(wholeOwnerResolverInputsCallbackFree(supplied,isDeriveBangContext),false);assert.deepStrictEqual(tape,[],'descriptor rejection never invokes unknown getters/proxies/iterators');return {result:outcome(()=>resolver(supplied)),tape};
  }const baseline=run(resolveModuleBindings),candidate=run(resolveWholeOwnerModuleBindings);assert.deepStrictEqual(candidate,baseline);assert.ok(baseline.tape.length>0);
 }
});

test('forged source items changed source maps and foreign bang contexts preserve every actual old refusal',{timeout:60000},()=>{
 const input=setup(),cases=[{...input,deriveContext:JSON.parse(JSON.stringify(input.deriveContext))},{...input,deriveBangContext:JSON.parse(JSON.stringify(input.deriveBangContext))},{...input,modules:input.modules.map((module,index)=>index?{...module,source:module.source+' pub struct Added;'}:module)},{...input,modules:input.modules.map((module,index)=>index?{...module,items:[]}:module)}];
 for(const supplied of cases){assert.equal(wholeOwnerResolverInputsCallbackFree(supplied,isDeriveBangContext),false);const baseline=outcome(()=>resolveModuleBindings(supplied)),candidate=outcome(()=>resolveWholeOwnerModuleBindings(supplied));assert.deepStrictEqual(candidate,baseline);assert.ok(baseline.error);}
 const noContext={modules:[{file:'src/lib.rs',path:[],source:'pub fn plain() {}'}],externalModules:new Map(),compilationProfile:null};assert.deepStrictEqual(resolveWholeOwnerModuleBindings(noContext),resolveModuleBindings(noContext));
});
