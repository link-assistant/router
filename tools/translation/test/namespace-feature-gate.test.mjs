import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {originalCrateFeatureGateSourcePlan,requireOriginalCrateFeatureGateSourcePlan,captureOriginalCrateFeatureAbsence,originalCrateFeatureAbsenceFacts} from '../namespace-feature-gate.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
function fixture(source){const file='src/lib.rs',captured=captureSourceModuleViews({source,sourcePath:file}),modules=captured.views.map(sourceView=>({file,path:[...sourceView.modulePath],source,sourceView})),binding=resolveModuleBindings({modules});return {modules,binding};}
const capture=(source,feature='rustc_attrs')=>{const input=fixture(source),token=captureOriginalCrateFeatureAbsence({...input,feature});return {input,token,facts:originalCrateFeatureAbsenceFacts(token)};};
test('complete pinned collector ordering and post-expansion gate retain privileged spans',{timeout:60000},()=>{
 const plan=originalCrateFeatureGateSourcePlan();assert.strictEqual(requireOriginalCrateFeatureGateSourcePlan(plan),plan);assert.equal(plan.callbacks.collect.name,'features');assert.equal(plan.callbacks.create.name,'create_and_enter_global_ctxt');assert.equal(plan.callbacks.allowInternal.name,'check_allow_internal_unstable');assert.equal(plan.recipes.length,19);
 assert.ok(plan.recipes.some(row=>row.source.includes('!$span.allows_unstable($name)')));assert.deepEqual(plan.gateBranches,['feature enabled','feature absent and span allows_unstable','feature absent and span unprivileged: diagnostic']);assert.equal(plan.namespaceAuthority,false);assert.equal(plan.runtimeAuthority,false);assert.throws(()=>requireOriginalCrateFeatureGateSourcePlan(structuredClone(plan)),/copied/);
});
test('every original nested cfg_attr branch is retained without choosing its predicate',{timeout:60000},()=>{
 const value=capture('#![cfg_attr(test, cfg_attr(unix, feature(other)), no_std)]\n#![cfg_attr(not(test), doc="example")]\npub fn f(){}');assert.equal(value.facts.attributes.length,2);assert.equal(value.facts.allOriginalCfgAlternativesRetained,true);assert.equal(value.facts.originalFeatureNameAbsent,true);
 const nested=value.facts.attributes[0].alternatives;assert.deepEqual(nested.branches,['absent','all original present alternatives']);assert.equal(nested.attributes[0].attributes[0].features[0],'other');for(const name of ['featureDefaultOwnerProved','generatedSpanExceptionClosed','attributeGateClosed','namespaceAuthority','runtimeAuthority'])assert.equal(value.facts[name],false);
});
test('a requested feature in any original alternative and malformed feature syntax are refused',{timeout:60000},()=>{
 for(const source of ['#![feature(rustc_attrs)]','#![cfg_attr(test,feature(rustc_attrs))]','#![cfg_attr(any(),cfg_attr(all(),feature(rustc_attrs)))]','#![feature(r#rustc_attrs)]'])assert.throws(()=>capture(source+'\nfn f(){}'),/requested feature/);
 for(const source of ['#![feature = "rustc_attrs"]','#![feature(other())]','#![cfg_attr(test)]','#![unsafe(feature(rustc_attrs))]'])assert.throws(()=>capture(source+'\nfn f(){}'),/original|complete/);
});
test('later original child attributes cannot rewrite the earlier crate attribute input',{timeout:60000},()=>{
 const source='#![feature(other)]\nmod child{#![feature(rustc_attrs)] #[proc_macro_attribute] fn p(){} }';const value=capture(source);assert.equal(value.facts.attributes.length,1);assert.equal(value.facts.originalFeatureNameAbsent,true);assert.equal(value.facts.attributeGateClosed,false);
});
test('private resolver origins and feature tokens reject copied changed and foreign carriers',{timeout:60000},()=>{
 const {input,token}=capture('#![cfg_attr(test,no_std)]\nfn f(){}');for(const value of [structuredClone(token),{...token},new Proxy(token,{})])assert.throws(()=>originalCrateFeatureAbsenceFacts(value),/copied/);
 assert.throws(()=>captureOriginalCrateFeatureAbsence({...input,binding:structuredClone(input.binding),feature:'rustc_attrs'}),/exact original/);input.modules[0]={...input.modules[0],source:input.modules[0].source+'\n'};assert.throws(()=>originalCrateFeatureAbsenceFacts(token),/different original/);
 const other=fixture('fn f(){}');other.modules[0]={...other.modules[0],sourceView:structuredClone(other.modules[0].sourceView)};assert.throws(()=>captureOriginalCrateFeatureAbsence({...other,feature:'rustc_attrs'}),/different original/);
});
test('complete original base64 root has no original rustc_attrs alternative but retains the gate obligation',{timeout:60000},()=>{
 const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')}),packageToken=captureOriginalExternalTraitPackage(dependencies,'base64'),original=originalExternalTraitPackageInputs(packageToken),source=original.sources.find(row=>row.path===original.crateRoot),value=capture(source.source);
 assert.equal(value.facts.sourceSha256,source.sha256);assert.equal(value.facts.originalFeatureNameAbsent,true);assert.equal(value.facts.allOriginalCfgAlternativesRetained,true);assert.equal(value.facts.generatedSpanExceptionClosed,false);assert.equal(value.facts.attributeGateClosed,false);assert.equal(value.facts.namespaceAuthority,false);
});
