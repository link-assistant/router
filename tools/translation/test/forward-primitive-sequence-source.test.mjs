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
import {preparePrimitiveSequenceForwardSources} from '../prepare-primitive-sequence-forward-sources.mjs';
const limits={timeout:60000},namespace='crate::translation_primitive_sequences_core::',native=readFileSync(new URL('../../../rust/src/translation_primitive_sequences_core.rs',import.meta.url),'utf8'),dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
// Deliberately independent extrema, never read from translation rule/catalog DATA.
const domains=[['bool',false,true],['u8',0n,255n],['i8',-128n,127n],['u16',0n,65535n],['i16',-32768n,32767n],['u32',0n,4294967295n],['i32',-2147483648n,2147483647n],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['u128',0n,340282366920938463463374607431768211455n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
function caller(domain){const type='::core::primitive::'+domain;return `pub fn count(values:&[${type}])->::core::primitive::u64{${namespace}slice_${domain}_len(values)}
pub fn vacant(values:&[${type}])->bool{${namespace}slice_${domain}_is_empty(values)}
pub fn element(values:&[${type}],index:::core::primitive::u64)->Option<${type}>{${namespace}slice_${domain}_get(values,index)}`.replace('index:::','index: ::');}
function files(source,leaf=native){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_primitive_sequences_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_primitive_sequences_core.rs':leaf};}
function project(input){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
for(const [domain,minimum,maximum]of domains)test(domain+' actual primitive sequence callers emit complete JS and strict TypeScript with copied Option results',limits,async()=>{
 const result=project(files(caller(domain)));for(const name of ['count','vacant','element'])assert.equal(admitted(result,name),true,JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{for(const values of [Object.freeze([]),Object.freeze([minimum]),Object.freeze([maximum,minimum]),Object.freeze(Array(5001).fill(minimum))]){assert.equal(api.count(values),BigInt(values.length));assert.equal(api.vacant(values),values.length===0);assert.deepEqual(api.element(values,0n),values.length?{$:'Some',field0:values[0]}:{$:'None'});assert.deepEqual(api.element(values,BigInt(values.length)),{$:'None'});assert.deepEqual(api.element(values,18446744073709551615n),{$:'None'});}assert.throws(()=>api.count([minimum]));for(const index of [-1n,18446744073709551616n,0])assert.throws(()=>api.element(Object.freeze([minimum]),index));},{childTimeoutMs:20000});
});
test('counterfeit native source, root bindings, scalar widths, signedness and borrowed results remain refused',limits,()=>{
 const source=caller('u8');for(const changed of [source.replace('slice_u8_get(values,index)','slice_u8_get(values,0_i64)'),source.replace('slice_u8_get(values,index)','slice_i8_get(values,index)'),source.replace('->Option<::core::primitive::u8>','->Option<&::core::primitive::u8>'),source.replace(namespace+'slice_u8_get','crate::translation_core::slice_u8_get')])assert.equal(admitted(project(files(changed)),'element'),false);
 for(const changed of [native+'\n// changed complete original\n',native.replace('primitive_sequence_get(values, index)','None')]){const result=project(files(source,changed));for(const name of ['count','vacant','element'])assert.equal(admitted(result,name),false);}
 for(const root of ['mod translation_primitive_sequences_core;','#[cfg(any())]pub mod translation_primitive_sequences_core;','pub mod translation_primitive_sequences_core; use crate::translation_primitive_sequences_core as shadow;']){const data=files(source);data['src/lib.rs']=data['src/lib.rs'].replace('pub mod translation_primitive_sequences_core;',root);const result=project(data);assert.equal(admitted(result,'element'),false);}
});
test('counterfeit checked nodes and copied public metadata cannot obtain private emission membership',limits,()=>{
 const value={k:'routerHostCall',id:'router_slice_u8_get',args:[],type:{kind:'data',name:'Option'},compatibilityCore:{id:'router-primitive-sequence-v1',sourceProjectionKey:'counterfeit',runtimeParity:true}};assert.equal(hasOriginalRouterCoreJsonProjection(value),false);assert.throws(()=>requireOriginalJsonProjectionEmission({},value),/rechecked actual source function/u);
});
test('all paired runtime dependencies ship with complete current bytes',limits,()=>{const assets=hostRuntimeAssets();for(const name of ['primitive-sequence-runtime.mjs','primitive-sequence-runtime.d.mts','primitive-operator-runtime.mjs','primitive-operator-runtime.d.mts'])assert.equal(assets.get(name),readFileSync(new URL('../extensions/'+name,import.meta.url),'utf8'));});
test('seven full forward source equations retain complete inverses and both rule sequences under the existing file limit',limits,()=>{const plan=preparePrimitiveSequenceForwardSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);});
