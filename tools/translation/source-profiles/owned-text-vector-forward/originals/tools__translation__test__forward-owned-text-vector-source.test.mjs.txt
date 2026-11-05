// Independent original Rust caller/typed-target/freshness/refusal SOURCE.
// ALL UNRUN. Native compilation/oracle execution is authorized in CI only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProjectOwnedTextVectors as translateProject} from '../owned-text-vector-project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './owned-text-vector-typed-targets.mjs';
import {hostRuntimeAssets} from '../host-assets.mjs';
import {requireOriginalJsonProjectionEmission,hasOriginalRouterCoreJsonProjection} from '../router-core-json-updates.mjs';
import {requireCurrentOwnedTextVectorNativeOperationSource as nativeJoin} from '../current-owned-text-vector-source.mjs';
import {checkForwardOwnedTextVector} from '../owned-text-vector-forward-domain.mjs';
import {prepareOwnedTextVectorForwardSources} from '../prepare-owned-text-vector-forward-sources.mjs';
const limits={timeout:60000},namespace='crate::translation_owned_text_vectors_core::',text='::std::string::String',vector='::std::vec::Vec<'+text+'>',optional='::std::option::Option<'+text+'>',n=operation=>namespace+'vec_text_'+operation;
const native=readFileSync(new URL('../../../rust/src/translation_owned_text_vectors_core.rs',import.meta.url),'utf8'),dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function files(source,leaf=native,edge='pub mod translation_owned_text_vectors_core;'){
 return {'src/lib.rs':'pub mod translation_core;\n'+edge+'\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_owned_text_vectors_core.rs':leaf};
}
function project(input){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
function source(){return `
pub fn build(value:${text})->${vector}{${n('push')}(${n('new')}(),value)}
pub fn combine(first:${text},second:${text})->${vector}{let initial=${n('push')}(${n('new')}(),first);let other=${n('push')}(${n('new')}(),second);${n('append')}(initial,other)}
pub fn edited(value:${text},replacement:${text})->${vector}{let initial=${n('push')}(${n('new')}(),value);let replaced=${n('replace')}(initial,0_u64,replacement);${n('truncate')}(replaced,1_u64)}
pub fn rebound(value:${text},other:${text})->${vector}{let mut values=${n('new')}();values=${n('push')}(values,value);values=${n('push')}(values,other);values}
pub fn element(value:${text},index: ::core::primitive::u64)->${optional}{let values=${n('push')}(${n('new')}(),value);${n('get')}(&values,index)}
pub fn independent(value:${text})->${optional}{let values=${n('push')}(${n('new')}(),value);let selected=${n('get')}(&values,0_u64);let moved=${n('append')}(values,${n('new')}());selected}
pub fn count(value:${text})->::core::primitive::u64{let values=${n('push')}(${n('new')}(),value);${n('len')}(&values)}
pub fn copy_input(values:&[${text}])->${vector}{let checked=${n('from_slice')}(values);checked}
pub fn add_input(values:${vector},value:${text})->${vector}{let checked=${n('truncate')}(values,18446744073709551615_u64);${n('push')}(checked,value)}
pub fn shared_count(values:&${vector})->::core::primitive::u64{let checked=${n('len')}(values);${n('len')}(values)}
pub fn through_helper(value:${text})->${vector}{build(value)}
pub fn mutable_helper(value:${text},other:${text})->${vector}{let mut values=build(value);values=${n('push')}(values,other);values}
pub fn helper_count(value:${text})->::core::primitive::u64{let values=build(value);shared_count(&values)}
pub fn helper_element(value:${text},index: ::core::primitive::u64)->${optional}{let values=build(value);${n('get')}(&values,index)}
pub fn helper_added(value:${text},other:${text})->${vector}{let values=build(value);add_input(values,other)}
pub fn branched(value:${text},other:${text},flag:bool)->${vector}{let mut values=${n('new')}();if flag {values=${n('push')}(values,value);}else{values=${n('push')}(values,other);}values}
pub fn looped(input:&[${text}])->::core::primitive::u64{let checked=${n('from_slice')}(input);let mut values=${n('new')}();for index in 0_u64..3_u64{let fresh=${n('from_slice')}(input);values=${n('append')}(values,fresh);}${n('len')}(&values)}
`;}
test('original complete Rust callers move String vectors and independently clone lookup results',limits,async()=>{
 const result=project(files(source()));for(const name of ['build','combine','edited','rebound','element','independent','count','copy_input','add_input','shared_count','through_helper','mutable_helper','helper_count','helper_element','helper_added','branched','looped'])assert.equal(admitted(result,name),true,name+': '+JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{
  for(const value of ['', 'é', '🦀\u0000文']){assert.deepEqual(api.build(value),[value]);assert.deepEqual(api.combine(value,'second'),[value,'second']);assert.deepEqual(api.edited(value,'replacement'),['replacement']);assert.deepEqual(api.rebound(value,'other'),[value,'other']);assert.deepEqual(api.element(value,0n),{$:'Some',field0:value});assert.deepEqual(api.independent(value),{$:'Some',field0:value});assert.equal(api.count(value),1n);assert.deepEqual(api.through_helper(value),[value]);assert.deepEqual(api.mutable_helper(value,'other'),[value,'other']);assert.equal(api.helper_count(value),1n);assert.deepEqual(api.helper_element(value,0n),{$:'Some',field0:value});assert.deepEqual(api.helper_added(value,'other'),[value,'other']);assert.deepEqual(api.branched(value,'other',true),[value]);assert.deepEqual(api.branched(value,'other',false),['other']);assert.equal(Object.isFrozen(api.build(value)),true);for(const index of [1n,18446744073709551615n])assert.deepEqual(api.element(value,index),{$:'None'});}
  const input=Object.freeze(['x','🦀']);assert.deepEqual(api.copy_input(input),input);assert.notStrictEqual(api.copy_input(input),input);assert.deepEqual(api.add_input(input,'third'),['x','🦀','third']);assert.equal(api.shared_count(input),2n);assert.equal(api.looped(input),6n);assert.throws(()=>api.copy_input(['x']));assert.throws(()=>api.copy_input(Object.freeze(['\ud800'])));assert.throws(()=>api.copy_input(Object.freeze(Array(4097).fill('x'))));assert.throws(()=>api.add_input(Object.freeze(Array(4096).fill('x')),'overflow'));
 },{childTimeoutMs:20000});
});
test('String and optional String moves, duplicate vectors and argument loans cannot become primitive Copy',limits,()=>{
 const bad=[
  `let values=${n('push')}(${n('new')}(),value);let moved=${n('push')}(values,other);${n('len')}(&values)`,
  `let first=${n('push')}(${n('new')}(),value);let second=${n('push')}(${n('new')}(),value);${n('len')}(&second)`,
  `let values=${n('push')}(${n('new')}(),value);let moved=${n('append')}(values,values);${n('len')}(&moved)`,
  `let mut values=${n('new')}();let alias=values;values=${n('push')}(values,value);${n('len')}(&alias)`,
  `let values=${n('push')}(${n('new')}(),value);${n('len')}(&mut values)`,
  `let values=${n('push')}(${n('new')}(),value);${n('len')}(values)`,
  `let mut values=${n('new')}();for index in 0_u64..3_u64{let moved=${n('push')}(values,other);}${n('len')}(&values)`,
 ];for(const body of bad){const result=project(files(`pub fn bad(value:${text},other:${text})->::core::primitive::u64{${body}}`));assert.equal(admitted(result,'bad'),false);}
 const nested=`pub fn bad(value:${text})->${optional}{let values=${n('push')}(${n('new')}(),value);${n('get')}(&values,{let moved=${n('append')}(values,${n('new')}());0_u64})}`;assert.equal(admitted(project(files(nested)),'bad'),false);
 for(const fn of [`pub fn bad(values:${vector})->::core::primitive::u64{${n('len')}(&values)}`,`pub fn bad(values:&${vector})->::core::primitive::u64{${n('len')}(values)}`,`pub fn bad(values:&[${text}])->${vector}{${n('from_slice')}(values)}`])assert.equal(admitted(project(files(fn)),'bad'),false);
});
test('actual ABI join observes complete sources and keeps caller/type authority false',limits,()=>{
 const input=files(''),root=input['src/lib.rs'];for(const operation of ['new','from_slice','push','append','truncate','replace','len','get']){const row=nativeJoin(root,native,'vec_text_'+operation);assert.equal(row.javascriptName,'router_owned_text_vec_'+operation);assert.equal(row.sourceRecords.length,8);assert.equal(row.nativeTypeOwnerQualified,false);assert.equal(row.privateCallerBindingQualified,false);assert.equal(row.crossInvocationCache,false);}
 assert.throws(()=>nativeJoin(root,native+'\n// changed complete native input\n','vec_text_get'));assert.throws(()=>nativeJoin(root.replace('pub mod translation_owned_text_vectors_core;','mod translation_owned_text_vectors_core;'),native,'vec_text_get'));
 assert.throws(()=>checkForwardOwnedTextVector({}, {operation:'router_owned_text_vec_new',args:[],span:{start:0,end:0}},new Map(),[],undefined,{current(){}}));
});
test('complete runtime/declaration package and private emission reissue remain mandatory',limits,()=>{
 const assets=hostRuntimeAssets();for(const name of ['owned-text-vector-runtime.mjs','owned-text-vector-runtime.d.mts','string-iterator-runtime.mjs','primitive-operator-runtime.mjs','primitive-operator-runtime.d.mts','whitespace-data.mjs'])assert.equal(typeof assets.get(name),'string');
 const result=project(files(`pub fn selected(value:${text})->${vector}{${n('push')}(${n('new')}(),value)}`));assert.equal(admitted(result,'selected'),true);assert.throws(()=>requireOriginalJsonProjectionEmission({},{$:'Some',id:'router_owned_text_vec_get',nativeTypeOwnerQualified:true}));assert.equal(hasOriginalRouterCoreJsonProjection({}, {k:'routerHostCall',id:'router_owned_text_vec_get',compatibilityCore:{sourceProjectionKey:'forged'}}),false);
});
test('native String vector extension retains complete original source substitutions and inverse histories',limits,()=>{
 const plan=prepareOwnedTextVectorForwardSources();assert.ok(plan.files.length>=12);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);
});
