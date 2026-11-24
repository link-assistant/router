// Independent actual token/variant source cases. All remain unrun drafts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveModuleGraph} from '../project.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {resolveConfiguredVariantEnclosingNamespaceModuleBindings} from '../module-bindings.mjs';
import {createConfiguredVariantToolAttributeContext} from '../tool-attributes.mjs';
import {createTokenBoundRegisteredBuiltinCallerAttributeScope} from '../registered-builtin-caller-attribute-source.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareTokenBoundVariantAttributeSources} from '../prepare-token-bound-variant-attribute-sources.mjs';
const limits={timeout:60000},sourcePath='rust/src/lib.rs';
const stable='#[stable(feature="fixture",since="1.0.0")]',unstable='#[unstable(feature="fixture",issue="none")]';
const source='pub enum Choice<T>{#[cfg(any())]rustfmt(T),'+stable+'Value(T),'+unstable+'Other(T)}\nuse Choice::*;\n#[rustfmt::skip]pub fn selected(value:bool)->bool{value}\n';
function setup(text=source){const graph=resolveModuleGraph({entry:sourcePath,paths:[sourcePath],readSource:()=>text,compilationProfile:PRODUCTION_PROFILE});return {modules:graph.modules,externalModules:registeredStandardHostBindings(),compilationProfile:PRODUCTION_PROFILE};}
function attribute(text,original,name){const start=text.indexOf(original);assert.ok(start>=0);return {name,span:{start,end:start+original.length}};}
test('exact original nested stability attributes retain active variant names and compose the selected source/tool path',limits,()=>{
 const input=setup(),facts=resolveConfiguredVariantEnclosingNamespaceModuleBindings(input),root=facts.scopes.find(row=>row.path.length===0);for(const name of ['Value','Other']){assert.ok(root.bindings.some(row=>row.name===name&&row.namespace==='type'&&row.status==='resolved'));assert.ok(root.bindings.some(row=>row.name===name&&row.namespace==='value'&&row.status==='resolved'));}assert.ok(!root.bindings.some(row=>row.name==='rustfmt'));assert.equal(createConfiguredVariantToolAttributeContext(input).certificates.length,1);assert.ok(facts.registeredBuiltinAttributeSource.selected.some(row=>row.name==='stable'&&row.originalTokenBoundsVerified===true));
 const module=input.modules[0],item=originalSourceModuleItems(module).find(row=>row.term==='enum'),scope=createTokenBoundRegisteredBuiltinCallerAttributeScope(),selected=scope.at(module,item,attribute(source,stable,'stable'));assert.equal(selected.original,stable);assert.equal(selected.originalTokenBoundsVerified,true);assert.equal(selected.sourceAuthority,false);assert.equal(selected.semanticAuthority,false);const summary=scope.finish();assert.equal(summary.namespaceAuthority,false);assert.equal(summary.runtimeAuthority,false);assert.equal(summary.crossInvocationCache,false);
});
test('attribute-like string contents cannot qualify an original attribute token range',limits,()=>{
 const text='const TEXT: &str = "#[automatically_derived]";\npub fn selected()->bool{true}',input=setup(text),module=input.modules[0],item=originalSourceModuleItems(module).find(row=>row.term==='const'),scope=createTokenBoundRegisteredBuiltinCallerAttributeScope(),request=attribute(text,'#[automatically_derived]','automatically_derived');assert.equal(scope.at(module,item,request),null);assert.equal(scope.finish(),null);
 const original=setup(),owner=original.modules[0],actual=originalSourceModuleItems(owner).find(row=>row.term==='enum'),frame=createTokenBoundRegisteredBuiltinCallerAttributeScope(),selected=attribute(source,stable,'stable');assert.throws(()=>frame.at(owner,{...actual,tokens:actual.tokens.slice(1)},selected));assert.throws(()=>frame.at({...owner,source:owner.source+' '},actual,selected));
});
test('qualified raw macro-valued unknown and active shadow variants retain namespace refusals',limits,()=>{
 for(const replacement of ['#[unknown]','#[stable::transform]','#[r#stable(feature="fixture",since="1.0.0")]','#[stable(feature=make!(),since="1.0.0")]']){const text=source.replace(stable,replacement);assert.equal(createConfiguredVariantToolAttributeContext(setup(text)).certificates.length,0,replacement);}
 assert.equal(createConfiguredVariantToolAttributeContext(setup(source.replace('cfg(any())','cfg(all())'))).certificates.length,0);
 const input=setup(source.replace('cfg(any())','cfg(all())'));input.modules=input.modules.map(module=>({...module,items:[],allItems:[]}));assert.equal(createConfiguredVariantToolAttributeContext(input).certificates.length,0);
});
test('complete token-bound source frames and exact variant consumer histories retain both phases and original inverses',limits,()=>{
 const plan=prepareTokenBoundVariantAttributeSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
