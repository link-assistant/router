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
import {preparePrimitiveOwnedVectorNativeHelpersSources} from '../prepare-primitive-owned-vector-native-helpers-sources.mjs';
const limits={timeout:60000},namespace='crate::translation_primitive_vectors_core::',native=readFileSync(new URL('../../../rust/src/translation_primitive_vectors_core.rs',import.meta.url),'utf8'),sequence=readFileSync(new URL('../../../rust/src/translation_primitive_sequences_core.rs',import.meta.url),'utf8'),dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
// Deliberately independent extrema, never read from translation rule/catalog DATA.
const domains=[['bool',false,true],['u8',0n,255n],['i8',-128n,127n],['u16',0n,65535n],['i16',-32768n,32767n],['u32',0n,4294967295n],['i32',-2147483648n,2147483647n],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['u128',0n,340282366920938463463374607431768211455n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
function files(source,leaf=native,slice=sequence){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_primitive_sequences_core;\npub mod translation_primitive_vectors_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_primitive_sequences_core.rs':slice,'src/translation_primitive_vectors_core.rs':leaf};}
function project(input){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
for(const [domain,minimum,maximum]of domains)test(domain+' full native helper graph source retains owned returns and shared-slice copies',limits,async()=>{
 const type='::core::primitive::'+domain,v='::std::vec::Vec<'+type+'>',n=operation=>namespace+'vec_'+domain+'_'+operation,input=`fn seed(value:${type})->${v}{${n('push')}(${n('new')}(),value)}
fn middle(value:${type})->${v}{seed(value)}
pub fn build(value:${type})->${v}{middle(value)}
pub fn count(value:${type})->::core::primitive::u64{let values=middle(value);${n('len')}(&values)}
fn copy_slice(values:&[${type}])->${v}{${n('from_slice')}(values)}
pub fn clone_input(values:&[${type}])->${v}{copy_slice(values)}`;
 const result=project(files(input));for(const name of ['seed','middle','build','count','copy_slice','clone_input'])assert.equal(admitted(result,name),true,JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const value of [minimum,maximum]){assert.deepEqual(api.build(value),[value]);assert.equal(api.count(value),1n);const values=Object.freeze([value,value]),copied=api.clone_input(values);assert.deepEqual(copied,values);assert.notStrictEqual(copied,values);assert.equal(Object.isFrozen(copied),true);}},{childTimeoutMs:20000});
});
test('recursive, foreign-module, owned-input and source-invalid helper graphs cannot qualify vector callers',limits,()=>{
 const v='::std::vec::Vec<::core::primitive::u8>',prefix='fn leaf(value: ::core::primitive::u8)->'+v,tail='pub fn caller(value: ::core::primitive::u8)->'+v+'{leaf(value)}',n=operation=>namespace+'vec_u8_'+operation;
 for(const graph of [prefix+'{leaf(value)}'+tail,prefix+'{other(value)}fn other(value: ::core::primitive::u8)->'+v+'{leaf(value)}'+tail,prefix+'{let values='+n('push')+'('+n('new')+'(),value);let moved='+n('push')+'(values,value);'+n('append')+'(values,moved)}'+tail,prefix+'{let mut values='+n('new')+'();let alias=values;values='+n('push')+'(values,value);'+n('append')+'(values,alias)}'+tail,prefix+'{vec![value]}'+tail])assert.equal(admitted(project(files(graph)),'caller'),false);
 const foreign='mod other{pub fn leaf(value: ::core::primitive::u8)->'+v+'{'+n('push')+'('+n('new')+'(),value)}}pub fn caller(value: ::core::primitive::u8)->'+v+'{other::leaf(value)}';assert.equal(admitted(project(files(foreign)),'caller'),false);
 const owned='fn transform(values:'+v+')->'+v+'{values}pub fn caller(value: ::core::primitive::u8)->'+v+'{transform('+n('push')+'('+n('new')+'(),value))}';assert.equal(admitted(project(files(owned)),'caller'),false);
});
test('four whole compiler/helper equations preserve frozen original APIs and exact two-phase source inverses',limits,()=>{const plan=preparePrimitiveOwnedVectorNativeHelpersSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);});
