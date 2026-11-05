// Independent actual native caller/body case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {requireOriginalJsonProjectionEmission,hasOriginalRouterCoreJsonProjection} from '../router-core-json-updates.mjs';
import {hostRuntimeAssets} from '../host-assets.mjs';
import {preparePrimitiveOwnedVectorForwardSources} from '../prepare-primitive-owned-vector-forward-sources.mjs';
const limits={timeout:60000},namespace='crate::translation_primitive_vectors_core::',native=readFileSync(new URL('../../../rust/src/translation_primitive_vectors_core.rs',import.meta.url),'utf8'),sequence=readFileSync(new URL('../../../rust/src/translation_primitive_sequences_core.rs',import.meta.url),'utf8'),dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
// Deliberately independent extrema, never read from translation rule/catalog DATA.
const domains=[['bool',false,true],['u8',0n,255n],['i8',-128n,127n],['u16',0n,65535n],['i16',-32768n,32767n],['u32',0n,4294967295n],['i32',-2147483648n,2147483647n],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['u128',0n,340282366920938463463374607431768211455n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
function caller(domain){const type='::core::primitive::'+domain,v='::std::vec::Vec<'+type+'>',n=operation=>namespace+'vec_'+domain+'_'+operation;return `
pub fn build(value:${type})->${v}{let initial=${n('new')}();let first=${n('push')}(initial,value);let next=${n('push')}(${n('new')}(),value);let combined=${n('append')}(first,next);let replaced=${n('replace')}(combined,0_u64,value);${n('truncate')}(replaced,1_u64)}
pub fn count(value:${type})->::core::primitive::u64{let values=${n('push')}(${n('new')}(),value);${n('len')}(&values)}
pub fn element(value:${type},index: ::core::primitive::u64)->Option<${type}>{let values=${n('push')}(${n('new')}(),value);${n('get')}(&values,index)}
pub fn clone_input(values:&[${type}])->${v}{${n('from_slice')}(values)}`;}
function files(source,leaf=native,slice=sequence){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_primitive_sequences_core;\npub mod translation_primitive_vectors_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_primitive_sequences_core.rs':slice,'src/translation_primitive_vectors_core.rs':leaf};}
function project(input){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
for(const [domain,minimum,maximum]of domains)test(domain+' complete local native owned-vector callers preserve moves, copied results and the explicit resource envelope',limits,async()=>{
 const result=project(files(caller(domain)));for(const name of ['build','count','element','clone_input'])assert.equal(admitted(result,name),true,JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{for(const value of [minimum,maximum]){assert.deepEqual(api.build(value),[value]);assert.equal(Object.isFrozen(api.build(value)),true);assert.equal(api.count(value),1n);assert.deepEqual(api.element(value,0n),{$:'Some',field0:value});for(const index of [1n,18446744073709551615n])assert.deepEqual(api.element(value,index),{$:'None'});for(const values of [Object.freeze([]),Object.freeze([value]),Object.freeze(Array(4096).fill(value))]){const copy=api.clone_input(values);assert.deepEqual(copy,values);assert.notStrictEqual(copy,values);assert.equal(Object.isFrozen(copy),true);}assert.throws(()=>api.clone_input(Object.freeze(Array(4097).fill(value))));assert.throws(()=>api.clone_input([value]));for(const index of [-1n,18446744073709551616n,0])assert.throws(()=>api.element(value,index));}},{childTimeoutMs:20000});
});
test('moved, duplicated, partially moved, mutable and publicly supplied vectors remain refused',limits,()=>{
 const n=operation=>namespace+'vec_u8_'+operation,v='::std::vec::Vec<::core::primitive::u8>',newValue=n('new')+'()',build=n('push')+'('+newValue+',value)';
 const bodies=[
  'let values='+build+';let moved='+n('push')+'(values,value);'+n('len')+'(&values)',
  'let values='+build+';let moved='+n('append')+'(values,values);'+n('len')+'(&moved)',
  'let mut values='+build+';'+n('len')+'(&values)',
  'let values='+build+';'+n('len')+'(&mut values)',
  'let values='+build+';'+n('len')+'(values)',
  'let values='+build+';let moved=if flag{'+n('push')+'(values,value)}else{'+newValue+'};'+n('len')+'(&values)',
  'let values='+build+';'+n('get')+'(&values,{let moved='+n('push')+'(values,value);0_u64})',
 ];for(const body of bodies){const resultType=body.includes(n('get')+'(')?'Option<::core::primitive::u8>':'::core::primitive::u64',source='pub fn bad(value: ::core::primitive::u8,flag:bool)->'+resultType+'{'+body+'}';assert.equal(admitted(project(files(source)),'bad'),false);}
 for(const source of ['pub fn bad(values:'+v+')->::core::primitive::u64{'+n('len')+'(&values)}','pub fn bad(values:&'+v+')->::core::primitive::u64{'+n('len')+'(values)}'])assert.equal(admitted(project(files(source)),'bad'),false);
});
test('actual namespaces, both native libraries, primitive identity and private emission membership are independently required',limits,()=>{
 const source=caller('u8');for(const changed of [source.replace('vec_u8_push(initial,value)','vec_i8_push(initial,value)'),source.replace('vec_u8_truncate(replaced,1_u64)','vec_u8_truncate(replaced,1_i64)'),source.replace(namespace+'vec_u8_get','crate::translation_core::vec_u8_get')])assert.equal(admitted(project(files(changed)),changed.includes('translation_core::vec_u8_get')?'element':'build'),false);
 for(const changed of [native+'\n// changed whole source\n',native.replace('primitive_vector_length(values)','0')])assert.equal(admitted(project(files(source,changed)),'count'),false);
 assert.equal(admitted(project(files(source,native,sequence+'\n// changed dependency\n')),'count'),false);
 for(const edge of ['mod translation_primitive_vectors_core;','#[cfg(any())]pub mod translation_primitive_vectors_core;','pub mod translation_primitive_vectors_core; use crate::translation_primitive_vectors_core as shadow;']){const input=files(source);input['src/lib.rs']=input['src/lib.rs'].replace('pub mod translation_primitive_vectors_core;',edge);assert.equal(admitted(project(input),'count'),false);}
 const value={k:'routerHostCall',id:'router_vec_u8_get',args:[],type:{kind:'data',name:'Option'},compatibilityCore:{id:'router-primitive-owned-vector-v1',sourceProjectionKey:'counterfeit',runtimeParity:true}};assert.equal(hasOriginalRouterCoreJsonProjection(value),false);assert.throws(()=>requireOriginalJsonProjectionEmission({},value),/rechecked actual source function/u);
});
test('complete owned-vector runtime pairs ship with their actual current bytes',limits,()=>{const assets=hostRuntimeAssets();for(const name of ['primitive-owned-vector-runtime.mjs','primitive-owned-vector-runtime.d.mts','primitive-sequence-runtime.mjs','primitive-sequence-runtime.d.mts'])assert.equal(assets.get(name),readFileSync(new URL('../extensions/'+name,import.meta.url),'utf8'));});
test('six whole native-forward source equations retain both substitution sequences and exact original inverses',limits,()=>{const plan=preparePrimitiveOwnedVectorForwardSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);});
