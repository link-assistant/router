import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {originalSerdeCopyTraitInputs,isOriginalSerdeCopyTraitInputs} from '../serde-copy-trait-inputs.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {bindNonCopyTraitOwner,nonCopyTraitOwner} from '../copy-trait-owners.mjs';
import {captureSourceModuleViews,moduleScopeKey} from '../source-module-views.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),input={manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')},deriveDependencies=loadDeriveDependencyProof(input),jsonMacroDependencies=loadJsonMacroSourceProof(input),deps={deriveDependencies,jsonMacroDependencies};
const tag=$=>Object.freeze({$}),some=field0=>Object.freeze({$:'Some',field0}),none=tag('None');
const definition='#[derive(Copy,Clone)]enum Choice{A,B}',implementation="impl<'de> Deserialize<'de> for Choice{fn deserialize<D:serde::Deserializer<'de>>(deserializer:D)->Result<Self,D::Error>{Ok(Self::A)}}",run='pub fn chosen(value:Option<u8>)->Choice{value.map_or(Choice::B,|n|Choice::A)}';
const project=(source,extra={})=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,...deps,...extra});
test('genuine retained serde source proves both exact trait routes without certifying nested expansion',()=>{
 const proof=originalSerdeCopyTraitInputs(deps);assert.equal(isOriginalSerdeCopyTraitInputs(proof),true);assert.equal(isOriginalSerdeCopyTraitInputs(structuredClone(proof)),false);assert.equal(isOriginalSerdeCopyTraitInputs(Object.freeze(structuredClone(proof))),false);
 assert.deepEqual(proof.routes.map(route=>route.condition),['not(docsrs)','docsrs']);for(const route of proof.routes){assert.match(route.reexport.source,/Deserialize/);assert.equal(route.macro.completeExpansion,false);assert.equal(route.macro.expansionAuthority,false);assert.ok(route.macro.unresolvedNestedMacros.some(macro=>macro.name==='tri'&&macro.expanded===false));assert.match(route.trait.header,/pub trait Deserialize<'de>: Sized/);assert.equal(route.trait.executionAuthority,false);assert.equal(route.exactBindingClosure.completeNamespace,false);assert.ok(route.exactBindingClosure.generated.projectedRootNames.every(name=>name!=='Deserialize'));}
 assert.equal(proof.deserializeExecution,false);assert.equal(proof.copyAuthority,false);assert.equal(proof.dropExecution,false);
 for(const falseDeps of [{...deps,deriveDependencies:structuredClone(deriveDependencies)},{...deps,jsonMacroDependencies:structuredClone(jsonMacroDependencies)}])assert.throws(()=>originalSerdeCopyTraitInputs(falseDeps),/genuine locked/);
});
test('lifetime-only manual trait leaves independently source-derived Copy mapping checked in both targets',{timeout:60000},async()=>{
 const r=project('use serde::Deserialize;'+definition+implementation+run);
 assert.deepEqual(r.meta.refused.filter(row=>row.term!=='generated-method'),[{file:'src/lib.rs',name:'Choice.deserialize',term:'method',span:{start:98,end:192},kind:'unsupported',message:'generic implementation requires checked monomorphization; trait implementation needs resolved generic bounds or qualified trait syntax; trait implementation requires declared trait and dispatch checking; generic method requires checked monomorphization'}]);
 assert.deepEqual(r.meta.refused.filter(row=>row.term==='generated-method'),[{file:'src/lib.rs',name:'Choice.clone',term:'generated-method',kind:'unsupported',span:{start:23,end:60},message:'Original unit Clone source: requires its genuine original derive invocation'}]);
 assert.deepEqual(r.meta.checkedGeneratedMethods??[],[]);
 await verifyTypedTargets(r,api=>{assert.deepEqual(api.chosen(none),tag('B'));assert.deepEqual(api.chosen(some(255n)),tag('A'));assert.throws(()=>api.chosen(some(256n)),TypeError);},{childTimeoutMs:20000});
});
test('qualified and imported alias identities use actual source exports rather than trait spelling',{timeout:60000},async()=>{
 for(const [prefix,trait]of [['','serde::Deserialize'],['use serde::Deserialize as ReadWire;','ReadWire']]){const r=project(prefix+definition+implementation.replace('Deserialize<',trait+'<')+run);assert.ok(r.meta.executable.some(row=>row.name==='chosen'));await verifyTypedTargets(r,api=>{assert.deepEqual(api.chosen(none),tag('B'));assert.deepEqual(api.chosen(some(1n)),tag('A'));},{childTimeoutMs:20000});}
});
test('actual owner seals require immutable original resolver identities and unchanged header evidence',()=>{
 const source='use serde::Deserialize;'+definition+implementation,view=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}).views[0],module={file:'src/lib.rs',path:[],source,sourceView:view,items:sourceItems(source),configurationCondition:'active'},resolved=resolveModuleBindings({modules:[module]}),scopes=new Map(resolved.scopes.map(scope=>[moduleScopeKey(scope),scope])),raw=extractImplDeclarations(source,{sourcePath:module.file,modulePath:[],sourceView:view}).implementations[0],bound={...raw,resolvedType:{kind:'data',name:'Choice'},resolvedNominalTarget:null};
 bindNonCopyTraitOwner(bound,module,scopes,{...deps,sourceScopes:resolved.scopes});assert.ok(nonCopyTraitOwner(bound));assert.ok(Object.isFrozen(nonCopyTraitOwner(bound).importEvidence.target));assert.throws(()=>nonCopyTraitOwner(bound).importEvidence.target.push('Drop'),TypeError);assert.equal(nonCopyTraitOwner({...bound}),null);module.source+='\n';assert.equal(nonCopyTraitOwner(bound),null);module.source=source;assert.ok(nonCopyTraitOwner(bound));scopes.clear();assert.equal(nonCopyTraitOwner(bound),null);for(const scope of resolved.scopes)scopes.set(moduleScopeKey(scope),scope);assert.ok(nonCopyTraitOwner(bound));bound.genericParameters=["'other"];assert.equal(nonCopyTraitOwner(bound),null);
 const cloned={...raw,resolvedType:{kind:'data',name:'Choice'},resolvedNominalTarget:null};bindNonCopyTraitOwner(cloned,module,scopes,{...deps,sourceScopes:Object.freeze(structuredClone(resolved.scopes))});assert.equal(nonCopyTraitOwner(cloned),null);
});
test('unknown, shadowed, generic, unsafe, nested, macro and Drop declarations keep mandatory Copy refusals',()=>{
 const sources=[
 'trait Deserialize{}'+definition+implementation+run,
 'mod serde{pub trait Deserialize{}}use serde::Deserialize;'+definition+implementation+run,
 'mod fake{pub trait Deserialize{}}use crate::fake as serde;'+definition+implementation.replace('Deserialize<','serde::Deserialize<')+run,
 'use serde::Deserialize;'+definition+implementation+'impl Drop for Choice{fn drop(&mut self){}}'+run,
 'use serde::Deserialize;'+definition+implementation.replace("impl<'de>","impl<'de,T>")+run,
 'use serde::Deserialize;'+definition+implementation.replace("impl<'de>","impl<'de,const N:usize>")+run,
 'use serde::Deserialize;'+definition+'#[cfg(feature="unknown")]'+implementation+run,
 'use serde::Deserialize;'+definition+'unsafe '+implementation+run,
 'use serde::Deserialize;'+definition+implementation.replace('{Ok(Self::A)}','{unknown!();Ok(Self::A)}')+run,
 'use serde::Deserialize;'+definition+implementation.replace('{Ok(Self::A)}','{impl Drop for Choice{fn drop(&mut self){}}Ok(Self::A)}')+run,
 'use serde::Deserialize;'+definition+implementation.replace("Deserialize<'de>","Deserialize<'other>")+run,
 'use serde::Deserialize;enum Choice{A,B}'+implementation+run,
 ];for(const source of sources){const r=project(source);assert.equal(r.meta.executable.some(row=>row.name==='chosen'),false,source);assert.ok(r.meta.refused.length,source);}
});
test('missing or cloned dependencies cannot certify nominal Copy through a manual trait header',()=>{
 const source='use serde::Deserialize;'+definition+implementation+run;for(const extra of [{deriveDependencies:null},{jsonMacroDependencies:null}]){const r=project(source,extra);assert.equal(r.meta.executable.some(row=>row.name==='chosen'),false);}
 assert.throws(()=>project(source,{jsonMacroDependencies:structuredClone(jsonMacroDependencies)}),/sealed dependency/);
});
