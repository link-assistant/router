// Regression source drafted only. No receiving qualification has been run.
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {proveBuiltinCloneEnclosingNamespace,requireBuiltinCloneEnclosingNamespace,reissueBuiltinCloneEnclosingNamespace,proveBuiltinDeriveBangFootprint} from '../builtin-derive-bang-footprints.mjs';
import {createDeriveEnclosingNamespaceContext,originalDeriveEnclosingNamespaceOutputs,proveDeriveEnclosingNamespaceEffect,deriveEnclosingNamespaceEffectFacts} from '../derive-enclosing-namespace-context.mjs';
import {prepareCloneEnclosing} from '../prepare-clone-enclosing.mjs';

const root=new URL('../../../',import.meta.url);
const read=path=>readFileSync(repositorySourceURL(path,root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
const test=(name,body)=>nodeTest(name,{timeout:60_000},body);
function setup(source){
 const modules=[{file:'src/lib.rs',path:[],source,configurationCondition:'active'}];
 const context=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
 const certificate=context.certificates.find(row=>row.name==='P');
 const attribute=certificate?.attributes.find(row=>row.derives?.some(path=>path.length===1&&path[0]==='Clone'));
 assert.ok(certificate&&attribute,'actual original Clone invocation');
 return {source,modules,context,certificate,invocation:{path:['Clone'],attributeSpan:attribute.span}};
}
function facts(args){
 const token=proveBuiltinCloneEnclosingNamespace(args);assert.ok(token);
 return {token,value:requireBuiltinCloneEnclosingNamespace(token,args.context,args.certificate,args.invocation)};
}
for(const [name,declaration]of [
 ['named generic field types','pub struct P{values:Vec<Option<String>>,map:std::collections::HashMap<String,String>,shared:std::sync::Arc<Other>}'],
 ['large named record','pub struct P{'+Array.from({length:47},(_,index)=>'field_'+index+':String').join(',')+'}'],
 ['tuple struct','pub struct P(pub String, pub Vec<Option<String>>);'],
 ['unit struct','pub struct P;'],
 ['unit enum','pub enum P{One,Two,Three}'],
])test('private Clone enclosing dimension retains '+name,()=>{
 const args=setup('#[derive(Clone)]'+declaration),{token,value}=facts(args),model=value.model;
 assert.equal(model.schema,'original-clone-enclosing-namespace-model-v1');
 assert.deepEqual(model.owner.target,['core','Clone']);
 assert.equal(model.sourceSha256,args.certificate.sourceSha256);
 assert.equal(model.itemSha256,args.certificate.itemSha256);
 assert.deepEqual(model.grammar.branches.map(row=>row.condition),['has_derive_copy=false','has_derive_copy=true']);
 for(const row of model.grammar.branches){assert.equal(row.outputKind,'ItemKind::Impl');assert.equal(row.associatedTypes,0);assert.deepEqual(row.associatedKinds,['AssocItemKind::Fn']);assert.deepEqual(row.methodNames,['clone']);}
 for(const row of model.grammar.sourceTypeRoundtrips){assert.equal(row.semanticSyntaxRoundTrip,true);assert.ok(row.typeSpan.end>row.typeSpan.start);}
 for(const key of ['enclosingTypeBindings','enclosingUsableValueBindings','enclosingMacroNames'])assert.deepEqual(model[key],[]);
 for(const key of ['namespaceAuthority','runtimeAuthority','generatedImplBehavior'])assert.equal(model[key],false);
 assert.equal(model.methodBehavior,'opaque-untranslated');assert.equal(value.wire,JSON.stringify(model));
 assert.equal(Object.isFrozen(model),true);assert.equal(Object.isFrozen(model.grammar),true);
 assert.equal(reissueBuiltinCloneEnclosingNamespace(token,args.context,args.certificate,args.invocation).wire,value.wire);
});

test('complete source-copy family keeps both rule sequences and every inverse',()=>{
 const plan=prepareCloneEnclosing();assert.equal(plan.files.length,3);
 for(const row of plan.files){assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.inverse,row.before);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);assert.equal(row.current,row.after);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}
 assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

test('copied tokens and models do not replace original source/owner joins',()=>{
 const args=setup('#[derive(Clone)]pub struct P{value:String}'),{token,value}=facts(args);
 for(const fake of [structuredClone(token),structuredClone(value),value.model])assert.throws(()=>requireBuiltinCloneEnclosingNamespace(fake,args.context,args.certificate,args.invocation));
 assert.throws(()=>requireBuiltinCloneEnclosingNamespace(token,args.context,structuredClone(args.certificate),args.invocation));
 const other=setup(args.source+'\n');assert.throws(()=>requireBuiltinCloneEnclosingNamespace(token,other.context,other.certificate,other.invocation));
 assert.throws(()=>requireBuiltinCloneEnclosingNamespace(token,args.context,args.certificate,{path:['Clone'],attributeSpan:{start:0,end:0}}));
});

test('namespace-only output remains separate from legacy complete Clone behavior metadata',()=>{
 const args=setup('#[derive(Clone,serde::Serialize)]pub struct P{value:String}');
 const full=proveBuiltinDeriveBangFootprint(args),namespace=facts(args).value;
 assert.equal(full.selectedOwnerBangComplete,true);assert.equal(full.generatedImplBehavior,false);
 assert.equal(namespace.model.methodBehavior,'opaque-untranslated');
 assert.equal(Object.hasOwn(namespace.model,'runtimeImplementation'),false);
});

test('whole invocation includes Clone and all sibling outputs without granting runtime authority',()=>{
 const args=setup('#[derive(Clone,serde::Serialize)]pub struct P{value:String}');
 const enclosing=createDeriveEnclosingNamespaceContext({deriveContext:args.context});
 const module=args.modules[0],item=originalSourceModuleItems(module).find(row=>row.name==='P');assert.ok(item);
 const original=originalDeriveEnclosingNamespaceOutputs(enclosing,args.context,module,item);
 assert.equal(original.outputs.length,2);assert.equal(original.outputs[0].format,'clone-enclosing');assert.equal(original.outputs[1].format,'quote');
 const token=proveDeriveEnclosingNamespaceEffect(enclosing,args.context,module,item),effect=deriveEnclosingNamespaceEffectFacts(token,enclosing,args.context,module,item);
 assert.equal(effect.runtimeAuthority,false);assert.equal(effect.generatedImplBehavior,false);
 assert.equal(effect.alternatives.length,2);assert.equal(effect.alternatives[0].format,'clone-enclosing-v1');
 assert.ok(deriveFootprintExternalModules(args.context) instanceof Map);
});

for(const declaration of [
 'pub struct P<T>{value:T}',
 '#[repr(packed)]pub struct P{value:String}',
 'pub struct P{value:unknown!()}',
 'pub enum P{A=1,B=2}',
])test('unknown Clone configuration/layout/type source stays refused: '+declaration,()=>{
 assert.throws(()=>facts(setup('#[derive(Clone)]'+declaration)));
});
