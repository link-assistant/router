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
function files(source,leaf=native,slice=sequence){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_primitive_sequences_core;\npub mod translation_primitive_vectors_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_primitive_sequences_core.rs':slice,'src/translation_primitive_vectors_core.rs':leaf};}
function project(input){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
for(const [domain,minimum,maximum]of domains)test(domain+' native shared Vec input and helper reads retain their actual single-reference source and Copy layout',limits,async()=>{const t='::core::primitive::'+domain,v='::std::vec::Vec<'+t+'>',n=operation=>namespace+'vec_'+domain+'_'+operation,text=`fn count_helper(input:&${v})->::core::primitive::u64{let checked=${n('len')}(input);${n('len')}(input)}
pub fn count(input:&${v})->::core::primitive::u64{let checked=${n('len')}(input);count_helper(input)}
pub fn element(input:&${v},index: ::core::primitive::u64)->Option<${t}>{let checked=${n('len')}(input);let alias=input;${n('get')}(alias,index)}
pub fn mixed(shared:&${v},owned:${v})->::core::primitive::u64{let checked=${n('len')}(shared);let values=${n('truncate')}(owned,18446744073709551615_u64);${n('len')}(&values)}`,result=project(files(text));for(const name of ['count','element','mixed'])assert.equal(admitted(result,name),true,JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const values of [Object.freeze([]),Object.freeze([minimum,maximum])]){assert.equal(api.count(values),BigInt(values.length));assert.deepEqual(api.element(values,0n),values.length?{$:'Some',field0:minimum}:{$:'None'});assert.equal(api.mixed(values,Object.freeze([maximum])),1n);}for(const values of [[minimum],Object.freeze(Array(4097).fill(minimum))])assert.throws(()=>api.count(values));},{childTimeoutMs:20000});
 for(const body of [n('len')+'(input)','let checked='+n('len')+'(input);'+n('len')+'(&input)','let checked='+n('len')+'(input);'+n('push')+'(input,0_u8)'])assert.equal(admitted(project(files('pub fn bad(input:&'+v+')->::core::primitive::u64{'+body+'}')),'bad'),false);
 const escaping='pub fn bad(input:&'+v+')->&'+v+'{let checked='+n('len')+'(input);input}';assert.equal(admitted(project(files(escaping)),'bad'),false);
});
