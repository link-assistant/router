// Independent source-only regressions; execute after the entire bulk draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {resolveModuleBindings,resolveEnclosingNamespaceModuleBindings,isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from '../module-bindings.mjs';
import {originalEnumNamespaceSourcePlan,requireOriginalEnumNamespaceSourcePlan} from '../derive-ancestor-attribute-scope.mjs';
import {prepareEnumNamespaceSources} from '../prepare-enum-namespace-sources.mjs';
import {enumNamespaceBody} from '../enum-namespace-header.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const limits={timeout:60000};
function input(source){const captured=captureSourceModuleViews({source,sourcePath:'rust/src/lib.rs',compilationProfile:PRODUCTION_PROFILE});return {modules:captured.views.map(sourceView=>({file:'rust/src/lib.rs',path:sourceView.modulePath,source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition})),compilationProfile:PRODUCTION_PROFILE};}
test('generic enum namespace follows actual type and tuple unit constructor domains',limits,()=>{
 const source='pub enum Carrier<T>{Value(T),Empty,Record{value:T}} use crate::Carrier::{Value as Present,Empty,Record};pub fn selected(value:bool)->bool{value}',request=input(source),result=resolveEnclosingNamespaceModuleBindings(request);assert.ok(isResolvedSourceScopeSet(result.scopes));assert.strictEqual(assertResolvedSourceScopeOrigin(result.scopes,request),result.scopes);const scope=result.scopes.find(row=>row.path.length===0);
 for(const name of ['Present','Empty'])for(const namespace of ['type','value'])assert.equal(scope.bindings.find(row=>row.name===name&&row.namespace===namespace)?.status,'resolved');assert.equal(scope.bindings.find(row=>row.name==='Record'&&row.namespace==='type')?.status,'resolved');assert.equal(scope.bindings.some(row=>row.name==='Record'&&row.namespace==='value'),false);assert.equal(scope.unresolvedTypeScope,false);
 const baseline=resolveModuleBindings(request);assert.ok(baseline.diagnostics.some(row=>row.message.includes('generic enum')));assert.ok(baseline.scopes.some(row=>row.unresolvedTypeScope));
});
test('nested angle bounds lifetimes const parameters and where predicates retain the original body selection',limits,()=>{
 const examples=['enum Wrapper<T: Trait<Vec<u8>>>{One(T)}','enum View<\'a,T,const N:usize> where T: Trait<\'a> {One(&\'a T),Bytes([u8;N])}','enum Nested<T=Vec<Vec<u8>>>{One(T)}','enum Plain {One}'];
 for(const source of examples){const tokens=rustTokens(source).filter(row=>row.type!=='comment'),keyword=tokens.findIndex(row=>row.text==='enum'),body=enumNamespaceBody(tokens,keyword);assert.equal(tokens[body].text,'{');assert.equal(tokens[body+1].text,'One');}
});
test('macro block malformed conditional and imported uncertainty are retained without a namespace bypass',limits,()=>{
 for(const source of ['enum E<T=generate!()>{One(T)}','enum E<const N:usize={1}>{One}','enum E<T'] )assert.throws(()=>enumNamespaceBody(rustTokens(source),0));
 for(const source of ['#[derive(Unknown)]pub enum E<T>{One(T)}','use unknown::*;pub enum E<T>{One(T)}','#[cfg(unknown)]pub enum E<T>{One(T)}']){const result=resolveEnclosingNamespaceModuleBindings(input(source));assert.ok(result.scopes.some(row=>row.unresolvedTypeScope));}
 const request=input('pub enum E<T>{One(T)}'),result=resolveEnclosingNamespaceModuleBindings(request);assert.throws(()=>assertResolvedSourceScopeOrigin(result.scopes,{...request,modules:request.modules.map(row=>({...row,source:row.source+' '}))}));assert.equal(isResolvedSourceScopeSet(structuredClone(result.scopes)),false);
});
test('source witnesses and both complete predecessor copies retain private identity and full inverses',limits,()=>{
 const plan=originalEnumNamespaceSourcePlan();assert.strictEqual(requireOriginalEnumNamespaceSourcePlan(plan),plan);assert.throws(()=>requireOriginalEnumNamespaceSourcePlan(structuredClone(plan)));assert.equal(plan.genericTypeValidity,false);assert.equal(plan.runtimeAuthority,false);assert.equal(plan.wholeCompilerExecuted,false);
 const copy=prepareEnumNamespaceSources();assert.equal(copy.files.length,2);for(const row of copy.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.stages[0].beforeMeta).source,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
});
