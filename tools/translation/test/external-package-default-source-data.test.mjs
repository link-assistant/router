import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Hash} from 'node:crypto';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {originalExternalPackageDefaultSourceData,registerOriginalExternalDefaultProfile,captureOriginalExternalDependencyDefaults,originalExternalDependencyDefaultsFacts} from '../external-dependency-defaults.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE,compilationProfile,evaluateConfiguration} from '../cfg-profile.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {prepareExternalPackageDefaultSources} from '../prepare-external-package-defaults.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest,lock}),packageToken=captureOriginalExternalTraitPackage(dependencies,'base64');
const noAuthority=['closedFeatureKey','dependencyUnitRoleProved','testConfigurationProved','operatingSystemProved','stdPreludeAuthority','namespaceAuthority','attributeOwnerResolved','runtimeAuthority','runtimeParity'];
test('package-only data reproduce complete existing Cargo activation without inventing a project module',{timeout:15000},()=>{
 const actual=originalExternalPackageDefaultSourceData(dependencies,packageToken),source='pub fn ordinary(value:u8)->u8{value}',file='src/lib.rs',capture=captureSourceModuleViews({source,sourcePath:file,compilationProfile:PRODUCTION_PROFILE});
 const options={module:{source,file,path:[],sourceView:capture.views[0],compilationProfile:PRODUCTION_PROFILE},dependencies,packageToken},profile=registerOriginalExternalDefaultProfile(options),token=captureOriginalExternalDependencyDefaults(profile,options),previous=originalExternalDependencyDefaultsFacts(token,options);
 for(const name of ['dependency','positiveFeatures','activated','records','rootManifest','packageManifest','rootLock','parserExecution','packageSourceDomainSha256'])assert.deepEqual(actual[name],previous[name],name);
 assert.equal(Object.hasOwn(actual,'project'),false);assert.equal(actual.rootManifest,manifest);assert.equal(actual.rootLock,lock);assert.deepEqual(actual.positiveFeatures,['alloc','simd-unsafe','std']);assert.equal(actual.packageManifest.source,originalExternalTraitPackageInputs(packageToken).sources.find(row=>row.path==='Cargo.toml').source);for(const name of noAuthority)assert.equal(actual[name],false,name);
 assert.ok(Object.isFrozen(actual));assert.ok(Object.isFrozen(actual.records));assert.ok(Object.isFrozen(actual.positiveFeatures));
});
test('positive feature data leave test target and every unproved feature atom unknown',{timeout:15000},()=>{
 const value=originalExternalPackageDefaultSourceData(dependencies,packageToken),profile=compilationProfile({values:{feature:value.positiveFeatures}}),truth=source=>evaluateConfiguration(rustTokens(source),profile).value;
 assert.equal(truth('feature="std"'),true);assert.equal(truth('feature="alloc"'),true);for(const predicate of ['test','windows','unix','feature="unknown"','not(feature="unknown")'])assert.equal(truth(predicate),null,predicate);assert.deepEqual(Object.keys(profile.flags),[]);assert.deepEqual(profile.closedKeys,[]);for(const name of noAuthority)assert.equal(value[name],false,name);
});
test('copied or foreign private input fields cannot become a package source association',()=>{
 for(const value of [null,{},structuredClone(dependencies),{...dependencies,verified:true}])assert.throws(()=>originalExternalPackageDefaultSourceData(value,packageToken),/genuine private dependency proof/);
 for(const value of [null,{},structuredClone(packageToken),new Proxy(packageToken,{})])assert.throws(()=>originalExternalPackageDefaultSourceData(dependencies,value),/genuine private capture/);
});
test('each actual call reauthenticates complete parser inputs and reproduces the full native Hash byte tape',{timeout:15000},()=>{
 const original=Object.getOwnPropertyDescriptor(Hash.prototype,'update');function observe(){const tape=[];let value;try{Object.defineProperty(Hash.prototype,'update',{...original,value(input,...args){tape.push({input:Buffer.from(input,typeof args[0]==='string'?args[0]:undefined).toString('base64'),encoding:args[0]??null});return Reflect.apply(original.value,this,[input,...args]);}});value=originalExternalPackageDefaultSourceData(dependencies,packageToken);}finally{Object.defineProperty(Hash.prototype,'update',original);}return {value,tape};}
 const before=observe(),after=observe();assert.deepEqual(after,before);assert.notEqual(after.value,before.value);assert.ok(before.tape.some(row=>Buffer.from(row.input,'base64').toString('utf8')===manifest));assert.ok(before.tape.some(row=>Buffer.from(row.input,'base64').toString('utf8')===before.value.packageManifest.source));
});
test('the installed producer stays an exact complete native-selected copy with both CST rule sequences',{timeout:15000},()=>{
 const source=readFileSync(new URL('../external-dependency-defaults.mjs',import.meta.url),'utf8'),proposal=prepareExternalPackageDefaultSources(source);assert.equal(proposal.text,source);assert.equal(proposal.copied.inverse,proposal.kernel.source);assert.equal(transportConcreteSyntaxMeta(proposal.beforeMeta).source,proposal.source);assert.equal(transportConcreteSyntaxMeta(proposal.afterMeta).source,source);assert.deepEqual(proposal.copied.trace.map(row=>row.phase),['language','language','repository','repository','repository']);assert.ok(proposal.source.includes(proposal.kernel.source));assert.throws(()=>prepareExternalPackageDefaultSources(source+'\n// stale copy extension\n'),/stale/);assert.throws(()=>prepareExternalPackageDefaultSources(source.replace('state.originalPackage.dependency','state.foreignPackage.dependency')),/stale/);
});
