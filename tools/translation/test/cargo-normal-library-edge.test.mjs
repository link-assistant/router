import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureOriginalExternalTraitPackage} from '../extensions/external-trait-sources.mjs';
import {originalCargoNormalLibraryEdgeSourcePlan,requireOriginalCargoNormalLibraryEdgeSourcePlan,captureOriginalNormalLibraryDependencyEdge,originalNormalLibraryDependencyEdgeFacts} from '../cargo-normal-library-edge.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
const root=new URL('../../../',import.meta.url),inputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const dependencies=loadDeriveDependencyProof(inputs),packageToken=captureOriginalExternalTraitPackage(dependencies,'base64');
test('complete Cargo callbacks prove the dependency-library range for every parent and host branch',{timeout:60000},()=>{
 const plan=originalCargoNormalLibraryEdgeSourcePlan();assert.strictEqual(requireOriginalCargoNormalLibraryEdgeSourcePlan(plan),plan);assert.equal(plan.rules.length,17);assert.equal(Object.keys(plan.callbacks).length,14);
 assert.deepEqual(plan.cases.map(row=>row.mode),[{kind:'Check',test:false},{kind:'Build'},{kind:'Build'},{kind:'Build'}]);assert.deepEqual(plan.postcondition,{selectedTargetKind:'Lib',isTest:false,isExample:false,isAnyTest:false,developmentEdgesExcluded:true});
 assert.ok(plan.rules.some(row=>row.callback.name==='compute_deps'&&row.conclusion.includes('dual-proc-macro')));assert.ok(plan.rules.some(row=>row.callback.name==='intern_inner'&&row.completeBodyChecked));assert.equal(plan.cfgTestSelected,false);assert.equal(plan.rawManifestNormalizationClaimed,false);assert.equal(plan.namespaceAuthority,false);
});
test('genuine original normal-library namespace excludes six dev edges and retains both cfg test branches',{timeout:60000},()=>{
 const token=captureOriginalNormalLibraryDependencyEdge(dependencies,packageToken),facts=originalNormalLibraryDependencyEdgeFacts(token,dependencies,packageToken);
 assert.equal(facts.dependency.package,'base64');assert.equal(facts.crateRoot,'src/lib.rs');assert.equal(Object.keys(facts.originalDevDependencies).length,6);assert.deepEqual(facts.declaredNormalDependencies,[]);assert.deepEqual(facts.cfgBranches,['false','true']);assert.equal(facts.developmentEdgesExcluded,true);assert.equal(facts.sourceNamespaceOnly,true);assert.equal(facts.unresolvedChildImportDiagnosticsRetained,true);
 for(const name of ['cfgTestProved','manifestNormalizationComplete','actualInvocationObserved','actualEnvironmentObserved','nativeParity','wholeCrateValidity','namespaceAuthority','runtimeAuthority'])assert.equal(facts[name],false,name);
});
test('copied source plans reports and private edge tokens never supply a producer proof',{timeout:60000},()=>{
 const plan=originalCargoNormalLibraryEdgeSourcePlan(),token=captureOriginalNormalLibraryDependencyEdge(dependencies,packageToken),facts=originalNormalLibraryDependencyEdgeFacts(token,dependencies,packageToken);
 for(const value of [structuredClone(plan),{...plan},new Proxy(plan,{})])assert.throws(()=>requireOriginalCargoNormalLibraryEdgeSourcePlan(value),/copied/);
 for(const value of [structuredClone(token),{...token},structuredClone(facts),new Proxy(token,{})])assert.throws(()=>originalNormalLibraryDependencyEdgeFacts(value,dependencies,packageToken),/copied/);
 assert.throws(()=>{facts.sourcePlan.postcondition.developmentEdgesExcluded=false;},TypeError);
});
test('foreign private package and dependency associations cannot replay the same public source identity',{timeout:60000},()=>{
 const token=captureOriginalNormalLibraryDependencyEdge(dependencies,packageToken),otherDependencies=loadDeriveDependencyProof(inputs),otherPackage=captureOriginalExternalTraitPackage(dependencies,'base64');
 assert.throws(()=>originalNormalLibraryDependencyEdgeFacts(token,otherDependencies,packageToken),/foreign/);assert.throws(()=>originalNormalLibraryDependencyEdgeFacts(token,dependencies,otherPackage),/foreign/);
 assert.throws(()=>captureOriginalNormalLibraryDependencyEdge(structuredClone(dependencies),packageToken),/genuine private dependency proof/);assert.throws(()=>captureOriginalNormalLibraryDependencyEdge(dependencies,structuredClone(packageToken)),/genuine private capture/);
});
test('fresh source reissue preserves the relational conclusion without a source-result cache',{timeout:60000},()=>{
 const token=captureOriginalNormalLibraryDependencyEdge(dependencies,packageToken),first=originalNormalLibraryDependencyEdgeFacts(token,dependencies,packageToken),second=originalNormalLibraryDependencyEdgeFacts(token,dependencies,packageToken);
 assert.notStrictEqual(first,second);assert.notStrictEqual(first.sourcePlan,second.sourcePlan);assert.notStrictEqual(first.sourcePlan.program,second.sourcePlan.program);assert.deepEqual(first.cfgBranches,second.cfgBranches);assert.deepEqual(first.sourcePlan.postcondition,second.sourcePlan.postcondition);assert.equal(first.sourcePlan.program.profileSha256,second.sourcePlan.program.profileSha256);
});
