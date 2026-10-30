// Independent actual-body source. Execution waits for the entire bulk draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../json-iteration-native-source.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareForwardJsonIteration} from '../prepare-forward-json-iteration.mjs';
import {requireOriginalJsonProjectionEmission} from '../router-core-json-updates.mjs';
import {json_macro_null,json_macro_bool,json_macro_string} from '../json-macro-runtime.mjs';
const limits={timeout:60_000},C='crate::translation_core::',N='crate::translation_collections_core::',T=C+'Json';
const dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function files(source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_collections_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_collections_core.rs':JSON_ITERATION_NATIVE_SOURCE};}
function project(input){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const source=`pub fn selected(values:&[${T}])->Vec<${T}>{${N}json_filter(values,|value|{!value.is_null()})}
pub fn has_null(values:&[${T}])->bool{${N}json_any(values,|value|{value.is_null()})}
pub fn all_present(values:&[${T}])->bool{${N}json_all(values,|value|{!value.is_null()})}
pub fn first_null(values:&[${T}])->${C}Maybe<${T}>{${N}json_find(values,|value|{value.is_null()})}
pub fn last(values:&[${T}],initial:${T})->${T}{${N}json_fold(values,initial,|accumulator,value|{${C}json_copy(value)})}
pub fn identity_fold(values:&[${T}],initial:${T})->${T}{${N}json_fold(values,initial,|accumulator,value|{accumulator})}`;
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
test('five qualified native operations retain original checked caller bodies in JS and strict TS',limits,async()=>{
 const result=project(files(source));for(const name of ['selected','has_null','all_present','first_null','last','identity_fold'])assert.equal(admitted(result,name),true,JSON.stringify(result.meta.refused));
 const values=Object.freeze([json_macro_null(),json_macro_string('λ😀'),json_macro_bool(false)]),initial=json_macro_string('initial');
 await verifyTypedTargets(result,api=>{assert.deepEqual(api.selected(values),[values[1],values[2]]);assert.equal(api.has_null(values),true);assert.equal(api.all_present(values),false);assert.deepEqual(api.first_null(values),{$:'Some',field0:json_macro_null()});assert.deepEqual(api.first_null(Object.freeze([])),{$:'None'});assert.deepEqual(api.last(values,initial),json_macro_bool(false));assert.deepEqual(api.identity_fold(values,initial),initial);assert.equal(api.has_null(Object.freeze([])),false);assert.equal(api.all_present(Object.freeze([])),true);},{childTimeoutMs:20_000});
});
test('counterfeit library bytes wrong namespaces and wrong predicate or initial domains stay refused',limits,()=>{
 for(const changed of [source.replace('json_any(values,|value|{value.is_null()})','json_any(values,|value|{crate::translation_core::json_copy(value)})'),source.replace('json_fold(values,initial,','json_fold(values,&initial,'),source.replaceAll(N+'json_any',C+'json_any')]){
  const result=project(files(changed)),name=changed.includes('&initial')?'last':'has_null';assert.equal(admitted(result,name),false);
 }
 const bad=files(source);bad['src/translation_collections_core.rs']+='\n// changed original library\n';const result=project(bad);for(const name of ['selected','has_null','all_present','first_null','last','identity_fold'])assert.equal(admitted(result,name),false);
});
test('a public call tag cannot bypass the original emission frame and complete-source reissuer',limits,()=>{
 const forged={k:'routerCoreJsonCollection',id:'router_core_json_any',args:[],type:{kind:'bool'},compatibilityCore:{sourceProjectionKey:'counterfeit'}};assert.throws(()=>requireOriginalJsonProjectionEmission({},forged),/rechecked actual source function/);
});
test('all five complete forward source layers and class owner selector keep native source inverses',limits,()=>{
 const plan=prepareForwardJsonIteration();assert.equal(plan.files.length,5);for(const row of [...plan.files,...plan.sourceOwnerLayer.files]){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);}
 const emitter=plan.files.find(row=>row.path.endsWith('/host-contracts.mjs'));assert.ok(emitter.nativeSelections.repository.every(row=>row.kind==='class'));assert.ok(emitter.after.split('\n').length-1<1000);
});
