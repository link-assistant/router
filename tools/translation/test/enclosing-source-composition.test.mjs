import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {createDeriveFootprintContext,deriveFootprintSourceContext} from '../derive-footprints.mjs';
import {createDeriveEnclosingNamespaceContext} from '../derive-enclosing-namespace-context.mjs';
import {createDefaultEnclosingSourceContext,defaultSourceContextFacts} from '../default-trait-source.mjs';
import {createCloneEnclosingSourceContext,cloneSourceContextFacts} from '../clone-trait-source.mjs';
import {resolveDerivedEnclosingSourceBindings} from '../derived-source-bindings.mjs';
import {resolveModuleBindings,isResolvedSourceScopeSet} from '../module-bindings.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProjectOwnedDefinitions} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest,lock}),limits={timeout:60000};
const source='#[derive(Default,Clone,Debug)]pub struct Record{value:u8}pub fn make()->Record{Record::default().clone()}';
function setup(text=source){
 const captured=captureSourceModuleViews({source:text,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE});
 const modules=captured.views.map(sourceView=>({file:'src/lib.rs',path:sourceView.modulePath,source:text,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition}));
 const deriveContext=createDeriveFootprintContext({modules,dependencies,externalModules:registeredStandardHostBindings(),compilationProfile:PRODUCTION_PROFILE});
 const original=deriveFootprintSourceContext(deriveContext),deriveBangContext=createDeriveEnclosingNamespaceContext({deriveContext});
 return {deriveContext,deriveBangContext,input:{modules:original.modules,externalModules:original.externalModules,deriveContext,compilationProfile:original.compilationProfile}};
}
function sameBindings(actual,expected){assert.deepEqual(actual,expected);assert.ok(isResolvedSourceScopeSet(actual.scopes));}

test('explicit genuine enclosing composition preserves complete independent Default and Clone contexts',limits,()=>{
 const row=setup(),beforeDefault=createDefaultEnclosingSourceContext(row.deriveContext),beforeClone=createCloneEnclosingSourceContext(row.deriveContext);
 const currentDefault=createDefaultEnclosingSourceContext(row.deriveContext,{deriveBangContext:row.deriveBangContext});
 const currentClone=createCloneEnclosingSourceContext(row.deriveContext,{deriveBangContext:row.deriveBangContext,defaultContext:currentDefault});
 assert.deepEqual(currentDefault,beforeDefault);assert.deepEqual(currentClone,beforeClone);
 sameBindings(defaultSourceContextFacts(currentDefault).binding,defaultSourceContextFacts(beforeDefault).binding);
 sameBindings(cloneSourceContextFacts(currentClone).binding,cloneSourceContextFacts(beforeClone).binding);
 assert.strictEqual(cloneSourceContextFacts(currentClone).defaultContext,currentDefault);
 sameBindings(resolveDerivedEnclosingSourceBindings({...row.input,deriveBangContext:row.deriveBangContext}),resolveDerivedEnclosingSourceBindings(row.input));
});
test('copied and unrelated enclosing contexts cannot issue original binding facts',limits,()=>{
 const row=setup(),other=setup(source.replaceAll('Record','Different'));
 for(const deriveBangContext of [structuredClone(row.deriveBangContext),other.deriveBangContext]){
  assert.throws(()=>resolveDerivedEnclosingSourceBindings({...row.input,deriveBangContext}),/context|source|original|composition|sealed/i);
  assert.throws(()=>createDefaultEnclosingSourceContext(row.deriveContext,{deriveBangContext}),/context|source|original|composition|sealed/i);
 }
});
test('copied or foreign Default contexts cannot be composed into a genuine Clone context',limits,()=>{
 const row=setup(),other=setup(source.replaceAll('Record','Different'));
 const currentDefault=createDefaultEnclosingSourceContext(row.deriveContext,{deriveBangContext:row.deriveBangContext});
 const foreign=createDefaultEnclosingSourceContext(other.deriveContext,{deriveBangContext:other.deriveBangContext});
 for(const defaultContext of [structuredClone(currentDefault),foreign])assert.throws(()=>createCloneEnclosingSourceContext(row.deriveContext,{deriveBangContext:row.deriveBangContext,defaultContext}),/context|unsealed|different/i);
});
test('full enrichment equality still precedes enclosing composition and preserves old refusals',limits,()=>{
 const row=setup('use extra::Thing;'+source),externalModules=new Map(row.input.externalModules);
 externalModules.set('extra',{kind:'mod',complete:false,bindings:[{name:'Thing',namespace:'type',kind:'struct',target:['extra','Thing']}]});
 const input={...row.input,externalModules},expected=resolveModuleBindings(input);
 const actual=resolveDerivedEnclosingSourceBindings({...input,deriveBangContext:row.deriveBangContext});
 sameBindings(actual,expected);assert.ok(actual.scopes.some(scope=>scope.unresolvedTypeScope));
});
test('unknown sibling owners and source/profile mutations retain original refusals',limits,()=>{
 const row=setup(source.replace('Default,Clone,Debug','Default,Clone,Debug,Unknown'));
 const expected=resolveDerivedEnclosingSourceBindings(row.input),actual=resolveDerivedEnclosingSourceBindings({...row.input,deriveBangContext:row.deriveBangContext});
 sameBindings(actual,expected);assert.ok(actual.scopes.some(scope=>scope.unresolvedTypeScope));
 assert.throws(()=>resolveDerivedEnclosingSourceBindings({...row.input,deriveBangContext:row.deriveBangContext,modules:row.input.modules.map(module=>({...module,source:module.source+' '}))}),/source|original|changed|different/i);
 assert.throws(()=>resolveDerivedEnclosingSourceBindings({...row.input,deriveBangContext:row.deriveBangContext,compilationProfile:{flags:{test:true}}}),/profile|agree/i);
});
test('the complete owned project still checks both generated methods and independently executes strict targets',limits,async()=>{
 const events=[],result=translateProjectOwnedDefinitions({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE,progress:event=>events.push(event)});
 assert.deepEqual(result.meta.refused,[]);assert.deepEqual(result.meta.checkedGeneratedMethods.map(row=>row.generator),['core::default::Default','core::clone::Clone']);
 assert.equal(events.filter(event=>event.stage==='namespace'&&event.phase==='derive-namespace-context').length,1);
 const serialization=events.filter(event=>event.stage==='project-serialize');assert.equal(serialization[0].state,'start');assert.equal(serialization.at(-1).state,'end');assert.equal(serialization.filter(event=>event.phase==='owned-definitions-complete').length,1);
 await verifyTypedTargets(result,api=>{const first=api.make(),second=api.make();assert.deepEqual(first,{$:'Record',value:0n});assert.deepEqual(second,first);assert.notStrictEqual(first,second);},{childTimeoutMs:20000});
});
