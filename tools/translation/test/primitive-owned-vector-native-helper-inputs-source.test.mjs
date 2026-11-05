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
for(const [domain,minimum,maximum]of domains)test(domain+' native helper inputs retain full source graph and copied result contracts',limits,async()=>{const t='::core::primitive::'+domain,v='::std::vec::Vec<'+t+'>',n=operation=>namespace+'vec_'+domain+'_'+operation,text=`fn identity_helper(input:${v})->${v}{let values=${n('truncate')}(input,18446744073709551615_u64);values}
fn count_helper(input:${v})->::core::primitive::u64{let values=${n('truncate')}(input,18446744073709551615_u64);${n('len')}(&values)}
fn element_helper(input:${v})->Option<${t}>{let values=${n('truncate')}(input,18446744073709551615_u64);${n('get')}(&values,0_u64)}
pub fn identity(input:${v})->${v}{let values=${n('truncate')}(input,18446744073709551615_u64);identity_helper(values)}
pub fn count(input:${v})->::core::primitive::u64{let values=${n('truncate')}(input,18446744073709551615_u64);count_helper(values)}
pub fn element(input:${v})->Option<${t}>{let values=${n('truncate')}(input,18446744073709551615_u64);element_helper(values)}`,result=project(files(text));for(const name of ['identity','count','element'])assert.equal(admitted(result,name),true,JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const input of [Object.freeze([]),Object.freeze([minimum,maximum])]){assert.deepEqual(api.identity(input),input);assert.equal(api.count(input),BigInt(input.length));assert.deepEqual(api.element(input),input.length?{$:'Some',field0:minimum}:{$:'None'});}},{childTimeoutMs:20000});
 const unguarded=text.replace('fn count_helper(input:'+v+')->::core::primitive::u64{let values='+n('truncate')+'(input,18446744073709551615_u64);'+n('len')+'(&values)}','fn count_helper(input:'+v+')->::core::primitive::u64{'+n('len')+'(&input)}');assert.equal(admitted(project(files(unguarded)),'count'),false);
 const moved=text.replace('count_helper(values)}','let result=count_helper(values);'+n('len')+'(&values)}');assert.equal(admitted(project(files(moved)),'count'),false);
});
